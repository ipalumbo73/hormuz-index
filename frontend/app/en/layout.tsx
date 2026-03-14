import type { Metadata } from 'next'
import NavHeader from '@/components/NavHeader';

export const metadata: Metadata = {
  title: 'Hormuz Index — Iran-USA-Israel Geopolitical Crisis Dashboard',
  description: 'Real-time geopolitical early warning system for the Iran-USA-Israel crisis. 7 risk indices, 5 escalation scenarios, event map and timeline.',
  keywords: ['geopolitics', 'Iran', 'Israel', 'USA', 'crisis', 'nuclear', 'Hormuz', 'risk index', 'early warning', 'escalation'],
  alternates: {
    canonical: 'https://hormuzindex.info/en',
    languages: { 'it': 'https://hormuzindex.info/' },
  },
  openGraph: {
    title: 'Hormuz Index — Geopolitical Crisis Dashboard',
    description: 'Early warning system for the Iran-USA-Israel crisis. Risk indices, escalation scenarios, real-time analysis.',
    url: 'https://hormuzindex.info/en',
    siteName: 'Hormuz Index',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hormuz Index — Geopolitical Crisis Dashboard',
    description: 'Early warning system for the Iran-USA-Israel crisis.',
  },
}

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavHeader lang="en" />
      <main className="max-w-[1280px] mx-auto px-3 sm:px-6 py-4 sm:py-5">
        {children}
      </main>
      <footer className="text-center py-5 pb-10 text-[11px] font-mono text-white/20">
        Hormuz Index · Source: multi-source analysis (GDELT, RSS, NewsData)
      </footer>
    </>
  );
}
