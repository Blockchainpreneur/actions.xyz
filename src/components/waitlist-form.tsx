'use client'

import { track } from '@vercel/analytics'
import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'

type Status = 'idle' | 'loading' | 'success' | 'error'

// DB-free email capture against POST /api/waitlist. Used as the fallback
// path when normal signup is unavailable (Supabase paused): pricing free
// CTA + upgrade modal.
export function WaitlistForm({ source }: { source: 'pricing' | 'upgrade-modal' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setMessage(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      if (res.ok) {
        track('waitlist_submit', { source })
        setStatus('success')
        return
      }
      const data = await res.json().catch(() => ({})) as { error?: string }
      setStatus('error')
      setMessage(
        res.status === 429
          ? 'Too many attempts from this network — try again in a bit.'
          : data.error ?? 'Could not save your email — please try again.',
      )
    } catch {
      setStatus('error')
      setMessage('Network error — check your connection and try again.')
    }
  }

  if (status === 'success') {
    return (
      <p
        data-testid="waitlist-success"
        role="status"
        className="animate-slide-up flex items-center"
        style={{ gap: 6, fontSize: 12, color: 'var(--teal-400)', fontFamily: 'var(--font-mono)' }}
      >
        <Check size={12} /> You&apos;re on the list — we&apos;ll email you as soon as your spot opens.
      </p>
    )
  }

  return (
    <form data-testid="waitlist-form" onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 6 }}>
      <div className="flex items-center" style={{ gap: 8 }}>
        <input
          type="email"
          required
          data-testid="waitlist-email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-label="Email for the waitlist"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '7px 10px',
            borderRadius: 6,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          data-testid="waitlist-submit"
          disabled={status === 'loading'}
          className="btn-press disabled:opacity-50"
          style={{
            padding: '7px 14px',
            borderRadius: 6,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-accent)',
            color: 'var(--teal-400)',
            fontSize: 12,
            fontWeight: 500,
            cursor: status === 'loading' ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'loading' ? 'Saving…' : 'Join waitlist'}
        </button>
      </div>
      {status === 'error' && message && (
        <p data-testid="waitlist-error" role="alert" style={{ fontSize: 11, color: 'var(--error)', fontFamily: 'var(--font-mono)' }}>
          {message}
        </p>
      )}
    </form>
  )
}
