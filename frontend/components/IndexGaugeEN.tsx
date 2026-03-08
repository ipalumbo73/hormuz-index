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
}

const INDEX_INFO: Record<string, {
  label: string;
  what: string;
  how: string;
  feeds: string;
  scale: [string, string];
  icon: string;
}> = {
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

const LEVEL_LABEL: Record<string, string> = {
  green: 'Low',
  yellow: 'Moderate',
  orange: 'Elevated',
  red: 'High',
  dark_red: 'Critical',
};

export default function IndexGaugeEN({ name, value, delta, level, history, ci_low, ci_high }: IndexGaugeProps) {
  const [expanded, setExpanded] = useState(false);
  const info = INDEX_INFO[name] || { label: name, what: '', how: '', feeds: '', scale: ['0', '100'], icon: '?' };
  const color = LEVEL_COLORS[level] || LEVEL_COLORS.green;
  const bg = LEVEL_BG[level] || LEVEL_BG.green;
  const levelText = LEVEL_LABEL[level] || 'N/A';
  const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  const deltaColor = delta > 0
    ? (name === 'DCI' ? '#22c55e' : '#ef4444')
    : (name === 'DCI' ? '#ef4444' : '#22c55e');

  return (
    <div
      className="rounded-[10px] p-3 flex flex-col gap-1.5 transition-all"
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
          <span className="text-sm">{info.icon}</span>
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
          <span className="text-[9px] text-white/20 font-mono" title="90% confidence interval">
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
        {delta !== 0 && <div className="text-[8px] text-white/25 font-mono">vs 24h ago</div>}
        {history && history.length >= 2 && <Sparkline data={history} color={color} />}
      </div>

      {/* Expand for technical details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[9px] text-gray-500 hover:text-gray-300 text-left flex items-center gap-1 transition-colors"
      >
        <span className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>&#9654;</span>
        {expanded ? 'Hide details' : 'How is it calculated?'}
      </button>

      {expanded && (
        <div className="space-y-1.5 border-t border-gray-700/50 pt-1.5">
          <div>
            <p className="text-[9px] font-semibold text-gray-400 mb-0.5">Formula:</p>
            <p className="text-[9px] text-gray-500 leading-relaxed">{info.how}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold text-gray-400 mb-0.5">What feeds it:</p>
            <p className="text-[9px] text-gray-500 leading-relaxed">{info.feeds}</p>
          </div>
          <div className="text-[8px] text-gray-600 font-mono">
            Time window: 50% last 24h + 30% last 7d + 20% last 30d
          </div>
        </div>
      )}
    </div>
  );
}
