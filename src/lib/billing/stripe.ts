import Stripe from 'stripe'

// Lazy singleton — STRIPE_SECRET_KEY might not exist at build/import time
let _stripe: Stripe | null = null

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
    _stripe = new Stripe(key)
  }
  return _stripe
}
