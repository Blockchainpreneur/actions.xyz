import type { Metadata } from 'next'
import Link from 'next/link'
import { verifyTaskToken } from '@/lib/task-token'
import { completeTaskViaToken } from '@/lib/public-task'
import { trackEvent } from '@/lib/events'

// One-click "Done" target from the assignment email (GET marks the task
// completed and confirms). Known trade-off: aggressive email-scanner prefetch
// could trigger this — acceptable for v1, the full page offers undo-by-edit
// for board owners and the action is idempotent.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Task done · actions.xyz',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ token: string }>
}

const mono = { fontFamily: 'var(--font-mono)' } as const

function Shell({ children, token }: { children: React.ReactNode; token: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', padding: 16 }}>
      <div
        className="w-full flex flex-col"
        style={{
          maxWidth: 440,
          padding: '28px 24px',
          borderRadius: 12,
          background: 'var(--surface-1)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          gap: 12,
        }}
      >
        {children}
        <footer style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
            <strong style={{ color: 'var(--text-primary)' }}>actions<span style={{ color: 'var(--teal-400)' }}>.xyz</span></strong>
            {' '}— turn your meetings into boards like this one.
          </p>
          <a
            data-testid="footer-cta"
            href={`/auth/signin?ref=${encodeURIComponent(token)}&utm_source=task_page&utm_medium=web&utm_campaign=viral_footer`}
            style={{ ...mono, fontSize: 12, color: 'var(--teal-400)', fontWeight: 500, textDecoration: 'none' }}
          >
            Create yours free →
          </a>
        </footer>
      </div>
    </div>
  )
}

export default async function OneClickDonePage({ params }: PageProps) {
  const { token } = await params
  const payload = verifyTaskToken(token)

  if (!payload) {
    return (
      <Shell token={token}>
        <p style={{ ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal-400)', margin: 0 }}>Link not valid</p>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.35 }}>
          This task link isn&apos;t valid anymore
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          It may have expired or been revoked. Ask the person who assigned you the task to resend it.
        </p>
      </Shell>
    )
  }

  const result = await completeTaskViaToken(payload)

  if (result === 'ok') {
    await trackEvent('task_done_no_login', {
      email: payload.email,
      taskId: payload.taskId,
      token,
      metadata: { via: 'one_click_email' },
    })
    return (
      <Shell token={token}>
        <p style={{ ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--success)', margin: 0 }}>Done</p>
        <h1 data-testid="one-click-done" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.35 }}>
          ✓ Task marked as done
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          The board has been updated — everyone in the meeting sees it.
        </p>
        <Link
          href={`/t/${encodeURIComponent(token)}`}
          style={{ ...mono, fontSize: 12, color: 'var(--teal-400)', textDecoration: 'none' }}
        >
          View the task →
        </Link>
      </Shell>
    )
  }

  if (result === 'not_found') {
    return (
      <Shell token={token}>
        <p style={{ ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal-400)', margin: 0 }}>Not found</p>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.35 }}>
          This task no longer exists
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          It may have been deleted from the board.
        </p>
      </Shell>
    )
  }

  // degraded — DB unreachable
  return (
    <Shell token={token}>
      <p style={{ ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--warning)', margin: 0 }}>Temporarily unavailable</p>
      <h1 data-testid="one-click-degraded" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.35 }}>
        We couldn&apos;t mark this done right now
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
        Your link is fine — our task store is briefly unreachable. Try the link again in a few minutes.
      </p>
    </Shell>
  )
}
