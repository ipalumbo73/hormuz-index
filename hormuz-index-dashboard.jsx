import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

// ── Data ──────────────────────────────────────────────────────────────
const RISK_INDICES = [
  { id: "nuclear", label: "Nuclear Opacity", value: 0.0, delta: 0.0, level: "Basso", history: [0,0,0,0,0,0,0] },
  { id: "gulf", label: "Gulf Attack", value: 87.5, delta: -1.1, level: "Critico", history: [82,84,85,86,87,88,87.5] },
  { id: "hormuz", label: "Hormuz Disruption", value: 0.0, delta: 0.0, level: "Basso", history: [0,0,0,0,0,0,0] },
  { id: "proxy", label: "Proxy Activation", value: 87.2, delta: 0.7, level: "Critico", history: [78,80,82,84,85,86,87.2] },
  { id: "rhetoric", label: "Strategic Rhetoric", value: 66.7, delta: 11.7, level: "Elevato", history: [42,45,48,50,55,55,66.7] },
  { id: "breakout", label: "Breakout Signal", value: 0.0, delta: 0.0, level: "Basso", history: [0,0,0,0,0,0,0] },
  { id: "diplo", label: "Diplomatic Cooling", value: 56.3, delta: -1.7, level: "Moderato", history: [60,59,58,58,57,58,56.3] },
];

const SCENARIOS = [
  { id: "contained", label: "Conflitto Contenuto", prob: 20.9, tag: "MODERATO", tagColor: "#f59e0b", desc: "Scontri militari limitati e circoscritti tra Iran e Israele/USA, senza coinvolgimento su larga scala di altri attori regionali." },
  { id: "regional", label: "Guerra Regionale", prob: 44.2, tag: "DOMINANTE", tagColor: "#ef4444", desc: "Conflitto su larga scala che coinvolge più paesi del Golfo, proxy armati, milizie, con potenziale disruption dello Stretto di Hormuz." },
  { id: "nuclear_threshold", label: "Crisi Soglia Nucleare", prob: 15.1, tag: "MODERATO", tagColor: "#f59e0b", desc: "L'Iran si avvicina alla capacità di costruire un'arma nucleare (breakout), provocando una crisi internazionale." },
  { id: "coercion", label: "Coercizione Nucleare", prob: 14.6, tag: "BASSO", tagColor: "#22c55e", desc: "L'Iran usa il programma nucleare come leva coercitiva sotto pressione estrema, senza effettivo utilizzo." },
  { id: "nuclear_use", label: "Uso Nucleare Effettivo", prob: 5.3, tag: "BASSO", tagColor: "#22c55e", desc: "Uso effettivo di un dispositivo nucleare. Scenario estremo e improbabile, monitorato come rischio esistenziale." },
];

const TREND_DATA = [
  { date: "01 Mar", contained: 25, regional: 38, nuclear_threshold: 16, coercion: 15, nuclear_use: 6 },
  { date: "02 Mar", contained: 24, regional: 40, nuclear_threshold: 15, coercion: 15, nuclear_use: 6 },
  { date: "03 Mar", contained: 23, regional: 41, nuclear_threshold: 15, coercion: 15, nuclear_use: 6 },
  { date: "04 Mar", contained: 22, regional: 42, nuclear_threshold: 15, coercion: 15, nuclear_use: 6 },
  { date: "05 Mar", contained: 21, regional: 43, nuclear_threshold: 15, coercion: 15, nuclear_use: 6 },
  { date: "06 Mar", contained: 21, regional: 43, nuclear_threshold: 15, coercion: 15, nuclear_use: 6 },
  { date: "07 Mar", contained: 20.9, regional: 44.2, nuclear_threshold: 15.1, coercion: 14.6, nuclear_use: 5.3 },
];

const NOI_DATA = [
  { name: "Narrativa contrastanti", value: 8 },
  { name: "Postura diplomatica opaca", value: 5 },
  { name: "Attività sotterranea", value: 3 },
  { name: "Gap verifica arricchimento", value: 12 },
  { name: "Perdita conoscenza materiali", value: 2 },
  { name: "Perdita accesso ai siti", value: 4 },
];

