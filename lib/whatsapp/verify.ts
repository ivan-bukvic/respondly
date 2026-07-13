import type { NextRequest } from 'next/server'
import twilio from 'twilio'

// Reconstructs the public webhook URL Twilio signed against.
// Behind a TLS-terminating proxy (Docker/self-hosted, some Vercel edge
// setups), request.url can report http:// or an internal host — that
// mismatch produces false 401s from validateRequest. Prefer
// X-Forwarded-Proto / X-Forwarded-Host when present.
export function getTwilioWebhookUrl(request: NextRequest): string {
  const forwardedProto = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
  const forwardedHost = request.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim()

  const protocol =
    forwardedProto || request.nextUrl.protocol.replace(':', '')
  const host =
    forwardedHost ||
    request.headers.get('host') ||
    request.nextUrl.host

  return `${protocol}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`
}

// Validates that an inbound webhook request originated from Twilio.
// Must run BEFORE any payload processing — see SECURITY.md §5.
// Uses Auth Token + full webhook URL + POST params (Twilio's signing scheme).
export function verifyTwilioSignature(
  url: string,
  signature: string | null,
  params: Record<string, string>
): boolean {
  if (!signature) {
    return false
  }

  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  )
}
