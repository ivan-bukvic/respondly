import { insertInboundMessage } from '../lib/conversations/queries'
import { generateDraftResponse } from '../lib/rag/generate-draft'
import {
  findPendingResponseByInboundMessageId,
  insertPendingResponse,
} from '../lib/responses/queries'
import { createServiceClient } from '../lib/supabase/server'
import { getInternalBaseUrl } from '../lib/http/internal-url'

// Smoke-test MCP booking tool call (Phase 4 checklist items 8–9).
// Mirrors the webhook flow: generate draft (with tool call) -> persist a
// pending_responses row -> independently re-read both appointments and
// pending_responses from the DB (no reliance on in-memory return values).
// Requires:
//   1. appointments migration applied
//   2. MCP_SHARED_SECRET + APP_BASE_URL set in .env.local
//   3. `npm run dev` running (real HTTP round-trip to /api/mcp)
// Usage: npx tsx --env-file=.env.local scripts/smoke-booking.ts

async function createFreshConversationId(): Promise<string> {
  const supabase = await createServiceClient()
  // Unique whatsapp_number each run so unique(conversation_id, requested_time)
  // + idempotent no-op never defeat the after > before appointments assertion.
  const whatsappNumber = `+1${Date.now()}`

  const { data: created, error: insertError } = await supabase
    .from('conversations')
    .insert({
      whatsapp_number: whatsappNumber,
      display_name: 'smoke-booking',
    })
    .select('id')
    .single()

  if (insertError) {
    throw insertError
  }

  return created.id as string
}

async function countAppointments(conversationId: string): Promise<number> {
  const supabase = await createServiceClient()
  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)

  if (error) {
    throw error
  }

  return count ?? 0
}

async function main() {
  if (!process.env.MCP_SHARED_SECRET) {
    throw new Error('MCP_SHARED_SECRET is required for smoke:booking')
  }

  const conversationId = await createFreshConversationId()
  const baseUrl = getInternalBaseUrl()
  const before = await countAppointments(conversationId)

  console.log(`conversation_id: ${conversationId}`)
  console.log(`baseUrl: ${baseUrl}`)
  console.log(`appointments before: ${before}`)

  const inboundBody =
    'Želim da zakažem termin za Botox u petak u 14:00.'

  // Persist a disposable inbound message so the pending_responses FK +
  // unique(inbound_message_id) constraint behave exactly like the webhook.
  const messageSid = `smoke-booking-${Date.now()}`
  const inboundMessage = await insertInboundMessage(
    conversationId,
    inboundBody,
    messageSid
  )

  const result = await generateDraftResponse({
    inboundBody,
    conversationId,
    baseUrl,
  })

  console.log(`draft: ${result.draftText}`)
  console.log(`tag: ${result.sensitivityTag}`)

  // Replicate the webhook's HITL persistence step (generateDraftResponse
  // itself never writes to pending_responses).
  await insertPendingResponse({
    conversationId,
    inboundMessageId: inboundMessage.id,
    draftText: result.draftText,
    retrievedChunkIds: result.retrievedChunkIds,
    sensitivityTag: result.sensitivityTag,
  })

  const after = await countAppointments(conversationId)
  console.log(`appointments after: ${after}`)

  if (after <= before) {
    throw new Error(
      'Expected a new appointments row after booking-intent draft generation'
    )
  }

  // Independent DB read-back (fresh query, not the in-memory return value)
  // to prove the pending draft actually landed in the HITL queue.
  const persisted = await findPendingResponseByInboundMessageId(
    inboundMessage.id
  )

  if (!persisted) {
    throw new Error(
      'No pending_responses row found in DB for the booking draft — HITL persistence failed'
    )
  }

  console.log(
    `pending_responses row: id=${persisted.id} status=${persisted.status} generation_failed=${persisted.generation_failed}`
  )

  if (persisted.status !== 'pending') {
    throw new Error(
      `Expected pending_responses.status='pending', got '${persisted.status}'`
    )
  }

  if (persisted.generation_failed) {
    throw new Error(
      'pending_responses.generation_failed is true — draft is the fallback, not a real booking confirmation'
    )
  }

  if (!persisted.draft_text.trim()) {
    throw new Error('Persisted draft_text is empty')
  }

  console.log(
    'PASS — appointment row + pending_responses row both verified in DB; draft is queued for HITL (not auto-sent).'
  )
}

main().catch((error) => {
  console.error('Booking smoke test failed:', error)
  process.exit(1)
})
