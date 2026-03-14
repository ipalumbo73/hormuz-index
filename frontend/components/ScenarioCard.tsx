'use client';
import { useState } from 'react';

interface ScenarioCardProps {
  name: string;
  probability: number;
  score: number;
  delta?: number;
  ci_low?: number;
  ci_high?: number;
}

const SCENARIO_COLORS: Record<string, string> = {
  contained: '#22c55e',
  regional: '#ef4444',
  threshold: '#f59e0b',
  coercive: '#f97316',
  actual: '#991b1b',
};

const SCENARIO_INFO: Record<string, { label: string; labelIt: string; description: string; drivers: string; example: string; icon: string }> = {
  contained: {
    label: 'Contained Conflict',
    labelIt: 'Conflitto Contenuto',
    description: 'Scambi militari limitati e circoscritti tra Iran e Israele/USA, senza coinvolgimento su larga scala di altri attori regionali. Il conflitto resta sotto controllo diplomatico.',
    drivers: 'La diplomazia (DCI) lo alimenta fortemente (+0.25/pt). Tutti gli altri indici lo riducono: NOI (-0.15/pt), BSI e GAI (-0.12/pt), HDI (-0.10/pt), SRI e PAI (-0.08/pt). Più la situazione si aggrava, meno probabile è il contenimento.',
    example: 'Raid aerei mirati seguiti da de-escalation, attacchi limitati ai proxy senza risposta diretta tra stati.',
    icon: '🟢',
  },
  regional: {
    label: 'Regional War',
    labelIt: 'Guerra Regionale',
    description: 'Conflitto su larga scala che coinvolge più paesi del Golfo, proxy armati (Hezbollah, Houthi, milizie irachene), e potenziale disruption dello Stretto di Hormuz e delle rotte petrolifere.',
    drivers: 'Alimentato da GAI (+0.30/pt), HDI (+0.25/pt), PAI (+0.20/pt). La diplomazia DCI frena (-0.15/pt). Se DCI >= 65, riduzione del 10%.',
    example: 'Attacco iraniano a basi USA nel Golfo + risposta Hezbollah + blocco di Hormuz + coinvolgimento Arabia Saudita.',
    icon: '🟡',
  },
  threshold: {
    label: 'Nuclear Threshold',
    labelIt: 'Crisi Soglia Nucleare',
    description: "La dimensione nucleare entra nella crisi. L'Iran accelera il programma nucleare sotto pressione bellica (arricchimento, espulsione ispettori IAEA), oppure USA/Israele — che le armi nucleari le hanno già — minacciano o considerano opzioni nucleari tattiche.",
    drivers: 'Guidato da BSI (+0.30/pt) e NOI (+0.25/pt): opacità del programma iraniano e segnali di breakout. SRI (+0.15/pt) contribuisce con la retorica. DCI frena (-0.20/pt). Boost di +5 punti se NOI >= 75 e BSI >= 65.',
    example: "Iran arricchisce al 90%, espelle ispettori IAEA, attività a Fordow non verificabile, Israele minaccia azione preventiva.",
    icon: '🟠',
  },
  coercive: {
    label: 'Coercive Go-Nuclear',
    labelIt: 'Coercizione Nucleare',
    description: "Un attore usa la minaccia nucleare come leva coercitiva. USA/Israele possono usare la loro superiorità nucleare come pressione per forzare la resa. L'Iran può minacciare di armarsi o ritirarsi dal TNP, ma non possiede armi nucleari.",
    drivers: 'Guidato da SRI (+0.25/pt): retorica escalatoria da stati con armi nucleari. BSI (+0.22/pt) e NOI (+0.15/pt) contribuiscono. DCI frena (-0.18/pt). Boost di +4 punti se SRI >= 75 e BSI >= 70.',
    example: "USA/Israele: 'tutte le opzioni sul tavolo inclusa quella nucleare'. Iran: ritiro dal TNP, test missilistici con payload ambiguo.",
    icon: '🔴',
  },
  actual: {
    label: 'Actual Nuclear Use',
    labelIt: 'Uso Nucleare Effettivo',
    description: "Uso effettivo di un dispositivo nucleare nel teatro di conflitto. Può provenire SOLO da USA o Israele, che sono gli unici attori con armi nucleari operative in questa crisi. L'Iran non possiede armi nucleari e il suo programma è lontano dal produrne. L'unica eccezione sarebbe un trasferimento di dispositivi dalla Russia o dalla Cina — scenario monitorato ma estremamente improbabile.",
    drivers: "Guidato da SRI (+0.10/pt): retorica nucleare estrema da stati armati. BSI (+0.08/pt): postura nucleare attiva. NOI ha peso ZERO — l'Iran non può usare armi che non ha. Richiede convergenza estrema: SRI >= 85, BSI >= 80 e GAI >= 80. DCI frena (-0.12/pt).",
    example: 'Detonazione nucleare tattica USA/Israele in scenario di escalation estrema, o test atmosferico dimostrativo come deterrenza.',
    icon: '⚫',
  },
};

