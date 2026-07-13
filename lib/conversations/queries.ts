import { createServiceClient } from '@/lib/supabase/server'

export type Conversation = {
  id: string
  whatsapp_number: string
  display_name: string | null
  created_at: string
}

export type Message = {
  id: string
  conversation_id: string
  direction: 'inbound' | 'outbound'
  body: string
  message_sid: string | null
  created_at: string
}

// Finds an existing conversation by E.164 whatsapp_number, or creates one.
// display_name comes from Twilio's ProfileName when available.
// Note: a concurrent race (two first-time inbound for the same new number)
// can still hit unique(whatsapp_number); demo traffic never does — if it
// ever does, catch 23505 and re-select. Left as-is for Phase 1 scope.
export async function findOrCreateConversation(
  whatsappNumber: string,
  displayName?: string | null
): Promise<Conversation> {
  const supabase = await createServiceClient()

  const { data: existing, error: selectError } = await supabase
    .from('conversations')
    .select('*')
    .eq('whatsapp_number', whatsappNumber)
    .maybeSingle()

  if (selectError) {
    throw selectError
  }

  if (existing) {
    return existing as Conversation
  }

  const { data: created, error: insertError } = await supabase
    .from('conversations')
    .insert({
      whatsapp_number: whatsappNumber,
      display_name: displayName ?? null,
    })
    .select('*')
    .single()

  if (insertError) {
    throw insertError
  }

  return created as Conversation
}

// Looks up an inbound message by Twilio MessageSid (idempotency check).
export async function findMessageBySid(
  messageSid: string
): Promise<Message | null> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('message_sid', messageSid)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as Message | null) ?? null
}

// Inserts an inbound message row for the given conversation.
// message_sid enables Twilio retry idempotency (unique when not null).
export async function insertInboundMessage(
  conversationId: string,
  body: string,
  messageSid: string
): Promise<Message> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      direction: 'inbound',
      body,
      message_sid: messageSid,
    })
    .select('*')
    .single()

  if (error) {
    // Unique violation on message_sid — Twilio retried a known message.
    // Return the existing row instead of failing (idempotent no-op).
    if (error.code === '23505') {
      const existing = await findMessageBySid(messageSid)
      if (existing) {
        return existing
      }
    }
    throw error
  }

  return data as Message
}
