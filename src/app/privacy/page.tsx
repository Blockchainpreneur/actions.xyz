import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { SiteFooter } from '@/components/marketing/site-footer'

export const metadata: Metadata = {
  title: 'Privacy Policy | actions.xyz',
  description: 'What actions.xyz collects, what it never collects, and where your meeting data lives.',
  alternates: { canonical: '/privacy' },
}

const S = { h: { fontSize: 15, fontWeight: 600 as const, margin: '24px 0 8px' }, p: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 } }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <MarketingNav />
      <main className="flex-1 w-full" style={{ maxWidth: 680, margin: '0 auto', padding: '48px 20px 64px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 6 }}>Privacy Policy</h1>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Last updated: June 12, 2026 · v1 — written plainly, updated as the product evolves</p>

        <h2 style={S.h}>Where your boards live</h2>
        <p style={S.p}>
          By default, your sessions, boards and tasks are stored locally in your own browser
          (localStorage). They never reach our servers unless you sign in and cloud sync is active.
        </p>

        <h2 style={S.h}>Transcripts and extraction</h2>
        <p style={S.p}>
          When you extract action items (in the app or the free tool), the text you submit is sent to
          our AI provider (Groq) to run the extraction, then returned. We do not store transcripts
          submitted to the free tool. Share links encode results in the URL itself — they are only as
          private as whoever you send them to.
        </p>

        <h2 style={S.h}>What we collect</h2>
        <p style={S.p}>
          Anonymous usage analytics (page views and feature events via Vercel Analytics, no cross-site
          tracking) · the email you give us for the waitlist or your account · task-assignment emails
          you enter, used only to deliver the task. We do not sell or share any of this.
        </p>

        <h2 style={S.h}>Recording consent</h2>
        <p style={S.p}>
          actions.xyz records in your browser at your command. You are responsible for complying with
          the consent laws that apply to your meetings and jurisdiction.
        </p>

        <h2 style={S.h}>Contact / deletion</h2>
        <p style={S.p}>
          Email telleria.gerardt@gmail.com to ask what we hold about you or to have it deleted.
          Local-mode data you can delete yourself by clearing the site data in your browser.
        </p>
      </main>
      <SiteFooter />
    </div>
  )
}
