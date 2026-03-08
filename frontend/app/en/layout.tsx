import NavHeader from '@/components/NavHeader';

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavHeader lang="en" />
      <main className="max-w-[1280px] mx-auto px-6 py-5">
        {children}
      </main>
      <footer className="text-center py-5 pb-10 text-[11px] font-mono text-white/20">
        Hormuz Index · Source: multi-source analysis (GDELT, RSS, NewsData)
      </footer>
    </>
  );
}
