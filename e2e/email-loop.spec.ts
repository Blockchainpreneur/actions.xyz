import { test, expect, type Page } from '@playwright/test'
import { signTaskToken, verifyTaskToken } from '../src/lib/task-token'
import { buildAssignmentEmail, buildDigestEmail } from '../src/lib/email'
import { buildTaskIcs } from '../src/lib/ics'

// ─────────────────────────────────────────────────────────
// Unit layer (same pattern as billing.spec.ts webhook units):
// token signing, ICS generation, and email building are pure
// and run in-process. NOT real credentials — runtime-built
// dummy fixture for HMAC signing only.
// ─────────────────────────────────────────────────────────
process.env.TASK_TOKEN_SECRET = ['e2e', 'unit', 'fixture', 'only'].join('-')

const TASK_ID = '0b9f8a3c-1111-4222-8333-444455556666'
const EMAIL = 'invitee@example.com'

test.describe('Task token (unit)', () => {
  test('sign → verify round-trip', () => {
    const token = signTaskToken({ taskId: TASK_ID, email: EMAIL })
    expect(token).toBeTruthy()
    const payload = verifyTaskToken(token!)
    expect(payload).toEqual({ taskId: TASK_ID, email: EMAIL })
  })

  test('tampered token is rejected', () => {
    const token = signTaskToken({ taskId: TASK_ID, email: EMAIL })!
    const [body, sig] = token.split('.')
    // Flip the payload but keep the signature
    const forgedBody = Buffer.from(
      JSON.stringify({ t: TASK_ID, e: 'attacker@example.com', v: 1 }),
      'utf8',
    ).toString('base64url')
    expect(verifyTaskToken(`${forgedBody}.${sig}`)).toBeNull()
    expect(verifyTaskToken(`${body}.AAAA${sig.slice(4)}`)).toBeNull()
    expect(verifyTaskToken('garbage')).toBeNull()
    expect(verifyTaskToken('')).toBeNull()
  })

  test('email is normalized into the token', () => {
    const token = signTaskToken({ taskId: TASK_ID, email: '  Invitee@Example.COM ' })!
    expect(verifyTaskToken(token)?.email).toBe('invitee@example.com')
  })
})

test.describe('ICS generation (unit)', () => {
  test('date-only deadline becomes an all-day VEVENT', () => {
    const ics = buildTaskIcs({ uid: 'abc', title: 'Ship the report; fast, please', dueDate: '2026-06-19' })!
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('DTSTART;VALUE=DATE:20260619')
    // RFC 5545 escaping of ; and ,
    expect(ics).toContain('SUMMARY:Ship the report\\; fast\\, please')
    expect(ics).toContain('END:VCALENDAR')
  })

  test('unparseable due date returns null instead of throwing', () => {
    expect(buildTaskIcs({ uid: 'x', title: 't', dueDate: 'not-a-date' })).toBeNull()
  })
})

