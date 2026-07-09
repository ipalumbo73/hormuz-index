import type { Metadata } from 'next'

export type Lang = 'en' | 'it'

export const SITE_URL = 'https://hormuzindex.info'

/** Page slugs, keyed by route. '' is the dashboard at the locale root. */
export type PageKey =
  | 'home'
  | 'briefing'
  | 'timeline'
  | 'nuclear'
  | 'sources'
  | 'explain'
  | 'methodology'

const SLUGS: Record<PageKey, string> = {
  home: '',
  briefing: 'briefing',
  timeline: 'timeline',
  nuclear: 'nuclear',
  sources: 'sources',
  explain: 'explain',
  methodology: 'methodology',
}

/** English is the default locale and occupies the root; Italian is nested under /it. */
export function pageUrl(lang: Lang, page: PageKey): string {
  const slug = SLUGS[page]
  const base = lang === 'en' ? SITE_URL : `${SITE_URL}/it`
  return slug ? `${base}/${slug}` : base || SITE_URL
}

interface Copy {
  title: string
  description: string
  ogTitle?: string
}

const EN: Record<PageKey, Copy> = {
  home: {
    title: 'Hormuz Index Live — Iran War & Nuclear Risk Tracker',
    description:
      'Live tracking of the Iran war and the Strait of Hormuz. 7 geopolitical risk indices updated in real time, 5 escalation scenarios, and Iran nuclear capacity signals.',
    ogTitle: 'Hormuz Index Live — Iran War & Nuclear Risk Tracker',
  },
  briefing: {
    title: 'Iran War Briefing — Daily Escalation Report',
    description:
      'Daily briefing on the Iran–US–Israel war: current risk indices, dominant escalation scenario, and the key events of the last 24 hours in the Strait of Hormuz.',
  },
  timeline: {
    title: 'Iran War Timeline — Live Escalation Events',
    description:
      'Live timeline of the Iran war and Hormuz escalation. Every ingested event, classified by signal and scored for impact on the risk indices.',
  },
  nuclear: {
    title: 'Iran Nuclear Capacity — Breakout Tracker',
    description:
      'Tracking Iran nuclear capacity: IAEA verification loss, enrichment gaps, breakout signals, and the nuclear opacity index with its six sub-components.',
  },
  sources: {
    title: 'Sources & Reliability',
    description:
      'Every source feeding the Hormuz Index, with its reliability weight. Reuters and AP score highest; social media is excluded from event scoring.',
  },
  explain: {
    title: 'Risk Model — How the Index Is Computed',
    description:
      'The scoring model behind the Hormuz Index: event impact, rolling windows, the seven risk indices, and how escalation scenario probabilities are derived.',
  },
  methodology: {
    title: 'Methodology — Early Warning System',
    description:
      'Full methodology of the Hormuz Index: ingestion, deduplication, signal classification, index formulas, scenario weighting, and known limitations.',
  },
}

const IT: Record<PageKey, Copy> = {
  home: {
    title: 'Hormuz Index Live — Guerra Iran e Rischio Nucleare',
    description:
      'Monitoraggio in tempo reale della guerra in Iran e dello Stretto di Hormuz. 7 indici di rischio geopolitico, 5 scenari di escalation e la capacità nucleare iraniana.',
  },
  briefing: {
    title: 'Briefing Guerra Iran — Report Quotidiano',
    description:
      'Briefing quotidiano sulla crisi Iran-USA-Israele: indici di rischio, scenario dominante ed eventi chiave delle ultime 24 ore nello Stretto di Hormuz.',
  },
  timeline: {
    title: 'Timeline Guerra Iran — Eventi di Escalation',
    description:
      'Cronologia in tempo reale della guerra in Iran e dell’escalation su Hormuz. Ogni evento classificato per segnale e pesato sugli indici di rischio.',
  },
  nuclear: {
    title: 'Capacità Nucleare Iran — Breakout',
    description:
      'Monitoraggio della capacità nucleare iraniana: perdita di verifica IAEA, gap di arricchimento, segnali di breakout e indice di opacità nucleare.',
  },
  sources: {
    title: 'Fonti e Affidabilità',
    description:
      'Tutte le fonti che alimentano l’Hormuz Index, con il rispettivo peso di affidabilità. Reuters e AP hanno il punteggio più alto; i social sono esclusi.',
  },
  explain: {
    title: 'Modello di Rischio — Come si Calcola',
    description:
      'Il modello di scoring dietro l’Hormuz Index: impatto degli eventi, finestre mobili, i sette indici e come nascono le probabilità degli scenari.',
  },
  methodology: {
    title: 'Metodologia — Sistema di Early Warning',
    description:
      'Metodologia completa: ingestione, deduplica, classificazione dei segnali, formule degli indici, pesatura degli scenari e limiti noti del modello.',
  },
}

const COPY: Record<Lang, Record<PageKey, Copy>> = { en: EN, it: IT }

/**
 * Builds metadata for a localized page, including the hreflang cluster.
 * x-default points at English, which is the default locale.
 */
export function pageMetadata(page: PageKey, lang: Lang): Metadata {
  const copy = COPY[lang][page]
  const url = pageUrl(lang, page)
  const isHome = page === 'home'

  // Titles are absolute so they never depend on template inheritance: a parent
  // layout using `absolute` silently suppresses the root template for its children.
  // The homepage already carries the brand; the others get it appended, staying under
  // the ~60 characters Google shows before truncating.
  const title = isHome ? copy.title : `${copy.title} | Hormuz Index`

  return {
    title: { absolute: title },
    description: copy.description,
    alternates: {
      canonical: url,
      languages: {
        en: pageUrl('en', page),
        it: pageUrl('it', page),
        'x-default': pageUrl('en', page),
      },
    },
    openGraph: {
      title: copy.ogTitle ?? copy.title,
      description: copy.description,
      url,
      siteName: 'Hormuz Index',
      locale: lang === 'en' ? 'en_US' : 'it_IT',
      alternateLocale: lang === 'en' ? 'it_IT' : 'en_US',
      type: isHome ? 'website' : 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.ogTitle ?? copy.title,
      description: copy.description,
    },
  }
}

/** Admin is a private surface: keep it out of the index entirely. */
export const noindexMetadata: Metadata = {
  title: 'Admin — Hormuz Index',
  robots: { index: false, follow: false },
}
