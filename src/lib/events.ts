import { getSupabase } from '@/lib/supabase'

// Minimal product analytics: one row per event in public.events.
// Fail-open by design — analytics must NEVER break a user-facing flow,
// including when the Supabase project is paused/unreachable or the events
// table has not been migrated yet.

export type EventType =
  | 'assigned_email_sent'
  | 'task_page_view'
  | 'task_done_no_login'
  | 'signup_from_task'

export interface TrackParams {
  email?: string
  taskId?: string
  token?: string
  metadata?: Record<string, unknown>
}

export async function trackEvent(type: EventType, params: TrackParams = {}): Promise<void> {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('events').insert({
      type,
      email: params.email?.toLowerCase().trim() || null,
      task_id: params.taskId || null,
      token: params.token ? params.token.slice(0, 64) : null, // prefix only — enough to join, never the full secret
      metadata: params.metadata ?? {},
    })
    if (error) console.warn(`[events] insert failed (${type}):`, error.message)
  } catch (err) {
    console.warn(`[events] tracking skipped (${type}):`, (err as Error).message)
  }
}
