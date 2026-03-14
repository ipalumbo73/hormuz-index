import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Data Sources — Hormuz Index',
  description: 'Catalog of data sources used by Hormuz Index: news agencies, official sources, think tanks, with reliability scores for each.',
  alternates: {
    canonical: 'https://hormuzindex.info/en/sources',
    languages: { 'it': 'https://hormuzindex.info/sources' },
  },
  openGraph: {
    title: 'Data Sources — Hormuz Index',
    description: 'Source catalog: news agencies, official sources, think tanks with reliability scores.',
    url: 'https://hormuzindex.info/en/sources',
    siteName: 'Hormuz Index',
    locale: 'en_US',
    type: 'website',
  },
}

export default function SourcesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
