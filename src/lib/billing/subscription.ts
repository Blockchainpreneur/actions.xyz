import type { SupabaseClient } from '@supabase/supabase-js'
import { FREE_MEETING_LIMIT, type PlanId } from './config'

export interface SubscriptionRow {
  id: string
  user_id: string
  plan: PlanId
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

// past_due keeps access during Stripe's dunning grace window
const ACTIVE_STATUSES = ['active', 'trialing', 'past_due']

// 24h grace past period end — absorbs webhook delivery lag on renewals
const PERIOD_END_GRACE_MS = 24 * 60 * 60 * 1000

export function isSubscriptionActive(row: Pick<SubscriptionRow, 'status' | 'current_period_end'>, now = Date.now()): boolean {
  if (!ACTIVE_STATUSES.includes(row.status)) return false
  if (!row.current_period_end) return true
  return new Date(row.current_period_end).getTime() + PERIOD_END_GRACE_MS > now
}

export async function getActiveSubscription(supabase: SupabaseClient, userId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    // Table missing / DB unreachable — treat as "no subscription", never crash the caller
    console.warn('[billing] subscription lookup failed:', error.message)
    return null
  }
  if (!data) return null
  const row = data as SubscriptionRow
  return isSubscriptionActive(row) ? row : null
}

// First instant of the current calendar month, UTC
export function monthStartUtcIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

export async function countMeetingsThisMonth(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ count: number; error: { message: string } | null }> {
  const { count, error } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .gte('created_at', monthStartUtcIso())

  return { count: count ?? 0, error }
}

export interface MeetingAllowance {
  allowed: boolean
  used: number
  limit: number
}

// Server-side freemium gate. Fails OPEN on infra errors — a billing outage
// must never block meeting creation.
export async function checkMeetingAllowance(supabase: SupabaseClient, userId: string): Promise<MeetingAllowance> {
  const subscription = await getActiveSubscription(supabase, userId)
  if (subscription) return { allowed: true, used: 0, limit: FREE_MEETING_LIMIT }

  const { count, error } = await countMeetingsThisMonth(supabase, userId)
  if (error) {
    console.warn('[billing] usage count failed — failing open:', error.message)
    return { allowed: true, used: 0, limit: FREE_MEETING_LIMIT }
  }

  return { allowed: count < FREE_MEETING_LIMIT, used: count, limit: FREE_MEETING_LIMIT }
}
