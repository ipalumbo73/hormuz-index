import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Metodologia — Hormuz Index',
  description: 'Metodologia completa del sistema Hormuz Index: formula degli indici, matrice dei pesi calibrata su 20 eventi storici, scenari bayesiani, intervalli di confidenza Monte Carlo, limitazioni e riferimenti bibliografici.',
  alternates: {
    canonical: 'https://hormuzindex.info/methodology',
    languages: { 'en': 'https://hormuzindex.info/en/methodology' },
  },
  openGraph: {
    title: 'Metodologia — Hormuz Index',
    description: 'Metodologia del sistema di early warning geopolitico: indici di rischio, scenari, calibrazione storica.',
    url: 'https://hormuzindex.info/methodology',
    siteName: 'Hormuz Index',
    locale: 'it_IT',
    type: 'article',
  },
};

export default function MethodologyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