const EVENT_MAP = [
  { date: "01 Mar", retorica: 2, sanzioni: 0, proxy: 1, missili: 0, attacco: 3, infrastr: 0, diplomazia: 0, deescalation: 0 },
  { date: "02 Mar", retorica: 1, sanzioni: 2, proxy: 0, missili: 0, attacco: 0, infrastr: 0, diplomazia: 1, deescalation: 0 },
  { date: "03 Mar", retorica: 0, sanzioni: 1, proxy: 2, missili: 1, attacco: 0, infrastr: 0, diplomazia: 0, deescalation: 0 },
  { date: "04 Mar", retorica: 1, sanzioni: 0, proxy: 0, missili: 0, attacco: 0, infrastr: 1, diplomazia: 0, deescalation: 0 },
  { date: "05 Mar", retorica: 0, sanzioni: 0, proxy: 1, missili: 1, attacco: 0, infrastr: 0, diplomazia: 0, deescalation: 0 },
  { date: "06 Mar", retorica: 3, sanzioni: 2, proxy: 2, missili: 1, attacco: 1, infrastr: 0, diplomazia: 0, deescalation: 0 },
  { date: "07 Mar", retorica: 4, sanzioni: 0, proxy: 0, missili: 0, attacco: 0, infrastr: 0, diplomazia: 0, deescalation: 1 },
];

const ALERTS = [
  { time: "11:18:02", msg: "Gulf Attack Index a 87.5 — livello CRITICO" },
  { time: "11:08:02", msg: "Gulf Attack Index a 87.5 — livello CRITICO" },
  { time: "10:57:58", msg: "Gulf Attack Index a 87.5 — livello CRITICO" },
  { time: "10:47:56", msg: "Strategic Rhetoric +11.7 in 24h" },
  { time: "10:37:58", msg: "Proxy Activation supera soglia 85.0" },
];

// ── Helpers ────────────────────────────────────────────────────────────
const levelColor = (level) => {
  const m = { Basso: "#22c55e", Moderato: "#f59e0b", Elevato: "#f97316", Critico: "#ef4444" };
  return m[level] || "#64748b";
};

const levelBg = (level) => {
  const m = { Basso: "rgba(34,197,94,0.08)", Moderato: "rgba(245,158,11,0.08)", Elevato: "rgba(249,115,22,0.08)", Critico: "rgba(239,68,68,0.1)" };
  return m[level] || "rgba(100,116,139,0.08)";
};

const scenarioColor = (id) => {
  const m = { contained: "#22c55e", regional: "#ef4444", nuclear_threshold: "#f59e0b", coercion: "#f97316", nuclear_use: "#dc2626" };
  return m[id] || "#64748b";
};

// ── Sparkline ──────────────────────────────────────────────────────────
const Sparkline = ({ data, color, width = 80, height = 24 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * height} r="2" fill={color} />
    </svg>
  );
};

// ── Gauge Arc ──────────────────────────────────────────────────────────
const GaugeArc = ({ value, size = 180 }) => {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size * 0.52;
  const startAngle = -210;
  const endAngle = 30;
  const totalArc = endAngle - startAngle;
  const filledAngle = startAngle + (value / 100) * totalArc;

  const toRad = (d) => (d * Math.PI) / 180;
  const arcPath = (start, end, radius) => {
    const sx = cx + radius * Math.cos(toRad(start));
    const sy = cy + radius * Math.sin(toRad(start));
    const ex = cx + radius * Math.cos(toRad(end));
    const ey = cy + radius * Math.sin(toRad(end));
    const large = end - start > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey}`;
  };

  const getColor = (v) => {
    if (v < 20) return "#22c55e";
    if (v < 40) return "#f59e0b";
    if (v < 60) return "#f97316";
    return "#ef4444";
  };

  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
      <path d={arcPath(startAngle, endAngle, r)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
      {value > 0 && (
        <path d={arcPath(startAngle, filledAngle, r)} fill="none" stroke={getColor(value)} strokeWidth="10" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${getColor(value)}60)` }} />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#f1f5f9" fontSize="28" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{value.toFixed(1)}%</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="'JetBrains Mono', monospace">RISCHIO ESCALATION</text>
    </svg>
  );
};

