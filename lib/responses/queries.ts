import { createServiceClient } from '@/lib/supabase/server'
import type { SensitivityTag } from '@/lib/rag/sensitivity'

export type PendingResponse = {
  id: string
  conversation_id: string
  inbound_message_id: string
  draft_text: string
  retrieved_chunk_ids: string[]
  sensitivity_tag: SensitivityTag
  // True when draft_text is the static fallback message, not a real AI draft —
  // admin UI must not treat this as a one-click-sendable response.
  generation_failed: boolean
  status: 'pending' | 'approved' | 'edited_and_sent' | 'rejected'
  created_at: string
}

export async function findPendingResponseByInboundMessageId(
  inboundMessageId: string
): Promise<PendingResponse | null> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('pending_responses')
    .select('*')
    .eq('inbound_message_id', inboundMessageId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as PendingResponse | null) ?? null
}

export async function insertPendingResponse({
  conversationId,
  inboundMessageId,
  draftText,
  retrievedChunkIds,
  sensitivityTag,
  generationFailed = false,
}: {
  conversationId: string
  inboundMessageId: string
  draftText: string
  retrievedChunkIds: string[]
  sensitivityTag: SensitivityTag
  generationFailed?: boolean
}): Promise<PendingResponse> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('pending_responses')
    .insert({
      conversation_id: conversationId,
      inbound_message_id: inboundMessageId,
      draft_text: draftText,
      retrieved_chunk_ids: retrievedChunkIds,
      sensitivity_tag: sensitivityTag,
      generation_failed: generationFailed,
      status: 'pending',
    })
    .select('*')
    .single()

  if (error) {
    // Unique violation on inbound_message_id — concurrent duplicate delivery.
    // Return the existing row instead of failing (idempotent no-op).
    if (error.code === '23505') {
      const existing =
        await findPendingResponseByInboundMessageId(inboundMessageId)
      if (existing) {
        return existing
      }
    }
    throw error
  }

  return data as PendingResponse
}
