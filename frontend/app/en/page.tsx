'use client';
import { useEffect, useState } from 'react';
import IndexGaugeEN from '@/components/IndexGaugeEN';
import ScenarioCardEN from '@/components/ScenarioCardEN';
import AlertBanner from '@/components/AlertBanner';
import MethodologyDisclaimerEN from '@/components/MethodologyDisclaimerEN';
import GaugeArc from '@/components/GaugeArc';
import PlotlyWrapper from '@/components/plotly/PlotlyWrapper';
import type { DashboardSummary, PlotlyFigure } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function InfoIcon({ tooltip }: { tooltip: string }) {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-mono cursor-help ml-1.5"
      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
      title={tooltip}>?</span>
  );
}

export default function DashboardPageEN() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [scenarioChart, setScenarioChart] = useState<PlotlyFigure | null>(null);
  const [noiChart, setNoiChart] = useState<PlotlyFigure | null>(null);
  const [heatmap, setHeatmap] = useState<PlotlyFigure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [sum, sc, noi, hm] = await Promise.allSettled([
        fetch(`${API}/dashboard/summary`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/charts/scenario-timeline?range=7d`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/charts/noi-breakdown?range=7d`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/charts/event-heatmap?range=7d`).then(r => r.ok ? r.json() : null),
      ]);
      if (sum.status === 'fulfilled' && sum.value) setSummary(sum.value);
      if (sc.status === 'fulfilled' && sc.value) setScenarioChart(sc.value);
      if (noi.status === 'fulfilled' && noi.value) setNoiChart(noi.value);
      if (hm.status === 'fulfilled' && hm.value) setHeatmap(hm.value);
      setError(null);
    } catch (e) {
      setError('Unable to connect to API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gray-600 border-t-orange-500 rounded-full mx-auto mb-4" />
          <p className="text-white/40">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center card p-8">
          <p className="text-red-400 text-lg mb-2">Connection Error</p>
          <p className="text-white/40 text-sm">{error}</p>
          <p className="text-white/20 text-xs mt-4">Check that the backend is running on port 8000</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900 transition">Retry</button>
        </div>
      </div>
    );
  }

  const indices = summary?.indices || {};
  const scenarios = summary?.scenarios || {};
  const INDEX_ORDER = ['NOI', 'GAI', 'HDI', 'PAI', 'SRI', 'BSI', 'DCI'];
  const SCENARIO_ORDER = ['contained', 'regional', 'threshold', 'coercive', 'actual'];

  // "What Changed" summary
  const generateSummary = () => {
    const changes: string[] = [];
    for (const name of INDEX_ORDER) {
      const idx = indices[name];
      if (idx && Math.abs(idx.delta) > 1.0) {
        changes.push(`${name} ${idx.delta > 0 ? '+' : ''}${idx.delta.toFixed(1)}`);
      }
    }
    const dominant = SCENARIO_ORDER.reduce((a, b) =>
      (scenarios[a]?.probability || 0) > (scenarios[b]?.probability || 0) ? a : b
    );
    const SCENARIO_NAMES: Record<string, string> = {
      contained: 'Contained Conflict', regional: 'Regional War',
      threshold: 'Nuclear Threshold Crisis', coercive: 'Nuclear Coercion', actual: 'Actual Nuclear Use'
    };
    const domProb = scenarios[dominant]?.probability?.toFixed(1) || '0';
    if (changes.length === 0) return 'No significant changes in the last 24h.';
    return `Last 24h: ${changes.join(', ')}. Dominant scenario: ${SCENARIO_NAMES[dominant]} (${domProb}%).`;
  };

  const ner = indices['NER'];

  return (
    <div className="space-y-5">
      {/* Alerts */}
      {summary?.alerts && summary.alerts.length > 0 && <AlertBanner alerts={summary.alerts} />}

      {/* Methodology Disclaimer */}
      <MethodologyDisclaimerEN />

      {/* What Changed Summary */}
      <div className="rounded-[10px] px-4 py-3 flex items-start gap-2.5" style={{
        background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.15)',
      }}>
        <span className="text-blue-400 flex-shrink-0 mt-0.5">📊</span>
        <span className="text-[13px] text-white/65 leading-relaxed">{generateSummary()}</span>
      </div>

      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-white tracking-tight">Crisis Dashboard</h2>
          <p className="text-xs font-mono text-white/35 mt-0.5">
            {summary?.events_24h_count || 0} events in the last 24h
            {summary?.last_updated && (
              <span> · Updated at {new Date(summary.last_updated).toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-4 py-1.5 text-xs font-medium rounded-lg transition-all" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Nuclear Escalation Gauge */}
      {ner && (
        <div className="rounded-[14px] px-6 py-5 flex flex-col sm:flex-row items-center gap-6" style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(20,27,45,0.8))',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white mb-1.5">Nuclear Escalation Risk</h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Overall probability that the nuclear dimension enters the conflict — from any side
              (USA/Israel who already have weapons, or Iran who could build them).
              Sum of: Nuclear Threshold ({scenarios.threshold?.probability?.toFixed(1) || 0}%)
              + Coercion ({scenarios.coercive?.probability?.toFixed(1) || 0}%)
              + Actual Use ({scenarios.actual?.probability?.toFixed(1) || 0}%).
            </p>
          </div>
          <div className="flex flex-col items-center flex-shrink-0">
            <GaugeArc value={ner.value} size={200} />
            {ner.delta !== 0 && (
              <div className="font-mono text-xs flex items-center gap-1 mt-1">
                <span style={{ color: ner.delta > 0 ? '#ef4444' : '#22c55e' }}>
                  {ner.delta > 0 ? '▲' : '▼'} {ner.delta > 0 ? '+' : ''}{ner.delta.toFixed(1)}
                </span>
                <span className="text-white/30">vs 24h ago</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Indices */}
      <section>
        <div className="text-sm font-semibold text-white/80 mb-1">
          Risk Indices
          <InfoIcon tooltip="7 independent indices, each measuring a different aspect of the crisis. Scale 0-100. Together they feed the escalation scenarios." />
        </div>
        <p className="text-[11px] text-white/30 mb-3">
          7 dimensions of the Iran-Gulf crisis, computed in real time from news. Click &quot;How is it calculated?&quot; for details.
        </p>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))' }}>
          {INDEX_ORDER.map(name => {
            const idx = indices[name] || { value: 0, delta: 0, level: 'green', history: [] };
            return <IndexGaugeEN key={name} name={name} value={idx.value} delta={idx.delta} level={idx.level} history={idx.history} ci_low={idx.ci_low} ci_high={idx.ci_high} />;
          })}
        </div>
      </section>

      {/* Scenarios */}
      <section>
        <div className="text-sm font-semibold text-white/80 mb-1">
          Escalation Scenarios
          <InfoIcon tooltip="Each card represents a possible scenario. The probabilities always sum to 100%." />
        </div>
        <p className="text-[11px] text-white/30 mb-3">Indicative estimates with 90% confidence interval (Monte Carlo, 500 iterations)</p>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {SCENARIO_ORDER.map(name => {
            const sc = scenarios[name] || { probability: 0, score: 0, delta: 0 };
            return <ScenarioCardEN key={name} name={name} probability={sc.probability} score={sc.score} delta={sc.delta} ci_low={sc.ci_low} ci_high={sc.ci_high} />;
          })}
        </div>
      </section>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-[13px] font-semibold text-white/80 mb-1">Scenario Trends (7 days)</div>
          <p className="text-[10px] text-white/30 mb-3">Separate lines for readability — dashed = Actual Nuclear Use</p>
          {scenarioChart ? (
            <PlotlyWrapper data={scenarioChart.data} layout={scenarioChart.layout} config={scenarioChart.config} height={220} />
          ) : (
            <div className="h-56 flex items-center justify-center text-white/30 text-sm">Data incoming</div>
          )}
        </div>
        <div className="card">
          <div className="text-[13px] font-semibold text-white/80 mb-1">Nuclear Opacity Index (NOI)</div>
          <p className="text-[10px] text-white/30 mb-3">6 components measuring the opacity of the Iranian nuclear program</p>
          {noiChart ? (
            <PlotlyWrapper data={noiChart.data} layout={noiChart.layout} config={noiChart.config} height={220} />
          ) : (
            <div className="h-56 flex items-center justify-center text-white/30 text-sm">Data incoming</div>
          )}
        </div>
      </div>

      {/* Event Map */}
      <div className="card">
        <div className="text-[13px] font-semibold text-white/80 mb-1">Event Map by Category (7 days)</div>
        <p className="text-[10px] text-white/30 mb-3">Event distribution by type and day — stacked bars</p>
        {heatmap ? (
          <PlotlyWrapper data={heatmap.data} layout={heatmap.layout} config={heatmap.config} height={240} />
        ) : (
          <div className="h-56 flex items-center justify-center text-white/30 text-sm">Data incoming — events will appear after the first collection cycle</div>
        )}
      </div>
    </div>
  );
}
