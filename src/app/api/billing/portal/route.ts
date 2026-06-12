import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getSupabase } from '@/lib/supabase'
import { getStripe, stripeConfigured } from '@/lib/billing/stripe'

// GET /api/billing/portal — redirect to the Stripe Customer Portal
export async function GET(req: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: 'Billing is not configured (missing STRIPE_SECRET_KEY)', code: 'billing_unavailable' },
      { status: 503 },
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email.toLowerCase())
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const origin = req.nextUrl.origin

  // No billing relationship yet — send them to pricing instead
  if (!subscription?.stripe_customer_id) {
    return NextResponse.redirect(`${origin}/pricing`, 303)
  }

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/`,
    })
    return NextResponse.redirect(portal.url, 303)
  } catch (err) {
    console.error('[billing] portal session create failed', err)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
