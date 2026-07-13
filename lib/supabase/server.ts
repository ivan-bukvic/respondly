import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

// Server-side Supabase client using the service_role key.
// Used in webhook, MCP, and admin action routes — operates outside
// a logged-in user's session. NEVER import this in client components.
export async function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // no-op: service_role client doesn't manage user sessions
        },
      },
    }
  )
}

// Server-side Supabase client using the anon key, bound to the current
// user's session cookies. Used for checking the admin's logged-in session
// (e.g. in server components / route handlers reading auth state).
export async function createSessionClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // called from a Server Component — safe to ignore if proxy
            // is refreshing sessions
          }
        },
      },
    }
  )
}

// Supabase client for Next.js proxy (formerly middleware). Uses the
// request/response cookie API so refreshed session tokens are written
// back to both the request (for downstream Server Components) and the
// browser response. Returns { supabase, response } — always return
// `response` from the proxy so cookie updates are preserved.
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return {
    supabase,
    // getter so callers always see the latest response after setAll
    // refreshes cookies during auth.getUser()
    get response() {
      return response
    },
  }
}
