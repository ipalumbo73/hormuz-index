'use client';
import { useState } from 'react';
import Sparkline from './Sparkline';

interface IndexGaugeProps {
  name: string;
  value: number;
  delta: number;
  level: string;
  history?: number[];
  ci_low?: number;
  ci_high?: number;
  lang?: 'it' | 'en';
}

interface IndexInfo {
  label: string;
  what: string;
  how: string;
  feeds: string;
  scale: [string, string];
  icon: string;
}

const INDEX_INFO_IT: Record<string, IndexInfo> = {
  NOI: {
    label: 'Nuclear Opacity',
    what: "Quanto il programma nucleare iraniano è opaco e non verificabile dall'IAEA.",
    how: '6 sotto-componenti pesate: perdita accesso ai siti (25%), perdita conoscenza materiali (25%), gap verifica arricchimento (20%), attività sotterranea (10%), rottura tecnico-diplomatica (10%), narrazioni contrastanti (10%).',
    feeds: 'Notizie su IAEA, ispezioni negate, arricchimento uranio, attività a Fordow/Natanz, rottura accordi.',
    scale: ['Trasparente', 'Opaco'],
    icon: '🔬',
  },
  GAI: {
    label: 'Gulf Attack',
    what: 'Intensità di attacchi a infrastrutture militari e civili nel Golfo Persico.',
    how: 'Media pesata degli eventi classificati come attacchi militari, missili/droni, attacchi a infrastrutture petrolifere e operazioni cyber nella regione.',
    feeds: 'Attacchi aerei, bombardamenti, strike missilistici, attacchi a raffinerie/porti, cyber-attacchi su infrastrutture.',
    scale: ['Nessun attacco', 'Attacchi massicci'],
    icon: '💥',
  },
  HDI: {
    label: 'Hormuz Disruption',
    what: 'Rischio di blocco o disruption della navigazione nello Stretto di Hormuz.',
    how: 'Media pesata di eventi legati a minacce alla navigazione, attacchi a petroliere, sequestri navali e minacce dirette allo Stretto.',
    feeds: 'Attacchi a navi cargo/petroliere, minacce di chiusura dello Stretto, incidenti marittimi nel Mar Rosso.',
    scale: ['Navigazione libera', 'Stretto bloccato'],
    icon: '🚢',
  },
  PAI: {
    label: 'Proxy Activation',
    what: "Livello di attivazione dei proxy iraniani: Hezbollah, Houthi e milizie irachene.",
    how: 'Media pesata di eventi proxy (attacchi Hezbollah, missili Houthi, azioni milizie) e vittime civili legate ai proxy.',
    feeds: 'Razzi Hezbollah, droni Houthi su navi, attacchi milizie in Iraq/Siria, vittime civili da proxy.',
    scale: ['Proxy inattivi', 'Piena attivazione'],
    icon: '⚔️',
  },
  SRI: {
    label: 'Strategic Rhetoric',
    what: "Quanto il linguaggio ufficiale di stati e leader è escalatorio e minaccioso.",
    how: "Media pesata di dichiarazioni con toni estremi: minacce nucleari, 'linee rosse', 'tutte le opzioni sul tavolo', sanzioni e pressioni economiche.",
    feeds: "Dichiarazioni di leader su 'minaccia esistenziale', opzioni nucleari, sanzioni, ultimatum, cambio di regime.",
    scale: ['Toni moderati', 'Retorica estrema'],
    icon: '🎙️',
  },
  BSI: {
    label: 'Breakout Signal',
    what: "Segnali che l'Iran si stia avvicinando alla capacità di costruire un'arma nucleare (breakout), o che USA/Israele stiano considerando opzioni nucleari.",
    how: "Media pesata di eventi su arricchimento ad alto livello, postura nucleare di stati armati, attacchi a siti nucleari e attività sotterranee.",
    feeds: "Arricchimento al 60-90%, attività a Fordow, postura nucleare USA/Israele, dispiegamento armi nucleari tattiche.",
    scale: ['Nessun segnale', 'Breakout imminente'],
    icon: '☢️',
  },
  DCI: {
    label: 'Diplomatic Cooling',
    what: "Segnali di dialogo diplomatico e de-escalation tra le parti. È l'unico indice 'positivo': più è alto, meglio è.",
    how: "Media pesata di eventi diplomatici: ripresa negoziati, mediazione dell'Oman, canali diplomatici, cessate il fuoco, proposte di pace.",
    feeds: 'Colloqui diplomatici, mediazione, hotline, cessate il fuoco, ritiro truppe, segnali di de-escalation.',
    scale: ['Nessun dialogo', 'Forte diplomazia'],
    icon: '🕊️',
  },
};

