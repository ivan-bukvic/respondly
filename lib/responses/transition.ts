import {
  getConversationById,
  insertOutboundMessage,
} from '@/lib/conversations/queries'
import {
  getPendingResponseById,
  updatePendingResponseResolved,
  type PendingResponse,
} from '@/lib/responses/queries'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/send'

export type LogAction = 'approved' | 'edited_and_sent' | 'rejected'

export type InteractionLogRow = {
  id: string
  pending_response_id: string
  action: LogAction
  actor: string
  created_at: string
}

export type InteractionLogWithContext = InteractionLogRow & {
  whatsapp_number: string
  display_name: string | null
  message_preview: string
}

export type TransitionErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_STATE_TRANSITION'
  | 'GENERATION_FAILED_APPROVE_BLOCKED'
  | 'GENERATION_FAILED_REQUIRES_EDIT'
  | 'WHATSAPP_SEND_FAILED'
  | 'RESOLVE_AFTER_SEND_FAILED'

export type TransitionResult =
  | { ok: true; pending: PendingResponse }
  | { ok: false; code: TransitionErrorCode; message: string }

async function insertInteractionLog({
  pendingResponseId,
  action,
  actor,
}: {
  pendingResponseId: string
  action: LogAction
  actor: string
}): Promise<InteractionLogRow> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('interaction_log')
    .insert({
      pending_response_id: pendingResponseId,
      action,
      actor,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as InteractionLogRow
}

async function assertPending(
  id: string
): Promise<
  | { ok: true; pending: PendingResponse }
  | { ok: false; code: TransitionErrorCode; message: string }
> {
  const pending = await getPendingResponseById(id)

  if (!pending) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'Pending response not found',
    }
  }

  if (pending.status !== 'pending') {
    return {
      ok: false,
      code: 'INVALID_STATE_TRANSITION',
      message: `Cannot transition from status '${pending.status}' — expected 'pending'`,
    }
  }

  return { ok: true, pending }
}

async function sendAndPersist({
  pending,
  actor,
  body,
  status,
  finalText,
}: {
  pending: PendingResponse
  actor: string
  body: string
  status: 'approved' | 'edited_and_sent'
  finalText?: string
}): Promise<TransitionResult> {
  const conversation = await getConversationById(pending.conversation_id)
  if (!conversation) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'Conversation for pending response not found',
    }
  }

  try {
    await sendWhatsAppMessage({
      to: conversation.whatsapp_number,
      body,
    })
  } catch (error) {
    console.error('WhatsApp send failed:', error)
    return {
      ok: false,
      code: 'WHATSAPP_SEND_FAILED',
      message: 'Failed to send WhatsApp message — status left as pending',
    }
  }

  // Atomic claim immediately after successful send — before outbound/log writes.
  // If 0 rows update, a concurrent transition already claimed this row.
  const resolvedAt = new Date().toISOString()
  const updated = await updatePendingResponseResolved(pending.id, {
    status,
    finalText: finalText ?? null,
    resolvedAt,
  })

  if (!updated) {
    console.error(
      '[CRITICAL] WhatsApp message was sent but pending_responses claim failed — needs manual review',
      { pending_response_id: pending.id, intended_status: status }
    )
    return {
      ok: false,
      code: 'RESOLVE_AFTER_SEND_FAILED',
      message:
        'Message was sent but could not be recorded — needs manual review',
    }
  }

  await insertOutboundMessage(pending.conversation_id, body)

  await insertInteractionLog({
    pendingResponseId: pending.id,
    action: status,
    actor,
  })

  return { ok: true, pending: updated }
}

export async function approvePendingResponse(
  id: string,
  actor: string
): Promise<TransitionResult> {
  const checked = await assertPending(id)
  if (!checked.ok) {
    return checked
  }

  // Defense-in-depth: UI disables Approve when generation_failed, but a direct
  // API call must not send the static fallback placeholder to the patient.
  if (checked.pending.generation_failed) {
    return {
      ok: false,
      code: 'GENERATION_FAILED_APPROVE_BLOCKED',
      message:
        'Draft generation failed — edit the response manually or reject it',
    }
  }

  return sendAndPersist({
    pending: checked.pending,
    actor,
    body: checked.pending.draft_text,
    status: 'approved',
  })
}

export async function editAndSendPendingResponse(
  id: string,
  actor: string,
  finalText: string
): Promise<TransitionResult> {
  const checked = await assertPending(id)
  if (!checked.ok) {
    return checked
  }

  // Generation-failed drafts use a static placeholder — refuse to send it
  // verbatim via Edit; admin must change the text before Save & send.
  if (
    checked.pending.generation_failed &&
    finalText.trim() === checked.pending.draft_text.trim()
  ) {
    return {
      ok: false,
      code: 'GENERATION_FAILED_REQUIRES_EDIT',
      message: 'Draft generation failed — edit the text before sending',
    }
  }

  return sendAndPersist({
    pending: checked.pending,
    actor,
    body: finalText,
    status: 'edited_and_sent',
    finalText,
  })
}

export async function rejectPendingResponse(
  id: string,
  actor: string
): Promise<TransitionResult> {
  const checked = await assertPending(id)
  if (!checked.ok) {
    return checked
  }

  const resolvedAt = new Date().toISOString()
  const updated = await updatePendingResponseResolved(checked.pending.id, {
    status: 'rejected',
    resolvedAt,
  })

  // Parallel approve/edit won the atomic claim race.
  if (!updated) {
    return {
      ok: false,
      code: 'INVALID_STATE_TRANSITION',
      message:
        "Cannot transition from status — row is no longer 'pending'",
    }
  }

  await insertInteractionLog({
    pendingResponseId: checked.pending.id,
    action: 'rejected',
    actor,
  })

  return { ok: true, pending: updated }
}

export async function listInteractionLogWithContext(
  limit = 50
): Promise<InteractionLogWithContext[]> {
  const supabase = await createServiceClient()

  const { data: logRows, error: logError } = await supabase
    .from('interaction_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (logError) {
    throw logError
  }

  const logs = (logRows ?? []) as InteractionLogRow[]
  if (logs.length === 0) {
    return []
  }

  const pendingIds = [
    ...new Set(logs.map((row) => row.pending_response_id)),
  ]

  const { data: pendingRows, error: pendingError } = await supabase
    .from('pending_responses')
    .select('id, conversation_id, draft_text, final_text')
    .in('id', pendingIds)

  if (pendingError) {
    throw pendingError
  }

  const pendingById = new Map(
    (pendingRows ?? []).map((row) => [row.id as string, row])
  )

  const conversationIds = [
    ...new Set(
      (pendingRows ?? [])
        .map((row) => row.conversation_id as string)
        .filter(Boolean)
    ),
  ]

  const { data: conversations, error: conversationsError } =
    conversationIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('conversations')
          .select('id, whatsapp_number, display_name')
          .in('id', conversationIds)

  if (conversationsError) {
    throw conversationsError
  }

  const conversationById = new Map(
    (conversations ?? []).map((row) => [row.id as string, row])
  )

  return logs.map((row) => {
    const pending = pendingById.get(row.pending_response_id)
    const conversation = pending
      ? conversationById.get(pending.conversation_id as string)
      : undefined
    const previewSource =
      (pending?.final_text as string | null) ||
      (pending?.draft_text as string | null) ||
      ''

    return {
      ...row,
      whatsapp_number: (conversation?.whatsapp_number as string) ?? 'unknown',
      display_name: (conversation?.display_name as string | null) ?? null,
      message_preview: previewSource.slice(0, 120),
    }
  })
}
