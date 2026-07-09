import type { Metadata } from 'next'
import './globals.css'
import CookieBanner from '@/components/CookieBanner'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Hormuz Index Live — Iran War & Nuclear Risk Tracker',
    template: '%s | Hormuz Index',
  },
  description:
    'Live tracking of the Iran war and the Strait of Hormuz. 7 geopolitical risk indices updated in real time, 5 escalation scenarios, and Iran nuclear capacity signals.',
  keywords: [
    'Hormuz Index',
    'Hormuz Index Live',
    'Iran war live',
    'Hormuz war live',
    'Strait of Hormuz',
    'Iran nuclear capacity',
    'nuclear breakout',
    'escalation scenarios',
    'geopolitical risk index',
    'early warning system',
    'IAEA',
  ],
  authors: [{ name: 'Hormuz Index' }],
  creator: 'Hormuz Index',
  publisher: 'Hormuz Index',
  formatDetection: { telephone: false },
  // Read at build time. Unset means Next emits no verification tag, so the token
  // never lands in this public repository.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION }
      : undefined,
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
}

// Per-page canonical and hreflang links are emitted from each page's `alternates`
// metadata. Do not hardcode them here: a static <link rel="canonical"> in <head>
// would point every page at the homepage.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Hormuz Index',
  alternateName: 'Hormuz Index Live',
  description:
    'Live tracker for the Iran war, Strait of Hormuz disruption, and Iran nuclear capacity. Seven real-time geopolitical risk indices and five escalation scenarios with explainable alerts.',
  url: SITE_URL,
  applicationCategory: 'SecurityApplication',
  operatingSystem: 'Web',
  inLanguage: ['en', 'it'],
  author: {
    '@type': 'Organization',
    name: 'Hormuz Index',
    url: SITE_URL,
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
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