test.describe('Assignment email (unit)', () => {
  const token = signTaskToken({ taskId: TASK_ID, email: EMAIL })!
  const params = {
    to: EMAIL,
    assignerName: 'Ada Lovelace',
    taskText: 'Draft the Q3 launch plan',
    taskDescription: 'Cover pricing, channels & owners',
    meetingName: 'Q3 Planning',
    token,
    dueDate: '2026-06-19',
  }

  test('subject + both CTAs point at /t/[token]', () => {
    const msg = buildAssignmentEmail(params)
    expect(msg.subject).toBe('Ada Lovelace assigned you: Draft the Q3 launch plan')
    expect(msg.html).toContain(`/t/${encodeURIComponent(token)}?utm_source=assignment_email`)
    expect(msg.html).toContain(`/t/${encodeURIComponent(token)}/done?utm_source=assignment_email`)
    expect(msg.html).toContain('View &amp; complete task')
    expect(msg.html).toContain('Mark as done')
  })

  test('instrumented viral footer with UTM is present', () => {
    const msg = buildAssignmentEmail(params)
    expect(msg.html).toContain('turn your meetings into boards like this one')
    expect(msg.html).toContain('Create yours free')
    expect(msg.html).toContain('utm_source=assignment_email')
    expect(msg.html).toContain('utm_medium=email')
    expect(msg.html).toContain(`ref=${encodeURIComponent(token)}`)
    // plain-text part carries the CTA too
    expect(msg.text).toContain('Create yours free')
  })

  test('deadline attaches a .ics VEVENT', () => {
    const msg = buildAssignmentEmail(params)
    expect(msg.attachments).toHaveLength(1)
    expect(msg.attachments![0].filename).toBe('task-deadline.ics')
    expect(msg.attachments![0].content).toContain('BEGIN:VEVENT')
    expect(msg.attachments![0].content).toContain('SUMMARY:Draft the Q3 launch plan')
  })

  test('no deadline → no attachment; html stays escaped', () => {
    const msg = buildAssignmentEmail({ ...params, dueDate: null, taskText: '<script>alert(1)</script>' })
    expect(msg.attachments).toBeUndefined()
    expect(msg.html).not.toContain('<script>alert(1)</script>')
    expect(msg.html).toContain('&lt;script&gt;')
  })

  test('weekly digest groups tasks with /t links + viral footer', () => {
    const msg = buildDigestEmail(EMAIL, [
      { text: 'Draft the Q3 launch plan', meetingName: 'Q3 Planning', dueDate: '2026-06-19', token },
      { text: 'Review hiring loop', meetingName: 'Ops Sync', dueDate: null, token },
    ])
    expect(msg.subject).toBe('You have 2 open tasks from your meetings')
    expect(msg.html).toContain(`/t/${encodeURIComponent(token)}?utm_source=weekly_digest`)
    expect(msg.html).toContain('Create yours free')
  })
})

// ─────────────────────────────────────────────────────────
// Page layer — /t/[token] against a mocked API
// (Supabase is paused; interception is the verification path,
//  same approach as billing.spec.ts.)
// ─────────────────────────────────────────────────────────
const PAGE_TOKEN = ['mocked', 'for', 'page', 'tests'].join('-')

const MOCK_TASK = {
  id: TASK_ID,
  text: 'Draft the Q3 launch plan',
  description: 'Cover pricing, channels & owners.',
  status: 'assigned',
  due_date: '2026-06-19',
  meeting_name: 'Q3 Planning',
  assigner_name: 'Ada Lovelace',
  assignee_email: EMAIL,
  comments: [
    { id: 'c1', author_name: 'Ada Lovelace', author_email: 'ada@example.com', body: 'Deck from last quarter is in Drive.', created_at: '2026-06-12T10:00:00Z' },
  ],
}

// Single interception point for all /api/t/** calls made by the page
async function mockTaskApi(page: Page, overrides: { get?: object; getStatus?: number; done?: object; comment?: object; reassign?: object } = {}) {
  await page.route('**/api/t/**', async route => {
    const url = route.request().url()
    const method = route.request().method()
    const json = (status: number, body: object) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (method === 'POST' && url.includes('/done')) return json(200, overrides.done ?? { ok: true })
    if (method === 'POST' && url.includes('/comment')) return json(200, overrides.comment ?? { ok: true })
    if (method === 'POST' && url.includes('/reassign')) return json(200, overrides.reassign ?? { ok: true })
    if (method === 'GET') return json(overrides.getStatus ?? 200, overrides.get ?? { ok: true, task: MOCK_TASK })
    return route.continue()
  })
}

