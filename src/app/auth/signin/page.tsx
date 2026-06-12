'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

function SignInForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  // Conversion attribution: when arriving from a task email / public task page
  // (?ref=<token>&utm_source=...), stash it in a cookie so the sign-in callback
  // can persist signup_source + referrer_token (fail-open, first-touch only).
  useEffect(() => {
    const ref = searchParams.get('ref')
    const utmSource = searchParams.get('utm_source')
    if (!ref && !utmSource) return
    try {
      const value = encodeURIComponent(JSON.stringify({ ref, utm_source: utmSource }))
      document.cookie = `axyz_ref=${value}; path=/; max-age=${30 * 24 * 3600}; samesite=lax`
    } catch { /* attribution is best-effort */ }
  }, [searchParams])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn('credentials', { email, password, callbackUrl, redirect: false })
    if (res?.error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else if (res?.url) {
      window.location.href = res.url
    }
  }

  async function handleGoogle() {
    setLoading(true)
    await signIn('google', { callbackUrl })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--ocean-900)' }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8 flex flex-col gap-6"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600 }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
              <path d="M8 5v3l2 2" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ color: 'var(--text-primary)' }}>actions</span>
            <span style={{ color: 'var(--cyan-400)' }}>.xyz</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            sign in to continue
          </p>
        </div>

        {error && (
          <div
            className="px-3 py-2 rounded text-xs"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {error}
          </div>
        )}

        {/* Email form */}
        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg outline-none text-sm"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg outline-none text-sm"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50"
            style={{
              background: 'var(--teal-500)',
              border: '1px solid var(--teal-400)',
              color: '#fff',
              boxShadow: '0 0 16px rgba(13,148,136,0.25)',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
          <span style={{ fontSize: 10, color: 'var(--teal-400)', fontFamily: 'var(--font-mono)' }}>
            + calendar
          </span>
        </button>

        <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          Google unlocks calendar auto-join.<br />Email login works for recording + pipeline.
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
