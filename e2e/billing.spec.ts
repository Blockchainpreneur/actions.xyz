import { test, expect, type Page } from '@playwright/test'
import Stripe from 'stripe'
import {
  handleStripeEvent,
  type BillingDb,
  type SubscriptionPatch,
  type SubscriptionUpsert,
} from '../src/lib/billing/webhook-handler'

// Helper: clear localStorage so each test starts clean (same as app.spec.ts)
async function freshPage(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForLoadState('networkidle')
}

// ─────────────────────────────────────────────────────────
// 1. PRICING PAGE
// ─────────────────────────────────────────────────────────
test.describe('Pricing Page', () => {
  test('renders 3 tiers with annual pricing by default', async ({ page }) => {
    await page.goto('/pricing')

    // 3 tier cards
    await expect(page.getByTestId('plan-card-starter')).toBeVisible()
    await expect(page.getByTestId('plan-card-pro')).toBeVisible()
    await expect(page.getByTestId('plan-card-team')).toBeVisible()

    // Annual is the DEFAULT — −20% prices shown
    await expect(page.getByTestId('pricing-toggle-annual')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('pricing-toggle-monthly')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByTestId('plan-price-starter')).toHaveText('$15')
    await expect(page.getByTestId('plan-price-pro')).toHaveText('$23')
    await expect(page.getByTestId('plan-price-team')).toHaveText('$63')

    // −20% badge on the annual segment
    await expect(page.getByTestId('pricing-toggle-annual')).toContainText('−20%')
  })

  test('toggle switches to monthly prices', async ({ page }) => {
    await page.goto('/pricing')
    await page.getByTestId('pricing-toggle-monthly').click()

    await expect(page.getByTestId('pricing-toggle-monthly')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('plan-price-starter')).toHaveText('$19')
    await expect(page.getByTestId('plan-price-pro')).toHaveText('$29')
    await expect(page.getByTestId('plan-price-team')).toHaveText('$79')
  })

  test('Pro tier is highlighted as recommended', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByTestId('plan-card-pro').getByText('Recommended')).toBeVisible()
  })

  test('free tier shows limits and links to signup', async ({ page }) => {
    await page.goto('/pricing')
    const freeTier = page.getByTestId('free-tier')
    await expect(freeTier).toBeVisible()
    await expect(freeTier).toContainText('5 meetings/mo')
    await expect(freeTier).toContainText('1 board')
    await expect(freeTier.getByRole('link', { name: /start free/i })).toHaveAttribute('href', '/auth/signin')
  })

  test('paid CTA without Stripe keys shows launch notice with free fallback', async ({ page }) => {
    // No STRIPE_SECRET_KEY on the server → /api/billing/checkout responds 503
    await page.goto('/pricing')
    await page.getByTestId('plan-cta-pro').click()

    const notice = page.getByTestId('billing-notice')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('Payments launching this week')
    await expect(notice.getByRole('link', { name: /start free/i })).toHaveAttribute('href', '/auth/signin')
  })
})

