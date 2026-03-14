import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Daily Briefing — Hormuz Index',
  description: 'Daily summary of the Iran-USA-Israel crisis: risk indices, dominant scenario, key events from the last 24 hours.',
  alternates: {
    canonical: 'https://hormuzindex.info/en/briefing',
    languages: { 'it': 'https://hormuzindex.info/briefing' },
  },
  openGraph: {
    title: 'Daily Briefing — Hormuz Index',
    description: 'Daily summary: risk indices, dominant scenario, key events.',
    url: 'https://hormuzindex.info/en/briefing',
    siteName: 'Hormuz Index',
    locale: 'en_US',
    type: 'article',
  },
}

export default function BriefingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
