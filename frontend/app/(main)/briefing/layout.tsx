import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Briefing Giornaliero — Hormuz Index',
  description: 'Riepilogo giornaliero della crisi Iran-USA-Israele: indici di rischio, scenario dominante, eventi principali delle ultime 24 ore.',
  alternates: {
    canonical: 'https://hormuzindex.info/briefing',
    languages: { 'en': 'https://hormuzindex.info/en/briefing' },
  },
  openGraph: {
    title: 'Briefing Giornaliero — Hormuz Index',
    description: 'Riepilogo giornaliero: indici di rischio, scenario dominante, eventi principali.',
    url: 'https://hormuzindex.info/briefing',
    siteName: 'Hormuz Index',
    locale: 'it_IT',
    type: 'article',
  },
};

export default function BriefingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
