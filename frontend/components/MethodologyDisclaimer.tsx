'use client';
import { useState } from 'react';

export default function MethodologyDisclaimer() {
  const [expanded, setExpanded] = useState(false);

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
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2 text-[12px] text-white/50">
          <span className="flex-shrink-0">{'\u26A0\uFE0F'}</span>
          <span>Questo sistema analizza notizie pubbliche, non fatti verificati &mdash; Leggi le avvertenze</span>
        </span>
        <span
          className="text-white/30 text-[11px] transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          &#9662;
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 text-[11px] text-white/45 leading-relaxed">
          <div>
            <div className="text-[12px] text-white/60 font-semibold mb-1">Avvertenza importante</div>
            <p>
              Hormuz Index <strong className="text-white/60">non &egrave; un sistema di intelligence</strong>.
              Analizza esclusivamente notizie pubbliche provenienti da media internazionali (agenzie stampa,
              RSS, aggregatori). I dati riflettono il <strong className="text-white/60">tono mediatico</strong>,
              non necessariamente la realt&agrave; sul campo. I media tendono a enfatizzare notizie
              allarmistiche &mdash; questo bias si riflette nei valori degli indici.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">Cosa misurano gli indici</div>
            <p>
              Gli indici (0-100) rappresentano l&rsquo;intensit&agrave; della <strong className="text-white/60">copertura
              mediatica</strong> su ciascun tema, non il livello di rischio reale. Un indice alto significa
              che i media parlano molto di quel tema, non che il rischio sia effettivamente elevato.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">Scenari nucleari</div>
            <p>
              L&rsquo;Iran non possiede armi nucleari. Gli scenari &ldquo;coercive&rdquo; e &ldquo;actual nuclear
              use&rdquo; si riferiscono esclusivamente alla possibilit&agrave; che USA o Israele (gli unici
              attori con armi nucleari nella regione) le utilizzino. Storicamente, nessuna arma nucleare
              &egrave; stata usata dal 1945. Le probabilit&agrave; mostrate sono stime indicative basate
              sul tono delle notizie, non previsioni calibrate.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">Come interpretare</div>
            <p>
              Usare come strumento esplorativo per seguire le tendenze della copertura mediatica.
              I <strong className="text-white/60">trend relativi</strong> (variazioni nel tempo) sono pi&ugrave;
              significativi dei valori assoluti. Confrontare sempre con fonti primarie, rapporti istituzionali
              (IAEA, ICG) e analisi esperte prima di trarre conclusioni.
            </p>
          </div>

          <div className="pt-1">
            <a href="/methodology" className="text-white/30 underline underline-offset-2 cursor-pointer hover:text-white/50 transition-colors">
              Metodologia completa e riferimenti accademici
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