const INDEX_INFO_EN: Record<string, IndexInfo> = {
  NOI: {
    label: 'Nuclear Opacity',
    what: "How opaque and unverifiable Iran's nuclear program is to the IAEA.",
    how: '6 weighted sub-components: loss of site access (25%), loss of material knowledge (25%), enrichment verification gap (20%), underground activity (10%), technical-diplomatic breakdown (10%), conflicting narratives (10%).',
    feeds: 'News about IAEA, denied inspections, uranium enrichment, activity at Fordow/Natanz, agreement breakdowns.',
    scale: ['Transparent', 'Opaque'],
    icon: '🔬',
  },
  GAI: {
    label: 'Gulf Attack',
    what: 'Intensity of attacks on military and civilian infrastructure in the Persian Gulf.',
    how: 'Weighted average of events classified as military attacks, missiles/drones, attacks on oil infrastructure, and cyber operations in the region.',
    feeds: 'Air strikes, bombings, missile strikes, attacks on refineries/ports, cyber-attacks on infrastructure.',
    scale: ['No attacks', 'Massive attacks'],
    icon: '💥',
  },
  HDI: {
    label: 'Hormuz Disruption',
    what: 'Risk of blockage or disruption of navigation in the Strait of Hormuz.',
    how: 'Weighted average of events related to navigation threats, tanker attacks, ship seizures, and direct threats to the Strait.',
    feeds: 'Attacks on cargo ships/tankers, threats to close the Strait, maritime incidents in the Red Sea.',
    scale: ['Free navigation', 'Strait blocked'],
    icon: '🚢',
  },
  PAI: {
    label: 'Proxy Activation',
    what: "Activation level of Iranian proxies: Hezbollah, Houthis, and Iraqi militias.",
    how: 'Weighted average of proxy events (Hezbollah attacks, Houthi missiles, militia actions) and civilian casualties linked to proxies.',
    feeds: 'Hezbollah rockets, Houthi drones on ships, militia attacks in Iraq/Syria, civilian casualties from proxies.',
    scale: ['Proxies inactive', 'Full activation'],
    icon: '⚔️',
  },
  SRI: {
    label: 'Strategic Rhetoric',
    what: "How escalatory and threatening the official language of states and leaders is.",
    how: "Weighted average of statements with extreme tones: nuclear threats, 'red lines', 'all options on the table', sanctions, and economic pressures.",
    feeds: "Leader statements on 'existential threat', nuclear options, sanctions, ultimatums, regime change.",
    scale: ['Moderate tones', 'Extreme rhetoric'],
    icon: '🎙️',
  },
  BSI: {
    label: 'Breakout Signal',
    what: "Signals that Iran is approaching the capability to build a nuclear weapon (breakout), or that the USA/Israel are considering nuclear options.",
    how: "Weighted average of events on high-level enrichment, nuclear posture of armed states, attacks on nuclear sites, and underground activities.",
    feeds: "Enrichment at 60-90%, activity at Fordow, USA/Israel nuclear posture, deployment of tactical nuclear weapons.",
    scale: ['No signal', 'Imminent breakout'],
    icon: '☢️',
  },
  DCI: {
    label: 'Diplomatic Cooling',
    what: "Signals of diplomatic dialogue and de-escalation between the parties. This is the only 'positive' index: the higher it is, the better.",
    how: "Weighted average of diplomatic events: resumed negotiations, Oman mediation, diplomatic channels, ceasefire, peace proposals.",
    feeds: 'Diplomatic talks, mediation, hotlines, ceasefire, troop withdrawal, de-escalation signals.',
    scale: ['No dialogue', 'Strong diplomacy'],
    icon: '🕊️',
  },
};

const LEVEL_COLORS: Record<string, string> = {
  green: '#22c55e',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  dark_red: '#dc2626',
};

const LEVEL_BG: Record<string, string> = {
  green: 'rgba(34,197,94,0.08)',
  yellow: 'rgba(245,158,11,0.08)',
  orange: 'rgba(249,115,22,0.08)',
  red: 'rgba(239,68,68,0.1)',
  dark_red: 'rgba(220,38,38,0.12)',
};

