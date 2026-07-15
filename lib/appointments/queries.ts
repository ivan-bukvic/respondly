import { createServiceClient } from '@/lib/supabase/server'

export type Appointment = {
  id: string
  conversation_id: string
  requested_time: string
  treatment: string | null
  status: 'booked' | 'cancelled'
  created_at: string
}

export async function findAppointmentByConversationAndTime(
  conversationId: string,
  requestedTime: string
): Promise<Appointment | null> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('requested_time', requestedTime)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as Appointment | null) ?? null
}

export async function insertAppointment({
  conversationId,
  requestedTime,
  treatment,
}: {
  conversationId: string
  requestedTime: string
  treatment?: string | null
}): Promise<Appointment> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      conversation_id: conversationId,
      requested_time: requestedTime,
      treatment: treatment ?? null,
      status: 'booked',
    })
    .select('*')
    .single()

  if (error) {
    // Unique violation on (conversation_id, requested_time) — Claude retried
    // a book_appointment tool call. Return the existing row (idempotent no-op).
    if (error.code === '23505') {
      const existing = await findAppointmentByConversationAndTime(
        conversationId,
        requestedTime
      )
      if (existing) {
        return existing
      }
    }
    throw error
  }

  return data as Appointment
}

export async function getAppointmentById(
  id: string
): Promise<Appointment | null> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as Appointment | null) ?? null
}
