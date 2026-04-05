import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — env vars might not exist at build/import time
let _client: SupabaseClient | null = null

// Server-side client with service role (bypasses RLS)
// Use this in API routes only — never expose to client
export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase env vars not configured')
    _client = createClient(url, key)
  }
  return _client
}

// Helper: get or create a "ghost" user by email
// Uses upsert to avoid race conditions when two requests create the same user
export async function getOrCreateUser(email: string, name?: string) {
  const supabase = getSupabase()
  const normalizedEmail = email.toLowerCase().trim()

  // Try upsert first
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { email: normalizedEmail, name: name || normalizedEmail.split('@')[0] },
      { onConflict: 'email', ignoreDuplicates: true }
    )
    .select()
    .single()

  if (data) return data

  // If upsert returned nothing (ignoreDuplicates) or errored, fetch existing
  if (!data || error) {
    const { data: existing } = await supabase
      .from('users')
      .select('id, email, name, avatar_url')
      .eq('email', normalizedEmail)
      .single()
    if (existing) return existing
    if (error) throw error
  }

  return data!
}

// Helper: upsert user on Google sign-in (merges ghost → real user)
export async function upsertGoogleUser(profile: {
  email: string
  name: string
  image?: string
  googleId: string
  accessToken?: string
  refreshToken?: string
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        email: profile.email.toLowerCase().trim(),
        name: profile.name,
        avatar_url: profile.image,
        google_id: profile.googleId,
        google_access_token: profile.accessToken,
        google_refresh_token: profile.refreshToken,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}
