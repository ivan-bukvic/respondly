import { createSessionClient } from '@/lib/supabase/server'

// Checks whether the current request has a valid admin session.
// Used in middleware (protecting /admin) and in every /api/responses/*
// route (protecting admin actions). Throws-free: returns the user or null,
// caller decides how to respond (redirect vs 401).
export async function requireAdmin() {
  const supabase = await createSessionClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}