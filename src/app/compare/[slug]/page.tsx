import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, Minus, X } from 'lucide-react'
import {
  COMPARE_ROWS,
  COMPETITOR_SLUGS,
  VERIFIED_DATE,
  getCompetitor,
  type CellStatus,
  type TableCell,
} from '@/lib/compare/data'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { SiteFooter } from '@/components/marketing/site-footer'

// Fully static — every slug is known at build time, anything else 404s.
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return COMPETITOR_SLUGS.map(slug => ({ slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const c = getCompetitor(slug)
  if (!c) return {}
  return {
    title: c.meta.title,
    description: c.meta.description,
    alternates: { canonical: `/compare/${c.slug}` },
    openGraph: {
      title: c.meta.title,
      description: c.meta.description,
      url: `/compare/${c.slug}`,
      siteName: 'actions.xyz',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: c.meta.title,
      description: c.meta.description,
    },
  }
}

function StatusIcon({ status }: { status: CellStatus }) {
  if (status === 'yes') return <Check size={13} style={{ color: 'var(--teal-400)', flexShrink: 0, marginTop: 2 }} aria-label="Yes" />
  if (status === 'no') return <X size={13} style={{ color: 'var(--error)', flexShrink: 0, marginTop: 2 }} aria-label="No" />
  if (status === 'partial') return <Minus size={13} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} aria-label="Partial" />
  return null
}

function Cell({ cell }: { cell: TableCell }) {
  return (
    <div className="flex items-start" style={{ gap: 8 }}>
      <StatusIcon status={cell.status} />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{cell.text}</span>
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--teal-400)',
  marginBottom: 12,
}

const h2Style: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: 'var(--text-primary)',
  marginBottom: 12,
}

function CtaPair({ competitor }: { competitor: string }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center" style={{ gap: 10 }}>
      <Link
        href="/"
        className="btn-press"
        style={{
          padding: '9px 18px',
          borderRadius: 8,
          background: 'var(--teal-500)',
          border: '1px solid var(--teal-400)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 500,
          textDecoration: 'none',
          boxShadow: '0 0 18px rgba(14,145,136,0.25)',
          whiteSpace: 'nowrap',
        }}
      >
        Try the live board — no signup
      </Link>
      <Link
        href="/pricing"
        className="btn-press"
        style={{
          padding: '9px 18px',
          borderRadius: 8,
          background: 'var(--surface-2)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
          fontSize: 12,
          fontWeight: 500,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        See pricing
      </Link>
      <span className="sr-only">Compare actions.xyz with {competitor}</span>
    </div>
  )
}

export default async function ComparePage({ params }: PageProps) {
  const { slug } = await params
  const c = getCompetitor(slug)
  if (!c) notFound()

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MarketingNav />

      <main className="flex-1 w-full" style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px 80px' }}>
        {/* ── Hero ── */}
        <header className="flex flex-col items-center text-center" style={{ gap: 12, marginBottom: 32 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal-400)' }}>
            Comparison · verified {VERIFIED_DATE}
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.15 }}>
            actions.xyz vs {c.name} (2026)
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6 }}>{c.whatItIs}</p>
        </header>

        {/* ── Verdict (above the fold, honest both ways) ── */}
        <section
          data-testid="compare-verdict"
          className="card-shadow"
          style={{
            padding: 24,
            borderRadius: 12,
            background: 'var(--surface-1)',
            border: '1px solid var(--border-accent)',
            marginBottom: 40,
          }}
        >
          <p style={sectionLabel}>The honest verdict</p>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65, marginBottom: 20 }}>
            {c.verdict.summary}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 20 }}>
            <div>
              <p style={{ ...sectionLabel, color: 'var(--text-muted)' }}>Pick {c.shortName} when…</p>
              <ul className="flex flex-col" style={{ gap: 8, listStyle: 'none' }}>
                {c.verdict.chooseThem.map(item => (
                  <li key={item} className="flex items-start" style={{ gap: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <Check size={12} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 3 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={sectionLabel}>Pick actions.xyz when…</p>
              <ul className="flex flex-col" style={{ gap: 8, listStyle: 'none' }}>
                {c.verdict.chooseUs.map(item => (
                  <li key={item} className="flex items-start" style={{ gap: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <Check size={12} style={{ color: 'var(--teal-400)', flexShrink: 0, marginTop: 3 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Comparison table ── */}
        <section style={{ marginBottom: 40 }}>
          <p style={sectionLabel}>Side by side</p>
          <h2 style={h2Style}>actions.xyz vs {c.name}, feature by feature</h2>
          <div
            className="card-shadow overflow-x-auto"
            style={{ borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--surface-1)' }}
          >
            <table data-testid="compare-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <th scope="col" style={{ textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', width: '22%' }} />
                  <th scope="col" style={{ textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal-400)', width: '39%' }}>
                    actions.xyz
                  </th>
                  <th scope="col" style={{ textAlign: 'left', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', width: '39%' }}>
                    {c.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.key} style={{ borderBottom: i < COMPARE_ROWS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <th scope="row" style={{ textAlign: 'left', verticalAlign: 'top', padding: '14px 16px', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {row.label}
                    </th>
                    <td style={{ verticalAlign: 'top', padding: '14px 16px' }}>
                      <Cell cell={row.us} />
                    </td>
                    <td style={{ verticalAlign: 'top', padding: '14px 16px' }}>
                      <Cell cell={c.cells[row.key]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {c.name} data verified {VERIFIED_DATE} against{' '}
            <a href={c.pricingUrl} rel="nofollow noopener" target="_blank" style={{ color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
              their official pricing page
            </a>{' '}
            and help-center docs. Prices and limits change — check theirs before deciding.
          </p>
        </section>

        {/* ── The workflow gap ── */}
        <section style={{ marginBottom: 40 }}>
          <p style={sectionLabel}>The workflow gap</p>
          <h2 style={h2Style}>They transcribe the meeting. We turn it into a pipeline.</h2>
          <div className="flex flex-col" style={{ gap: 12 }}>
            {c.workflowGap.map(para => (
              <p key={para.slice(0, 40)} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {para}
              </p>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section data-testid="compare-faq" style={{ marginBottom: 48 }}>
          <p style={sectionLabel}>FAQ</p>
          <h2 style={h2Style}>actions.xyz vs {c.name} — common questions</h2>
          <div className="flex flex-col" style={{ gap: 10 }}>
            {c.faqs.map(f => (
              <details
                key={f.q}
                className="card-shadow"
                style={{ borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-1)', padding: '12px 16px' }}
              >
                <summary style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', listStylePosition: 'inside' }}>
                  {f.q}
                </summary>
                <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          className="card-shadow flex flex-col items-center text-center"
          style={{
            padding: '32px 24px',
            borderRadius: 12,
            background: 'var(--surface-1)',
            border: '1px solid var(--border-accent)',
            gap: 14,
            boxShadow: '0 0 32px rgba(45,212,191,0.08), 0 2px 8px rgba(0,0,0,0.35)',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            Your next meeting can end with a moving pipeline.
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 460, lineHeight: 1.6 }}>
            Record in the browser — no bot, nothing to install. Action items land on a kanban and go out by email to anyone. 5 meetings free, every month.
          </p>
          <CtaPair competitor={c.name} />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
