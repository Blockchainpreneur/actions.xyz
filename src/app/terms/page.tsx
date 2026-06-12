import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { SiteFooter } from '@/components/marketing/site-footer'

export const metadata: Metadata = {
  title: 'Terms of Service | actions.xyz',
  description: 'The plain-language terms for using actions.xyz.',
  alternates: { canonical: '/terms' },
}

const S = { h: { fontSize: 15, fontWeight: 600 as const, margin: '24px 0 8px' }, p: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 } }

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <MarketingNav />
      <main className="flex-1 w-full" style={{ maxWidth: 680, margin: '0 auto', padding: '48px 20px 64px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 6 }}>Terms of Service</h1>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Last updated: June 12, 2026 · v1, plain language</p>

        <h2 style={S.h}>The service</h2>
        <p style={S.p}>
          actions.xyz turns meetings and notes into actionable task boards. It is early-stage software
          provided as-is, without uptime guarantees. The free tier (currently 5 meetings/month and the
          free extractor at 10 runs/day) can change with notice on the pricing page.
        </p>

        <h2 style={S.h}>Your content</h2>
        <p style={S.p}>
          Your transcripts, boards and tasks are yours. You grant us only the processing rights needed
          to run the features you invoke (e.g., sending text to our AI provider for extraction). Do not
          submit content you have no right to record or process.
        </p>

        <h2 style={S.h}>Acceptable use</h2>
        <p style={S.p}>
          No abuse of rate limits, no illegal content, no attempts to break other users&apos; data.
          We may suspend access that harms the service.
        </p>

        <h2 style={S.h}>Payments</h2>
        <p style={S.p}>
          Paid plans are billed via Stripe when active. If a charge ever goes wrong, email us — refund
          requests within 14 days of a charge are honored while we are in early access.
        </p>

        <h2 style={S.h}>Contact</h2>
        <p style={S.p}>telleria.gerardt@gmail.com</p>
      </main>
      <SiteFooter />
    </div>
  )
}