// ─────────────────────────────────────────────────────────
// 2. FREEMIUM LIMIT — UPGRADE MODAL
// ─────────────────────────────────────────────────────────
test.describe('Freemium Limit', () => {
  test('6th meeting of the month: server 402 → upgrade modal linking /pricing', async ({ page }) => {
    await freshPage(page)

    // Simulate the server-side gate response (the real route returns this exact
    // payload when an authed free user has already created 5 meetings this month)
    await page.route('**/api/db/sessions', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 402,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Free plan limit reached', code: 'meeting_limit_reached', used: 5, limit: 5 }),
        })
        return
      }
      await route.continue()
    })

    await page.getByTitle('New session').click()

    // Upgrade modal appears, in-system design, linking to /pricing
    const modal = page.getByTestId('upgrade-modal')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('5 free meetings this month')
    await expect(modal.getByRole('link', { name: /view plans/i })).toHaveAttribute('href', '/pricing')

    // The blocked meeting was NOT created — current session unchanged
    await expect(page.getByRole('button', { name: 'Q2 Planning' })).toBeVisible()

    // Dismissable
    await page.getByRole('button', { name: /not now/i }).click()
    await expect(modal).not.toBeVisible()
  })

  test('signed-out user (401) still creates a local session — no modal', async ({ page }) => {
    await freshPage(page)
    // E2E harness is unauthenticated → real API returns 401 → local fallback
    await page.getByTitle('New session').click()
    await expect(page.getByRole('button', { name: 'New Meeting' })).toBeVisible()
    await expect(page.getByTestId('upgrade-modal')).not.toBeVisible()
  })

  test('POST /api/db/sessions requires auth', async ({ request }) => {
    const res = await request.post('/api/db/sessions', { data: { name: 'X' } })
    expect(res.status()).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────
// 3. BILLING API — 503 CONTRACT WITHOUT STRIPE ENV
// ─────────────────────────────────────────────────────────
test.describe('Billing API (no Stripe env)', () => {
  test('POST /api/billing/checkout → 503 billing_unavailable', async ({ request }) => {
    const res = await request.post('/api/billing/checkout', { data: { plan: 'pro', interval: 'annual' } })
    expect(res.status()).toBe(503)
    const body = await res.json()
    expect(body.code).toBe('billing_unavailable')
  })

  test('POST /api/billing/webhook → 503 billing_unavailable', async ({ request }) => {
    const res = await request.post('/api/billing/webhook', { data: { type: 'checkout.session.completed' } })
    expect(res.status()).toBe(503)
    const body = await res.json()
    expect(body.code).toBe('billing_unavailable')
  })

  test('GET /api/billing/portal → 503 billing_unavailable', async ({ request }) => {
    const res = await request.get('/api/billing/portal', { maxRedirects: 0 })
    expect(res.status()).toBe(503)
    const body = await res.json()
    expect(body.code).toBe('billing_unavailable')
  })
})

// ─────────────────────────────────────────────────────────
// 4. WEBHOOK HANDLER — UNIT TESTS WITH SIGNED EXAMPLE EVENTS
//    (Stripe checkout cannot be verified end-to-end without
//     keys — these cover signature verification + upserts.)
// ─────────────────────────────────────────────────────────
// NOT real credentials — runtime-built dummy fixtures for HMAC signing only.
const WEBHOOK_SECRET = ['whsec', 'unit', 'test', 'fixture'].join('_')
// The key is never used for network calls — only stripe.webhooks utilities.
const stripe = new Stripe(['sk', 'test', 'unit', 'fixture', 'no', 'network'].join('_'))

function makeFakeDb() {
  const upserts: SubscriptionUpsert[] = []
  const updates: Array<{ subscriptionId: string; patch: SubscriptionPatch }> = []
  const db: BillingDb = {
    async upsertByUserId(row) {
      upserts.push(row)
      return { error: null }
    },
    async updateByStripeSubscriptionId(subscriptionId, patch) {
      updates.push({ subscriptionId, patch })
      return { error: null }
    },
  }
  return { db, upserts, updates }
}

function signedEvent(type: string, object: Record<string, unknown>): { payload: string; header: string } {
  const payload = JSON.stringify({
    id: 'evt_test_1',
    object: 'event',
    api_version: '2025-04-30.basil',
    created: Math.floor(Date.now() / 1000),
    type,
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    data: { object },
  })
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET })
  return { payload, header }
}

