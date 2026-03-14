import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monitor Escalation Nucleare — Hormuz Index',
  description: 'Monitoraggio dell\'opacità nucleare iraniana (NOI), segnali di breakout (BSI), scenari di escalation nucleare e probabilità in tempo reale.',
  alternates: {
    canonical: 'https://hormuzindex.info/nuclear',
    languages: { 'en': 'https://hormuzindex.info/en/nuclear' },
  },
  openGraph: {
    title: 'Monitor Escalation Nucleare — Hormuz Index',
    description: 'Monitoraggio nucleare Iran: opacità IAEA, segnali breakout, scenari di escalation.',
    url: 'https://hormuzindex.info/nuclear',
    siteName: 'Hormuz Index',
    locale: 'it_IT',
    type: 'article',
  },
};

export default function NuclearLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
