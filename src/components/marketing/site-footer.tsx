import Link from 'next/link'
import { COMPETITORS } from '@/lib/compare/data'

const linkStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  fontSize: 12,
  lineHeight: '22px',
}

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 10,
}

/**
 * Site footer — two variants.
 * - "full": column layout for static marketing pages (compare, tools).
 * - "app": single compact strip for the 100vh app shell on "/" — sized like a
 *   status bar so the board keeps its real estate while the homepage still
 *   links every pSEO page (crawlable internal links from the root URL).
 */
export function SiteFooter({ variant = 'full' }: { variant?: 'full' | 'app' }) {
  if (variant === 'app') {
    return (
      <footer
        data-testid="site-footer"
        className="flex items-center flex-shrink-0 overflow-x-auto"
        style={{
          height: 30,
          gap: 12,
          padding: '0 16px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--surface-1)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Compare</span>
        {COMPETITORS.map(c => (
          <Link key={c.slug} href={`/compare/${c.slug}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            vs {c.shortName}
          </Link>
        ))}
        <span aria-hidden="true" style={{ color: 'var(--border-primary)' }}>·</span>
        <span style={{ color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Free tools</span>
        <Link href="/tools/action-item-extractor" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Action item extractor
        </Link>
        <span aria-hidden="true" style={{ color: 'var(--border-primary)' }}>·</span>
        <Link href="/pricing" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Pricing
        </Link>
      </footer>
    )
  }

  return (
    <footer
      data-testid="site-footer"
      style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-1)' }}
    >
      <div
        className="grid grid-cols-2 sm:grid-cols-4 w-full"
        style={{ maxWidth: 1020, margin: '0 auto', padding: '32px 24px', gap: 24 }}
      >
        <div style={{ gridColumn: 'span 1' }}>
          <div className="flex items-center" style={{ gap: 6, marginBottom: 10 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5.5" stroke="var(--text-muted)" strokeWidth="1" />
              <path d="M7 4.5v2.5l1.5 1.5" stroke="var(--teal-400)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>
              actions<span style={{ color: 'var(--teal-400)' }}>.xyz</span>
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 200 }}>
            Meetings in. Pipelines out. Records in your browser — no bot, nothing to install.
          </p>
        </div>

        <div>
          <p style={headingStyle}>Product</p>
          <div className="flex flex-col">
            <Link href="/" style={linkStyle}>Live board</Link>
            <Link href="/pricing" style={linkStyle}>Pricing</Link>
            <Link href="/buildlog" style={linkStyle}>Build log</Link>
            <Link href="/auth/signin" style={linkStyle}>Start free</Link>
          </div>
        </div>

        <div>
          <p style={headingStyle}>Compare</p>
          <div className="flex flex-col">
            {COMPETITORS.map(c => (
              <Link key={c.slug} href={`/compare/${c.slug}`} style={linkStyle}>
                actions.xyz vs {c.shortName}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p style={headingStyle}>Free tools</p>
          <div className="flex flex-col">
            <Link href="/tools/action-item-extractor" style={linkStyle}>
              Action item extractor
            </Link>
          </div>
        </div>
      </div>
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '12px 24px',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
        }}
      >
        © {new Date().getFullYear()} actions.xyz — turn every meeting into an executed pipeline.
      </div>
    </footer>
  )
}
