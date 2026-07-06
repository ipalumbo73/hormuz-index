'use client';
import { useState } from 'react';

interface ScenarioCardProps {
  name: string;
  probability: number;
  score: number;
  delta?: number;
  ci_low?: number;
  ci_high?: number;
  lang?: 'it' | 'en';
}

const SCENARIO_COLORS: Record<string, string> = {
  contained: '#22c55e',
  regional: '#ef4444',
  threshold: '#f59e0b',
  coercive: '#f97316',
  actual: '#991b1b',
};

interface ScenarioInfo {
  label: string;
  localLabel: string;
  description: string;
  drivers: string;
  example: string;
  icon: string;
}

const SCENARIO_INFO_IT: Record<string, ScenarioInfo> = {
  contained: {
    label: 'Contained Conflict',
    localLabel: 'Conflitto Contenuto',
    description: 'Scambi militari limitati e circoscritti tra Iran e Israele/USA, senza coinvolgimento su larga scala di altri attori regionali. Il conflitto resta sotto controllo diplomatico.',
    drivers: 'La diplomazia (DCI) lo alimenta (+0.20/pt). Tutti gli altri indici lo riducono: BSI (-0.22/pt), NOI (-0.26/pt), SRI (-0.14/pt), GAI (-0.12/pt), HDI (-0.10/pt), PAI (-0.08/pt). Più la situazione si aggrava, meno probabile è il contenimento.',
    example: 'Raid aerei mirati seguiti da de-escalation, attacchi limitati ai proxy senza risposta diretta tra stati.',
    icon: '🟢',
  },
  regional: {
    label: 'Regional War',
    localLabel: 'Guerra Regionale',
    description: 'Conflitto su larga scala che coinvolge più paesi del Golfo, proxy armati (Hezbollah, Houthi, milizie irachene), e potenziale disruption dello Stretto di Hormuz e delle rotte petrolifere.',
    drivers: 'Alimentato da GAI (+0.15/pt), HDI (+0.12/pt), PAI (+0.10/pt). Il collasso della diplomazia DCI è il driver più forte (-0.27/pt). Se DCI >= 65, riduzione del 10% su tutti gli scenari di escalation.',
    example: 'Attacco iraniano a basi USA nel Golfo + risposta Hezbollah + blocco di Hormuz + coinvolgimento Arabia Saudita.',
    icon: '🟡',
  },
  threshold: {
    label: 'Nuclear Threshold',
    localLabel: 'Crisi Soglia Nucleare',
    description: "La dimensione nucleare entra nella crisi. L'Iran accelera il programma nucleare sotto pressione bellica (arricchimento, espulsione ispettori IAEA), oppure USA/Israele — che le armi nucleari le hanno già — minacciano o considerano opzioni nucleari tattiche.",
    drivers: 'Guidato da BSI (+0.14/pt) e NOI (+0.10/pt): opacità del programma iraniano e segnali di breakout. SRI (+0.03/pt) contribuisce con la retorica. DCI frena (-0.25/pt). Boost di +5 punti se NOI >= 60 e BSI >= 55.',
    example: "Iran arricchisce al 90%, espelle ispettori IAEA, attività a Fordow non verificabile, Israele minaccia azione preventiva.",
    icon: '🟠',
  },
  coercive: {
    label: 'Coercive Go-Nuclear',
    localLabel: 'Coercizione Nucleare',
    description: "Un attore usa la minaccia nucleare come leva coercitiva. USA/Israele possono usare la loro superiorità nucleare come pressione per forzare la resa. L'Iran può minacciare di armarsi o ritirarsi dal TNP, ma non possiede armi nucleari.",
    drivers: 'Guidato da SRI (+0.13/pt): retorica escalatoria da stati con armi nucleari. BSI (+0.04/pt) contribuisce. DCI frena (-0.17/pt). Boost di +4 punti se SRI >= 65 e BSI >= 60.',
    example: "USA/Israele: 'tutte le opzioni sul tavolo inclusa quella nucleare'. Iran: ritiro dal TNP, test missilistici con payload ambiguo.",
    icon: '🔴',
  },
  actual: {
    label: 'Actual Nuclear Use',
    localLabel: 'Uso Nucleare Effettivo',
    description: "Uso effettivo di un dispositivo nucleare nel teatro di conflitto. Può provenire SOLO da USA o Israele, che sono gli unici attori con armi nucleari operative in questa crisi. L'Iran non possiede armi nucleari e il suo programma è lontano dal produrne. L'unica eccezione sarebbe un trasferimento di dispositivi dalla Russia o dalla Cina — scenario monitorato ma estremamente improbabile.",
    drivers: "Guidato da SRI (+0.04/pt) e BSI (+0.03/pt). NOI ha peso ZERO — l'Iran non può usare armi che non ha. Boost di +3 punti solo con convergenza estrema: SRI >= 85, BSI >= 80, GAI >= 85 e DCI <= 25. La retorica di annientamento da stati nucleari con collasso diplomatico aggiunge +2. DCI frena (-0.12/pt).",
    example: 'Detonazione nucleare tattica USA/Israele in scenario di escalation estrema, o test atmosferico dimostrativo come deterrenza.',
    icon: '⚫',
  },
};