const SEVERITY_CONFIG: { min: number; label: string; bgClass: string }[] = [
  { min: 40, label: 'DOMINANTE', bgClass: 'bg-red-900/40' },
  { min: 25, label: 'ELEVATO', bgClass: 'bg-orange-900/40' },
  { min: 15, label: 'MODERATO', bgClass: 'bg-yellow-900/30' },
  { min: 5, label: 'BASSO', bgClass: 'bg-gray-700/40' },
  { min: 0, label: 'MINIMO', bgClass: 'bg-gray-800/40' },
];

// Inverted severity for "contained": high = good (stable), low = bad (critical)
const CONTAINED_SEVERITY_CONFIG: { min: number; label: string; bgClass: string; color: string }[] = [
  { min: 50, label: 'STABILE', bgClass: 'bg-green-900/40', color: '#22c55e' },
  { min: 35, label: 'PARZIALE', bgClass: 'bg-yellow-900/30', color: '#eab308' },
  { min: 20, label: 'DEBOLE', bgClass: 'bg-orange-900/40', color: '#f97316' },
  { min: 10, label: 'CRITICO', bgClass: 'bg-red-900/40', color: '#ef4444' },
  { min: 0, label: 'ASSENTE', bgClass: 'bg-red-900/50', color: '#991b1b' },
];

export default function ScenarioCard({ name, probability, score, delta, ci_low, ci_high }: ScenarioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const info = SCENARIO_INFO[name] || { label: name, labelIt: name, description: '', drivers: '', example: '', icon: '?' };

  // For "contained", use inverted severity scale and dynamic color
  const isContained = name === 'contained';
  const containedSev = isContained
    ? (CONTAINED_SEVERITY_CONFIG.find(s => probability >= s.min) || CONTAINED_SEVERITY_CONFIG[4])
    : null;
  const color = isContained ? (containedSev?.color || '#991b1b') : (SCENARIO_COLORS[name] || '#888');
  const severity = isContained
    ? { label: containedSev!.label, bgClass: containedSev!.bgClass }
    : (SEVERITY_CONFIG.find(s => probability >= s.min) || SEVERITY_CONFIG[4]);

  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-2 cursor-pointer transition-all hover:-translate-y-px" style={{
      borderLeft: `3px solid ${color}`,
      border: '1px solid rgba(255,255,255,0.06)',
      borderLeftWidth: 3,
      borderLeftColor: color,
      background: `linear-gradient(135deg, ${color}08, ${color}04)`,
    }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{info.icon}</span>
          <div>
            <span className="text-sm font-bold text-white block leading-tight">{info.labelIt}</span>
            <span className="text-[10px] text-gray-500">{info.label}</span>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${severity.bgClass}`} style={{ color }}>{severity.label}</span>
      </div>

      {/* Probability with CI */}
      <div className="flex items-end gap-2 flex-wrap">
        <span className="text-2xl font-bold leading-none" style={{ color }}>{probability.toFixed(1)}%</span>
        {ci_low != null && ci_high != null && (
          <span className="text-xs text-gray-400 font-mono pb-0.5" title="Intervallo di confidenza al 90% (Monte Carlo)">
            [{ci_low.toFixed(0)}&ndash;{ci_high.toFixed(0)}%]
          </span>
        )}
        {delta != null && delta !== 0 && (
          <span className={`text-xs font-mono pb-0.5 ${
            name === 'contained'
              ? (delta > 0 ? 'text-green-400' : 'text-red-400')
              : (delta > 0 ? 'text-red-400' : 'text-green-400')
          }`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
          </span>
        )}
        <span className="text-[10px] text-gray-500 pb-0.5">
          {delta != null && delta !== 0 ? 'vs 24h fa' : 'stima indicativa'}
        </span>
      </div>

      {/* Progress bar with CI band */}
      <div className="relative w-full bg-gray-700 rounded-full h-2">
        {ci_low != null && ci_high != null && (
          <div className="absolute h-2 rounded-full opacity-20" style={{
            left: `${Math.min(100, ci_low)}%`,
            width: `${Math.max(1, Math.min(100, ci_high) - Math.min(100, ci_low))}%`,
            backgroundColor: color,
          }} />
        )}
        <div className="absolute h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, probability)}%`, backgroundColor: color }} />
      </div>

      {/* Description */}
      <p className="text-[11px] text-gray-300 leading-relaxed">{info.description}</p>

      {/* Expand/collapse for details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-gray-400 hover:text-gray-200 text-left flex items-center gap-1 transition-colors"
      >
        <span className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>&#9654;</span>
        {expanded ? 'Nascondi dettagli tecnici' : 'Mostra dettagli tecnici'}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-gray-700/50 pt-2">
          <div>
            <p className="text-[10px] font-semibold text-gray-300 mb-0.5">Cosa lo muove:</p>
            <p className="text-[10px] text-gray-400 leading-relaxed">{info.drivers}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-300 mb-0.5">Esempio concreto:</p>
            <p className="text-[10px] text-gray-500 italic leading-relaxed">{info.example}</p>
          </div>
        </div>
      )}
    </div>
  );
}
