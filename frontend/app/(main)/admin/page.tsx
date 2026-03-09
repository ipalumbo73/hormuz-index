'use client';
import { useEffect, useState, useCallback } from 'react';
import PlotlyWrapper from '@/components/plotly/PlotlyWrapper';
import type { PlotlyFigure } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface Source {
  id: string;
  name: string;
  source_type: string;
  tier: number;
  reliability_score: number;
  active: boolean;
}

interface TuningConfig {
  id?: string;
  version?: string;
  priors: Record<string, number>;
  weights: Record<string, Record<string, number>>;
  thresholds: Record<string, unknown>;
}

interface ActionResult {
  action: string;
  status: 'success' | 'error';
  message: string;
  timestamp: string;
}

export default function AdminPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [tuning, setTuning] = useState<TuningConfig | null>(null);
  const [indicesChart, setIndicesChart] = useState<PlotlyFigure | null>(null);
  const [logs, setLogs] = useState<ActionResult[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  const addLog = (action: string, status: 'success' | 'error', message: string) => {
    setLogs(prev => [{
      action, status, message,
      timestamp: new Date().toLocaleTimeString(),
    }, ...prev].slice(0, 20));
  };

  const fetchSources = useCallback(async () => {
    try {
      const r = await fetch(`${API}/sources`);
      const data = await r.json();
      setSources(Array.isArray(data) ? data : []);
    } catch { setSources([]); }
  }, []);

  const fetchTuning = useCallback(async () => {
    try {
      const r = await fetch(`${API}/admin/tuning-config`);
      setTuning(await r.json());
    } catch { setTuning(null); }
  }, []);

  const fetchIndicesChart = useCallback(async () => {
    try {
      const r = await fetch(`${API}/charts/indices-timeline?range=7d`);
      if (r.ok) setIndicesChart(await r.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchSources();
    fetchTuning();
    fetchIndicesChart();
  }, [fetchSources, fetchTuning, fetchIndicesChart]);

  const runAction = async (label: string, endpoint: string, method = 'POST') => {
    setRunning(label);
    try {
      const r = await fetch(`${API}${endpoint}`, { method });
      const data = await r.json();
      addLog(label, 'success', JSON.stringify(data));
      // Refresh dependent data
      if (label.includes('Seed') || label.includes('Sorgent')) fetchSources();
      if (label.includes('Tuning')) fetchTuning();
      if (label.includes('Ricalcol') || label.includes('Riclassific')) fetchIndicesChart();
    } catch (e: unknown) {
      addLog(label, 'error', e instanceof Error ? e.message : 'Errore di rete');
    } finally {
      setRunning(null);
    }
  };

  const toggleSource = async (source: Source) => {
    try {
      const r = await fetch(`${API}/admin/source/${source.id}/toggle`, { method: 'POST' });
      const data = await r.json();
      addLog(`Toggle ${source.name}`, 'success', `active: ${data.active}`);
      fetchSources();
    } catch (e: unknown) {
      addLog(`Toggle ${source.name}`, 'error', e instanceof Error ? e.message : 'Errore');
    }
  };

  const actions = [
    { label: 'Seed Database', endpoint: '/admin/seed', desc: 'Inserisci le sorgenti iniziali nel database' },
    { label: 'Ingestione Sync', endpoint: '/admin/reingest-sync', desc: 'Raccogli notizie da tutte le fonti (sincrono)' },
    { label: 'Ricalcola Indici', endpoint: '/admin/recompute-sync', desc: 'Ricalcola indici e scenari dai dati attuali' },
    { label: 'Riclassifica Eventi', endpoint: '/admin/reclassify', desc: 'Riclassifica tutti gli eventi con il classificatore aggiornato' },
    { label: 'Reset Tuning', endpoint: '/admin/reset-tuning', desc: 'Ripristina la configurazione di tuning ai valori predefiniti' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-bold text-white tracking-tight">Pannello Admin</h2>
        <p className="text-xs text-white/35 mt-0.5 font-mono">Gestione pipeline, sorgenti e configurazione del modello</p>
      </div>

      {/* Action Buttons */}
      <section className="card">
        <div className="text-[13px] font-semibold text-white/80 mb-3">Azioni Pipeline</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map(a => (
            <button
              key={a.label}
              onClick={() => runAction(a.label, a.endpoint)}
              disabled={running !== null}
              className="text-left p-3 rounded-lg transition-all disabled:opacity-40"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="text-sm font-medium text-white flex items-center gap-2">
                {running === a.label && (
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-gray-600 border-t-orange-500 rounded-full" />
                )}
                {a.label}
              </div>
              <div className="text-[11px] text-white/35 mt-1">{a.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Action Log */}
      {logs.length > 0 && (
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-semibold text-white/80">Log Operazioni</div>
            <button onClick={() => setLogs([])} className="text-[11px] text-white/30 hover:text-white/50">Pulisci</button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scroll">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-xs font-mono py-1 px-2 rounded" style={{
                background: log.status === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.06)',
              }}>
                <span className={log.status === 'error' ? 'text-red-400' : 'text-green-400'}>
                  {log.status === 'error' ? '✗' : '✓'}
                </span>
                <span className="text-white/30">{log.timestamp}</span>
                <span className="text-white/60">{log.action}</span>
                <span className="text-white/30 truncate flex-1">{log.message}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Indices Timeline */}
      <section className="card">
        <div className="text-[13px] font-semibold text-white/80 mb-1">Andamento Indici (7 giorni)</div>
        <p className="text-[10px] text-white/30 mb-3">Tutti e 7 gli indici di rischio — linea tratteggiata = DCI (Diplomatico, scala inversa)</p>
        {indicesChart ? (
          <PlotlyWrapper data={indicesChart.data} layout={indicesChart.layout} config={indicesChart.config} height={280} />
        ) : (
          <div className="h-56 flex items-center justify-center text-white/30 text-sm">Nessun dato disponibile</div>
        )}
      </section>

      {/* Sources Management */}
      <section className="card overflow-hidden">
        <div className="text-[13px] font-semibold text-white/80 mb-3 px-1">Gestione Sorgenti</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left py-2.5 px-4">Nome</th>
              <th className="text-left py-2.5 px-4">Tipo</th>
              <th className="text-center py-2.5 px-4">Tier</th>
              <th className="text-center py-2.5 px-4">Affidabilità</th>
              <th className="text-center py-2.5 px-4">Stato</th>
              <th className="text-center py-2.5 px-4">Azione</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(src => (
              <tr key={src.id} className="border-b border-gray-800/50 hover:bg-white/[0.02]">
                <td className="py-2.5 px-4 font-medium text-white">{src.name}</td>
                <td className="py-2.5 px-4 text-gray-400">{src.source_type}</td>
                <td className="py-2.5 px-4 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs ${src.tier === 1 ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                    T{src.tier}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-center">
                  <span className={`font-mono ${src.reliability_score >= 0.9 ? 'text-green-400' : src.reliability_score >= 0.8 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {(src.reliability_score * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="py-2.5 px-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${src.active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${src.active ? 'bg-green-500' : 'bg-red-500'}`} />
                    {src.active ? 'Attivo' : 'Off'}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-center">
                  <button
                    onClick={() => toggleSource(src)}
                    className="text-xs px-3 py-1 rounded transition-all hover:bg-white/10"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: src.active ? '#f87171' : '#4ade80',
                    }}
                  >
                    {src.active ? 'Disattiva' : 'Attiva'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sources.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">Nessuna sorgente. Usa &quot;Seed Database&quot; per inizializzare.</div>
        )}
      </section>

      {/* Tuning Config */}
      {tuning && (
        <section className="card">
          <div className="text-[13px] font-semibold text-white/80 mb-3">
            Configurazione Tuning
            {tuning.version && <span className="ml-2 text-[11px] font-mono text-white/30">v{tuning.version}</span>}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Priors */}
            <div>
              <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">Prior degli Scenari</div>
              <div className="space-y-1.5">
                {Object.entries(tuning.priors).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-white/60 capitalize">{k.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                        <div className="h-full rounded-full bg-orange-500/60" style={{ width: `${v}%` }} />
                      </div>
                      <span className="font-mono text-white/80 text-xs w-8 text-right">{v}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weight Matrix Preview */}
            <div>
              <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">Matrice Pesi (Indici → Scenari)</div>
              {Object.keys(tuning.weights).length > 0 ? (
                <div className="text-xs font-mono text-white/30 overflow-auto max-h-40 custom-scroll">
                  <table className="w-full">
                    <thead>
                      <tr className="text-white/40">
                        <th className="text-left py-1 pr-2">Indice</th>
                        {Object.keys(tuning.priors).map(s => (
                          <th key={s} className="text-center py-1 px-1">{s.slice(0, 4)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(tuning.weights).map(([idx, vals]) => (
                        <tr key={idx} className="border-t border-gray-800/50">
                          <td className="py-1 pr-2 text-white/50">{idx}</td>
                          {Object.keys(tuning.priors).map(s => (
                            <td key={s} className="text-center py-1 px-1">
                              {typeof vals === 'object' && vals !== null ? ((vals as Record<string, number>)[s] ?? '-') : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-xs text-white/20">Nessun peso configurato</div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
