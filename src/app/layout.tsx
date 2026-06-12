import type { Metadata } from 'next'
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { Providers } from '@/components/providers'
import './globals.css'

// Instrument Sans — geometric, sharp, Apple DNA. Better than DM Sans for precision UI.
const instrumentSans = Instrument_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://actions.xyz'),
  title: 'actions.xyz — meetings in, pipelines out',
  description:
    'AI meeting recorder with no bot and nothing to install. Records in your browser, extracts action items onto a kanban board, and assigns tasks by email to anyone — even non-users. Free for 5 meetings a month.',
  openGraph: {
    siteName: 'actions.xyz',
    type: 'website',
    url: '/',
    title: 'actions.xyz — meetings in, pipelines out',
    description:
      'Botless, zero-install meeting recorder. Action items land on a kanban and go out by email to anyone. 5 meetings free, every month.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'actions.xyz — meetings in, pipelines out',
    description:
      'Botless, zero-install meeting recorder. Action items land on a kanban and go out by email to anyone.',
  },
}

// GEO: site-wide structured data — Organization + the product itself.
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://actions.xyz/#org',
      name: 'actions.xyz',
      url: 'https://actions.xyz',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'actions.xyz',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://actions.xyz',
      description:
        'AI meeting recorder that records in the browser (no bot, no install), extracts action items onto a native kanban board, and assigns tasks by email to anyone — even people without an account.',
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Starter (annual)', price: '15', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Pro (annual)', price: '23', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Team (annual)', price: '63', priceCurrency: 'USD' },
      ],
      publisher: { '@id': 'https://actions.xyz/#org' },
    },
  ],
}

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e) {}
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      document.documentElement.classList.add('theme-ready');
    });
  });
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${jetbrainsMono.variable} h-full`}>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
