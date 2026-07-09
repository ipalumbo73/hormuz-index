import NavHeader from '@/components/NavHeader'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata('home', 'it')

export default function ItalianLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Next renders <html> only in the root layout, which is statically English.
          Correct the lang attribute for this subtree without giving up static rendering.
          Google reads hreflang rather than this attribute, but Bing and screen readers use it. */}
      <script
        dangerouslySetInnerHTML={{ __html: `document.documentElement.lang='it'` }}
      />
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
