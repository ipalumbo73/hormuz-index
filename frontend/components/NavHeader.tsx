'use client';
import { useState } from 'react';

interface NavHeaderProps {
  lang?: 'it' | 'en';
}

export default function NavHeader({ lang = 'it' }: NavHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isEn = lang === 'en';
  const prefix = isEn ? '/en' : '';
  const switchHref = isEn ? '/' : '/en';
  const switchLabel = isEn ? 'IT' : 'EN';

  const links = isEn
    ? [
        { href: '/en', label: 'Dashboard' },
        { href: '/en/briefing', label: 'Briefing' },
        { href: '/en/timeline', label: 'Timeline' },
        { href: '/en/nuclear', label: 'Nuclear' },
        { href: '/en/sources', label: 'Sources' },
        { href: '/en/explain', label: 'Model' },
      ]
    : [
        { href: '/', label: 'Dashboard' },
        { href: '/briefing', label: 'Briefing' },
        { href: '/timeline', label: 'Timeline' },
        { href: '/nuclear', label: 'Nuclear' },
        { href: '/sources', label: 'Sources' },
        { href: '/explain', label: 'Modello' },
      ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] backdrop-blur-xl" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,14,23,0.9) 100%)' }}>
      <div className="flex items-center justify-between max-w-[1280px] mx-auto px-3 sm:px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] sm:text-xs" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>HI</div>
          <div>
            <span className="text-base sm:text-lg font-bold text-white tracking-tight">Hormuz <span className="text-orange-500">Index</span></span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'pulse-dot 1.5s infinite' }} />
            LIVE
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1 items-center">
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

        {/* Mobile: lang switch + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <a href={switchHref} className="px-2 py-1 text-[11px] font-bold font-mono text-white/30 hover:text-white/60 rounded-md border border-white/10">
            {switchLabel}
          </a>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-white/50 hover:text-white/80 hover:bg-white/5 rounded-md transition-all"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/[0.06] px-3 py-2" style={{ background: 'rgba(10,14,23,0.98)' }}>
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="block px-4 py-2.5 text-[14px] font-medium text-white/55 hover:text-white/80 hover:bg-white/5 rounded-md transition-all"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/ipalumbo73/hormuz-index"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2.5 text-[14px] font-medium text-white/40 hover:text-white/60 rounded-md transition-all"
          >
            GitHub
          </a>
        </div>
      )}
    </header>
  );
}
