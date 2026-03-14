import NavHeader from '@/components/NavHeader';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hormuz Index — Dashboard Crisi Geopolitica Iran-USA-Israele',
  description: 'Sistema di early warning geopolitico per la crisi Iran-USA-Israele. 7 indici di rischio in tempo reale, 5 scenari di escalation, mappa eventi e timeline.',
  keywords: ['geopolitica', 'Iran', 'Israele', 'USA', 'crisi', 'nucleare', 'Hormuz', 'risk index', 'early warning', 'escalation'],
  alternates: {
    canonical: 'https://hormuzindex.info/',
    languages: { 'en': 'https://hormuzindex.info/en' },
  },
  openGraph: {
    title: 'Hormuz Index — Dashboard Crisi Geopolitica',
    description: 'Sistema di early warning per la crisi Iran-USA-Israele. Indici di rischio, scenari di escalation, analisi in tempo reale.',
    url: 'https://hormuzindex.info/',
    siteName: 'Hormuz Index',
    locale: 'it_IT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hormuz Index — Dashboard Crisi Geopolitica',
    description: 'Sistema di early warning per la crisi Iran-USA-Israele.',
  },
};

export default function ItalianLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavHeader lang="it" />
      <main className="max-w-[1280px] mx-auto px-3 sm:px-6 py-4 sm:py-5">
        {children}
      </main>
      <footer className="text-center py-5 pb-10 text-[11px] font-mono text-white/20">
        Hormuz Index · Fonte: analisi multi-sorgente (GDELT, RSS, NewsData)
      </footer>
    </>
  );
}
