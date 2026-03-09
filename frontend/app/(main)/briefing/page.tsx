'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const LEVEL_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  green: { bg: 'rgba(34,197,94,0.08)', text: '#22c55e', dot: '#22c55e' },
  yellow: { bg: 'rgba(234,179,8,0.08)', text: '#eab308', dot: '#eab308' },
  orange: { bg: 'rgba(249,115,22,0.08)', text: '#f97316', dot: '#f97316' },
  red: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444', dot: '#ef4444' },
  dark_red: { bg: 'rgba(153,27,27,0.10)', text: '#dc2626', dot: '#dc2626' },
};

const LEVEL_LABELS: Record<string, string> = {
  green: 'Basso',
  yellow: 'Moderato',
  orange: 'Elevato',
  red: 'Alto',
  dark_red: 'Critico',
};

const CATEGORY_LABELS: Record<string, string> = {
  military_strike: 'Strike militare',
  missile_drone_attack: 'Missili/Droni',
  nuclear_posture_signal: 'Postura nucleare',
  nuclear_verification_gap: 'Gap verifica',
  enrichment_signal: 'Arricchimento',
  proxy_activity: 'Attività proxy',
  gulf_infrastructure_attack: 'Infrastrutture Golfo',
  shipping_disruption: 'Disruzione navale',
  hormuz_threat: 'Minaccia Hormuz',
  strategic_rhetoric: 'Retorica strategica',
  diplomatic_contact: 'Diplomazia',
  deescalation_signal: 'De-escalation',
  sanctions_or_economic_pressure: 'Sanzioni',
  cyber_operation: 'Cyber',
  civilian_casualty_mass_event: 'Vittime civili',
  nuclear_site_damage: 'Siti nucleari',
  underground_activity_signal: 'Attività sotterranea',
};

interface BriefingData {
  date: string;
  summary_it: string;
  summary_en: string;
  indices: Record<string, { value: number; delta: number; level: string }>;
  dominant_scenario: { name: string; probability: number };
  top_events: { title: string; category: string; severity: number; timestamp: string }[];
  events_24h_count: number;
  alerts_active: number;
  biggest_mover: { index: string; delta: number; direction: string };
}

const SCENARIO_LABELS: Record<string, string> = {
  contained: 'Conflitto Contenuto',
  regional: 'Guerra Regionale',
  threshold: 'Crisi Soglia Nucleare',
  coercive: 'Coercizione Nucleare',
  actual: 'Uso Nucleare Effettivo',
};

const INDEX_ORDER = ['NOI', 'GAI', 'HDI', 'PAI', 'SRI', 'BSI', 'DCI'];

export default function BriefingPage() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/briefing/daily`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gray-600 border-t-orange-500 rounded-full mx-auto mb-4" />
          <p className="text-white/40">Caricamento briefing...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center card p-8">
          <p className="text-white/50">Nessun dato disponibile per il briefing giornaliero.</p>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(data.date + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <p className="text-white/30 text-xs font-mono uppercase tracking-widest mb-2">Briefing Giornaliero</p>
        <h1 className="text-2xl font-bold text-white">{formattedDate}</h1>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-white/40">
          <span>{data.events_24h_count} eventi nelle ultime 24h</span>
          {data.alerts_active > 0 && (
            <span className="text-red-400">{data.alerts_active} alert attivi</span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl px-6 py-5" style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <h2 className="text-sm font-semibold text-white/70 mb-3">Sintesi</h2>
        <p className="text-[14px] text-white/80 leading-relaxed">{data.summary_it}</p>
      </div>

      {/* Indices Table */}
      <div className="rounded-xl overflow-hidden" style={{
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div className="px-5 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h2 className="text-sm font-semibold text-white/70">Indici di Rischio</h2>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {INDEX_ORDER.map(name => {
            const idx = data.indices[name];
            if (!idx) return null;
            const lc = LEVEL_COLORS[idx.level] || LEVEL_COLORS.green;
            return (
              <div key={name} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: lc.dot }} />
                  <span className="text-sm font-mono font-bold text-white/80">{name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: lc.bg, color: lc.text }}>
                    {LEVEL_LABELS[idx.level] || idx.level}
                  </span>
                  <span className="text-sm font-mono text-white/70 w-10 text-right">{idx.value.toFixed(1)}</span>
                  <span className="text-xs font-mono w-14 text-right" style={{ color: idx.delta > 0 ? '#ef4444' : idx.delta < 0 ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>
                    {idx.delta > 0 ? '+' : ''}{idx.delta.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dominant Scenario */}
      <div className="rounded-xl px-6 py-5" style={{
        background: 'rgba(249,115,22,0.05)',
        border: '1px solid rgba(249,115,22,0.12)',
      }}>
        <h2 className="text-sm font-semibold text-white/70 mb-2">Scenario Dominante</h2>
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-bold text-orange-400">
            {SCENARIO_LABELS[data.dominant_scenario.name] || data.dominant_scenario.name}
          </span>
          <span className="text-lg font-mono text-white/60">{data.dominant_scenario.probability}%</span>
        </div>
      </div>

      {/* Top Events */}
      {data.top_events.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="px-5 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h2 className="text-sm font-semibold text-white/70">Eventi Principali (ultime 24h)</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {data.top_events.map((ev, i) => (
              <div key={i} className="px-5 py-3 hover:bg-white/[0.02] transition">
                <p className="text-[13px] text-white/75 leading-snug">{ev.title}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-white/35">
                    {CATEGORY_LABELS[ev.category] || ev.category?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-white/25 font-mono">
                    sev {(ev.severity * 100).toFixed(0)}
                  </span>
                  {ev.timestamp && (
                    <span className="text-[10px] text-white/25 font-mono">
                      {new Date(ev.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-[11px] text-white/20 py-4">
        Questo briefing analizza notizie pubbliche, non fatti verificati. Vedi la pagina Modello per dettagli sulla metodologia.
      </p>
    </div>
  );
}
