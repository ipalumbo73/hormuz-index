import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Timeline Eventi — Hormuz Index',
  description: 'Cronologia degli eventi geopolitici nella crisi Iran-USA-Israele: attacchi, negoziati, sviluppi nucleari, attività proxy, classificati per categoria e severità.',
  alternates: {
    canonical: 'https://hormuzindex.info/timeline',
    languages: { 'en': 'https://hormuzindex.info/en/timeline' },
  },
  openGraph: {
    title: 'Timeline Eventi — Hormuz Index',
    description: 'Cronologia eventi geopolitici: attacchi, negoziati, sviluppi nucleari nella crisi Iran-USA-Israele.',
    url: 'https://hormuzindex.info/timeline',
    siteName: 'Hormuz Index',
    locale: 'it_IT',
    type: 'website',
  },
};

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
