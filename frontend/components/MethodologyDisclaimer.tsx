'use client';
import { useState } from 'react';

interface MethodologyDisclaimerProps {
  lang?: 'it' | 'en';
}

const CONTENT = {
  it: {
    banner: 'Questo sistema analizza notizie pubbliche, non fatti verificati — Leggi le avvertenze',
    sections: [
      {
        title: 'Avvertenza importante',
        titleClass: 'text-[12px] text-white/60 font-semibold mb-1',
        body: (
          <p>
            Hormuz Index <strong className="text-white/60">non &egrave; un sistema di intelligence</strong>.
            Analizza esclusivamente notizie pubbliche provenienti da media internazionali (agenzie stampa,
            RSS, aggregatori). I dati riflettono il <strong className="text-white/60">tono mediatico</strong>,
            non necessariamente la realt&agrave; sul campo. I media tendono a enfatizzare notizie
            allarmistiche &mdash; questo bias si riflette nei valori degli indici.
          </p>
        ),
      },
      {
        title: 'Cosa misurano gli indici',
        titleClass: 'text-white/55 font-medium mb-0.5',
        body: (
          <p>
            Gli indici (0-100) rappresentano l&rsquo;intensit&agrave; della <strong className="text-white/60">copertura
            mediatica</strong> su ciascun tema, non il livello di rischio reale. Un indice alto significa
            che i media parlano molto di quel tema, non che il rischio sia effettivamente elevato.
          </p>
        ),
      },
      {
        title: 'Scenari nucleari',
        titleClass: 'text-white/55 font-medium mb-0.5',
        body: (
          <p>
            L&rsquo;Iran non possiede armi nucleari. Gli scenari &ldquo;coercive&rdquo; e &ldquo;actual nuclear
            use&rdquo; si riferiscono esclusivamente alla possibilit&agrave; che USA o Israele (gli unici
            attori con armi nucleari nella regione) le utilizzino. Storicamente, nessuna arma nucleare
            &egrave; stata usata dal 1945. Le probabilit&agrave; mostrate sono stime indicative basate
            sul tono delle notizie, non previsioni calibrate.
          </p>
        ),
      },
      {
        title: 'Come interpretare',
        titleClass: 'text-white/55 font-medium mb-0.5',
        body: (
          <p>
            Usare come strumento esplorativo per seguire le tendenze della copertura mediatica.
            I <strong className="text-white/60">trend relativi</strong> (variazioni nel tempo) sono pi&ugrave;
            significativi dei valori assoluti. Confrontare sempre con fonti primarie, rapporti istituzionali
            (IAEA, ICG) e analisi esperte prima di trarre conclusioni.
          </p>
        ),
      },
    ],
    methodologyHref: '/methodology',
    methodologyLabel: 'Metodologia completa e riferimenti accademici',
  },
  en: {
    banner: 'This system analyzes public news, not verified facts — Read the disclaimer',
    sections: [
      {
        title: 'Important disclaimer',
        titleClass: 'text-[12px] text-white/60 font-semibold mb-1',
        body: (
          <p>
            Hormuz Index is <strong className="text-white/60">not an intelligence system</strong>.
            It exclusively analyzes public news from international media (wire services,
            RSS feeds, aggregators). The data reflects <strong className="text-white/60">media tone</strong>,
            not necessarily the situation on the ground. Media outlets tend to emphasize alarming
            news &mdash; this bias is reflected in the index values.
          </p>
        ),
      },
      {
        title: 'What the indices measure',
        titleClass: 'text-white/55 font-medium mb-0.5',
        body: (
          <p>
            The indices (0-100) represent the intensity of <strong className="text-white/60">media
            coverage</strong> on each topic, not the actual risk level. A high index means
            the media is talking a lot about that topic, not that the risk is necessarily high.
          </p>
        ),
      },
      {
        title: 'Nuclear scenarios',
        titleClass: 'text-white/55 font-medium mb-0.5',
        body: (
          <p>
            Iran does not possess nuclear weapons. The &ldquo;coercive&rdquo; and &ldquo;actual nuclear
            use&rdquo; scenarios refer exclusively to the possibility that the USA or Israel (the only
            actors with nuclear weapons in the region) might use them. Historically, no nuclear weapon
            has been used since 1945. The probabilities shown are indicative estimates based on
            news tone, not calibrated forecasts.
          </p>
        ),
      },
      {
        title: 'How to interpret',
        titleClass: 'text-white/55 font-medium mb-0.5',
        body: (
          <p>
            Use as an exploratory tool to follow media coverage trends.
            <strong className="text-white/60"> Relative trends</strong> (changes over time) are more
            meaningful than absolute values. Always compare with primary sources, institutional
            reports (IAEA, ICG) and expert analysis before drawing conclusions.
          </p>
        ),
      },
    ],
    methodologyHref: '/en/methodology',
    methodologyLabel: 'Full methodology and academic references',
  },
};

export default function MethodologyDisclaimer({ lang = 'it' }: MethodologyDisclaimerProps) {
  const [expanded, setExpanded] = useState(false);
  const content = CONTENT[lang];

  return (
    <div
      className="rounded-[10px] overflow-hidden transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {/* Always visible banner */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2 text-[12px] text-white/50">
          <span className="flex-shrink-0" role="img" aria-label="Warning">{'⚠️'}</span>
          <span>{content.banner}</span>
        </span>
        <span
          aria-hidden="true"
          className="text-white/30 text-[11px] transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          &#9662;
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 text-[11px] text-white/45 leading-relaxed">
          {content.sections.map((section) => (
            <div key={section.title}>
              <div className={section.titleClass}>{section.title}</div>
              {section.body}
            </div>
          ))}

          <div className="pt-1">
            <a href={content.methodologyHref} className="text-white/30 underline underline-offset-2 cursor-pointer hover:text-white/50 transition-colors">
              {content.methodologyLabel}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