const SCENARIO_INFO_EN: Record<string, ScenarioInfo> = {
  contained: {
    label: 'Contained Conflict',
    localLabel: 'Contained Conflict',
    description: 'Limited and circumscribed military exchanges between Iran and Israel/USA, without large-scale involvement of other regional actors. The conflict remains under diplomatic control.',
    drivers: 'Diplomacy (DCI) feeds it (+0.20/pt). All other indices reduce it: NOI (-0.26/pt), BSI (-0.22/pt), SRI (-0.14/pt), GAI (-0.12/pt), HDI (-0.10/pt), PAI (-0.08/pt). The worse the situation gets, the less likely containment becomes.',
    example: 'Targeted air raids followed by de-escalation, limited attacks on proxies without direct state-to-state response.',
    icon: '🟢',
  },
  regional: {
    label: 'Regional War',
    localLabel: 'Regional War',
    description: 'Large-scale conflict involving multiple Gulf countries, armed proxies (Hezbollah, Houthis, Iraqi militias), and potential disruption of the Strait of Hormuz and oil routes.',
    drivers: 'Driven by GAI (+0.15/pt), HDI (+0.12/pt), PAI (+0.10/pt). Collapse of diplomacy DCI is the strongest driver (-0.27/pt). If DCI >= 65, 10% reduction on all escalation scenarios.',
    example: 'Iranian attack on US bases in the Gulf + Hezbollah response + Hormuz blockade + Saudi Arabia involvement.',
    icon: '🟡',
  },
  threshold: {
    label: 'Nuclear Threshold',
    localLabel: 'Nuclear Threshold Crisis',
    description: "The nuclear dimension enters the crisis. Iran accelerates its nuclear program under wartime pressure (enrichment, expulsion of IAEA inspectors), or the USA/Israel — who already possess nuclear weapons — threaten or consider tactical nuclear options.",
    drivers: 'Driven by BSI (+0.14/pt) and NOI (+0.10/pt): opacity of the Iranian program and breakout signals. SRI (+0.03/pt) contributes through rhetoric. DCI slows it (-0.25/pt). +5 point boost if NOI >= 60 and BSI >= 55.',
    example: "Iran enriches to 90%, expels IAEA inspectors, unverifiable activity at Fordow, Israel threatens preemptive action.",
    icon: '🟠',
  },
  coercive: {
    label: 'Coercive Go-Nuclear',
    localLabel: 'Nuclear Coercion',
    description: "An actor uses nuclear threat as coercive leverage. The USA/Israel can use their nuclear superiority as pressure to force surrender. Iran may threaten to arm itself or withdraw from the NPT, but does not possess nuclear weapons.",
    drivers: 'Driven by SRI (+0.13/pt): escalatory rhetoric from nuclear-armed states. BSI (+0.04/pt) contributes. DCI slows it (-0.17/pt). +4 point boost if SRI >= 65 and BSI >= 60.',
    example: "USA/Israel: 'all options on the table including nuclear'. Iran: NPT withdrawal, missile tests with ambiguous payload.",
    icon: '🔴',
  },
  actual: {
    label: 'Actual Nuclear Use',
    localLabel: 'Actual Nuclear Use',
    description: "Actual use of a nuclear device in the theater of conflict. Can only come from the USA or Israel, the only actors with operational nuclear weapons in this crisis. Iran does not possess nuclear weapons and its program is far from producing any. The only exception would be a device transfer from Russia or China — a monitored but extremely unlikely scenario.",
    drivers: "Driven by SRI (+0.04/pt) and BSI (+0.03/pt). NOI has ZERO weight — Iran cannot use weapons it does not have. +3 point boost only under extreme convergence: SRI >= 85, BSI >= 80, GAI >= 85, and DCI <= 25. Annihilation rhetoric from nuclear-armed states with diplomatic collapse adds +2. DCI slows it (-0.12/pt).",
    example: 'Tactical nuclear detonation by USA/Israel in an extreme escalation scenario, or atmospheric demonstration test as deterrence.',
    icon: '⚫',
  },
};

const SEVERITY_CONFIG: Record<'it' | 'en', { min: number; label: string; bgClass: string }[]> = {
  it: [
    { min: 40, label: 'DOMINANTE', bgClass: 'bg-red-900/40' },
    { min: 25, label: 'ELEVATO', bgClass: 'bg-orange-900/40' },
    { min: 15, label: 'MODERATO', bgClass: 'bg-yellow-900/30' },
    { min: 5, label: 'BASSO', bgClass: 'bg-gray-700/40' },
    { min: 0, label: 'MINIMO', bgClass: 'bg-gray-800/40' },
  ],
  en: [
    { min: 40, label: 'DOMINANT', bgClass: 'bg-red-900/40' },
    { min: 25, label: 'ELEVATED', bgClass: 'bg-orange-900/40' },
    { min: 15, label: 'MODERATE', bgClass: 'bg-yellow-900/30' },
    { min: 5, label: 'LOW', bgClass: 'bg-gray-700/40' },
    { min: 0, label: 'MINIMAL', bgClass: 'bg-gray-800/40' },
  ],
};

