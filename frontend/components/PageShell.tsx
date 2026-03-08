import NavHeader from './NavHeader';

interface PageShellProps {
  lang?: 'it' | 'en';
  children: React.ReactNode;
}

export default function PageShell({ lang = 'it', children }: PageShellProps) {
  const footerText = lang === 'en'
    ? 'Hormuz Index · Source: multi-source analysis (GDELT, RSS, NewsData)'
    : 'Hormuz Index · Fonte: analisi multi-sorgente (GDELT, RSS, NewsData)';

  return (
    <>
      <NavHeader lang={lang} />
      <main className="max-w-[1280px] mx-auto px-6 py-5">
        {children}
      </main>
      <footer className="text-center py-5 pb-10 text-[11px] font-mono text-white/20">
        {footerText}
      </footer>
    </>
  );
}