const UI = {
  it: {
    levelLabel: {
      green: 'Basso', yellow: 'Moderato', orange: 'Elevato', red: 'Alto', dark_red: 'Critico',
    } as Record<string, string>,
    ciTitle: 'Intervallo di confidenza al 90%',
    vs24h: 'vs 24h fa',
    hideDetails: 'Nascondi dettagli',
    showDetails: 'Come si calcola?',
    formula: 'Formula:',
    feeds: 'Cosa lo alimenta:',
    window: 'Finestra temporale: 50% ultime 24h + 30% ultimi 7gg + 20% ultimi 30gg',
  },
  en: {
    levelLabel: {
      green: 'Low', yellow: 'Moderate', orange: 'Elevated', red: 'High', dark_red: 'Critical',
    } as Record<string, string>,
    ciTitle: '90% confidence interval',
    vs24h: 'vs 24h ago',
    hideDetails: 'Hide details',
    showDetails: 'How is it calculated?',
    formula: 'Formula:',
    feeds: 'What feeds it:',
    window: 'Time window: 50% last 24h + 30% last 7d + 20% last 30d',
  },
};

export default function IndexGauge({ name, value, delta, level, history, ci_low, ci_high, lang = 'it' }: IndexGaugeProps) {
  const [expanded, setExpanded] = useState(false);
  const infoDict = lang === 'en' ? INDEX_INFO_EN : INDEX_INFO_IT;
  const t = UI[lang];
  const info = infoDict[name] || { label: name, what: '', how: '', feeds: '', scale: ['0', '100'] as [string, string], icon: '?' };
  const color = LEVEL_COLORS[level] || LEVEL_COLORS.green;
  const bg = LEVEL_BG[level] || LEVEL_BG.green;
  const levelText = t.levelLabel[level] || 'N/A';
  const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  const deltaColor = delta > 0
    ? (name === 'DCI' ? '#22c55e' : '#ef4444')
    : (name === 'DCI' ? '#ef4444' : '#22c55e');

  return (
    <div
      className="rounded-[10px] p-3 flex flex-col gap-1.5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        borderLeft: `3px solid ${color}`,
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeftWidth: 3,
        borderLeftColor: color,
        background: `linear-gradient(135deg, ${color}06, transparent)`,
      }}
    >
      {/* Header: icon + name + badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm" role="img" aria-label={info.label}>{info.icon}</span>
          <span className="text-[11px] text-white/50 font-medium">{info.label}</span>
        </div>
        <span
          className="font-mono text-[10px] font-semibold uppercase px-2 py-0.5 rounded-lg"
          style={{ color, background: bg }}
        >
          {levelText}
        </span>
      </div>

      {/* Value + CI + delta */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="font-mono text-[22px] font-bold" style={{ color }}>{value.toFixed(1)}</span>
        {ci_low != null && ci_high != null && (
          <span className="text-[9px] text-white/20 font-mono" title={t.ciTitle} aria-label={`${t.ciTitle}: ${ci_low.toFixed(0)}-${ci_high.toFixed(0)}`}>
            [{ci_low.toFixed(0)}-{ci_high.toFixed(0)}]
          </span>
        )}
        {delta !== 0 && (
          <span className="font-mono text-[11px]" style={{ color: deltaColor }}>{deltaStr}</span>
        )}
      </div>

      {/* Scale bar with CI band */}
      <div className="relative w-full h-1.5 rounded-full bg-gray-700/60">
        {ci_low != null && ci_high != null && (
          <div className="absolute h-1.5 rounded-full opacity-25" style={{
            left: `${Math.min(100, ci_low)}%`,
            width: `${Math.min(100, ci_high) - Math.min(100, ci_low)}%`,
            backgroundColor: color,
          }} />
        )}
        <div className="absolute h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between text-[8px] text-white/20 font-mono -mt-0.5">
        <span>{info.scale[0]}</span>
        <span>{info.scale[1]}</span>
      </div>

      {/* What it means — always visible */}
      <p className="text-[10px] text-white/45 leading-relaxed">{info.what}</p>

      {/* Sparkline + delta label */}
      <div className="flex items-center justify-between mt-auto">
        {delta !== 0 && <div className="text-[8px] text-white/25 font-mono">{t.vs24h}</div>}
        {history && history.length >= 2 && <Sparkline data={history} color={color} />}
      </div>

      {/* Expand for technical details */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="text-[9px] text-gray-500 hover:text-gray-300 text-left flex items-center gap-1 transition-colors"
      >
        <span aria-hidden="true" className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>&#9654;</span>
        {expanded ? t.hideDetails : t.showDetails}
      </button>

      {expanded && (
        <div className="space-y-1.5 border-t border-gray-700/50 pt-1.5">
          <div>
            <p className="text-[9px] font-semibold text-gray-400 mb-0.5">{t.formula}</p>
            <p className="text-[9px] text-gray-500 leading-relaxed">{info.how}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold text-gray-400 mb-0.5">{t.feeds}</p>
            <p className="text-[9px] text-gray-500 leading-relaxed">{info.feeds}</p>
          </div>
          <div className="text-[8px] text-gray-600 font-mono">
            {t.window}
          </div>
        </div>
      )}
    </div>
  );
}
