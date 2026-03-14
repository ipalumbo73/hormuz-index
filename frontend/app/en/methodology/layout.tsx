import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Methodology — Hormuz Index',
  description: 'Complete methodology of the Hormuz Index system: index formulas, weight matrix calibrated on 20 historical events, Bayesian scenarios, Monte Carlo confidence intervals, limitations and references.',
  alternates: {
    canonical: 'https://hormuzindex.info/en/methodology',
    languages: { 'it': 'https://hormuzindex.info/methodology' },
  },
  openGraph: {
    title: 'Methodology — Hormuz Index',
    description: 'Geopolitical early warning methodology: risk indices, scenarios, historical calibration.',
    url: 'https://hormuzindex.info/en/methodology',
    siteName: 'Hormuz Index',
    locale: 'en_US',
    type: 'article',
  },
}

export default function MethodologyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