test.describe('Public task page /t/[token]', () => {
  test('renders task, assigner, deadline and board from mocked data', async ({ page }) => {
    await mockTaskApi(page)
    await page.goto(`/t/${PAGE_TOKEN}`)

    await expect(page.getByTestId('task-title')).toHaveText('Draft the Q3 launch plan')
    await expect(page.getByTestId('task-view')).toContainText('Ada Lovelace assigned you')
    await expect(page.getByTestId('task-board')).toHaveText('Q3 Planning')
    await expect(page.getByTestId('task-deadline')).toContainText('due')
    await expect(page.getByTestId('task-description')).toContainText('Cover pricing')
    // existing comment renders
    await expect(page.getByTestId('task-view')).toContainText('Deck from last quarter')
  })

  test('Mark as done works without login', async ({ page }) => {
    await mockTaskApi(page)
    await page.goto(`/t/${PAGE_TOKEN}`)

    await page.getByTestId('mark-done').click()
    await expect(page.getByTestId('done-confirmation')).toBeVisible()
    await expect(page.getByTestId('done-confirmation')).toContainText('Task marked as done')
    // action buttons are replaced by the confirmation
    await expect(page.getByTestId('mark-done')).not.toBeVisible()
  })

  test('comment posts without login and appears in the thread', async ({ page }) => {
    await mockTaskApi(page)
    await page.goto(`/t/${PAGE_TOKEN}`)

    await page.getByTestId('comment-input').fill('On it — ETA Friday.')
    await page.getByTestId('comment-submit').click()
    await expect(page.getByTestId('task-view')).toContainText('On it — ETA Friday.')
  })

  test('reassign hands the task off to another email', async ({ page }) => {
    await mockTaskApi(page)
    await page.goto(`/t/${PAGE_TOKEN}`)

    await page.getByTestId('reassign-toggle').click()
    await page.getByTestId('reassign-email').fill('teammate@example.com')
    await page.getByTestId('reassign-submit').click()
    await expect(page.getByTestId('reassign-confirmation')).toContainText('teammate@example.com')
  })

  test('footer CTA is present with ref token + UTM attribution', async ({ page }) => {
    await mockTaskApi(page)
    await page.goto(`/t/${PAGE_TOKEN}`)

    const cta = page.getByTestId('footer-cta')
    await expect(cta).toBeVisible()
    await expect(cta).toContainText('Create yours free')
    const href = await cta.getAttribute('href')
    expect(href).toContain(`ref=${PAGE_TOKEN}`)
    expect(href).toContain('utm_source=task_page')
    expect(href).toContain('/auth/signin')
  })

  test('degrades gracefully when the API reports the DB is down', async ({ page }) => {
    await mockTaskApi(page, { get: { ok: false, code: 'degraded' } })
    await page.goto(`/t/${PAGE_TOKEN}`)

    await expect(page.getByTestId('task-degraded')).toBeVisible()
    await expect(page.getByTestId('task-degraded')).toContainText("can't load this task right now")
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
    // viral footer still present even in the degraded state
    await expect(page.getByTestId('footer-cta')).toBeVisible()
  })

  test('failed action shows a friendly error, not a crash', async ({ page }) => {
    await mockTaskApi(page, { done: { ok: false, code: 'degraded' } })
    await page.goto(`/t/${PAGE_TOKEN}`)

    await page.getByTestId('mark-done').click()
    await expect(page.getByTestId('action-error')).toContainText("couldn't save")
    await expect(page.getByTestId('done-confirmation')).not.toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────
// No-mock layer — real server with Supabase PAUSED.
// The pages and APIs must degrade, never crash.
// ─────────────────────────────────────────────────────────
test.describe('Degradation without DB (no mocks)', () => {
  test('/t/[unsigned-token] renders a friendly invalid state (HTTP 200, no crash)', async ({ page }) => {
    const response = await page.goto(`/t/${PAGE_TOKEN}`)
    expect(response?.status()).toBe(200)
    // Server can't verify this token (different/unknown secret) → invalid state…
    // …or degraded if env differs — either way a designed state, never an error page
    await expect(page.getByTestId('task-invalid').or(page.getByTestId('task-degraded'))).toBeVisible()
    await expect(page.getByTestId('footer-cta')).toBeVisible()
  })

  test('one-click done page renders a designed state, never a crash', async ({ page }) => {
    const response = await page.goto(`/t/${PAGE_TOKEN}/done`)
    expect(response?.status()).toBe(200)
    await expect(page.getByTestId('footer-cta')).toBeVisible()
  })

  test('GET /api/t/[garbage] → 404 invalid_token', async ({ request }) => {
    const res = await request.get('/api/t/garbage')
    expect(res.status()).toBe(404)
    expect((await res.json()).code).toBe('invalid_token')
  })

  test('weekly digest cron is locked without CRON_SECRET', async ({ request }) => {
    const res = await request.get('/api/cron/weekly-digest')
    expect(res.status()).toBe(503)
    expect((await res.json()).code).toBe('cron_unavailable')
  })
})
