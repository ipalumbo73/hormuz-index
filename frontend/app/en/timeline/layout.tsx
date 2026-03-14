import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Event Timeline — Hormuz Index',
  description: 'Chronology of geopolitical events in the Iran-USA-Israel crisis: attacks, negotiations, nuclear developments, proxy activity, classified by category and severity.',
  alternates: {
    canonical: 'https://hormuzindex.info/en/timeline',
    languages: { 'it': 'https://hormuzindex.info/timeline' },
  },
  openGraph: {
    title: 'Event Timeline — Hormuz Index',
    description: 'Geopolitical event chronology: attacks, negotiations, nuclear developments.',
    url: 'https://hormuzindex.info/en/timeline',
    siteName: 'Hormuz Index',
    locale: 'en_US',
    type: 'website',
  },
}

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
