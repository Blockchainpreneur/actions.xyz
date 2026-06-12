import type { MetadataRoute } from 'next'
import { COMPETITOR_SLUGS } from '@/lib/compare/data'

const BASE_URL = 'https://actions.xyz'

// /t/[token] pages are intentionally excluded — they are private, tokenized
// task pages and already carry robots noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    { url: `${BASE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
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
