import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
// (e.g. in middleware or server components reading auth state).
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
            // called from a Server Component — safe to ignore if middleware
            // is refreshing sessions
          }
        },
      },
    }
  )
}