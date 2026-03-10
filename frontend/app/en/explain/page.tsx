'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface ContributingEvent {
  title: string;
  category: string;
  severity: number;
  confidence: number;
  impact: number;
  signal_values: Record<string, number>;
  timestamp: string;
}

interface ScenarioContribution {
  index: string;
  value: number;
  weight: number;
  contribution: number;
}

interface IndexDetail {
  value: number;
  delta: number;
  contributing_events_24h: ContributingEvent[];
  total_events_24h: number;
  scenario_impact: Record<string, { weight: number; contribution: number; direction: string }>;
  categories_tracked: string[];
  noi_components?: Record<string, number>;
}

interface ScenarioDetail {
  probability: number;
  raw_score: number;
  prior: number;
  contributions: ScenarioContribution[];
  ci: { p5?: number; median?: number; p95?: number };
}

interface TriggerInfo {
  label: string;
  fired: boolean;
  boost: Record<string, number>;
  dampen: Record<string, number>;
}

interface ExplainData {
  indices: Record<string, IndexDetail>;
  scenarios: Record<string, ScenarioDetail>;
  triggers: TriggerInfo[];
  formula: Record<string, string>;
  last_updated: string | null;
}

const INDEX_META: Record<string, { label: string; icon: string; color: string; description: string }> = {
  NOI: { label: 'Nuclear Opacity Index', icon: '🔬', color: '#a855f7', description: "How opaque and unverifiable Iran's nuclear program is to the IAEA." },
  GAI: { label: 'Gulf Attack Index', icon: '💥', color: '#ef4444', description: "Intensity of attacks on military and civilian infrastructure in the Persian Gulf." },
  HDI: { label: 'Hormuz Disruption Index', icon: '🚢', color: '#f97316', description: 'Risk of blockade or disruption of the Strait of Hormuz.' },
  PAI: { label: 'Proxy Activation Index', icon: '⚔️', color: '#eab308', description: 'Activation level of Iranian proxies (Hezbollah, Houthis, militias).' },
  SRI: { label: 'Strategic Rhetoric Index', icon: '🎙️', color: '#f43f5e', description: "How escalatory the official language of states and leaders is." },
  BSI: { label: 'Breakout Sensitivity Index', icon: '☢️', color: '#dc2626', description: "Signals of approaching nuclear capability or active nuclear posture by armed states." },
  DCI: { label: 'Diplomatic Channels Index', icon: '🕊️', color: '#22c55e', description: "Signals of dialogue and de-escalation. The only 'positive' index." },
};

const SCENARIO_META: Record<string, { label: string; color: string }> = {
  contained: { label: 'Contained Conflict', color: '#22c55e' },
  regional: { label: 'Regional War', color: '#ef4444' },
  threshold: { label: 'Nuclear Threshold', color: '#f59e0b' },
  coercive: { label: 'Nuclear Coercion', color: '#f97316' },
  actual: { label: 'Actual Nuclear Use', color: '#991b1b' },
};

const CATEGORY_LABELS: Record<string, string> = {
  military_strike: 'Military strike',
  missile_drone_attack: 'Missiles/drones',
  proxy_activity: 'Proxy activity',
  gulf_infrastructure_attack: 'Infrastructure attack',
  shipping_disruption: 'Shipping disruption',
  hormuz_threat: 'Hormuz threat',
  nuclear_site_damage: 'Nuclear site damage',
  strategic_rhetoric: 'Strategic rhetoric',
  diplomatic_contact: 'Diplomatic contact',
  deescalation_signal: 'De-escalation signal',
  sanctions_or_economic_pressure: 'Sanctions/economic pressure',
  cyber_operation: 'Cyber operation',
  civilian_casualty_mass_event: 'Civilian casualties',
  enrichment_signal: 'Enrichment signal',
  nuclear_posture_signal: 'Nuclear posture',
  nuclear_verification_gap: 'Nuclear verification gap',
  underground_activity_signal: 'Underground activity',
  nuclear_transfer_signal: 'Nuclear transfer',
};

const INDEX_ORDER = ['NOI', 'GAI', 'HDI', 'PAI', 'SRI', 'BSI', 'DCI'];
const SCENARIO_ORDER = ['contained', 'regional', 'threshold', 'coercive', 'actual'];

