import type { Metadata } from 'next'
import './globals.css'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  metadataBase: new URL('https://hormuzindex.info'),
  title: {
    default: 'Hormuz Index — Crisis Dashboard',
    template: '%s | Hormuz Index',
  },
  description: 'Sistema di early warning geopolitico per la crisi Iran-USA-Israele. 7 indici di rischio in tempo reale, 5 scenari di escalation con calibrazione storica.',
  keywords: ['Hormuz Index', 'geopolitica', 'Iran', 'Israele', 'USA', 'crisi nucleare', 'risk index', 'early warning', 'escalation', 'IAEA', 'Stretto di Hormuz'],
  authors: [{ name: 'Hormuz Index' }],
  creator: 'Hormuz Index',
  publisher: 'Hormuz Index',
  formatDetection: { telephone: false },
  openGraph: {
    title: 'Hormuz Index — Crisis Dashboard',
    description: 'Sistema di early warning geopolitico per la crisi Iran-USA-Israele.',
    url: 'https://hormuzindex.info',
    siteName: 'Hormuz Index',
    locale: 'it_IT',
    alternateLocale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hormuz Index — Crisis Dashboard',
    description: 'Sistema di early warning geopolitico per la crisi Iran-USA-Israele.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
  alternates: {
    canonical: 'https://hormuzindex.info',
    languages: {
      'it': 'https://hormuzindex.info',
      'en': 'https://hormuzindex.info/en',
    },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Hormuz Index',
  description: 'Geopolitical early warning system for the Iran-USA-Israel crisis. Real-time risk indices, escalation scenarios, and event monitoring.',
  url: 'https://hormuzindex.info',
  applicationCategory: 'SecurityApplication',
  operatingSystem: 'Web',
  inLanguage: ['it', 'en'],
  author: {
    '@type': 'Organization',
    name: 'Hormuz Index',
    url: 'https://hormuzindex.info',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <head>
        <link rel="canonical" href="https://hormuzindex.info" />
        <link rel="alternate" hrefLang="it" href="https://hormuzindex.info" />
        <link rel="alternate" hrefLang="en" href="https://hormuzindex.info/en" />
        <link rel="alternate" hrefLang="x-default" href="https://hormuzindex.info" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-dark-900">
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}
