import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { SiteFooter } from '@/components/marketing/site-footer'
import { ANSWERS } from '@/lib/answers/data'

export function generateStaticParams() {
  return ANSWERS.map(a => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = ANSWERS.find(a => a.slug === slug)
  if (!page) return {}
  return {
    title: `${page.question} | actions.xyz`,
    description: page.directAnswer.slice(0, 155),
    alternates: { canonical: `/answers/${page.slug}` },
    openGraph: { title: page.question, description: page.directAnswer.slice(0, 180), url: `/answers/${page.slug}`, siteName: 'actions.xyz', type: 'article' },
  }
}

export default async function AnswerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = ANSWERS.find(a => a.slug === slug)
  if (!page) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: page.question, acceptedAnswer: { '@type': 'Answer', text: page.directAnswer } },
      ...page.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    ],
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingNav />
      <main className="flex-1 w-full" style={{ maxWidth: 680, margin: '0 auto', padding: '48px 20px 64px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.3, marginBottom: 14 }}>{page.question}</h1>
        <p
          data-testid="direct-answer"
          className="rounded-xl"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', padding: '14px 16px', fontSize: 14, lineHeight: 1.65, color: 'var(--text-primary)' }}
        >
          {page.directAnswer}
        </p>
        {page.sections.map(s => (
          <section key={s.h}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '26px 0 8px' }}>{s.h}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{s.body}</p>
          </section>
        ))}
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: '26px 0 8px' }}>FAQ</h2>
        {page.faq.map(f => (
          <div key={f.q} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{f.q}</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.a}</p>
          </div>
        ))}
        <div style={{ marginTop: 28 }}>
          <Link href="/tools/action-item-extractor" style={{ color: 'var(--teal-400)', fontSize: 13 }}>
            Try the free extractor — no signup →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
