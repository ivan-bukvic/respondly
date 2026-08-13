import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/server'

// Next.js 16 renamed middleware → proxy; runtime is nodejs only.
// Supabase session protects /admin; public routes are intentionally open.
export async function proxy(request: NextRequest) {
  const client = createMiddlewareClient(request)

  const {
    data: { user },
  } = await client.supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    const redirectResponse = NextResponse.redirect(loginUrl)
    client.response.cookies
      .getAll()
      .forEach((cookie) => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  // read response AFTER getUser so refreshed cookies from setAll are included
  return client.response
}

export const config = {
  matcher: ['/admin/:path*'],
}
