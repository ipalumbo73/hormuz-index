import type { MetadataRoute } from 'next'
import { pageUrl, type PageKey } from '@/lib/seo'

/** Admin is excluded: it is noindex and disallowed in robots.txt. */
const PAGES: { page: PageKey; priority: number; changeFrequency: 'hourly' | 'daily' | 'weekly' }[] = [
  { page: 'home', priority: 1.0, changeFrequency: 'hourly' },
  { page: 'briefing', priority: 0.9, changeFrequency: 'daily' },
  { page: 'timeline', priority: 0.8, changeFrequency: 'hourly' },
  { page: 'nuclear', priority: 0.8, changeFrequency: 'daily' },
  { page: 'explain', priority: 0.6, changeFrequency: 'weekly' },
  { page: 'methodology', priority: 0.6, changeFrequency: 'weekly' },
  { page: 'sources', priority: 0.5, changeFrequency: 'weekly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return PAGES.flatMap(({ page, priority, changeFrequency }) =>
    (['en', 'it'] as const).map(lang => ({
      url: pageUrl(lang, page),
      lastModified,
      changeFrequency,
      // Italian pages rank for their own queries but should not outrank the English root.
      priority: lang === 'en' ? priority : priority - 0.1,
      alternates: {
        languages: {
          en: pageUrl('en', page),
          it: pageUrl('it', page),
          'x-default': pageUrl('en', page),
        },
      },
    }))
  )
}