test.describe('Webhook handler (unit, signed events)', () => {
  test('rejects events with a tampered signature', () => {
    const { payload, header } = signedEvent('checkout.session.completed', { id: 'cs_1' })
    const wrongSecret = ['whsec', 'wrong', 'secret'].join('_')
    expect(() => stripe.webhooks.constructEvent(payload, header, wrongSecret)).toThrow()
    // and accepts the genuine one
    expect(() => stripe.webhooks.constructEvent(payload, header, WEBHOOK_SECRET)).not.toThrow()
  })

  test('checkout.session.completed → upserts an active subscription', async () => {
    const { payload, header } = signedEvent('checkout.session.completed', {
      id: 'cs_test_1',
      object: 'checkout.session',
      mode: 'subscription',
      client_reference_id: 'user-uuid-1',
      customer: 'cus_123',
      subscription: 'sub_123',
      metadata: { user_id: 'user-uuid-1', plan: 'pro', interval: 'annual' },
    })
    const event = stripe.webhooks.constructEvent(payload, header, WEBHOOK_SECRET)

    const { db, upserts } = makeFakeDb()
    const result = await handleStripeEvent(event, db)

    expect(result.handled).toBe(true)
    expect(upserts).toHaveLength(1)
    expect(upserts[0]).toMatchObject({
      user_id: 'user-uuid-1',
      plan: 'pro',
      status: 'active',
      stripe_customer_id: 'cus_123',
      stripe_subscription_id: 'sub_123',
    })
  })

  test('checkout.session.completed without user reference is not handled', async () => {
    const { payload, header } = signedEvent('checkout.session.completed', {
      id: 'cs_test_2',
      object: 'checkout.session',
      mode: 'subscription',
      customer: 'cus_123',
      subscription: 'sub_456',
      metadata: {},
    })
    const event = stripe.webhooks.constructEvent(payload, header, WEBHOOK_SECRET)

    const { db, upserts } = makeFakeDb()
    const result = await handleStripeEvent(event, db)

    expect(result.handled).toBe(false)
    expect(upserts).toHaveLength(0)
  })

  test('customer.subscription.updated with user metadata → upserts status + period end', async () => {
    const periodEnd = 1781136000 // unix seconds
    const { payload, header } = signedEvent('customer.subscription.updated', {
      id: 'sub_123',
      object: 'subscription',
      status: 'active',
      customer: 'cus_123',
      metadata: { user_id: 'user-uuid-1', plan: 'team' },
      items: { data: [{ price: { id: 'price_unknown' }, current_period_end: periodEnd }] },
    })
    const event = stripe.webhooks.constructEvent(payload, header, WEBHOOK_SECRET)

    const { db, upserts } = makeFakeDb()
    const result = await handleStripeEvent(event, db)

    expect(result.handled).toBe(true)
    expect(upserts).toHaveLength(1)
    expect(upserts[0]).toMatchObject({
      user_id: 'user-uuid-1',
      plan: 'team',
      status: 'active',
      stripe_subscription_id: 'sub_123',
      current_period_end: new Date(periodEnd * 1000).toISOString(),
    })
  })

  test('customer.subscription.updated without metadata → updates by subscription id', async () => {
    const { payload, header } = signedEvent('customer.subscription.updated', {
      id: 'sub_789',
      object: 'subscription',
      status: 'past_due',
      customer: 'cus_456',
      metadata: {},
      items: { data: [] },
    })
    const event = stripe.webhooks.constructEvent(payload, header, WEBHOOK_SECRET)

    const { db, updates, upserts } = makeFakeDb()
    const result = await handleStripeEvent(event, db)

    expect(result.handled).toBe(true)
    expect(upserts).toHaveLength(0)
    expect(updates).toHaveLength(1)
    expect(updates[0].subscriptionId).toBe('sub_789')
    expect(updates[0].patch).toMatchObject({ status: 'past_due' })
  })

  test('customer.subscription.deleted → marks subscription canceled', async () => {
    const { payload, header } = signedEvent('customer.subscription.deleted', {
      id: 'sub_123',
      object: 'subscription',
      status: 'canceled',
      customer: 'cus_123',
      metadata: {},
      items: { data: [] },
    })
    const event = stripe.webhooks.constructEvent(payload, header, WEBHOOK_SECRET)

    const { db, updates } = makeFakeDb()
    const result = await handleStripeEvent(event, db)

    expect(result.handled).toBe(true)
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({ subscriptionId: 'sub_123', patch: { status: 'canceled' } })
  })

  test('unrelated event types are ignored', async () => {
    const { payload, header } = signedEvent('invoice.finalized', { id: 'in_1', object: 'invoice' })
    const event = stripe.webhooks.constructEvent(payload, header, WEBHOOK_SECRET)

    const { db, updates, upserts } = makeFakeDb()
    const result = await handleStripeEvent(event, db)

    expect(result.handled).toBe(false)
    expect(upserts).toHaveLength(0)
    expect(updates).toHaveLength(0)
  })

  test('persistence errors propagate so the route returns 500 (Stripe retries)', async () => {
    const { payload, header } = signedEvent('customer.subscription.deleted', {
      id: 'sub_err',
      object: 'subscription',
      status: 'canceled',
      metadata: {},
      items: { data: [] },
    })
    const event = stripe.webhooks.constructEvent(payload, header, WEBHOOK_SECRET)

    const failingDb: BillingDb = {
      async upsertByUserId() { return { error: { message: 'db down' } } },
      async updateByStripeSubscriptionId() { return { error: { message: 'db down' } } },
    }
    await expect(handleStripeEvent(event, failingDb)).rejects.toThrow('db down')
  })
})
