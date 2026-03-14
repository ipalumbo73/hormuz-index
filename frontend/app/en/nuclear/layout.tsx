import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuclear Escalation Monitor — Hormuz Index',
  description: 'Monitoring Iran nuclear opacity (NOI), breakout signals (BSI), nuclear escalation scenarios and real-time probabilities.',
  alternates: {
    canonical: 'https://hormuzindex.info/en/nuclear',
    languages: { 'it': 'https://hormuzindex.info/nuclear' },
  },
  openGraph: {
    title: 'Nuclear Escalation Monitor — Hormuz Index',
    description: 'Iran nuclear monitoring: IAEA opacity, breakout signals, escalation scenarios.',
    url: 'https://hormuzindex.info/en/nuclear',
    siteName: 'Hormuz Index',
    locale: 'en_US',
    type: 'article',
  },
}

export default function NuclearLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
