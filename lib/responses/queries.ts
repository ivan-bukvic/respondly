import { createServiceClient } from '@/lib/supabase/server'
import type { SensitivityTag } from '@/lib/rag/sensitivity'

export type PendingResponse = {
  id: string
  conversation_id: string
  inbound_message_id: string
  draft_text: string
  final_text: string | null
  retrieved_chunk_ids: string[]
  sensitivity_tag: SensitivityTag
  // True when draft_text is the static fallback message, not a real AI draft —
  // admin UI must not treat this as a one-click-sendable response.
  generation_failed: boolean
  status: 'pending' | 'approved' | 'edited_and_sent' | 'rejected'
  created_at: string
  resolved_at: string | null
}

export type PendingResponseWithContext = PendingResponse & {
  whatsapp_number: string
  display_name: string | null
  inbound_body: string
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

export async function getPendingResponseById(
  id: string
): Promise<PendingResponse | null> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('pending_responses')
    .select('*')
    .eq('id', id)
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

// Atomic claim: only succeeds when the row is still status='pending'.
// Returns null if another transition already claimed the row (0 rows updated).
export async function updatePendingResponseResolved(
  id: string,
  {
    status,
    finalText,
    resolvedAt,
  }: {
    status: 'approved' | 'edited_and_sent' | 'rejected'
    finalText?: string | null
    resolvedAt: string
  }
): Promise<PendingResponse | null> {
  const supabase = await createServiceClient()

  const patch: {
    status: 'approved' | 'edited_and_sent' | 'rejected'
    resolved_at: string
    final_text?: string | null
  } = {
    status,
    resolved_at: resolvedAt,
  }

  if (finalText !== undefined) {
    patch.final_text = finalText
  }

  const { data, error } = await supabase
    .from('pending_responses')
    .update(patch)
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as PendingResponse | null) ?? null
}

export async function listPendingResponsesWithContext(): Promise<
  PendingResponseWithContext[]
> {
  const supabase = await createServiceClient()

  const { data: pendingRows, error: pendingError } = await supabase
    .from('pending_responses')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (pendingError) {
    throw pendingError
  }

  const pending = (pendingRows ?? []) as PendingResponse[]
  if (pending.length === 0) {
    return []
  }

  const conversationIds = [...new Set(pending.map((row) => row.conversation_id))]
  const inboundIds = [...new Set(pending.map((row) => row.inbound_message_id))]

  const [{ data: conversations, error: conversationsError }, { data: messages, error: messagesError }] =
    await Promise.all([
      supabase.from('conversations').select('*').in('id', conversationIds),
      supabase.from('messages').select('*').in('id', inboundIds),
    ])

  if (conversationsError) {
    throw conversationsError
  }
  if (messagesError) {
    throw messagesError
  }

  const conversationById = new Map(
    (conversations ?? []).map((row) => [row.id as string, row])
  )
  const messageById = new Map(
    (messages ?? []).map((row) => [row.id as string, row])
  )

  return pending.map((row) => {
    const conversation = conversationById.get(row.conversation_id)
    const inbound = messageById.get(row.inbound_message_id)

    return {
      ...row,
      whatsapp_number: (conversation?.whatsapp_number as string) ?? 'unknown',
      display_name: (conversation?.display_name as string | null) ?? null,
      inbound_body: (inbound?.body as string) ?? '',
    }
  })
}
