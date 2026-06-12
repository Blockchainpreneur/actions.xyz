'use client'

import { useCallback, useEffect, useState } from 'react'

// Client view for the public task page. Fetches /api/t/[token] so the whole
// flow is interceptable in E2E and degrades gracefully when the DB is down.

interface PublicComment {
  id: string
  author_name: string | null
  body: string
  created_at: string
}

interface PublicTask {
  id: string
  text: string
  description: string | null
  status: string
  due_date: string | null
  meeting_name: string
  assigner_name: string | null
  assignee_email: string
  comments: PublicComment[]
}

type ViewState =
  | { kind: 'loading' }
  | { kind: 'ok'; task: PublicTask }
  | { kind: 'invalid' }
  | { kind: 'degraded' }

const mono = { fontFamily: 'var(--font-mono)' } as const

function label(text: string) {
  return (
    <p style={{ ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal-400)', margin: 0 }}>
      {text}
    </p>
  )
}

function formatDue(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function TaskView({ token }: { token: string }) {
  const [state, setState] = useState<ViewState>({ kind: 'loading' })
  const [done, setDone] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Comment form
  const [comment, setComment] = useState('')
  const [localComments, setLocalComments] = useState<PublicComment[]>([])

  // Reassign form
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignEmail, setReassignEmail] = useState('')
  const [reassigned, setReassigned] = useState<string | null>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/t/${encodeURIComponent(token)}`)
        if (cancelled) return
        if (res.status === 404) {
          setState({ kind: 'invalid' })
          return
        }
        const data = await res.json()
        if (cancelled) return
        if (data.ok && data.task) {
          setState({ kind: 'ok', task: data.task })
          if (data.task.status === 'completed') setDone(true)
        } else {
          setState({ kind: 'degraded' })
        }
      } catch {
        if (!cancelled) setState({ kind: 'degraded' })
      }
    }

    load()
    return () => { cancelled = true }
  }, [token, reloadKey])

  const retry = useCallback(() => {
    setState({ kind: 'loading' })
    setReloadKey(k => k + 1)
  }, [])

  async function markDone() {
    setBusy(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/t/${encodeURIComponent(token)}/done`, { method: 'POST' })
      const data = await res.json().catch(() => ({ ok: false }))
      if (data.ok) {
        setDone(true)
      } else {
        setActionError("We couldn't save that right now — please try again in a bit.")
      }
    } catch {
      setActionError("We couldn't save that right now — please try again in a bit.")
    }
    setBusy(false)
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    const body = comment.trim()
    if (!body) return
    setBusy(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/t/${encodeURIComponent(token)}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await res.json().catch(() => ({ ok: false }))
      if (data.ok) {
        setLocalComments(c => [...c, { id: `local-${Date.now()}`, author_name: 'You', body, created_at: new Date().toISOString() }])
        setComment('')
      } else {
        setActionError("Comment didn't save — please try again in a bit.")
      }
    } catch {
      setActionError("Comment didn't save — please try again in a bit.")
    }
    setBusy(false)
  }

  async function submitReassign(e: React.FormEvent) {
    e.preventDefault()
    const email = reassignEmail.trim()
    if (!email) return
    setBusy(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/t/${encodeURIComponent(token)}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({ ok: false }))
      if (data.ok) {
        setReassigned(email)
        setReassignOpen(false)
      } else if (data.code === 'invalid_email') {
        setActionError('That email address doesn’t look right.')
      } else {
        setActionError("Couldn't hand this off right now — please try again in a bit.")
      }
    } catch {
      setActionError("Couldn't hand this off right now — please try again in a bit.")
    }
    setBusy(false)
  }

  const footerCta = (
    <footer style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
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
  )

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', padding: 16 }}>
      <div
        className="w-full flex flex-col"
        style={{
          maxWidth: 520,
          padding: '28px 24px',
          borderRadius: 12,
          background: 'var(--surface-1)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          gap: 14,
        }}
      >
        {children}
        {footerCta}
      </div>
    </div>
  )

  if (state.kind === 'loading') {
    return shell(
      <div data-testid="task-loading" className="flex flex-col" style={{ gap: 10 }}>
        {[64, 100, 80].map((w, i) => (
          <div key={i} style={{ height: i === 1 ? 22 : 12, width: `${w}%`, borderRadius: 6, background: 'var(--surface-3)', opacity: 0.6 }} />
        ))}
      </div>,
    )
  }

  if (state.kind === 'invalid') {
    return shell(
      <div data-testid="task-invalid">
        {label('Link not valid')}
        <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '10px 0 6px 0', lineHeight: 1.35 }}>
          This task link isn&apos;t valid anymore
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          It may have expired or been revoked. Ask the person who assigned you the task to resend it.
        </p>
      </div>,
    )
  }

  if (state.kind === 'degraded') {
    return shell(
      <div data-testid="task-degraded">
        {label('Temporarily unavailable')}
        <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '10px 0 6px 0', lineHeight: 1.35 }}>
          We can&apos;t load this task right now
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 14px 0' }}>
          Your link is fine — our task store is briefly unreachable. Try again in a few minutes.
        </p>
        <button
          type="button"
          onClick={retry}
          className="btn-press"
          style={{
            alignSelf: 'flex-start',
            padding: '8px 16px',
            borderRadius: 8,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>,
    )
  }

  const { task } = state
  const comments = [...task.comments, ...localComments]

  return shell(
    <div data-testid="task-view" className="flex flex-col" style={{ gap: 14 }}>
      <div>
        {label(task.assigner_name ? `${task.assigner_name} assigned you` : 'Assigned to you')}
        <h1 data-testid="task-title" style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)', margin: '10px 0 0 0', lineHeight: 1.35 }}>
          {task.text}
        </h1>
      </div>

      {task.description && (
        <p data-testid="task-description" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
        <span data-testid="task-board" style={{ ...mono, fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
          {task.meeting_name}
        </span>
        {task.due_date && (
          <span data-testid="task-deadline" style={{ ...mono, fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(245,165,36,0.08)', border: '1px solid rgba(245,165,36,0.2)', color: 'var(--warning)' }}>
            due {formatDue(task.due_date)}
          </span>
        )}
        <span style={{ ...mono, fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          for {task.assignee_email}
        </span>
      </div>

      {actionError && (
        <div data-testid="action-error" style={{ ...mono, fontSize: 11, padding: '8px 12px', borderRadius: 8, background: 'rgba(240,96,96,0.08)', border: '1px solid rgba(240,96,96,0.2)', color: 'var(--error)' }}>
          {actionError}
        </div>
      )}

      {reassigned && (
        <div data-testid="reassign-confirmation" style={{ ...mono, fontSize: 11, padding: '8px 12px', borderRadius: 8, background: 'rgba(63,207,127,0.08)', border: '1px solid rgba(63,207,127,0.2)', color: 'var(--success)' }}>
          Handed off to {reassigned} — they got an email with their own link.
        </div>
      )}

      {/* Primary actions */}
      {done ? (
        <div data-testid="done-confirmation" className="flex items-center" style={{ gap: 10, padding: '12px 14px', borderRadius: 8, background: 'rgba(63,207,127,0.08)', border: '1px solid rgba(63,207,127,0.25)' }}>
          <span style={{ fontSize: 15, color: 'var(--success)' }}>✓</span>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
            Task marked as done. Nice work.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
          <button
            type="button"
            data-testid="mark-done"
            onClick={markDone}
            disabled={busy}
            className="btn-press"
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              background: 'var(--teal-500)',
              border: '1px solid var(--teal-400)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 0 18px rgba(14,145,136,0.25)',
              opacity: busy ? 0.6 : 1,
            }}
          >
            Mark as done
          </button>
          <button
            type="button"
            data-testid="reassign-toggle"
            onClick={() => setReassignOpen(o => !o)}
            disabled={busy}
            className="btn-press"
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Hand off to someone else
          </button>
        </div>
      )}

      {reassignOpen && !done && (
        <form onSubmit={submitReassign} className="flex items-center" style={{ gap: 8 }}>
          <input
            type="email"
            data-testid="reassign-email"
            placeholder="their@email.com"
            value={reassignEmail}
            onChange={e => setReassignEmail(e.target.value)}
            required
            className="flex-1 outline-none"
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
          <button
            type="submit"
            data-testid="reassign-submit"
            disabled={busy}
            className="btn-press"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: 'var(--surface-3)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        </form>
      )}

      {/* Comments */}
      <div className="flex flex-col" style={{ gap: 10, marginTop: 4 }}>
        {label(`Comments${comments.length ? ` · ${comments.length}` : ''}`)}
        {comments.length > 0 && (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {comments.map(c => (
              <div key={c.id} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ ...mono, fontSize: 10, color: 'var(--text-muted)', margin: '0 0 3px 0' }}>
                  {c.author_name || 'Someone'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{c.body}</p>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={submitComment} className="flex items-start" style={{ gap: 8 }}>
          <textarea
            data-testid="comment-input"
            placeholder="Add a comment — no account needed"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            maxLength={2000}
            className="flex-1 outline-none resize-none"
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          />
          <button
            type="submit"
            data-testid="comment-submit"
            disabled={busy || !comment.trim()}
            className="btn-press"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: 'var(--surface-3)',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: comment.trim() ? 'pointer' : 'default',
              opacity: comment.trim() ? 1 : 0.5,
            }}
          >
            Post
          </button>
        </form>
      </div>
    </div>,
  )
}
