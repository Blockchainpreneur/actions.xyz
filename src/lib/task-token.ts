import { createHmac, timingSafeEqual } from 'node:crypto'

// Stateless signed tokens for the public task page (/t/[token]).
//
// Format: base64url(payload).base64url(hmac-sha256(payload))
// Payload: { t: taskId, e: assigneeEmail, v: 1 }
//
// Why stateless: the token must be verifiable server-side even when the
// database is unreachable (the Supabase project can be paused). The token is
// ALSO persisted to task_assignees.access_token (best-effort) so it can be
// revoked later — but persistence is never required for validation.

const TOKEN_VERSION = 1

export interface TaskTokenPayload {
  taskId: string
  email: string
}

function getSecret(): string | null {
  return process.env.TASK_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || null
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url')
}

function hmac(payload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payload).digest()
}

// Returns null when no signing secret is configured (never throws).
export function signTaskToken(payload: TaskTokenPayload): string | null {
  const secret = getSecret()
  if (!secret) return null
  const body = b64url(
    Buffer.from(
      JSON.stringify({ t: payload.taskId, e: payload.email.toLowerCase().trim(), v: TOKEN_VERSION }),
      'utf8',
    ),
  )
  return `${body}.${b64url(hmac(body, secret))}`
}

// Returns the payload when the signature is valid, null otherwise. Never throws.
export function verifyTaskToken(token: string): TaskTokenPayload | null {
  const secret = getSecret()
  if (!secret || !token || token.length > 2048) return null

  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  try {
    const expected = hmac(body, secret)
    const actual = Buffer.from(sig, 'base64url')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null

    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      t?: unknown
      e?: unknown
      v?: unknown
    }
    if (parsed.v !== TOKEN_VERSION) return null
    if (typeof parsed.t !== 'string' || typeof parsed.e !== 'string') return null
    if (!parsed.t || !parsed.e) return null
    return { taskId: parsed.t, email: parsed.e }
  } catch {
    return null
  }
}
