import type { MetadataRoute } from 'next'

const BASE_URL = 'https://actionsxyz.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private surfaces: APIs, auth flows, tokenized task pages (also noindexed)
        disallow: ['/api/', '/auth/', '/t/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
