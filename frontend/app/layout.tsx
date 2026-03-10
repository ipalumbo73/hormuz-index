import type { Metadata } from 'next'
import './globals.css'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: 'Hormuz Index — Crisis Dashboard',
  description: 'Iran-Gulf Geopolitical Crisis Early Warning System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className="min-h-screen bg-dark-900">
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}
