import { NextRequest, NextResponse } from 'next/server'
import { extractActions } from '@/lib/extraction'
import { RateLimiter, clientIpFrom } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// Free public tool — no signup, no DB. Same extraction pipeline as the app.
export const MAX_INPUT_CHARS = 20_000
export const DAILY_LIMIT = 10
const DAY_MS = 24 * 60 * 60 * 1000

// Module-scope: survives across requests within an instance.
const limiter = new RateLimiter(DAILY_LIMIT, DAY_MS)
let pruneCounter = 0

export async function POST(req: NextRequest) {
  let body: { text?: unknown }
  try {
    body = await req.json() as { text?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'invalid_body' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text : ''
  if (!text.trim()) {
    return NextResponse.json(
      { error: 'Paste a transcript or meeting notes to extract from.', code: 'empty_input' },
      { status: 400 },
    )
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Input too long — max ${MAX_INPUT_CHARS.toLocaleString()} characters.`, code: 'input_too_long', max: MAX_INPUT_CHARS },
      { status: 413 },
    )
  }

  // Rate limit AFTER validation (malformed requests don't burn quota),
  // BEFORE any model work (quota guards the expensive part).
  const ip = clientIpFrom(req.headers)
  const verdict = limiter.check(ip)
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: 'Daily free limit reached (10/day). Sign up free for 5 full meetings a month.', code: 'rate_limited' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(verdict.retryAfterMs / 1000)) },
      },
    )
  }
  if (++pruneCounter % 50 === 0) limiter.prune()

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Extraction is temporarily unavailable.', code: 'extraction_unavailable' },
      { status: 503 },
    )
  }

  try {
    const result = await extractActions(apiKey, { text })
    return NextResponse.json(
      { actions: result.actions, participants: result.participants, remaining: verdict.remaining },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('[tools/extract] extraction error:', err)
    return NextResponse.json(
      { error: 'Extraction failed — please try again.', code: 'extraction_failed' },
      { status: 500 },
    )
  }
}
