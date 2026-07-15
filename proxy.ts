import { NextResponse, type NextRequest } from 'next/server'
import { timingSafeEqual } from '@/lib/auth/timing-safe-equal'
import { createMiddlewareClient } from '@/lib/supabase/server'

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Lumin Aesthetic Clinic"',
    },
  })
}

// Curtain for the public demo URL. Supabase Auth remains the real
// protection for /admin — this is an extra gate (SECURITY.md §7 item 10).
function requireBasicAuth(request: NextRequest): NextResponse | null {
  const expectedUser = process.env.BASIC_AUTH_USER
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD

  if (!expectedUser || !expectedPassword) {
    console.error('BASIC_AUTH_USER or BASIC_AUTH_PASSWORD is not configured')
    return unauthorized()
  }

  const header = request.headers.get('authorization')
  if (!header?.startsWith('Basic ')) {
    return unauthorized()
  }

  let decoded: string
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
  } catch {
    return unauthorized()
  }

  const colonIndex = decoded.indexOf(':')
  if (colonIndex === -1) {
    return unauthorized()
  }

  const providedUser = decoded.slice(0, colonIndex)
  const providedPassword = decoded.slice(colonIndex + 1)

  // Always evaluate both compares (avoid early-exit timing leak).
  const userOk = timingSafeEqual(providedUser, expectedUser)
  const passwordOk = timingSafeEqual(providedPassword, expectedPassword)
  if (!userOk || !passwordOk) {
    return unauthorized()
  }

  return null
}

// Next.js 16 renamed middleware → proxy; runtime is nodejs only.
// Basic-auth gates the whole public URL; Supabase session still protects /admin.
export async function proxy(request: NextRequest) {
  const basicAuthFailure = requireBasicAuth(request)
  if (basicAuthFailure) {
    return basicAuthFailure
  }

  const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
  if (!isAdminPath) {
    return NextResponse.next()
  }

  const client = createMiddlewareClient(request)

  const {
    data: { user },
  } = await client.supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    const redirectResponse = NextResponse.redirect(loginUrl)
    client.response.cookies.getAll().forEach((cookie) =>
      redirectResponse.cookies.set(cookie)
    )
    return redirectResponse
  }

  // read response AFTER getUser so refreshed cookies from setAll are included
  return client.response
}

export const config = {
  matcher: [
    // Basic-auth for everything except Twilio webhook, MCP, and Next assets.
    '/((?!api/webhook/whatsapp|api/mcp|_next/static|_next/image|favicon.ico|icon).*)',
  ],
}
