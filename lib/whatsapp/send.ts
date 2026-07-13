import twilio from 'twilio'
import { toWhatsAppAddress } from '@/lib/whatsapp/format'

// Module-scope client is fine here: env vars are fixed at process start on
// Vercel/Node, and this module is server-only — no per-request secrets to rotate.
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

// Sends a WhatsApp message via the Twilio Messages API.
// Called only from admin HITL actions (approve / edit) — never from the
// inbound webhook. Foundation for Phase 3; not wired up in Phase 1.
export async function sendWhatsAppMessage({
  to,
  body,
}: {
  to: string
  body: string
}) {
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER!,
    to: toWhatsAppAddress(to),
    body,
  })
}
