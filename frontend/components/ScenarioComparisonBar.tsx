'use client';

interface ScenarioData {
  probability: number;
  score: number;
  delta?: number;
  ci_low?: number;
  ci_high?: number;
}

interface ScenarioComparisonBarProps {
  scenarios: Record<string, ScenarioData>;
  lang?: 'it' | 'en';
}

const SCENARIO_ORDER = ['contained', 'regional', 'threshold', 'coercive', 'actual'] as const;

const SCENARIO_COLORS: Record<string, string> = {
  contained: '#22c55e',
  regional: '#ef4444',
  threshold: '#f59e0b',
  coercive: '#f97316',
  actual: '#991b1b',
};

const SCENARIO_LABELS: Record<string, { it: string; en: string }> = {
  contained: { it: 'Contenuto', en: 'Contained' },
  regional: { it: 'Regionale', en: 'Regional' },
  threshold: { it: 'Soglia Nucleare', en: 'Nuclear Threshold' },
  coercive: { it: 'Coercizione', en: 'Coercion' },
  actual: { it: 'Uso Effettivo', en: 'Actual Use' },
};

export default function ScenarioComparisonBar({ scenarios, lang = 'it' }: ScenarioComparisonBarProps) {
  // Compute total and normalized widths so segments always sum to 100%
  const total = SCENARIO_ORDER.reduce((sum, key) => {
    const s = scenarios[key];
    return sum + (s ? s.probability : 0);
  }, 0);

  const segments = SCENARIO_ORDER.map((key) => {
    const s = scenarios[key];
    const probability = s ? s.probability : 0;
    const width = total > 0 ? (probability / total) * 100 : 20;
    return { key, probability, width, data: s };
  });

  return (
    <div className="w-full">
      {/* Stacked bar */}
      <div className="flex w-full h-5 rounded-lg overflow-hidden">
        {segments.map((seg, i) => (
          <div
            key={seg.key}
            className="h-full transition-all duration-500 relative group"
            style={{
              width: `${seg.width}%`,
              backgroundColor: SCENARIO_COLORS[seg.key],
              minWidth: seg.probability > 0 ? '2px' : '0px',
            }}
          >
            {/* Show percentage inside segment if wide enough */}
            {seg.width > 8 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm select-none">
                {seg.probability.toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Labels with probability and CI below the bar */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {segments.map((seg) => {
          const label = SCENARIO_LABELS[seg.key]?.[lang] ?? seg.key;
          const ci = seg.data?.ci_low != null && seg.data?.ci_high != null
            ? ` [${seg.data.ci_low.toFixed(0)}-${seg.data.ci_high.toFixed(0)}%]`
            : '';
          return (
            <div key={seg.key} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: SCENARIO_COLORS[seg.key] }}
              />
              <span className="text-[11px] text-gray-300 whitespace-nowrap">
                <span className="font-semibold text-white">{label}</span>
                {' '}
                <span className="font-mono">{seg.probability.toFixed(1)}%</span>
                {ci && <span className="text-gray-500 font-mono text-[10px]">{ci}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
