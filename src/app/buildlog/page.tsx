import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { SiteFooter } from '@/components/marketing/site-footer'
import buildlog from '@/lib/buildlog-data.json'

export const metadata: Metadata = {
  title: 'Build Log — this SaaS is built and operated by an AI agent | actions.xyz',
  description:
    'The live, unedited build log of actions.xyz: an autonomous AI agent plans, builds, tests and ships this product — strategy tournaments, evidence gates, merges, and its failures. Updated as the engine runs.',
  alternates: { canonical: '/buildlog' },
  openGraph: {
    title: 'actions.xyz Build Log — a SaaS operated by an AI agent',
    description:
      'Unedited ledger of an autonomous agent building a real product: commits, evidence gates, adversarial tournaments — and the stalls. Nothing curated out.',
    url: '/buildlog',
    siteName: 'actions.xyz',
    type: 'website',
  },
}

const STAT_META: { key: keyof typeof buildlog.stats; label: string; accent: string }[] = [
  { key: 'commits_today', label: 'Commits today', accent: 'var(--teal-400)' },
  { key: 'additions', label: 'Lines added', accent: '#22d3ee' },
  { key: 'e2e_tests', label: 'E2E tests', accent: '#a5b4fc' },
  { key: 'gates_closed', label: 'Gates closed', accent: 'var(--success)' },
  { key: 'stalls', label: 'Failures & retries', accent: '#fdba74' },
]

function entryAccent(e: { failed: boolean; closed: boolean }): string {
  if (e.failed) return '#fdba74'
  if (e.closed) return 'var(--success)'
  return 'var(--text-muted)'
}

export default function BuildlogPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <MarketingNav />

      <main className="flex-1 w-full" style={{ maxWidth: 860, margin: '0 auto', padding: '48px 20px 64px' }}>
        <header style={{ marginBottom: 28 }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--teal-400)',
              marginBottom: 10,
            }}
          >
            Live build log · autonomous
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.25, marginBottom: 10 }}>
            This SaaS is built and operated by an AI agent.
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6 }}>
            An autonomous engine plans strategy in 50-idea tournaments judged by adversarial AI judges,
            builds in verified gates, and merges only with evidence. This is its unedited ledger —
            including the failures. The product it ships is{' '}
            <Link href="/" style={{ color: 'var(--teal-400)' }}>actions.xyz</Link>; try the agent&apos;s own pipeline in the{' '}
            <Link href="/tools/action-item-extractor" style={{ color: 'var(--teal-400)' }}>free extractor</Link>.
          </p>
        </header>

        {/* Stats */}
        <div className="flex gap-3" style={{ flexWrap: 'wrap', marginBottom: 36 }}>
          {STAT_META.map(s => (
            <div
              key={s.key}
              className="rounded-xl"
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                padding: '12px 18px',
                minWidth: 118,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 600, color: s.accent, fontFamily: 'var(--font-mono)' }}>
                {buildlog.stats[s.key].toLocaleString('en-US')}
              </div>
              <div style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <section aria-label="Engine ledger" data-testid="buildlog-timeline">
          <ol style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {buildlog.entries.map((e, i) => (
              <li key={i} style={{ position: 'relative' }}>
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: -25,
                    top: 5,
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: entryAccent(e),
                  }}
                />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: entryAccent(e), letterSpacing: '0.06em', marginBottom: 3 }}>
                  {e.date} · {e.type}
                  {e.failed && ' · FAILURE'}
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{e.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Commits */}
        <section aria-label="Commits" style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
            Commits today · repo goes public at launch
          </h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {buildlog.commits.map(c => (
              <li key={c.hash} className="rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', padding: '8px 12px', fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal-400)' }}>{c.hash}</span>
                <span style={{ color: 'var(--text-muted)', margin: '0 8px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{c.time}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{c.msg}</span>
                <span style={{ float: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--success)' }}>+{c.add}</span>{' '}
                  <span style={{ color: '#fca5a5' }}>−{c.del}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p style={{ marginTop: 32, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Generated {new Date(buildlog.generated_at).toUTCString()} · <a href="/buildlog/feed.xml" style={{ color: 'var(--text-secondary)' }}>RSS</a>
        </p>
      </main>

      <SiteFooter />
    </div>
  )
}
