import type { MetadataRoute } from 'next'
import { COMPETITOR_SLUGS } from '@/lib/compare/data'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://actionsxyz.vercel.app'

// /t/[token] pages are intentionally excluded — they are private, tokenized
// task pages and already carry robots noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    { url: `${BASE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/buildlog`, lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/failures`, lastModified, changeFrequency: 'daily', priority: 0.6 },
    {
      url: `${BASE_URL}/tools/action-item-extractor`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...COMPETITOR_SLUGS.map(slug => ({
      url: `${BASE_URL}/compare/${slug}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
