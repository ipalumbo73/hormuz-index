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
      {/* Collapsed header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2 text-[12px] text-white/50">
          <span className="flex-shrink-0">{'\u26A0\uFE0F'}</span>
          <span>Modello sperimentale &mdash; Metodologia e limiti</span>
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
            <div className="text-[12px] text-white/60 font-semibold mb-1">Nota metodologica</div>
            <p>
              Hormuz Index &egrave; un sistema sperimentale di aggregazione e analisi automatica di
              notizie. I valori numerici rappresentano stime indicative, non previsioni calibrate.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">Fonti</div>
            <p>
              I dati provengono da 30+ fonti pubbliche (agenzie stampa, RSS, API) e GDELT. La
              classificazione eventi usa pattern matching rule-based.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">Modello</div>
            <p>
              Gli indici (0-100) sono medie pesate di segnali estratti dalle notizie con finestra
              temporale (50% 24h, 30% 7gg, 20% 30gg). Gli scenari usano una matrice di pesi con
              priors bayesiani e bootstrap Monte Carlo per le bande di incertezza.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">Limiti</div>
            <p>
              I pesi del modello sono calibrati su framework accademici (GCRI, NTI Nuclear Security
              Index, scala Goldstein) ma non sono stati validati con back-testing completo su crisi
              storiche. Le probabilit&agrave; includono bande di incertezza (intervallo al 90%) per
              riflettere questa limitazione.
            </p>
          </div>

          <div>
            <div className="text-white/55 font-medium mb-0.5">Come interpretare</div>
            <p>
              Usare come strumento esplorativo di monitoraggio, non come previsione. I trend e le
              variazioni relative sono pi&ugrave; significativi dei valori assoluti. Confrontare
              sempre con fonti primarie e analisi esperte.
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
