import { test, expect } from '@playwright/test'
import { RateLimiter, clientIpFrom } from '../src/lib/rate-limit'
import { COMPETITOR_SLUGS } from '../src/lib/compare/data'

// ─────────────────────────────────────────────────────────
// 1. COMPARE PAGES — /compare/[slug]
// ─────────────────────────────────────────────────────────
test.describe('Compare pages', () => {
  test('all 8 competitor pages render with the right H1', async ({ page }) => {
    expect(COMPETITOR_SLUGS).toHaveLength(8)
    for (const slug of COMPETITOR_SLUGS) {
      const res = await page.goto(`/compare/${slug}`)
      expect(res?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toContainText('actions.xyz vs')
      await expect(page.getByRole('heading', { level: 1 })).toContainText('(2026)')
    }
  })

  test('otter page: verdict above the fold, comparison table, FAQ, dual CTA', async ({ page }) => {
    await page.goto('/compare/otter')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('actions.xyz vs Otter.ai (2026)')

    // Honest verdict — recommends them too
    const verdict = page.getByTestId('compare-verdict')
    await expect(verdict).toBeVisible()
    await expect(verdict).toContainText('Pick Otter when…')
    await expect(verdict).toContainText('Pick actions.xyz when…')

    // Comparison table with both columns and the key differentiator rows
    const table = page.getByTestId('compare-table')
    await expect(table).toBeVisible()
    await expect(table.locator('thead')).toContainText('actions.xyz')
    await expect(table.locator('thead')).toContainText('Otter.ai')
    await expect(table).toContainText('Action items → kanban board')
    await expect(table).toContainText('Assign tasks by email to non-users')
    await expect(table).toContainText('Free plan')

    // FAQ section with expandable questions
    const faq = page.getByTestId('compare-faq')
    await expect(faq).toBeVisible()
    expect(await faq.locator('details').count()).toBeGreaterThanOrEqual(4)

    // Dual CTA
    await expect(page.getByRole('link', { name: /start free/i }).first()).toHaveAttribute('href', '/auth/signin')
    await expect(page.getByRole('link', { name: /see pricing/i })).toHaveAttribute('href', '/pricing')
  })

  test('krisp page: honest about the closest botless rival', async ({ page }) => {
    await page.goto('/compare/krisp')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('actions.xyz vs Krisp (2026)')
    await expect(page.getByTestId('compare-verdict')).toContainText('noise cancellation')
    await expect(page.getByTestId('compare-table')).toBeVisible()
    await expect(page.getByTestId('compare-faq')).toBeVisible()
  })

  test('compare pages carry valid FAQPage JSON-LD', async ({ page }) => {
    for (const slug of ['otter', 'krisp']) {
      await page.goto(`/compare/${slug}`)
      const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
      const faqLd = scripts
        .map(s => JSON.parse(s) as Record<string, unknown>)
        .find(j => j['@type'] === 'FAQPage')
      expect(faqLd, `FAQPage JSON-LD missing on /compare/${slug}`).toBeTruthy()
      const mainEntity = (faqLd as { mainEntity: Array<{ '@type': string; name: string }> }).mainEntity
      expect(mainEntity.length).toBeGreaterThanOrEqual(4)
      expect(mainEntity[0]['@type']).toBe('Question')
    }
  })

  test('unique metadata per page', async ({ page }) => {
    await page.goto('/compare/otter')
    await expect(page).toHaveTitle(/Otter\.ai/)
    await page.goto('/compare/sembly')
    await expect(page).toHaveTitle(/Sembly/)
  })

  test('unknown slug 404s', async ({ page }) => {
    const res = await page.goto('/compare/notion')
    expect(res?.status()).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────
// 2. FREE TOOL — /tools/action-item-extractor
// ─────────────────────────────────────────────────────────
const FAKE_ACTIONS = [
  {
    task: 'Send pricing copy to legal',
    description: 'CONTEXT: Launch blocked on legal review.\nSTEPS:\n1. Final pass\n2. Send to legal\nFLOW: [Draft] → [Legal]',
    assignee: 'Jonas',
    assigneeType: 'human',
    priority: 'high',
    tag: 'content',
    dueDate: 'Thursday',
  },
  {
    task: 'Automate weekly metrics digest',
    description: 'CONTEXT: Manual digest eats two hours weekly.\nSTEPS:\n1. Script the queries\n2. Schedule it\nFLOW: [Cron] → [Digest]',
    assignee: 'AI Agent',
    assigneeType: 'agent',
    priority: 'med',
    tag: 'automated',
  },
]

test.describe('Action item extractor', () => {
  test('renders with disabled submit until text is entered', async ({ page }) => {
    await page.goto('/tools/action-item-extractor')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Action item extractor')
    await expect(page.getByTestId('extractor-input')).toBeVisible()
    await expect(page.getByTestId('extractor-submit')).toBeDisabled()

    await page.getByTestId('extractor-input').fill('Sarah will send the deck on Friday.')
    await expect(page.getByTestId('extractor-submit')).toBeEnabled()
  })

  test('carries SoftwareApplication JSON-LD', async ({ page }) => {
    await page.goto('/tools/action-item-extractor')
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
    const appLd = scripts
      .map(s => JSON.parse(s) as Record<string, unknown>)
      .find(j => j['@type'] === 'SoftwareApplication')
    expect(appLd).toBeTruthy()
    expect((appLd as { offers: { price: string } }).offers.price).toBe('0')
  })

  test('full flow: paste → skeleton → result cards + copy + CTA (API intercepted)', async ({ page }) => {
    await page.goto('/tools/action-item-extractor')

    let releaseResponse: () => void = () => {}
    const gate = new Promise<void>(resolve => { releaseResponse = resolve })
    await page.route('**/api/tools/extract', async route => {
      await gate // hold the response so the skeleton is observable
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ actions: FAKE_ACTIONS, participants: ['Maya', 'Jonas', 'Priya'], remaining: 9 }),
      })
    })

    await page.getByTestId('extractor-sample').click()
    await page.getByTestId('extractor-submit').click()

    // Loading state: skeleton, not a spinner
    await expect(page.getByTestId('extractor-skeleton')).toBeVisible()
    releaseResponse()

    // Results
    const results = page.getByTestId('extractor-results')
    await expect(results).toBeVisible()
    await expect(results).toContainText('2 action items')
    await expect(results).toContainText('Send pricing copy to legal')
    await expect(results).toContainText('Automate weekly metrics digest')
    await expect(results).toContainText('Jonas')
    await expect(results).toContainText('#automated')

    // Copy as markdown
    await expect(page.getByTestId('extractor-copy')).toBeVisible()

    // Conversion CTA → signup
    const cta = page.getByTestId('extractor-cta')
    await expect(cta).toBeVisible()
    await expect(cta).toContainText('Save these to a board')
    await expect(cta.getByRole('link', { name: /start free/i })).toHaveAttribute('href', '/auth/signin')
  })

  test('error state on API failure', async ({ page }) => {
    await page.goto('/tools/action-item-extractor')
    await page.route('**/api/tools/extract', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Extraction failed — please try again.', code: 'extraction_failed' }),
      }),
    )

    await page.getByTestId('extractor-input').fill('Some meeting notes.')
    await page.getByTestId('extractor-submit').click()

    const err = page.getByTestId('extractor-error')
    await expect(err).toBeVisible()
    await expect(err).toContainText('Extraction failed')
  })

  test('rate-limited state surfaces the 429 message', async ({ page }) => {
    await page.goto('/tools/action-item-extractor')
    await page.route('**/api/tools/extract', route =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Retry-After': '3600' },
        body: JSON.stringify({ error: 'Daily free limit reached (10/day). Sign up free for 5 full meetings a month.', code: 'rate_limited' }),
      }),
    )

    await page.getByTestId('extractor-input').fill('More meeting notes.')
    await page.getByTestId('extractor-submit').click()

    await expect(page.getByTestId('extractor-error')).toContainText('Daily free limit reached')
  })

  test('no-items result shows the guidance empty state', async ({ page }) => {
    await page.goto('/tools/action-item-extractor')
    await page.route('**/api/tools/extract', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ actions: [], participants: [], remaining: 9 }),
      }),
    )

    await page.getByTestId('extractor-input').fill('blah blah nothing actionable')
    await page.getByTestId('extractor-submit').click()

    const empty = page.getByTestId('extractor-empty')
    await expect(empty).toBeVisible()
    await expect(empty).toContainText('No action items found')
  })

  // Real API contract — validation runs before the rate limit and before any
  // model call, so these never burn quota or tokens.
  test('POST /api/tools/extract rejects empty input with 400', async ({ request }) => {
    const res = await request.post('/api/tools/extract', { data: { text: '   ' } })
    expect(res.status()).toBe(400)
    expect((await res.json()).code).toBe('empty_input')
  })

  test('POST /api/tools/extract rejects oversized input with 413', async ({ request }) => {
    const res = await request.post('/api/tools/extract', { data: { text: 'a'.repeat(20_001) } })
    expect(res.status()).toBe(413)
    expect((await res.json()).code).toBe('input_too_long')
  })

  test('POST /api/tools/extract rejects malformed JSON with 400', async ({ request }) => {
    const res = await request.post('/api/tools/extract', {
      headers: { 'Content-Type': 'application/json' },
      data: 'not json',
    })
    expect(res.status()).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────
// 3. RATE LIMITER — UNIT (10/day per IP, fixed window)
//    Pure in-memory module: tested directly with an
//    injected clock, no network and no Groq involved.
// ─────────────────────────────────────────────────────────
test.describe('RateLimiter (unit)', () => {
  const DAY = 24 * 60 * 60 * 1000

  test('allows 10 requests then blocks the 11th with retry-after', () => {
    let now = 1_000_000
    const limiter = new RateLimiter(10, DAY, () => now)

    for (let i = 0; i < 10; i++) {
      const v = limiter.check('1.2.3.4')
      expect(v.allowed).toBe(true)
      expect(v.remaining).toBe(9 - i)
    }

    now += 60_000 // a minute later, same window
    const blocked = limiter.check('1.2.3.4')
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterMs).toBe(DAY - 60_000)
  })

  test('window resets after 24h', () => {
    let now = 0
    const limiter = new RateLimiter(10, DAY, () => now)
    for (let i = 0; i < 10; i++) limiter.check('ip')
    expect(limiter.check('ip').allowed).toBe(false)

    now = DAY // exactly one window later
    expect(limiter.check('ip').allowed).toBe(true)
  })

  test('keys are independent', () => {
    const limiter = new RateLimiter(1, DAY, () => 0)
    expect(limiter.check('a').allowed).toBe(true)
    expect(limiter.check('a').allowed).toBe(false)
    expect(limiter.check('b').allowed).toBe(true)
  })

  test('prune drops expired windows', () => {
    let now = 0
    const limiter = new RateLimiter(10, DAY, () => now)
    limiter.check('old')
    now = DAY + 1
    limiter.check('fresh')
    limiter.prune()
    expect(limiter.size).toBe(1)
  })

  test('clientIpFrom prefers first x-forwarded-for hop', () => {
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }))).toBe('9.9.9.9')
    expect(clientIpFrom(new Headers({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8')
    expect(clientIpFrom(new Headers())).toBe('unknown')
  })
})

// ─────────────────────────────────────────────────────────
// 4. GEO SURFACE — sitemap, robots, llms.txt, footer links
// ─────────────────────────────────────────────────────────
test.describe('GEO surface', () => {
  test('sitemap.xml lists core pages, all compare pages, the tool — and no /t/ tokens', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    const xml = await res.text()
    expect(xml).toContain('https://actions.xyz/pricing')
    expect(xml).toContain('https://actions.xyz/tools/action-item-extractor')
    for (const slug of COMPETITOR_SLUGS) {
      expect(xml).toContain(`https://actions.xyz/compare/${slug}`)
    }
    expect(xml).not.toContain('/t/')
  })

  test('robots.txt allows crawl, blocks private surfaces, points at the sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    const txt = await res.text()
    expect(txt).toContain('Disallow: /api/')
    expect(txt).toContain('Disallow: /t/')
    expect(txt).toContain('Sitemap: https://actions.xyz/sitemap.xml')
  })

  test('llms.txt is served with the core claims and links', async ({ request }) => {
    const res = await request.get('/llms.txt')
    expect(res.status()).toBe(200)
    const txt = await res.text()
    expect(txt).toContain('# actions.xyz')
    expect(txt).toContain('no bot joins the call')
    expect(txt).toContain('/compare/otter')
    expect(txt).toContain('/tools/action-item-extractor')
  })

  test('landing footer links every compare page and the free tool', async ({ page }) => {
    await page.goto('/')
    const footer = page.getByTestId('site-footer')
    await expect(footer).toBeVisible()
    await expect(footer.getByRole('link', { name: 'vs Otter' })).toHaveAttribute('href', '/compare/otter')
    await expect(footer.getByRole('link', { name: 'vs Sembly' })).toHaveAttribute('href', '/compare/sembly')
    await expect(footer.getByRole('link', { name: 'Action item extractor' })).toHaveAttribute('href', '/tools/action-item-extractor')
    await expect(footer.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing')
  })

  test('site-wide JSON-LD includes Organization + SoftwareApplication', async ({ page }) => {
    await page.goto('/pricing')
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
    const graph = scripts
      .map(s => JSON.parse(s) as { '@graph'?: Array<{ '@type': string }> })
      .find(j => Array.isArray(j['@graph']))
    expect(graph).toBeTruthy()
    const types = (graph!['@graph'] as Array<{ '@type': string }>).map(n => n['@type'])
    expect(types).toContain('Organization')
    expect(types).toContain('SoftwareApplication')
  })
})

