// Shared helpers for Twilio WhatsApp address format.
// Twilio sends/expects "whatsapp:+381...", while we store plain E.164
// in conversations.whatsapp_number.

export function stripWhatsAppPrefix(address: string): string {
  return address.replace(/^whatsapp:/i, '')
}

export function toWhatsAppAddress(e164: string): string {
  if (e164.toLowerCase().startsWith('whatsapp:')) {
    return e164
  }
  return `whatsapp:${e164}`
}
