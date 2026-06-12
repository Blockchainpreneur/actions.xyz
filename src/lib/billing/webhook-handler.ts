import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isPlanId, planFromPriceId, type PlanId } from './config'

// Pure, injectable persistence boundary so the webhook logic is unit-testable
// without a live Supabase project.
export interface SubscriptionUpsert {
  user_id: string
  plan: PlanId
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
}

export interface SubscriptionPatch {
  plan?: PlanId
  status?: string
  stripe_customer_id?: string | null
  current_period_end?: string | null
}

export interface BillingDb {
  upsertByUserId(row: SubscriptionUpsert): Promise<{ error: { message: string } | null }>
  updateByStripeSubscriptionId(subscriptionId: string, patch: SubscriptionPatch): Promise<{ error: { message: string } | null }>
}

export function createSupabaseBillingDb(supabase: SupabaseClient): BillingDb {
  return {
    async upsertByUserId(row) {
      const { error } = await supabase
        .from('subscriptions')
        .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      return { error }
    },
    async updateByStripeSubscriptionId(subscriptionId, patch) {
      const { error } = await supabase
        .from('subscriptions')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscriptionId)
      return { error }
    },
  }
}

function asId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

// current_period_end lives on the subscription in older API versions and on
// subscription items in 2025+ versions — read both defensively.
function periodEndIso(sub: Stripe.Subscription): string | null {
  const s = sub as unknown as {
    current_period_end?: number
    items?: { data?: Array<{ current_period_end?: number }> }
  }
  const ts = s.current_period_end ?? s.items?.data?.[0]?.current_period_end
  return typeof ts === 'number' ? new Date(ts * 1000).toISOString() : null
}

function planFromSubscription(sub: Stripe.Subscription): PlanId | null {
  for (const item of sub.items?.data ?? []) {
    const mapped = planFromPriceId(item.price?.id)
    if (mapped) return mapped.plan
  }
  return isPlanId(sub.metadata?.plan) ? sub.metadata.plan : null
}

export interface HandleResult {
  handled: boolean
  message?: string
}

// Processes a verified Stripe event. Throws on persistence errors so the
// webhook route can return 500 and Stripe retries delivery.
export async function handleStripeEvent(event: Stripe.Event, db: BillingDb): Promise<HandleResult> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const cs = event.data.object as Stripe.Checkout.Session
      if (cs.mode !== 'subscription') return { handled: false, message: 'not a subscription checkout' }

      const userId = cs.client_reference_id ?? cs.metadata?.user_id
      if (!userId) return { handled: false, message: 'missing user reference' }

      const plan = isPlanId(cs.metadata?.plan) ? cs.metadata.plan : 'starter'
      const { error } = await db.upsertByUserId({
        user_id: userId,
        plan,
        status: 'active',
        stripe_customer_id: asId(cs.customer),
        stripe_subscription_id: asId(cs.subscription),
        // Filled in by the subsequent customer.subscription.updated event
        current_period_end: null,
      })
      if (error) throw new Error(`subscriptions upsert failed: ${error.message}`)
      return { handled: true }
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const plan = planFromSubscription(sub)

      // Prefer upsert by user_id (set via subscription_data.metadata at checkout) —
      // robust against event-ordering races where updated arrives before completed.
      const userId = sub.metadata?.user_id
      if (userId) {
        const { error } = await db.upsertByUserId({
          user_id: userId,
          plan: plan ?? 'starter',
          status: sub.status,
          stripe_customer_id: asId(sub.customer),
          stripe_subscription_id: sub.id,
          current_period_end: periodEndIso(sub),
        })
        if (error) throw new Error(`subscriptions upsert failed: ${error.message}`)
        return { handled: true }
      }

      const { error } = await db.updateByStripeSubscriptionId(sub.id, {
        status: sub.status,
        current_period_end: periodEndIso(sub),
        stripe_customer_id: asId(sub.customer),
        ...(plan ? { plan } : {}),
      })
      if (error) throw new Error(`subscriptions update failed: ${error.message}`)
      return { handled: true }
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const { error } = await db.updateByStripeSubscriptionId(sub.id, {
        status: 'canceled',
        current_period_end: periodEndIso(sub),
      })
      if (error) throw new Error(`subscriptions update failed: ${error.message}`)
      return { handled: true }
    }

    default:
      return { handled: false, message: `ignored event type ${event.type}` }
  }
}
