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
