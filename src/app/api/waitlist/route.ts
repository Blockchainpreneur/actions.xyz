import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, clientIpFrom } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// DB-free waitlist capture (Supabase is paused — this endpoint must not
// depend on it). Storage strategy:
//   - BLOB_READ_WRITE_TOKEN present → one JSONL blob per signup under
//     waitlist/ (Vercel Blob has no append; per-entry blobs concatenate
//     into a JSONL stream with `cat`).
//   - No token → structured console.log with the [WAITLIST] prefix so the
//     entries are recoverable from Vercel runtime logs.

const HOUR_MS = 60 * 60 * 1000
export const WAITLIST_LIMIT = 5 // signups per IP per hour — generous for humans, hostile to scripts

const limiter = new RateLimiter(WAITLIST_LIMIT, HOUR_MS)
let pruneCounter = 0

// Pragmatic RFC-5322-ish check: one @, no whitespace, a dot in the domain.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_EMAIL_LEN = 254

const KNOWN_SOURCES = new Set(['pricing', 'upgrade-modal'])

export async function POST(req: NextRequest) {
  let body: { email?: unknown; source?: unknown }
  try {
    body = await req.json() as { email?: unknown; source?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'invalid_body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'Enter a valid email address.', code: 'invalid_email' },
      { status: 400 },
    )
  }
  // Source is an allowlist, never echoed user input.
  const source = typeof body.source === 'string' && KNOWN_SOURCES.has(body.source) ? body.source : 'unknown'

  // Rate limit AFTER validation (malformed requests don't burn quota).
  const ip = clientIpFrom(req.headers)
  const verdict = limiter.check(ip)
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: 'Too many signups from this network — try again later.', code: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(verdict.retryAfterMs / 1000)) } },
    )
  }
  if (++pruneCounter % 50 === 0) limiter.prune()

  const line = JSON.stringify({ email, source, ts: new Date().toISOString() })

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import('@vercel/blob')
      await put(`waitlist/${Date.now()}.jsonl`, `${line}\n`, {
        access: 'public', // Blob only supports public; the random suffix makes URLs unguessable
        addRandomSuffix: true,
        contentType: 'application/jsonl',
      })
    } catch (err) {
      // Never lose a lead: fall back to the log sink.
      console.error('[WAITLIST] blob write failed, falling back to logs:', err)
      console.log(`[WAITLIST] ${line}`)
    }
  } else {
    console.log(`[WAITLIST] ${line}`)
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
