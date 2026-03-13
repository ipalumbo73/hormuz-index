'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function CookieBanner() {
  const pathname = usePathname();
  const isEn = pathname.startsWith('/en');
  const [consent, setConsent] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cookie_consent');
    if (stored === 'accepted') {
      setConsent('accepted');
    } else if (stored === 'rejected') {
      setConsent('rejected');
    } else {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setConsent('accepted');
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem('cookie_consent', 'rejected');
    setConsent('rejected');
    setVisible(false);
  };

  return (
    <>
      {/* Load GA only if accepted */}
      {consent === 'accepted' && GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}

      {/* Banner */}
      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-3 sm:p-4" style={{ background: 'rgba(10,14,23,0.97)', borderTop: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-[12px] sm:text-[13px] text-white/60 leading-relaxed">
              {isEn
                ? 'This site uses technical and analytics cookies (Google Analytics) to improve your browsing experience. No personal data is collected or shared with third parties for commercial purposes.'
                : 'Questo sito utilizza cookie tecnici e di analisi (Google Analytics) per migliorare l\u0027esperienza di navigazione. Nessun dato personale viene raccolto o condiviso con terze parti per fini commerciali.'}
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={reject}
                className="px-3 sm:px-4 py-1.5 text-[12px] sm:text-xs font-medium rounded-lg transition-all text-white/40 hover:text-white/60"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {isEn ? 'Reject' : 'Rifiuta'}
              </button>
              <button
                onClick={accept}
                className="px-3 sm:px-4 py-1.5 text-[12px] sm:text-xs font-medium rounded-lg transition-all text-white hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}
              >
                {isEn ? 'Accept' : 'Accetta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
