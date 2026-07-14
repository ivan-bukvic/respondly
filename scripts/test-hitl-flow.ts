import { createServiceClient } from '../lib/supabase/server'
import { insertPendingResponse } from '../lib/responses/queries'
import {
  approvePendingResponse,
  editAndSendPendingResponse,
  rejectPendingResponse,
} from '../lib/responses/transition'

// Manual HITL transition checks (checklist items 9–11 + review fix #4).
// Requires: Faza 3 migration applied + at least one inbound message.
// Approve/edit paths send a real WhatsApp message via Twilio.
// Usage: npx tsx --env-file=.env.local scripts/test-hitl-flow.ts

async function createFreshPending(label: string) {
  const supabase = await createServiceClient()

  const { data: message, error: messageError } = await supabase
    .from('messages')
    .select('id, conversation_id')
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (messageError) {
    throw messageError
  }

  if (!message) {
    throw new Error(
      'No inbound messages found — send a WhatsApp message first, then re-run.'
    )
  }

  // Unique on inbound_message_id — insert a disposable inbound row so each
  // scenario gets its own pending_responses row.
  const { data: disposableInbound, error: inboundError } = await supabase
    .from('messages')
    .insert({
      conversation_id: message.conversation_id,
      direction: 'inbound',
      body: `[hitl-test] ${label}`,
      message_sid: null,
    })
    .select('id, conversation_id')
    .single()

  if (inboundError) {
    throw inboundError
  }

  return insertPendingResponse({
    conversationId: disposableInbound.conversation_id,
    inboundMessageId: disposableInbound.id,
    draftText: `HITL test draft (${label})`,
    retrievedChunkIds: [],
    sensitivityTag: 'routine',
  })
}

async function countOutbound(conversationId: string): Promise<number> {
  const supabase = await createServiceClient()
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('direction', 'outbound')

  if (error) {
    throw error
  }

  return count ?? 0
}

async function assertLogAction(
  pendingResponseId: string,
  action: string
): Promise<void> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('interaction_log')
    .select('action')
    .eq('pending_response_id', pendingResponseId)
    .eq('action', action)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      `Expected interaction_log row with action=${action} for ${pendingResponseId}`
    )
  }
}

async function main() {
  const actor = 'hitl-test-script'

  // --- Reject: no outbound message, status rejected, log written ---
  const rejectPending = await createFreshPending('reject')
  const outboundBeforeReject = await countOutbound(
    rejectPending.conversation_id
  )
  const rejectResult = await rejectPendingResponse(rejectPending.id, actor)
  if (!rejectResult.ok) {
    throw new Error(`Reject failed: ${rejectResult.code} ${rejectResult.message}`)
  }
  if (rejectResult.pending.status !== 'rejected') {
    throw new Error(
      `Expected rejected, got ${rejectResult.pending.status}`
    )
  }
  const outboundAfterReject = await countOutbound(rejectPending.conversation_id)
  if (outboundAfterReject !== outboundBeforeReject) {
    throw new Error('Reject must not create an outbound message')
  }
  await assertLogAction(rejectPending.id, 'rejected')
  console.log('reject PASS')

  // --- Approve: sends WhatsApp, status approved, log written ---
  const approvePending = await createFreshPending('approve')
  const outboundBeforeApprove = await countOutbound(
    approvePending.conversation_id
  )
  const approveResult = await approvePendingResponse(approvePending.id, actor)
  if (!approveResult.ok) {
    throw new Error(
      `Approve failed: ${approveResult.code} ${approveResult.message}`
    )
  }
  if (approveResult.pending.status !== 'approved') {
    throw new Error(
      `Expected approved, got ${approveResult.pending.status}`
    )
  }
  const outboundAfterApprove = await countOutbound(
    approvePending.conversation_id
  )
  if (outboundAfterApprove !== outboundBeforeApprove + 1) {
    throw new Error('Approve must insert exactly one outbound message')
  }
  await assertLogAction(approvePending.id, 'approved')
  console.log('approve PASS (WhatsApp send succeeded)')

  // --- Double approve: second call returns INVALID_STATE_TRANSITION ---
  const second = await approvePendingResponse(approvePending.id, actor)
  if (second.ok || second.code !== 'INVALID_STATE_TRANSITION') {
    throw new Error(
      `Expected INVALID_STATE_TRANSITION on second approve, got ${JSON.stringify(second)}`
    )
  }
  const outboundAfterSecond = await countOutbound(approvePending.conversation_id)
  if (outboundAfterSecond !== outboundAfterApprove) {
    throw new Error('Second approve must not send another WhatsApp message')
  }
  console.log('double-approve 409 PASS')

  // --- generation_failed blocks approve ---
  const failedPending = await createFreshPending('generation-failed')
  const supabase = await createServiceClient()
  const { error: flagError } = await supabase
    .from('pending_responses')
    .update({ generation_failed: true })
    .eq('id', failedPending.id)
  if (flagError) {
    throw flagError
  }

  const blocked = await approvePendingResponse(failedPending.id, actor)
  if (blocked.ok || blocked.code !== 'GENERATION_FAILED_APPROVE_BLOCKED') {
    throw new Error(
      `Expected GENERATION_FAILED_APPROVE_BLOCKED, got ${JSON.stringify(blocked)}`
    )
  }
  console.log('generation_failed approve blocked PASS')

  // --- generation_failed edit with unchanged draft_text is blocked ---
  const editFailedPending = await createFreshPending('edit-placeholder')
  const { error: editFlagError } = await supabase
    .from('pending_responses')
    .update({ generation_failed: true })
    .eq('id', editFailedPending.id)
  if (editFlagError) {
    throw editFlagError
  }

  const outboundBeforeEditBlock = await countOutbound(
    editFailedPending.conversation_id
  )
  const editBlocked = await editAndSendPendingResponse(
    editFailedPending.id,
    actor,
    editFailedPending.draft_text
  )
  if (
    editBlocked.ok ||
    editBlocked.code !== 'GENERATION_FAILED_REQUIRES_EDIT'
  ) {
    throw new Error(
      `Expected GENERATION_FAILED_REQUIRES_EDIT, got ${JSON.stringify(editBlocked)}`
    )
  }
  const outboundAfterEditBlock = await countOutbound(
    editFailedPending.conversation_id
  )
  if (outboundAfterEditBlock !== outboundBeforeEditBlock) {
    throw new Error('Blocked edit must not send a WhatsApp message')
  }
  console.log('generation_failed edit-placeholder blocked PASS')

  // --- generation_failed edit with genuinely changed text succeeds ---
  const editedText = `${editFailedPending.draft_text} — manually revised`
  const editOk = await editAndSendPendingResponse(
    editFailedPending.id,
    actor,
    editedText
  )
  if (!editOk.ok) {
    throw new Error(
      `Edited send failed: ${editOk.code} ${editOk.message}`
    )
  }
  if (editOk.pending.status !== 'edited_and_sent') {
    throw new Error(
      `Expected edited_and_sent, got ${editOk.pending.status}`
    )
  }
  await assertLogAction(editFailedPending.id, 'edited_and_sent')
  console.log('generation_failed edit-with-change PASS')

  console.log('HITL flow checks PASS')
}

main().catch((error) => {
  console.error('HITL flow test failed:', error)
  process.exit(1)
})
