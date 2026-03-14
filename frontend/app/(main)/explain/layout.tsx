import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Spiegazione Indici di Rischio — Hormuz Index',
  description: 'Analisi dettagliata dei 7 indici di rischio geopolitico: NOI, GAI, HDI, PAI, SRI, BSI, DCI. Composizione, pesi, notizie che alimentano ogni indice.',
  alternates: {
    canonical: 'https://hormuzindex.info/explain',
    languages: { 'en': 'https://hormuzindex.info/en/explain' },
  },
  openGraph: {
    title: 'Spiegazione Indici di Rischio — Hormuz Index',
    description: 'Analisi dettagliata dei 7 indici di rischio geopolitico con notizie e composizione.',
    url: 'https://hormuzindex.info/explain',
    siteName: 'Hormuz Index',
    locale: 'it_IT',
    type: 'article',
  },
};

export default function ExplainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
