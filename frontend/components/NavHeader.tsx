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
          <a href={switchHref} className="ml-2 px-2.5 py-1 text-[11px] font-bold font-mono text-white/30 hover:text-white/60 hover:bg-white/5 rounded-md transition-all border border-white/10">
            {switchLabel}
          </a>
        </nav>
      </div>
    </header>
  );
}