// Inverted severity for "contained": high = good (stable), low = bad (critical)
const CONTAINED_SEVERITY_CONFIG: Record<'it' | 'en', { min: number; label: string; bgClass: string; color: string }[]> = {
  it: [
    { min: 50, label: 'STABILE', bgClass: 'bg-green-900/40', color: '#22c55e' },
    { min: 35, label: 'PARZIALE', bgClass: 'bg-yellow-900/30', color: '#eab308' },
    { min: 20, label: 'DEBOLE', bgClass: 'bg-orange-900/40', color: '#f97316' },
    { min: 10, label: 'CRITICO', bgClass: 'bg-red-900/40', color: '#ef4444' },
    { min: 0, label: 'ASSENTE', bgClass: 'bg-red-900/50', color: '#991b1b' },
  ],
  en: [
    { min: 50, label: 'STABLE', bgClass: 'bg-green-900/40', color: '#22c55e' },
    { min: 35, label: 'PARTIAL', bgClass: 'bg-yellow-900/30', color: '#eab308' },
    { min: 20, label: 'WEAK', bgClass: 'bg-orange-900/40', color: '#f97316' },
    { min: 10, label: 'CRITICAL', bgClass: 'bg-red-900/40', color: '#ef4444' },
    { min: 0, label: 'ABSENT', bgClass: 'bg-red-900/50', color: '#991b1b' },
  ],
};

const UI = {
  it: {
    ciTitle: 'Intervallo di confidenza al 90% (Monte Carlo)',
    vs24h: 'vs 24h fa',
    indicative: 'stima indicativa',
    hideDetails: 'Nascondi dettagli tecnici',
    showDetails: 'Mostra dettagli tecnici',
    drivers: 'Cosa lo muove:',
    example: 'Esempio concreto:',
  },
  en: {
    ciTitle: '90% confidence interval (Monte Carlo)',
    vs24h: 'vs 24h ago',
    indicative: 'indicative estimate',
    hideDetails: 'Hide technical details',
    showDetails: 'Show technical details',
    drivers: 'What drives it:',
    example: 'Concrete example:',
  },
};

export default function ScenarioCard({ name, probability, score, delta, ci_low, ci_high, lang = 'it' }: ScenarioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const infoDict = lang === 'en' ? SCENARIO_INFO_EN : SCENARIO_INFO_IT;
  const t = UI[lang];
  const info = infoDict[name] || { label: name, localLabel: name, description: '', drivers: '', example: '', icon: '?' };

  // For "contained", use inverted severity scale and dynamic color
  const isContained = name === 'contained';
  const containedConfig = CONTAINED_SEVERITY_CONFIG[lang];
  const containedSev = isContained
    ? (containedConfig.find(s => probability >= s.min) || containedConfig[4])
    : null;
  const color = isContained ? (containedSev?.color || '#991b1b') : (SCENARIO_COLORS[name] || '#888');
  const severity = isContained
    ? { label: containedSev!.label, bgClass: containedSev!.bgClass }
    : (SEVERITY_CONFIG[lang].find(s => probability >= s.min) || SEVERITY_CONFIG[lang][4]);

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
          <span className="text-lg" role="img" aria-label={info.label}>{info.icon}</span>
          <div>
            <span className="text-sm font-bold text-white block leading-tight">{info.localLabel}</span>
            <span className="text-[10px] text-gray-500">{info.label}</span>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${severity.bgClass}`} style={{ color }}>{severity.label}</span>
      </div>

      {/* Probability with CI */}
      <div className="flex items-end gap-2 flex-wrap">
        <span className="text-2xl font-bold leading-none" style={{ color }}>{probability.toFixed(1)}%</span>
        {ci_low != null && ci_high != null && (
          <span className="text-xs text-gray-400 font-mono pb-0.5" title={t.ciTitle}>
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
          {delta != null && delta !== 0 ? t.vs24h : t.indicative}
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
        aria-expanded={expanded}
        className="text-[10px] text-gray-400 hover:text-gray-200 text-left flex items-center gap-1 transition-colors"
      >
        <span aria-hidden="true" className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>&#9654;</span>
        {expanded ? t.hideDetails : t.showDetails}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-gray-700/50 pt-2">
          <div>
            <p className="text-[10px] font-semibold text-gray-300 mb-0.5">{t.drivers}</p>
            <p className="text-[10px] text-gray-400 leading-relaxed">{info.drivers}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-300 mb-0.5">{t.example}</p>
            <p className="text-[10px] text-gray-500 italic leading-relaxed">{info.example}</p>
          </div>
        </div>
      )}
    </div>
  );
}
