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

const SCENARIO_INFO: Record<string, { label: string; labelEn: string; description: string; drivers: string; example: string; icon: string }> = {
  contained: {
    label: 'Contained Conflict',
    labelEn: 'Contained Conflict',
    description: 'Limited and circumscribed military exchanges between Iran and Israel/USA, without large-scale involvement of other regional actors. The conflict remains under diplomatic control.',
    drivers: 'Diplomacy (DCI) strongly feeds it (+0.25/pt). All other indices reduce it: NOI (-0.15/pt), BSI and GAI (-0.12/pt), HDI (-0.10/pt), SRI and PAI (-0.08/pt). The worse the situation gets, the less likely containment becomes.',
    example: 'Targeted air raids followed by de-escalation, limited attacks on proxies without direct state-to-state response.',
    icon: '🟢',
  },
  regional: {
    label: 'Regional War',
    labelEn: 'Regional War',
    description: 'Large-scale conflict involving multiple Gulf countries, armed proxies (Hezbollah, Houthis, Iraqi militias), and potential disruption of the Strait of Hormuz and oil routes.',
    drivers: 'Driven by GAI (+0.30/pt), HDI (+0.25/pt), PAI (+0.20/pt). Diplomacy DCI slows it (-0.15/pt). If DCI >= 65, 10% reduction.',
    example: 'Iranian attack on US bases in the Gulf + Hezbollah response + Hormuz blockade + Saudi Arabia involvement.',
    icon: '🟡',
  },
  threshold: {
    label: 'Nuclear Threshold',
    labelEn: 'Nuclear Threshold Crisis',
    description: "The nuclear dimension enters the crisis. Iran accelerates its nuclear program under wartime pressure (enrichment, expulsion of IAEA inspectors), or the USA/Israel — who already possess nuclear weapons — threaten or consider tactical nuclear options.",
    drivers: 'Driven by BSI (+0.30/pt) and NOI (+0.25/pt): opacity of the Iranian program and breakout signals. SRI (+0.15/pt) contributes through rhetoric. DCI slows it (-0.20/pt). +5 point boost if NOI >= 75 and BSI >= 65.',
    example: "Iran enriches to 90%, expels IAEA inspectors, unverifiable activity at Fordow, Israel threatens preemptive action.",
    icon: '🟠',
  },
  coercive: {
    label: 'Coercive Go-Nuclear',
    labelEn: 'Nuclear Coercion',
    description: "An actor uses nuclear threat as coercive leverage. The USA/Israel can use their nuclear superiority as pressure to force surrender. Iran may threaten to arm itself or withdraw from the NPT, but does not possess nuclear weapons.",
    drivers: 'Driven by SRI (+0.25/pt): escalatory rhetoric from nuclear-armed states. BSI (+0.22/pt) and NOI (+0.15/pt) contribute. DCI slows it (-0.18/pt). +4 point boost if SRI >= 75 and BSI >= 70.',
    example: "USA/Israel: 'all options on the table including nuclear'. Iran: NPT withdrawal, missile tests with ambiguous payload.",
    icon: '🔴',
  },
  actual: {
    label: 'Actual Nuclear Use',
    labelEn: 'Actual Nuclear Use',
    description: "Actual use of a nuclear device in the theater of conflict. Can only come from the USA or Israel, the only actors with operational nuclear weapons in this crisis. Iran does not possess nuclear weapons and its program is far from producing any. The only exception would be a device transfer from Russia or China — a monitored but extremely unlikely scenario.",
    drivers: "Driven by SRI (+0.10/pt): extreme nuclear rhetoric from armed states. BSI (+0.08/pt): active nuclear posture. NOI has ZERO weight — Iran cannot use weapons it does not have. Requires extreme convergence: SRI >= 85, BSI >= 80, and GAI >= 80. DCI slows it (-0.12/pt).",
    example: 'Tactical nuclear detonation by USA/Israel in an extreme escalation scenario, or atmospheric demonstration test as deterrence.',
    icon: '⚫',
  },
};

const SEVERITY_CONFIG: { min: number; label: string; bgClass: string }[] = [
  { min: 40, label: 'DOMINANT', bgClass: 'bg-red-900/40' },
  { min: 25, label: 'ELEVATED', bgClass: 'bg-orange-900/40' },
  { min: 15, label: 'MODERATE', bgClass: 'bg-yellow-900/30' },
  { min: 5, label: 'LOW', bgClass: 'bg-gray-700/40' },
  { min: 0, label: 'MINIMAL', bgClass: 'bg-gray-800/40' },
];

export default function ScenarioCardEN({ name, probability, score, delta, ci_low, ci_high }: ScenarioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = SCENARIO_COLORS[name] || '#888';
  const info = SCENARIO_INFO[name] || { label: name, labelEn: name, description: '', drivers: '', example: '', icon: '?' };
  const severity = SEVERITY_CONFIG.find(s => probability >= s.min) || SEVERITY_CONFIG[4];

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
            <span className="text-sm font-bold text-white block leading-tight">{info.labelEn}</span>
            <span className="text-[10px] text-gray-500">{info.label}</span>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${severity.bgClass}`} style={{ color }}>{severity.label}</span>
      </div>

      {/* Probability with CI */}
      <div className="flex items-end gap-2 flex-wrap">
        <span className="text-3xl font-bold leading-none" style={{ color }}>{probability.toFixed(1)}%</span>
        {ci_low != null && ci_high != null && (
          <span className="text-[10px] text-gray-500 font-mono pb-0.5" title="90% confidence interval (Monte Carlo)">
            [{ci_low.toFixed(0)}-{ci_high.toFixed(0)}%]
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
          {delta != null && delta !== 0 ? 'vs 24h ago' : 'indicative estimate'}
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
        {expanded ? 'Hide technical details' : 'Show technical details'}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-gray-700/50 pt-2">
          <div>
            <p className="text-[10px] font-semibold text-gray-300 mb-0.5">What drives it:</p>
            <p className="text-[10px] text-gray-400 leading-relaxed">{info.drivers}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-300 mb-0.5">Concrete example:</p>
            <p className="text-[10px] text-gray-500 italic leading-relaxed">{info.example}</p>
          </div>
        </div>
      )}
    </div>
  );
}
