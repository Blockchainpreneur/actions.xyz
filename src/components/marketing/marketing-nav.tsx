import Link from 'next/link'

// Sticky marketing top bar — same anatomy as /pricing's nav so the static
// surface (compare pages, free tools) feels like one product.
export function MarketingNav() {
  return (
    <nav
      className="glass flex items-center justify-between flex-shrink-0"
      style={{
        height: 52,
        borderBottom: '1px solid var(--border-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" stroke="var(--text-muted)" strokeWidth="1" />
          <path d="M7 4.5v2.5l1.5 1.5" stroke="var(--teal-400)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
          actions<span style={{ color: 'var(--teal-400)' }}>.xyz</span>
        </span>
      </Link>
      <div className="flex items-center" style={{ gap: 8 }}>
        <Link
          href="/pricing"
          style={{
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
          }}
        >
          Pricing
        </Link>
        <Link
          href="/auth/signin"
          className="btn-press"
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-2)',
            color: 'var(--text-secondary)',
            fontSize: 11,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Sign in
        </Link>
      </div>
    </nav>
  )
}
