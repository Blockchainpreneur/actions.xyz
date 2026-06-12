import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getStripe } from '@/lib/billing/stripe'
import { createSupabaseBillingDb, handleStripeEvent } from '@/lib/billing/webhook-handler'

// POST /api/billing/webhook — Stripe webhook receiver
// Handles: checkout.session.completed, customer.subscription.updated/deleted
export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      { error: 'Billing is not configured (missing STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET)', code: 'billing_unavailable' },
      { status: 503 },
    )
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })

  const payload = await req.text()

  let event
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    console.warn('[billing] webhook signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const result = await handleStripeEvent(event, createSupabaseBillingDb(getSupabase()))
    return NextResponse.json({ received: true, handled: result.handled })
  } catch (err) {
    // 500 → Stripe retries delivery
    console.error('[billing] webhook handling failed', err)
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 })
  }
}
