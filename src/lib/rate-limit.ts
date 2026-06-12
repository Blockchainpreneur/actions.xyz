// In-memory fixed-window rate limiter — deliberately DB-free (Supabase is
// paused; the pSEO surface must not depend on it). Per-instance state is an
// accepted limitation for a free public tool: it resets on deploy and is not
// shared across serverless instances, which only ever errs in the visitor's
// favor.

interface WindowEntry {
  count: number
  windowStart: number
}

export class RateLimiter {
  private hits = new Map<string, WindowEntry>()

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    /** Injectable clock for tests */
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Register an attempt for `key`. Returns whether it is allowed plus the
   * remaining quota in the current window.
   */
  check(key: string): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const t = this.now()
    const entry = this.hits.get(key)

    if (!entry || t - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: t })
      return { allowed: true, remaining: this.max - 1, retryAfterMs: 0 }
    }

    if (entry.count >= this.max) {
      return { allowed: false, remaining: 0, retryAfterMs: entry.windowStart + this.windowMs - t }
    }

    entry.count += 1
    return { allowed: true, remaining: this.max - entry.count, retryAfterMs: 0 }
  }

  /** Drop expired windows so the map can't grow unbounded. */
  prune(): void {
    const t = this.now()
    for (const [key, entry] of this.hits) {
      if (t - entry.windowStart >= this.windowMs) this.hits.delete(key)
    }
  }

  get size(): number {
    return this.hits.size
  }
}

/** Best-effort client IP — first hop of x-forwarded-for, else x-real-ip. */
export function clientIpFrom(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return headers.get('x-real-ip')?.trim() || 'unknown'
}
