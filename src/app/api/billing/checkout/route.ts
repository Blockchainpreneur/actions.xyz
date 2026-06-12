import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getSupabase } from '@/lib/supabase'
import { getStripe, stripeConfigured } from '@/lib/billing/stripe'
import { isBillingInterval, isPlaceholderPrice, isPlanId, STRIPE_PRICE_IDS } from '@/lib/billing/config'

// POST /api/billing/checkout — create a Stripe Checkout Session for a subscription
// Body: { plan: 'starter' | 'pro' | 'team', interval: 'monthly' | 'annual' }
export async function POST(req: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: 'Billing is not configured (missing STRIPE_SECRET_KEY)', code: 'billing_unavailable' },
      { status: 503 },
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { plan?: unknown; interval?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!isPlanId(body.plan) || !isBillingInterval(body.interval)) {
    return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 })
  }

  const priceId = STRIPE_PRICE_IDS[body.plan][body.interval]
  if (isPlaceholderPrice(priceId)) {
    return NextResponse.json(
      { error: 'Stripe prices not provisioned yet', code: 'billing_unavailable' },
      { status: 503 },
    )
  }

  const supabase = getSupabase()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email.toLowerCase())
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Reuse the Stripe customer if this user already has one (best effort)
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const origin = req.nextUrl.origin

  try {
    const checkout = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/pricing?billing=canceled`,
      client_reference_id: user.id,
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: session.user.email.toLowerCase() }),
      metadata: { user_id: user.id, plan: body.plan, interval: body.interval },
      subscription_data: { metadata: { user_id: user.id, plan: body.plan } },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: checkout.url })
  } catch (err) {
    console.error('[billing] checkout session create failed', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
