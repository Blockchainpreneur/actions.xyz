import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { SiteFooter } from '@/components/marketing/site-footer'
import { ExtractorClient } from './extractor-client'

export const metadata: Metadata = {
  title: 'Free AI Action Item Extractor — paste a transcript, get tasks | actions.xyz',
  description:
    'Paste any meeting transcript or notes and get structured action items — task, owner, priority, next steps — extracted by the same AI pipeline that powers actions.xyz. Free, no signup.',
  alternates: { canonical: '/tools/action-item-extractor' },
  openGraph: {
    title: 'Free AI Action Item Extractor | actions.xyz',
    description:
      'Paste a meeting transcript, get structured action items with owners and priorities. Free, no signup — the live actions.xyz extraction pipeline.',
    url: '/tools/action-item-extractor',
    siteName: 'actions.xyz',
    type: 'website',
  },
}

const toolJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Action Item Extractor by actions.xyz',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://actions.xyz/tools/action-item-extractor',
  description:
    'Free AI tool that extracts structured action items (task, owner, priority, next steps) from meeting transcripts and notes. No signup required.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: 'actions.xyz', url: 'https://actions.xyz' },
}

export default function ActionItemExtractorPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd) }}
      />
      <MarketingNav />

      <main className="flex-1 w-full" style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px 80px' }}>
        <header className="flex flex-col items-center text-center" style={{ gap: 12, marginBottom: 32 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal-400)' }}>
            Free tool · no signup
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.15 }}>
            Action item extractor
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 540, lineHeight: 1.6 }}>
            Paste a meeting transcript or raw notes. The same AI pipeline that powers actions.xyz
            pulls out every commitment — task, owner, priority, concrete next steps. 10 free runs a day.
          </p>
        </header>

        <ExtractorClient />
      </main>

      <SiteFooter />
    </div>
  )
}
