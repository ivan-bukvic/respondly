import type { NextRequest } from 'next/server'

// Resolves the public origin of this Next.js app for server-side internal
// fetches (e.g. generate-draft → POST /api/mcp).
//
// Same proxy-aware reconstruction as getTwilioWebhookUrl: behind a
// TLS-terminating edge, request.url can report http:// or an internal
// host. Prefer X-Forwarded-* when present so Vercel preview and production
// both resolve correctly. No hardcoded URL.
export function getInternalBaseUrl(request?: NextRequest): string {
  if (request) {
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

    return `${protocol}://${host}`
  }

  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, '')
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  }

  return 'http://localhost:3000'
}
