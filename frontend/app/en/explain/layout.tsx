import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Risk Index Explanation — Hormuz Index',
  description: 'Detailed analysis of 7 geopolitical risk indices: NOI, GAI, HDI, PAI, SRI, BSI, DCI. Composition, weights, and contributing news for each index.',
  alternates: {
    canonical: 'https://hormuzindex.info/en/explain',
    languages: { 'it': 'https://hormuzindex.info/explain' },
  },
  openGraph: {
    title: 'Risk Index Explanation — Hormuz Index',
    description: 'Detailed analysis of 7 geopolitical risk indices with contributing news.',
    url: 'https://hormuzindex.info/en/explain',
    siteName: 'Hormuz Index',
    locale: 'en_US',
    type: 'article',
  },
}

export default function ExplainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
