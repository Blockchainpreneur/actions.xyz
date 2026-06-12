import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────
// LOCAL MODE — DB-free features
//   1. Extractor permalinks: result lives in the #r= URL
//      fragment (lz-string), reconstructed client-side.
//   2. Waitlist endpoint: email capture with no database.
// Run against `next start`: PW_BASE_URL=http://localhost:<port>
// ─────────────────────────────────────────────────────────

const MOCK_ACTIONS = [
  {
    task: 'Get the pricing page copy to legal',
    description: 'Loop in Priya on the annual-discount wording.',
    assignee: 'Jonas',
    assigneeType: 'human',
    priority: 'high',
    tag: 'marketing',
    dueDate: 'Thursday',
  },
  {
    task: 'Fix broken UTM tracking on the signup form',
    description: '',
    assignee: 'Maya',
    assigneeType: 'human',
    priority: 'med',
    tag: 'eng',
  },
  {
    task: 'Automate the weekly metrics digest',
    description: 'Manual version eats two hours every Friday.',
    assignee: 'Metrics agent',
    assigneeType: 'agent',
    priority: 'high',
    tag: 'ops',
  },
]

// ─────────────────────────────────────────────────────────
// 1. EXTRACTOR PERMALINKS
// ─────────────────────────────────────────────────────────
test.describe('Extractor permalinks (no DB)', () => {
  test('extract → copy share link → fresh load from fragment reconstructs the view', async ({ page }) => {
    // Mock the extraction API — the permalink mechanism is fully client-side.
    await page.route('**/api/tools/extract', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ actions: MOCK_ACTIONS, participants: ['Maya', 'Jonas', 'Priya'], remaining: 9 }),
      }),
    )

    await page.goto('/tools/action-item-extractor')
    await page.getByTestId('extractor-input').fill('Maya: Jonas, pricing copy to legal by Thursday.')
    await page.getByTestId('extractor-submit').click()
    await expect(page.getByTestId('extractor-results')).toBeVisible()
    await expect(page.getByTestId('extractor-shared-banner')).not.toBeVisible()

    // Copy share link → the fragment lands in the address bar too.
    await page.getByTestId('extractor-share').click()
    await expect(page).toHaveURL(/#r=.+/)
    const shareUrl = page.url()

    // Fresh navigation with NO extraction API available — fragment only.
    await page.unroute('**/api/tools/extract')
    await page.route('**/api/tools/extract', route => route.fulfill({ status: 500, body: '{}' }))
    await page.goto('about:blank')
    await page.goto(shareUrl)

    // Result view is reconstructed client-side from the fragment.
    await expect(page.getByTestId('extractor-results')).toBeVisible()
    await expect(page.getByText('3 action items')).toBeVisible()
    await expect(page.getByText('Get the pricing page copy to legal')).toBeVisible()
    await expect(page.getByText('Automate the weekly metrics digest')).toBeVisible()
    await expect(page.getByText('Maya · Jonas · Priya')).toBeVisible()

    // Shared banner with the "extract your own" CTA.
    const banner = page.getByTestId('extractor-shared-banner')
    await expect(banner).toBeVisible()
    await page.getByTestId('extractor-extract-own').click()

    // CTA resets to a clean idle state and drops the fragment.
    await expect(page.getByTestId('extractor-results')).not.toBeVisible()
    await expect(page.getByTestId('extractor-input')).toBeVisible()
    expect(page.url()).not.toContain('#r=')
  })

  test('malformed share fragment falls back to the normal idle state', async ({ page }) => {
    await page.goto('/tools/action-item-extractor#r=not-a-real-payload')
    await expect(page.getByTestId('extractor-input')).toBeVisible()
    await expect(page.getByTestId('extractor-results')).not.toBeVisible()
    await expect(page.getByTestId('extractor-error')).not.toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────
// 2. WAITLIST — DB-FREE EMAIL CAPTURE
//    Direct API contract against `next start` (no DB, no
//    BLOB token → entries land in [WAITLIST] logs).
//    Each test spoofs a unique x-forwarded-for so the
//    per-IP rate-limit buckets don't bleed across tests
//    or across reruns against the same server instance.
// ─────────────────────────────────────────────────────────
function uniqueIp(label: string): string {
  return `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

test.describe('Waitlist API (no DB)', () => {
  test('valid email → 200 ok:true', async ({ request }) => {
    const res = await request.post('/api/waitlist', {
      headers: { 'x-forwarded-for': uniqueIp('ok') },
      data: { email: 'founder@example.com', source: 'pricing' },
    })
    expect(res.status()).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  test('invalid email / bad body → 400', async ({ request }) => {
    const ip = uniqueIp('bad')
    for (const data of [{ email: 'not-an-email' }, { email: '' }, {}]) {
      const res = await request.post('/api/waitlist', { headers: { 'x-forwarded-for': ip }, data })
      expect(res.status()).toBe(400)
    }
    // Non-JSON body
    const res = await request.post('/api/waitlist', {
      headers: { 'x-forwarded-for': ip, 'content-type': 'application/json' },
      data: 'not json',
    })
    expect(res.status()).toBe(400)
  })

  test('rate limit → 429 with Retry-After after the per-IP quota', async ({ request }) => {
    const ip = uniqueIp('flood')
    let limited = false
    for (let i = 0; i < 10; i++) {
      const res = await request.post('/api/waitlist', {
        headers: { 'x-forwarded-for': ip },
        data: { email: `flood${i}@example.com`, source: 'pricing' },
      })
      if (res.status() === 429) {
        limited = true
        expect(Number(res.headers()['retry-after'])).toBeGreaterThan(0)
        const body = await res.json()
        expect(body.code).toBe('rate_limited')
        break
      }
      expect(res.status()).toBe(200)
    }
    expect(limited).toBe(true)
  })
})

test.describe('Waitlist UI fallback', () => {
  test('pricing fallback captures email with success state (intercepted)', async ({ page }) => {
    await page.route('**/api/waitlist', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
    )
    await page.goto('/pricing')
    const fallback = page.getByTestId('waitlist-fallback')
    await expect(fallback).toBeVisible()
    await fallback.getByTestId('waitlist-email').fill('lead@example.com')
    await fallback.getByTestId('waitlist-submit').click()
    await expect(fallback.getByTestId('waitlist-success')).toBeVisible()
    await expect(fallback.getByTestId('waitlist-form')).not.toBeVisible()
  })

  test('pricing fallback shows error state on 429 (intercepted)', async ({ page }) => {
    await page.route('**/api/waitlist', route =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Too many signups from this network — try again later.', code: 'rate_limited' }),
      }),
    )
    await page.goto('/pricing')
    const fallback = page.getByTestId('waitlist-fallback')
    await fallback.getByTestId('waitlist-email').fill('lead@example.com')
    await fallback.getByTestId('waitlist-submit').click()
    await expect(fallback.getByTestId('waitlist-error')).toBeVisible()
    await expect(fallback.getByTestId('waitlist-error')).toContainText(/too many attempts/i)
  })

  test('upgrade modal includes the waitlist fallback', async ({ page }) => {
    // Same 402 simulation as billing.spec.ts to open the modal.
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
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
    await page.route('**/api/waitlist', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
    )

    await page.getByTitle('New session').click()
    const modal = page.getByTestId('upgrade-modal')
    await expect(modal).toBeVisible()
    await modal.getByTestId('waitlist-email').fill('blocked-user@example.com')
    await modal.getByTestId('waitlist-submit').click()
    await expect(modal.getByTestId('waitlist-success')).toBeVisible()
  })
})
