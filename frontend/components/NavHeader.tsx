interface NavHeaderProps {
  lang?: 'it' | 'en';
}

export default function NavHeader({ lang = 'it' }: NavHeaderProps) {
  const isEn = lang === 'en';
  const prefix = isEn ? '/en' : '';
  const switchHref = isEn ? '/' : '/en';
  const switchLabel = isEn ? 'IT' : 'EN';

  const links = isEn
    ? [
        { href: '/en', label: 'Dashboard' },
        { href: '/en/timeline', label: 'Timeline' },
        { href: '/en/nuclear', label: 'Nuclear' },
        { href: '/en/sources', label: 'Sources' },
        { href: '/en/explain', label: 'Model' },
      ]
    : [
        { href: '/', label: 'Dashboard' },
        { href: '/timeline', label: 'Timeline' },
        { href: '/nuclear', label: 'Nuclear' },
        { href: '/sources', label: 'Sources' },
        { href: '/explain', label: 'Modello' },
      ];

  const footerText = isEn
    ? 'Hormuz Index · Source: multi-source analysis (GDELT, RSS, NewsData)'
    : 'Hormuz Index · Fonte: analisi multi-sorgente (GDELT, RSS, NewsData)';

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] backdrop-blur-xl" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,14,23,0.9) 100%)' }}>
      <div className="flex items-center justify-between max-w-[1280px] mx-auto px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>HI</div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">Hormuz <span className="text-orange-500">Index</span></span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'pulse-dot 1.5s infinite' }} />
            LIVE
          </span>
        </div>
        <nav className="flex gap-1 items-center">
          {links.map(link => (
            <a key={link.href} href={link.href} className="px-3.5 py-1.5 text-[13px] font-medium text-white/45 hover:text-white/70 hover:bg-white/5 rounded-md transition-all">
              {link.label}
            </a>
          ))}
          <a href="https://github.com/ipalumbo73/hormuz-index" target="_blank" rel="noopener noreferrer" className="ml-1 px-2 py-1.5 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-md transition-all" title="GitHub">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <a href={switchHref} className="ml-1 px-2.5 py-1 text-[11px] font-bold font-mono text-white/30 hover:text-white/60 hover:bg-white/5 rounded-md transition-all border border-white/10">
            {switchLabel}
          </a>
        </nav>
      </div>
    </header>
  );
}