export default function ExplainPage() {
  const [data, setData] = useState<ExplainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/explain/indices`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-12 h-12 border-4 border-gray-600 border-t-orange-500 rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-white/40">
        Unable to load explanation data. Please verify the backend is running.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-[22px] font-bold text-white tracking-tight">How the model works</h2>
        <p className="text-xs text-white/40 mt-1">
          This page shows in detail how each index is calculated, which news items feed into it, and how the indices determine scenario probabilities.
          {data.last_updated && (
            <span> · Last updated: {new Date(data.last_updated).toLocaleString('en-US')}</span>
          )}
        </p>
      </div>

      {/* Formula Overview */}
      <div className="rounded-[10px] p-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <h3 className="text-sm font-semibold text-blue-300 mb-2">Model formula</h3>
        <div className="grid gap-2 text-[10px] sm:text-[11px] font-mono text-white/60 overflow-x-auto">
          {Object.entries(data.formula).map(([key, val]) => (
            <div key={key} className="flex gap-2 sm:gap-3 min-w-0">
              <span className="text-blue-400 min-w-[100px] sm:min-w-[140px] flex-shrink-0">{key}:</span>
              <span className="break-all">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Indices Section */}
      <section>
        <h3 className="text-base font-semibold text-white mb-3">Risk Indices — Detail</h3>
        <div className="grid gap-3">
          {INDEX_ORDER.map(name => {
            const idx = data.indices[name];
            const meta = INDEX_META[name];
            if (!idx || !meta) return null;
            const isOpen = activeIndex === name;

            return (
              <div key={name} className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${meta.color}22` }}>
                {/* Index Header — clickable */}
                <button
                  onClick={() => setActiveIndex(isOpen ? null : name)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors hover:bg-white/[0.02]"
                  style={{ background: `linear-gradient(135deg, ${meta.color}08, transparent)` }}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="text-base sm:text-lg">{meta.icon}</span>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white">{name}</span>
                      <span className="text-[10px] sm:text-xs text-white/40 ml-1 sm:ml-2 hidden sm:inline">{meta.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className="text-xl sm:text-2xl font-bold font-mono" style={{ color: meta.color }}>{idx.value.toFixed(1)}</span>
                    {idx.delta !== 0 && (
                      <span className={`text-xs font-mono ${
                        name === 'DCI'
                          ? (idx.delta > 0 ? 'text-green-400' : 'text-red-400')
                          : (idx.delta > 0 ? 'text-red-400' : 'text-green-400')
                      }`}>
                        {idx.delta > 0 ? '+' : ''}{idx.delta.toFixed(1)}
                      </span>
                    )}
                    <span className={`text-white/30 text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>&#9654;</span>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-4" style={{ borderTop: `1px solid ${meta.color}15` }}>
                    {/* Description */}
                    <p className="text-[11px] text-white/50 pt-3">{meta.description}</p>

                    {/* NOI Components */}
                    {name === 'NOI' && idx.noi_components && Object.keys(idx.noi_components).length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-semibold text-white/60 mb-2">NOI Components</h4>
                        <div className="grid gap-1.5">
                          {Object.entries(idx.noi_components).map(([comp, val]) => {
                            const numVal = typeof val === 'number' ? val : 0;
                            const compLabels: Record<string, { label: string; weight: string }> = {
                              site_access_loss: { label: 'Site access loss', weight: '25%' },
                              material_knowledge_loss: { label: 'Material knowledge loss', weight: '25%' },
                              enrichment_verification_gap: { label: 'Enrichment verification gap', weight: '20%' },
                              underground_activity_signal: { label: 'Underground activity', weight: '10%' },
                              technical_diplomatic_breakdown: { label: 'Technical-diplomatic breakdown', weight: '10%' },
                              conflicting_narratives_uncertainty: { label: 'Conflicting narratives', weight: '10%' },
                            };
                            const cl = compLabels[comp] || { label: comp, weight: '?' };
                            return (
                              <div key={comp} className="flex items-center gap-2">
                                <span className="text-[10px] text-white/40 w-[180px] truncate">{cl.label} ({cl.weight})</span>
                                <div className="flex-1 h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, numVal)}%`, backgroundColor: meta.color }} />
                                </div>
                                <span className="text-[10px] font-mono text-white/50 w-8 text-right">{numVal.toFixed(0)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* How it feeds scenarios */}
                    <div>
                      <h4 className="text-[11px] font-semibold text-white/60 mb-2">Impact on scenarios</h4>
                      <div className="flex flex-wrap gap-2">
                        {SCENARIO_ORDER.map(sc => {
                          const impact = idx.scenario_impact[sc];
                          if (!impact) return null;
                          const sm = SCENARIO_META[sc];
                          return (
                            <div key={sc} className="rounded-lg px-2.5 py-1.5 text-[10px]" style={{
                              background: `${sm.color}10`,
                              border: `1px solid ${sm.color}25`,
                            }}>
                              <span className="text-white/50">{sm.label}: </span>
                              <span className="font-mono font-semibold" style={{ color: impact.contribution > 0 ? '#ef4444' : '#22c55e' }}>
                                {impact.contribution > 0 ? '+' : ''}{impact.contribution.toFixed(1)}
                              </span>
                              <span className="text-white/30 ml-1">(weight {impact.weight > 0 ? '+' : ''}{impact.weight})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Categories tracked */}
                    <div>
                      <h4 className="text-[11px] font-semibold text-white/60 mb-1.5">Tracked categories</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {idx.categories_tracked.map(cat => (
                          <span key={cat} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Contributing Events */}
                    <div>
                      <h4 className="text-[11px] font-semibold text-white/60 mb-2">
                        News feeding this index
                        <span className="text-white/30 font-normal ml-1">({idx.total_events_24h} in the last 24h)</span>
                      </h4>
                      {idx.contributing_events_24h.length === 0 ? (
                        <p className="text-[10px] text-white/30 italic">No relevant events in the last 24 hours.</p>
                      ) : (
                        <div className="space-y-1">
                          {idx.contributing_events_24h.slice(0, 10).map((ev, i) => (
                            <div key={i} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-white/70 leading-snug truncate">{ev.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/35">
                                    {CATEGORY_LABELS[ev.category] || ev.category}
                                  </span>
                                  {Object.entries(ev.signal_values).map(([sk, sv]) => (
                                    <span key={sk} className="text-[9px] font-mono text-white/30">
                                      {sk}={sv}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col items-end flex-shrink-0">
                                <span className="text-[10px] font-mono font-semibold" style={{ color: meta.color }}>
                                  sev {ev.severity.toFixed(2)}
                                </span>
                                <span className="text-[9px] text-white/25 font-mono">
                                  imp {ev.impact.toFixed(3)}
                                </span>
                              </div>
                            </div>
                          ))}
                          {idx.contributing_events_24h.length > 10 && (
                            <p className="text-[9px] text-white/25 italic pt-1">
                              ...and {idx.contributing_events_24h.length - 10} more events
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Scenarios Section */}
      <section>
        <h3 className="text-base font-semibold text-white mb-3">Scenarios — How probabilities are calculated</h3>
        <p className="text-[11px] text-white/35 mb-3">
          Each scenario starts from a Bayesian prior (historical baseline), then weighted contributions from each index are added, and finally trigger rules are applied. The total is normalized to 100%.
        </p>

        <div className="grid gap-3">
          {SCENARIO_ORDER.map(name => {
            const sc = data.scenarios[name];
            const meta = SCENARIO_META[name];
            if (!sc || !meta) return null;
            const isOpen = activeScenario === name;

            return (
              <div key={name} className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${meta.color}22` }}>
                <button
                  onClick={() => setActiveScenario(isOpen ? null : name)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors hover:bg-white/[0.02]"
                  style={{ background: `linear-gradient(135deg, ${meta.color}08, transparent)` }}
                >
                  <div>
                    <span className="text-sm font-bold text-white">{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold font-mono" style={{ color: meta.color }}>
                      {sc.probability.toFixed(1)}%
                    </span>
                    {sc.ci.p5 != null && sc.ci.p95 != null && (
                      <span className="text-[10px] text-white/30 font-mono">
                        [{sc.ci.p5}-{sc.ci.p95}%]
                      </span>
                    )}
                    <span className={`text-white/30 text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>&#9654;</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${meta.color}15` }}>
                    {/* Calculation breakdown */}
                    <div className="pt-3">
                      <h4 className="text-[11px] font-semibold text-white/60 mb-2">Detailed calculation</h4>
                      <div className="rounded-lg bg-black/20 p-3 font-mono text-[11px] space-y-1">
                        <div className="flex justify-between text-white/40">
                          <span>Prior (historical baseline):</span>
                          <span className="text-white/60">{sc.prior.toFixed(1)}</span>
                        </div>
                        {sc.contributions.map((c, i) => {
                          const idxMeta = INDEX_META[c.index];
                          return (
                            <div key={i} className="flex justify-between">
                              <span className="text-white/40">
                                {idxMeta?.icon || ''} {c.index} ({c.value.toFixed(0)}) x {c.weight > 0 ? '+' : ''}{c.weight}:
                              </span>
                              <span style={{ color: c.contribution > 0 ? '#ef4444' : '#22c55e' }}>
                                {c.contribution > 0 ? '+' : ''}{c.contribution.toFixed(1)}
                              </span>
                            </div>
                          );
                        })}
                        <div className="border-t border-white/10 pt-1 flex justify-between text-white/60">
                          <span>Raw score:</span>
                          <span>{sc.raw_score.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between font-semibold" style={{ color: meta.color }}>
                          <span>Probability (normalized):</span>
                          <span>{sc.probability.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual bar breakdown */}
                    <div>
                      <h4 className="text-[11px] font-semibold text-white/60 mb-2">Contribution by index</h4>
                      <div className="space-y-1.5">
                        {sc.contributions.map((c, i) => {
                          const maxAbs = Math.max(...sc.contributions.map(x => Math.abs(x.contribution)), 1);
                          const barWidth = Math.abs(c.contribution) / maxAbs * 100;
                          const isPositive = c.contribution > 0;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-[10px] text-white/40 w-8">{c.index}</span>
                              <div className="flex-1 flex items-center h-3">
                                {!isPositive && (
                                  <div className="flex-1 flex justify-end">
                                    <div className="h-3 rounded-l" style={{ width: `${barWidth}%`, backgroundColor: '#22c55e', minWidth: '2px' }} />
                                  </div>
                                )}
                                <div className="w-px h-4 bg-white/20 flex-shrink-0" />
                                {isPositive && (
                                  <div className="flex-1">
                                    <div className="h-3 rounded-r" style={{ width: `${barWidth}%`, backgroundColor: '#ef4444', minWidth: '2px' }} />
                                  </div>
                                )}
                                {!isPositive && <div className="flex-1" />}
                                {isPositive && <div className="flex-1" style={{ order: -1 }} />}
                              </div>
                              <span className="text-[10px] font-mono w-12 text-right" style={{ color: isPositive ? '#ef4444' : '#22c55e' }}>
                                {isPositive ? '+' : ''}{c.contribution.toFixed(1)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Trigger Rules */}
      <section>
        <h3 className="text-base font-semibold text-white mb-3">Trigger Rules (non-linear)</h3>
        <p className="text-[11px] text-white/35 mb-3">
          These rules activate when certain indices simultaneously exceed critical thresholds. They represent non-linear escalation dynamics.
        </p>
        <div className="grid gap-2">
          {data.triggers.map((t, i) => (
            <div key={i} className="rounded-lg px-3 py-2 flex items-center justify-between" style={{
              background: t.fired ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
              border: t.fired ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.05)',
            }}>
              <div>
                <span className={`text-[11px] font-mono ${t.fired ? 'text-red-400' : 'text-white/40'}`}>
                  {t.label}
                </span>
                <div className="flex gap-2 mt-0.5">
                  {Object.entries(t.boost).map(([sc, val]) => (
                    <span key={sc} className="text-[9px] text-red-400/60">+{val} {sc}</span>
                  ))}
                  {Object.entries(t.dampen).map(([sc, val]) => (
                    <span key={sc} className="text-[9px] text-green-400/60">x{val} {sc}</span>
                  ))}
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                t.fired ? 'bg-red-900/40 text-red-400' : 'bg-gray-800 text-white/30'
              }`}>
                {t.fired ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
