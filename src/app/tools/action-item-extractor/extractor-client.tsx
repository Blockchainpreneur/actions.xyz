'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Copy, Sparkles, Zap } from 'lucide-react'
import type { ExtractedAction } from '@/lib/extraction'

const MAX_CHARS = 20_000

const SAMPLE = `Maya: OK, wrapping up — Jonas, can you get the pricing page copy to legal by Thursday?
Jonas: Yep, I'll send it over Thursday morning, and I'll loop in Priya on the annual-discount wording.
Priya: Works. I also need someone to fix the broken UTM tracking on the signup form before the campaign launches Monday.
Maya: I'll take that — should be a quick fix in the form handler. Also let's automate the weekly metrics digest instead of compiling it by hand.
Jonas: Agreed, that's a perfect job for an agent. High priority, the manual version eats two hours every Friday.`

type Phase = 'idle' | 'loading' | 'error' | 'done'

const PRIORITY_COLOR: Record<string, string> = {
  high: 'var(--error)',
  med: 'var(--warning)',
  low: 'var(--text-muted)',
}

function toMarkdown(actions: ExtractedAction[]): string {
  const lines = ['# Action items', '']
  for (const a of actions) {
    const due = a.dueDate ? ` (due ${a.dueDate})` : ''
    lines.push(`- [ ] **${a.task}** — ${a.assignee} · ${a.priority} priority · #${a.tag}${due}`)
    if (a.description) {
      lines.push(...a.description.split('\n').map(l => `  ${l}`))
    }
    lines.push('')
  }
  lines.push('---', 'Extracted with actions.xyz — https://actions.xyz/tools/action-item-extractor')
  return lines.join('\n')
}