// ─────────────────────────────────────────────────────────
// BUILDLOG — the autonomous-agent ledger page
// ─────────────────────────────────────────────────────────
test.describe('Buildlog', () => {
  test('renders timeline with entries, stats and honest failures', async ({ page }) => {
    await page.goto('/buildlog')
    await expect(page.getByRole('heading', { name: /built and operated by an AI agent/i })).toBeVisible()
    const items = page.getByTestId('buildlog-timeline').locator('li')
    expect(await items.count()).toBeGreaterThanOrEqual(5)
    await expect(page.getByText('Failures & retries')).toBeVisible()
  })

  test('feed.xml responds with valid RSS', async ({ request }) => {
    const res = await request.get('/buildlog/feed.xml')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('rss+xml')
    const body = await res.text()
    expect(body).toContain('<rss version="2.0">')
    expect(body).toContain('<item>')
  })
})

test.describe('Failures + human-blocked', () => {
  test('failure log renders post-mortems', async ({ page }) => {
    await page.goto('/failures')
    await expect(page.getByRole('heading', { name: /every time I broke/i })).toBeVisible()
    expect(await page.getByTestId('failures-list').locator('li').count()).toBeGreaterThanOrEqual(3)
  })

  test('buildlog shows generic human-blocked strip without leaking specifics', async ({ page }) => {
    await page.goto('/buildlog')
    const strip = page.getByTestId('human-blocked')
    await expect(strip).toBeVisible()
    const text = await strip.innerText()
    expect(text).not.toMatch(/stripe|resend|supabase|npm|key/i)
  })
})

test.describe('Answer pages', () => {
  test('canonical answer renders direct answer + FAQ JSON-LD', async ({ page }) => {
    await page.goto('/answers/extract-action-items-from-meeting-transcript')
    await expect(page.getByTestId('direct-answer')).toBeVisible()
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent()
    expect(ld).toContain('FAQPage')
  })
})
