import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client, using the public anon key.
// Used only for admin login/session on the client (e.g. /login page
// form submission). Never use this for direct reads/writes to
// sensitive tables — see SECURITY.md §3.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}