export function ExtractorClient() {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [actions, setActions] = useState<ExtractedAction[]>([])
  const [participants, setParticipants] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const overLimit = text.length > MAX_CHARS
  const charLabel = useMemo(
    () => `${text.length.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`,
    [text.length],
  )

  async function handleExtract() {
    if (!text.trim() || overLimit || phase === 'loading') return
    setPhase('loading')
    setError(null)
    setCopied(false)
    try {
      const res = await fetch('/api/tools/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json().catch(() => ({})) as {
        actions?: ExtractedAction[]
        participants?: string[]
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? 'Extraction failed — please try again.')
        setPhase('error')
        return
      }
      setActions(data.actions ?? [])
      setParticipants(data.participants ?? [])
      setPhase('done')
    } catch {
      setError('Network error — check your connection and try again.')
      setPhase('error')
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(toMarkdown(actions))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard denied — non-fatal */ }
  }

  return (
    <div className="flex flex-col" style={{ gap: 24 }}>
      {/* ── Input ── */}
      <div
        className="card-shadow"
        style={{ borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--surface-1)', padding: 16 }}
      >
        <textarea
          data-testid="extractor-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'Paste your meeting transcript or notes here…\n\ne.g. "Sarah said she\'ll send the proposal by Friday, and Tom needs to review the API spec before the next sprint."'}
          rows={10}
          aria-label="Meeting transcript or notes"
          style={{
            width: '100%',
            resize: 'vertical',
            minHeight: 180,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            lineHeight: 1.7,
          }}
        />
        <div className="flex flex-col sm:flex-row items-center justify-between" style={{ gap: 10, marginTop: 10, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <span
              data-testid="extractor-charcount"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: overLimit ? 'var(--error)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
            >
              {charLabel}
            </span>
            <button
              type="button"
              data-testid="extractor-sample"
              onClick={() => { setText(SAMPLE); setPhase('idle'); setError(null) }}
              className="btn-press"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--teal-400)', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              try an example
            </button>
          </div>
          <button
            type="button"
            data-testid="extractor-submit"
            onClick={handleExtract}
            disabled={!text.trim() || overLimit || phase === 'loading'}
            className="btn-press flex items-center disabled:opacity-50"
            style={{
              gap: 8,
              padding: '9px 18px',
              borderRadius: 8,
              background: 'var(--teal-500)',
              border: '1px solid var(--teal-400)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              cursor: text.trim() && !overLimit && phase !== 'loading' ? 'pointer' : 'not-allowed',
              boxShadow: '0 0 18px rgba(14,145,136,0.25)',
            }}
          >
            <Sparkles size={13} />
            {phase === 'loading' ? 'Extracting…' : 'Extract action items'}
          </button>
        </div>
        {overLimit && (
          <p role="alert" style={{ marginTop: 8, fontSize: 11, color: 'var(--error)', fontFamily: 'var(--font-mono)' }}>
            Input is over the {MAX_CHARS.toLocaleString()}-character free limit — trim it down or split it.
          </p>
        )}
      </div>

      {/* ── Loading: skeleton cards, not a spinner ── */}
      {phase === 'loading' && (
        <div data-testid="extractor-skeleton" className="flex flex-col" style={{ gap: 10 }} aria-label="Extracting action items" role="status">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="animate-fade-in"
              style={{
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-1)',
                padding: 16,
                opacity: 1 - i * 0.25,
              }}
            >
              <div style={{ height: 12, width: `${62 - i * 12}%`, borderRadius: 4, background: 'var(--surface-3)', marginBottom: 10 }} className="animate-pulse-record" />
              <div style={{ height: 8, width: '38%', borderRadius: 4, background: 'var(--surface-2)' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {phase === 'error' && error && (
        <div
          data-testid="extractor-error"
          role="alert"
          className="animate-slide-up"
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: 'var(--error)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {phase === 'done' && (
        actions.length === 0 ? (
          <div
            data-testid="extractor-empty"
            className="animate-slide-up flex flex-col items-center text-center"
            style={{
              padding: '32px 24px',
              borderRadius: 12,
              border: '1px dashed var(--border-primary)',
              gap: 8,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>No action items found</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 420, lineHeight: 1.6 }}>
              The extractor looks for commitments — “I’ll…”, “Can you…”, deadlines, decisions that create work.
              Try pasting a longer chunk of the conversation, or hit “try an example” above.
            </p>
          </div>
        ) : (
          <section data-testid="extractor-results" className="animate-slide-up flex flex-col" style={{ gap: 12 }}>
            <div className="flex flex-col sm:flex-row items-center justify-between" style={{ gap: 10 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {actions.length} action item{actions.length === 1 ? '' : 's'}
                {participants.length > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginLeft: 10 }}>
                    {participants.join(' · ')}
                  </span>
                )}
              </h2>
              <button
                type="button"
                data-testid="extractor-copy"
                onClick={handleCopy}
                className="btn-press flex items-center"
                style={{
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                  color: copied ? 'var(--teal-400)' : 'var(--text-secondary)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy as Markdown'}
              </button>
            </div>

            {actions.map((a, i) => (
              <article
                key={`${a.task}-${i}`}
                className="card-shadow animate-card-enter"
                style={{
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-1)',
                  padding: 16,
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{a.task}</h3>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: PRIORITY_COLOR[a.priority] ?? 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      marginTop: 2,
                    }}
                  >
                    {a.priority}
                  </span>
                </div>
                <div className="flex items-center" style={{ gap: 8, marginBottom: a.description ? 10 : 0, flexWrap: 'wrap' }}>
                  <span className="flex items-center" style={{ gap: 5, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
                    {a.assigneeType === 'agent' ? <Zap size={11} style={{ color: 'var(--teal-400)' }} /> : (
                      <span
                        aria-hidden="true"
                        style={{
                          width: 14, height: 14, borderRadius: '50%', background: 'var(--surface-3)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8, color: 'var(--text-secondary)',
                        }}
                      >
                        {(a.assignee || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    {a.assignee}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 7px', borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    #{a.tag}
                  </span>
                  {a.dueDate && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--warning)' }}>
                      due {a.dueDate}
                    </span>
                  )}
                </div>
                {a.description && (
                  <pre
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      lineHeight: 1.7,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                    }}
                  >
                    {a.description}
                  </pre>
                )}
              </article>
            ))}

            {/* CTA — the conversion moment */}
            <div
              data-testid="extractor-cta"
              className="card-shadow flex flex-col sm:flex-row items-center justify-between"
              style={{
                marginTop: 8,
                padding: '18px 20px',
                borderRadius: 12,
                background: 'var(--surface-1)',
                border: '1px solid var(--border-accent)',
                boxShadow: '0 0 32px rgba(45,212,191,0.08), 0 2px 8px rgba(0,0,0,0.35)',
                gap: 12,
              }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Save these to a board
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  In actions.xyz these cards land on a live kanban — assignable by email to anyone, even people without an account. Free for 5 meetings a month.
                </p>
              </div>
              <Link
                href="/auth/signin"
                className="btn-press flex items-center"
                style={{
                  gap: 6,
                  padding: '9px 16px',
                  borderRadius: 8,
                  background: 'var(--teal-500)',
                  border: '1px solid var(--teal-400)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Start free <ArrowRight size={12} />
              </Link>
            </div>
          </section>
        )
      )}
    </div>
  )
}
