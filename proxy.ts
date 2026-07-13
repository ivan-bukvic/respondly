import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/server'

// Next.js 16 renamed middleware → proxy; same role: protect /admin and
// refresh the Supabase auth session cookies before the page renders.
export async function proxy(request: NextRequest) {
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
  matcher: ['/admin/:path*'],
}