// ── Main Component ─────────────────────────────────────────────────────
export default function HormuzIndex() {
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [expandedScenario, setExpandedScenario] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const nuclearRisk = 34.9;
  const nuclearDelta = 1.8;
  const totalEvents = 14;
  const lastUpdate = "11:18:02";

  // What changed summary
  const generateSummary = () => {
    const changes = RISK_INDICES.filter(r => Math.abs(r.delta) > 1);
    if (changes.length === 0) return "Nessuna variazione significativa nelle ultime 24h.";
    const parts = changes.map(r => `${r.label} ${r.delta > 0 ? "+" : ""}${r.delta.toFixed(1)}`);
    const dominant = SCENARIOS.reduce((a, b) => a.prob > b.prob ? a : b);
    return `Ultime 24h: ${parts.join(", ")}. Scenario dominante: ${dominant.label} (${dominant.prob}%).`;
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
    
    .hi-root {
      font-family: 'Space Grotesk', sans-serif;
      background: #0a0e17;
      color: #e2e8f0;
      min-height: 100vh;
      overflow-x: hidden;
    }
    .hi-root * { box-sizing: border-box; margin: 0; padding: 0; }
    
    .hi-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px;
      background: linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,14,23,0.9) 100%);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      position: sticky; top: 0; z-index: 50;
      backdrop-filter: blur(12px);
    }
    .hi-logo { display: flex; align-items: center; gap: 10px; }
    .hi-logo-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, #ef4444, #f97316);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; color: white;
    }
    .hi-logo-text { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
    .hi-logo-text span { color: #f97316; }
    .hi-live {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(239,68,68,0.15); color: #ef4444;
      padding: 2px 10px; border-radius: 12px; font-size: 11px;
      font-weight: 600; margin-left: 10px;
      font-family: 'JetBrains Mono', monospace;
    }
    .hi-live::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: #ef4444;
      animation: pulse-dot 1.5s infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
    }
    
    .hi-nav { display: flex; gap: 4px; }
    .hi-nav button {
      background: none; border: none; color: rgba(255,255,255,0.45);
      padding: 6px 14px; border-radius: 6px; cursor: pointer;
      font-family: inherit; font-size: 13px; font-weight: 500;
      transition: all 0.2s;
    }
    .hi-nav button:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.05); }
    .hi-nav button.active { color: #f1f5f9; background: rgba(255,255,255,0.08); }
    
    .hi-body { padding: 20px 24px; max-width: 1280px; margin: 0 auto; }
    
    /* Alert Banner */
    .hi-alert-banner {
      background: linear-gradient(135deg, rgba(239,68,68,0.08), rgba(249,115,22,0.06));
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 10px; padding: 10px 16px;
      margin-bottom: 20px; cursor: pointer;
      transition: all 0.25s;
    }
    .hi-alert-banner:hover { border-color: rgba(239,68,68,0.35); }
    .hi-alert-top { display: flex; align-items: center; justify-content: space-between; }
    .hi-alert-left { display: flex; align-items: center; gap: 10px; }
    .hi-alert-badge {
      background: rgba(239,68,68,0.2); color: #ef4444;
      padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }
    .hi-alert-msg { font-size: 13px; color: rgba(255,255,255,0.7); }
    .hi-alert-expand { color: rgba(255,255,255,0.3); font-size: 12px; transition: transform 0.2s; }
    .hi-alert-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
    .hi-alert-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 10px; border-radius: 6px;
      background: rgba(255,255,255,0.02);
      font-size: 12px;
    }
    .hi-alert-time { color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; font-size: 11px; }
    
    /* Summary */
    .hi-summary {
      background: rgba(59,130,246,0.06);
      border: 1px solid rgba(59,130,246,0.15);
      border-radius: 10px; padding: 12px 16px;
      margin-bottom: 20px;
      font-size: 13px; color: rgba(255,255,255,0.65);
      line-height: 1.5;
      display: flex; align-items: flex-start; gap: 10px;
    }
    .hi-summary-icon { color: #3b82f6; font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    
    /* Title bar */
    .hi-title-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .hi-title { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .hi-subtitle { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px; font-family: 'JetBrains Mono', monospace; }
    .hi-refresh {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      color: #e2e8f0; padding: 7px 16px; border-radius: 8px;
      cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 500;
      transition: all 0.2s;
    }
    .hi-refresh:hover { background: rgba(255,255,255,0.1); }
    
    /* Nuclear Risk Gauge */
    .hi-gauge-card {
      background: linear-gradient(135deg, rgba(15,23,42,0.8), rgba(20,27,45,0.8));
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px; padding: 24px;
      margin-bottom: 20px;
      display: flex; align-items: center; gap: 32px;
    }
    .hi-gauge-info { flex: 1; }
    .hi-gauge-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
    .hi-gauge-desc { font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.5; }
    .hi-gauge-visual { display: flex; flex-direction: column; align-items: center; }
    .hi-gauge-delta {
      font-family: 'JetBrains Mono', monospace; font-size: 12px;
      display: flex; align-items: center; gap: 4px; margin-top: 4px;
    }
    
    /* Risk Indices Grid */
    .hi-section-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .hi-section-desc { font-size: 11px; color: rgba(255,255,255,0.3); margin-bottom: 14px; }
    .hi-indices-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
      gap: 10px; margin-bottom: 24px;
    }
    .hi-index-card {
      background: rgba(15,23,42,0.6);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px; padding: 14px;
      transition: border-color 0.2s;
    }
    .hi-index-card:hover { border-color: rgba(255,255,255,0.12); }
    .hi-index-label { font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 8px; font-weight: 500; }
    .hi-index-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px; }
    .hi-index-value { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700; }
    .hi-index-delta { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
    .hi-index-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
    .hi-index-level {
      font-size: 10px; font-weight: 600; padding: 2px 8px;
      border-radius: 8px; text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
    }
    
    /* Scenarios */
    .hi-scenarios { margin-bottom: 24px; }
    .hi-scenario-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
    .hi-scenario-card {
      border-radius: 10px; padding: 16px;
      border: 1px solid rgba(255,255,255,0.06);
      cursor: pointer; transition: all 0.2s;
      position: relative; overflow: hidden;
    }
    .hi-scenario-card::before {
      content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%;
    }
    .hi-scenario-card:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-1px); }
    .hi-scenario-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .hi-scenario-name { font-size: 13px; font-weight: 600; }
    .hi-scenario-tag {
      font-size: 9px; font-weight: 700; padding: 2px 8px;
      border-radius: 8px; text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
    }
    .hi-scenario-prob { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; margin-bottom: 2px; }
    .hi-scenario-prob-label { font-size: 10px; color: rgba(255,255,255,0.35); }
    .hi-scenario-desc {
      font-size: 11px; color: rgba(255,255,255,0.45); line-height: 1.5;
      margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);
    }
    .hi-scenario-toggle { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 8px; cursor: pointer; }
    
    /* Charts */
    .hi-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    @media (max-width: 800px) { .hi-charts-grid { grid-template-columns: 1fr; } }
    .hi-chart-card {
      background: rgba(15,23,42,0.6);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 18px;
    }
    .hi-chart-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .hi-chart-desc { font-size: 10px; color: rgba(255,255,255,0.3); margin-bottom: 14px; }
    
    /* Export button */
    .hi-actions { display: flex; gap: 8px; }
    .hi-btn-export {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.6); padding: 6px 12px; border-radius: 6px;
      cursor: pointer; font-family: inherit; font-size: 11px;
      transition: all 0.2s;
    }
    .hi-btn-export:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
    
    /* Info tooltip */
    .hi-info-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px; border-radius: 50%;
      background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3);
      font-size: 10px; cursor: help; margin-left: 6px;
      font-family: 'JetBrains Mono', monospace;
    }
    
    /* Custom tooltip */
    .hi-tooltip {
      background: rgba(15,23,42,0.95) !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 8px !important;
      padding: 10px 14px !important;
      font-size: 12px !important;
      font-family: 'JetBrains Mono', monospace !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
    }

    /* Event dots */
    .hi-events-section { margin-bottom: 24px; }
  `;

  return (
    <div className="hi-root">
      <style>{css}</style>

      {/* Header */}
      <header className="hi-header">
        <div className="hi-logo">
          <div className="hi-logo-icon">HI</div>
          <div>
            <div className="hi-logo-text">Hormuz <span>Index</span></div>
          </div>
          <div className="hi-live">LIVE</div>
        </div>
        <nav className="hi-nav">
          {["Dashboard", "Timeline", "Nuclear", "Sources"].map(t => (
            <button key={t} className={activeTab === t.toLowerCase() ? "active" : ""}
              onClick={() => setActiveTab(t.toLowerCase())}>{t}</button>
          ))}
        </nav>
      </header>

      <div className="hi-body">
        {/* Alert Banner — collapsible */}
        <div className="hi-alert-banner" onClick={() => setAlertsExpanded(!alertsExpanded)}>
          <div className="hi-alert-top">
            <div className="hi-alert-left">
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span className="hi-alert-badge">{ALERTS.length} alert attivi</span>
              <span className="hi-alert-msg">{ALERTS[0].msg}</span>
            </div>
            <span className="hi-alert-expand" style={{ transform: alertsExpanded ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
          </div>
          {alertsExpanded && (
            <div className="hi-alert-list">
              {ALERTS.map((a, i) => (
                <div key={i} className="hi-alert-item">
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>⚠ {a.msg}</span>
                  <span className="hi-alert-time">{a.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What Changed Summary */}
        <div className="hi-summary">
          <span className="hi-summary-icon">📊</span>
          <span>{generateSummary()}</span>
        </div>

        {/* Title Bar */}
        <div className="hi-title-bar">
          <div>
            <div className="hi-title">Crisis Dashboard</div>
            <div className="hi-subtitle">{totalEvents} eventi nelle ultime 24h · Aggiornato alle {lastUpdate}</div>
          </div>
          <div className="hi-actions">
            <button className="hi-btn-export" onClick={() => alert("Export PNG — funzione demo")}>📷 Snapshot</button>
            <button className="hi-btn-export" onClick={() => alert("Export PDF — funzione demo")}>📄 Report</button>
            <button className="hi-refresh" onClick={() => setNow(new Date())}>↻ Refresh</button>
          </div>
        </div>

        {/* Nuclear Escalation Gauge */}
        <div className="hi-gauge-card">
          <div className="hi-gauge-info">
            <div className="hi-gauge-title">Rischio Escalation Nucleare</div>
            <div className="hi-gauge-desc">
              Probabilità composita che si verifichi uno scenario con dimensione nucleare.
              Calcolato come somma di: Crisi Soglia Nucleare ({SCENARIOS[2].prob}%) + Coercizione Nucleare ({SCENARIOS[3].prob}%) + Uso Nucleare Effettivo ({SCENARIOS[4].prob}%).
            </div>
          </div>
          <div className="hi-gauge-visual">
            <GaugeArc value={nuclearRisk} size={200} />
            <div className="hi-gauge-delta">
              <span style={{ color: nuclearDelta > 0 ? "#ef4444" : "#22c55e" }}>
                {nuclearDelta > 0 ? "▲" : "▼"} {nuclearDelta > 0 ? "+" : ""}{nuclearDelta.toFixed(1)}
              </span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>vs precedente</span>
            </div>
          </div>
        </div>

        {/* Risk Indices */}
        <div style={{ marginBottom: 24 }}>
          <div className="hi-section-title">
            Indici di Rischio
            <span className="hi-info-icon" title="7 indici che alimentano il modello. Ogni indice va da 0 (nessun rischio) a 100 (rischio massimo).">?</span>
          </div>
          <div className="hi-section-desc">Trend a 7 giorni visualizzato per ogni indice</div>
          <div className="hi-indices-grid">
            {RISK_INDICES.map(idx => (
              <div key={idx.id} className="hi-index-card" style={{ borderLeftColor: levelColor(idx.level), borderLeft: `3px solid ${levelColor(idx.level)}` }}>
                <div className="hi-index-label">{idx.label}</div>
                <div className="hi-index-row">
                  <span className="hi-index-value" style={{ color: levelColor(idx.level) }}>{idx.value.toFixed(1)}</span>
                  <span className="hi-index-delta" style={{ color: idx.delta > 0 ? "#ef4444" : idx.delta < 0 ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
                    {idx.delta > 0 ? "+" : ""}{idx.delta.toFixed(1)}
                  </span>
                </div>
                <div className="hi-index-bottom">
                  <span className="hi-index-level" style={{ color: levelColor(idx.level), background: levelBg(idx.level) }}>
                    {idx.level}
                  </span>
                  <Sparkline data={idx.history} color={levelColor(idx.level)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scenarios */}
        <div className="hi-scenarios">
          <div className="hi-section-title">
            Scenari di Escalation
            <span className="hi-info-icon" title="Ogni card rappresenta uno scenario possibile. La somma delle probabilità è sempre 100%.">?</span>
          </div>
          <div className="hi-section-desc">Probabilità stimata calcolata in tempo reale da 7 indici di rischio</div>
          <div className="hi-scenario-grid">
            {SCENARIOS.map(s => (
              <div key={s.id} className="hi-scenario-card"
                style={{ background: `linear-gradient(135deg, ${scenarioColor(s.id)}08, ${scenarioColor(s.id)}04)` }}
                onClick={() => setExpandedScenario(expandedScenario === s.id ? null : s.id)}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: scenarioColor(s.id) }} />
                <div className="hi-scenario-top">
                  <span className="hi-scenario-name">{s.label}</span>
                  <span className="hi-scenario-tag" style={{ color: s.tagColor, background: `${s.tagColor}18` }}>{s.tag}</span>
                </div>
                <div className="hi-scenario-prob" style={{ color: scenarioColor(s.id) }}>{s.prob}%</div>
                <div className="hi-scenario-prob-label">probabilità stimata</div>
                {expandedScenario === s.id && (
                  <div className="hi-scenario-desc">{s.desc}</div>
                )}
                <div className="hi-scenario-toggle">{expandedScenario === s.id ? "▲ Nascondi" : "▼ Dettagli"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="hi-charts-grid">
          {/* Scenario Trend — Line chart instead of stacked area */}
          <div className="hi-chart-card">
            <div className="hi-chart-title">Andamento Scenari (7 giorni)</div>
            <div className="hi-chart-desc">Probabilità dei 5 scenari nel tempo — linee separate per leggibilità</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 60]} />
                <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                  itemStyle={{ color: "#e2e8f0" }} />
                <Line type="monotone" dataKey="regional" stroke="#ef4444" strokeWidth={2} dot={false} name="Guerra Regionale" />
                <Line type="monotone" dataKey="contained" stroke="#22c55e" strokeWidth={2} dot={false} name="Conflitto Contenuto" />
                <Line type="monotone" dataKey="nuclear_threshold" stroke="#f59e0b" strokeWidth={2} dot={false} name="Soglia Nucleare" />
                <Line type="monotone" dataKey="coercion" stroke="#f97316" strokeWidth={1.5} dot={false} name="Coercizione" />
                <Line type="monotone" dataKey="nuclear_use" stroke="#dc2626" strokeWidth={1.5} dot={false} name="Uso Nucleare" strokeDasharray="4 4" />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* NOI — Radar chart */}
          <div className="hi-chart-card">
            <div className="hi-chart-title">Nuclear Opacity Index (NOI)</div>
            <div className="hi-chart-desc">6 componenti che misurano l'opacità del programma nucleare iraniano</div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={NOI_DATA} outerRadius={70}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }} />
                <PolarRadiusAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} domain={[0, 20]} axisLine={false} />
                <Radar name="NOI" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Map */}
        <div className="hi-events-section">
          <div className="hi-chart-card">
            <div className="hi-chart-title">Mappa Eventi per Categoria (7 giorni)</div>
            <div className="hi-chart-desc">Distribuzione eventi per tipo e giorno</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={EVENT_MAP} barGap={0} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="retorica" stackId="a" fill="#8b5cf6" name="Retorica strategica" radius={[0,0,0,0]} />
                <Bar dataKey="sanzioni" stackId="a" fill="#3b82f6" name="Sanzioni" />
                <Bar dataKey="proxy" stackId="a" fill="#22c55e" name="Attività proxy" />
                <Bar dataKey="missili" stackId="a" fill="#f59e0b" name="Missili/Droni" />
                <Bar dataKey="attacco" stackId="a" fill="#f97316" name="Attacco militare" />
                <Bar dataKey="infrastr" stackId="a" fill="#ef4444" name="Infrastrutture Golfo" />
                <Bar dataKey="diplomazia" stackId="a" fill="#06b6d4" name="Diplomazia" />
                <Bar dataKey="deescalation" stackId="a" fill="#10b981" name="De-escalation" radius={[3,3,0,0]} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "20px 0 40px", fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>
          Hormuz Index · Dati aggiornati al {now.toLocaleDateString("it-IT")} · Fonte: analisi multi-sorgente
        </div>
      </div>
    </div>
  );
}
