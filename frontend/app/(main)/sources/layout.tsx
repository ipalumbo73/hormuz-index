import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fonti Dati — Hormuz Index',
  description: 'Catalogo delle fonti utilizzate dal sistema Hormuz Index: agenzie di stampa, fonti ufficiali, think tank, con punteggio di affidabilità per ciascuna.',
  alternates: {
    canonical: 'https://hormuzindex.info/sources',
    languages: { 'en': 'https://hormuzindex.info/en/sources' },
  },
  openGraph: {
    title: 'Fonti Dati — Hormuz Index',
    description: 'Catalogo fonti: agenzie di stampa, fonti ufficiali, think tank con punteggi di affidabilità.',
    url: 'https://hormuzindex.info/sources',
    siteName: 'Hormuz Index',
    locale: 'it_IT',
    type: 'website',
  },
};

export default function SourcesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
