'use client';
import { useEffect, useState } from 'react';
import IndexGaugeEN from '@/components/IndexGaugeEN';
import ScenarioCardEN from '@/components/ScenarioCardEN';
import ScenarioComparisonBar from '@/components/ScenarioComparisonBar';
import AlertBanner from '@/components/AlertBanner';
import MethodologyDisclaimerEN from '@/components/MethodologyDisclaimerEN';
import GaugeArc from '@/components/GaugeArc';
import PlotlyWrapper from '@/components/plotly/PlotlyWrapper';
import EventFeed from '@/components/EventFeed';
import EventMapLeaflet from '@/components/EventMapLeaflet';
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
  const [indicesChart, setIndicesChart] = useState<PlotlyFigure | null>(null);
  const [noiChart, setNoiChart] = useState<PlotlyFigure | null>(null);
  const [heatmap, setHeatmap] = useState<PlotlyFigure | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [sum, sc, idx, noi, hm] = await Promise.allSettled([
        fetch(`${API}/dashboard/summary`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/charts/scenario-timeline?range=7d`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/charts/indices-timeline?range=7d`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/charts/noi-breakdown?range=7d&lang=en`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/charts/event-heatmap?range=7d`).then(r => r.ok ? r.json() : null),
      ]);
      if (sum.status === 'fulfilled' && sum.value) setSummary(sum.value);
      if (sc.status === 'fulfilled' && sc.value) setScenarioChart(sc.value);
      if (idx.status === 'fulfilled' && idx.value) setIndicesChart(idx.value);
      if (noi.status === 'fulfilled' && noi.value) setNoiChart(noi.value);
      if (hm.status === 'fulfilled' && hm.value) setHeatmap(hm.value);
      setError(null);
    } catch (e) {
      setError('Unable to connect to API');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      <div className="rounded-[10px] px-3 sm:px-4 py-3 flex items-start gap-2.5" style={{
        background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.15)',
      }}>
        <span className="text-blue-400 flex-shrink-0 mt-0.5">📊</span>
        <span className="text-[12px] sm:text-[13px] text-white/65 leading-relaxed">{generateSummary()}</span>
      </div>

      {/* Title Bar */}
      <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-[22px] font-bold text-white tracking-tight">Crisis Dashboard</h2>
          <p className="text-[10px] sm:text-xs font-mono text-white/35 mt-0.5 truncate">
            {summary?.events_24h_count || 0} events in the last 24h
            {summary?.last_updated && (
              <span> · Updated at {new Date(summary.last_updated).toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={fetchData} disabled={refreshing} className="px-3 sm:px-4 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-50" style={{ background: refreshing ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${refreshing ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`, color: '#e2e8f0' }}>
            <span className={refreshing ? 'inline-block animate-spin' : ''}>↻</span> {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Nuclear Escalation Monitor */}
      {ner && (
        <div className="rounded-[14px] px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4" style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(20,27,45,0.8))',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex-1">
              <h3 className="text-sm sm:text-base font-semibold text-white mb-1.5">Nuclear Escalation Monitor</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                Tracking the nuclear dimension of the conflict — from any side
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
          <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[11px] text-white/45 leading-relaxed">
              Probabilities indicate relative plausibility among the model&apos;s 5 scenarios, not absolute event probability.
              Nuclear use remains historically unprecedented since 1945. Values reflect news signals, not classified intelligence.
            </p>
          </div>
        </div>
      )}

      {/* Risk Indices */}
      <section>
        <div className="text-sm font-semibold text-white/80 mb-1">
          Risk Indices
          <InfoIcon tooltip="7 independent indices, each measuring a different aspect of the crisis. Scale 0-100. Together they feed the escalation scenarios." />
        </div>
        <p className="text-[13px] text-white/50 mb-3 leading-relaxed max-w-[800px]">
          Think of 7 thermometers, each measuring a different aspect of tension in the Middle East: military attacks, nuclear threats, aggressive rhetoric, etc.
          When a thermometer rises (from 0 to 100), it means a lot of worrying news has come in on that topic in recent hours.
          If it drops, things are calming down on that front. The colour (green → yellow → red) shows the alert level.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-2.5">
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
        <p className="text-[13px] text-white/50 mb-3 leading-relaxed max-w-[800px]">
          These 5 cards show &quot;what could happen&quot; according to the model. The percentage is not a certain prediction:
          it shows how plausible each scenario is compared to the others, based on today&apos;s news.
          The percentages always add up to 100% — if one scenario goes up, another goes down.
          Example: if &quot;Contained Conflict&quot; is at 55%, it means current news suggests the situation is likely staying under control.
        </p>
        <ScenarioComparisonBar scenarios={scenarios} lang="en" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-2.5 mt-3">
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
          <div className="text-[13px] font-semibold text-white/80 mb-1">Risk Indices Trend (7 days)</div>
          <p className="text-[10px] text-white/30 mb-3">All 7 indices — dashed = DCI (inverse scale, higher = more diplomatic)</p>
          {indicesChart ? (
            <PlotlyWrapper data={indicesChart.data} layout={indicesChart.layout} config={indicesChart.config} height={220} />
          ) : (
            <div className="h-56 flex items-center justify-center text-white/30 text-sm">Data incoming</div>
          )}
        </div>
      </div>

      {/* NOI Breakdown */}
      <div className="card">
        <div className="text-[13px] font-semibold text-white/80 mb-1">Nuclear Opacity Index (NOI)</div>
        <p className="text-[10px] text-white/30 mb-3">6 components measuring the opacity of the Iranian nuclear program</p>
        {noiChart ? (
          <PlotlyWrapper data={noiChart.data} layout={noiChart.layout} config={noiChart.config} height={220} />
        ) : (
          <div className="h-56 flex items-center justify-center text-white/30 text-sm">Data incoming</div>
        )}
      </div>

      {/* Event Heatmap */}
      <div className="card">
        <div className="text-[13px] font-semibold text-white/80 mb-1">Events by Category (7 days)</div>
        <p className="text-[10px] text-white/30 mb-3">Event distribution by type and day — stacked bars</p>
        {heatmap ? (
          <PlotlyWrapper data={heatmap.data} layout={heatmap.layout} config={heatmap.config} height={240} />
        ) : (
          <div className="h-56 flex items-center justify-center text-white/30 text-sm">Data incoming — events will appear after the first collection cycle</div>
        )}
      </div>

      {/* Interactive Map + Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 card">
          <div className="text-[13px] font-semibold text-white/80 mb-1">Event Map — Middle East</div>
          <p className="text-[10px] text-white/30 mb-3">Interactive zoomable map — event locations by category (7 days)</p>
          <EventMapLeaflet lang="en" height={320} />
        </div>
        <div className="lg:col-span-2 card">
          <div className="text-[13px] font-semibold text-white/80 mb-1">Real-Time Event Feed</div>
          <p className="text-[10px] text-white/30 mb-3">Latest events collected from monitored sources</p>
          <EventFeed lang="en" maxItems={15} />
        </div>
      </div>
    </div>
  );
}
