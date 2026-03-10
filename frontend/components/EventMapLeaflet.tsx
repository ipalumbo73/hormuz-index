'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ---------- types ----------
interface MapEvent {
  id: string;
  lat: number;
  lon: number;
  lat_raw: number;
  lon_raw: number;
  title: string;
  summary: string;
  category: string;
  severity: number;
  confidence: number;
  source_reliability: number;
  timestamp: string;
  precision: string;
  actors: string[];
  locations: string[];
  countries: string[];
  article_url?: string;
}

interface MapStats {
  total: number;
  geolocated_pct: number;
  categories: Record<string, number>;
  regions: Record<string, number>;
}

interface MapData {
  events: MapEvent[];
  stats: MapStats;
  meta: { range: string };
}

interface EventMapProps {
  lang?: 'it' | 'en';
  height?: number;
}

// ---------- constants ----------
const CATEGORY_COLORS: Record<string, string> = {
  military_strike: '#ef4444',
  missile_drone_attack: '#f97316',
  nuclear_posture_signal: '#a855f7',
  nuclear_verification_gap: '#9333ea',
  enrichment_signal: '#7c3aed',
  nuclear_site_damage: '#dc2626',
  nuclear_transfer_signal: '#b91c1c',
  proxy_activity: '#f59e0b',
  gulf_infrastructure_attack: '#ef4444',
  shipping_disruption: '#3b82f6',
  hormuz_threat: '#0ea5e9',
  strategic_rhetoric: '#8b5cf6',
  diplomatic_contact: '#22c55e',
  deescalation_signal: '#10b981',
  sanctions_or_economic_pressure: '#6366f1',
  cyber_operation: '#06b6d4',
  civilian_casualty_mass_event: '#dc2626',
  underground_activity_signal: '#7c3aed',
};

const CATEGORY_LABELS_IT: Record<string, string> = {
  military_strike: 'Strike militare',
  missile_drone_attack: 'Missili/Droni',
  nuclear_posture_signal: 'Postura nucleare',
  nuclear_verification_gap: 'Gap verifica nucleare',
  enrichment_signal: 'Segnale arricchimento',
  nuclear_site_damage: 'Danno siti nucleari',
  nuclear_transfer_signal: 'Trasferimento nucleare',
  proxy_activity: 'Attività proxy',
  gulf_infrastructure_attack: 'Infrastrutture Golfo',
  shipping_disruption: 'Disruzione navale',
  hormuz_threat: 'Minaccia Hormuz',
  strategic_rhetoric: 'Retorica strategica',
  diplomatic_contact: 'Contatto diplomatico',
  deescalation_signal: 'Segnale de-escalation',
  sanctions_or_economic_pressure: 'Sanzioni/Pressione econ.',
  cyber_operation: 'Operazione cyber',
  civilian_casualty_mass_event: 'Vittime civili',
  underground_activity_signal: 'Attività sotterranea',
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  military_strike: 'Military Strike',
  missile_drone_attack: 'Missiles / Drones',
  nuclear_posture_signal: 'Nuclear Posture',
  nuclear_verification_gap: 'Verification Gap',
  enrichment_signal: 'Enrichment Signal',
  nuclear_site_damage: 'Nuclear Site Damage',
  nuclear_transfer_signal: 'Nuclear Transfer',
  proxy_activity: 'Proxy Activity',
  gulf_infrastructure_attack: 'Gulf Infrastructure',
  shipping_disruption: 'Shipping Disruption',
  hormuz_threat: 'Hormuz Threat',
  strategic_rhetoric: 'Strategic Rhetoric',
  diplomatic_contact: 'Diplomatic Contact',
  deescalation_signal: 'De-escalation Signal',
  sanctions_or_economic_pressure: 'Sanctions / Econ. Pressure',
  cyber_operation: 'Cyber Operation',
  civilian_casualty_mass_event: 'Civilian Casualties',
  underground_activity_signal: 'Underground Activity',
};

const TIME_RANGES = [
  { value: '24h', labelIT: '24h', labelEN: '24h' },
  { value: '48h', labelIT: '48h', labelEN: '48h' },
  { value: '7d', labelIT: '7gg', labelEN: '7d' },
  { value: '30d', labelIT: '30gg', labelEN: '30d' },
];

// ---------- helpers ----------
function getEventAge(timestamp: string): number {
  if (!timestamp) return 999;
  return (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
}

function getOpacityByAge(hours: number): number {
  if (hours < 6) return 1.0;
  if (hours < 24) return 0.85;
  if (hours < 72) return 0.65;
  if (hours < 168) return 0.45;
  return 0.3;
}

function timeAgo(timestamp: string, lang: 'it' | 'en'): string {
  if (!timestamp) return '';
  const hours = getEventAge(timestamp);
  if (hours < 1) {
    const mins = Math.floor(hours * 60);
    return lang === 'it' ? `${mins}min fa` : `${mins}min ago`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    return lang === 'it' ? `${h}h fa` : `${h}h ago`;
  }
  const days = Math.floor(hours / 24);
  return lang === 'it' ? `${days}g fa` : `${days}d ago`;
}

// ---------- inner map (loaded dynamically, no SSR) ----------
function InnerMap({
  events,
  lang,
  height,
  enabledCategories,
}: {
  events: MapEvent[];
  lang: 'it' | 'en';
  height: number;
  enabledCategories: Set<string>;
}) {
  const L = require('leaflet');
  require('leaflet.markercluster');
  require('leaflet.markercluster/dist/MarkerCluster.css');
  require('leaflet.markercluster/dist/MarkerCluster.Default.css');
  const { MapContainer, TileLayer, useMap } = require('react-leaflet');
  const clusterGroupRef = useRef<any>(null);

  const labels = lang === 'it' ? CATEGORY_LABELS_IT : CATEGORY_LABELS_EN;

  // Filter events by enabled categories
  const filteredEvents = useMemo(
    () => events.filter(ev => enabledCategories.has(ev.category)),
    [events, enabledCategories]
  );

  // Component that manages the cluster layer
  function ClusterLayer({ events }: { events: MapEvent[] }) {
    const map = useMap();

    useEffect(() => {
      // Remove old cluster group
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }

      const clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 40,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 9,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const markers = cluster.getAllChildMarkers();
          // Average severity for color
          const avgSev = markers.reduce((s: number, m: any) => s + (m.options.severity || 0.5), 0) / count;
          // Dominant category for color
          const catCounts: Record<string, number> = {};
          markers.forEach((m: any) => {
            const c = m.options.category || 'unknown';
            catCounts[c] = (catCounts[c] || 0) + 1;
          });
          const dominantCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
          const color = CATEGORY_COLORS[dominantCat] || '#64748b';

          let size = 32;
          let fontSize = 11;
          if (count > 50) { size = 44; fontSize = 13; }
          else if (count > 20) { size = 38; fontSize = 12; }

          return L.divIcon({
            html: `<div style="
              background: ${color}33;
              border: 2px solid ${color};
              border-radius: 50%;
              width: ${size}px;
              height: ${size}px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 700;
              font-size: ${fontSize}px;
              font-family: 'JetBrains Mono', monospace;
              box-shadow: 0 0 ${avgSev > 0.6 ? 12 : 6}px ${color}66;
            ">${count}</div>`,
            className: '',
            iconSize: L.point(size, size),
          });
        },
      });

      for (const ev of events) {
        const color = CATEGORY_COLORS[ev.category] || '#64748b';
        const ageHours = getEventAge(ev.timestamp);
        const opacity = getOpacityByAge(ageHours);
        const radius = Math.max(6, Math.min(18, ev.severity * 22));
        const isHighSeverity = ev.severity >= 0.7;
        const catLabel = labels[ev.category] || ev.category?.replace(/_/g, ' ');
        const precLabel = ev.precision === 'city'
          ? (lang === 'it' ? 'Precisa' : 'Precise')
          : (lang === 'it' ? 'Approssimativa' : 'Approximate');

        // Severity bar
        const sevPct = Math.round(ev.severity * 100);
        const sevColor = ev.severity >= 0.7 ? '#ef4444' : ev.severity >= 0.5 ? '#f59e0b' : '#22c55e';

        const popupHtml = `
          <div style="min-width:220px;max-width:300px;font-family:system-ui,sans-serif;">
            <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:6px;line-height:1.3;">
              ${ev.title}
            </div>
            ${ev.summary ? `<div style="font-size:11px;color:#64748b;margin-bottom:8px;line-height:1.4;">${ev.summary}</div>` : ''}
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
              <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:${color}22;color:${color};">
                ${catLabel}
              </span>
              <span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;background:#f1f5f9;color:#475569;">
                ${timeAgo(ev.timestamp, lang)}
              </span>
              <span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;background:#f1f5f9;color:#475569;">
                ${precLabel}
              </span>
            </div>
            <div style="margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;margin-bottom:2px;">
                <span>${lang === 'it' ? 'Severità' : 'Severity'}</span>
                <span style="color:${sevColor};font-weight:600;">${sevPct}%</span>
              </div>
              <div style="height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${sevPct}%;background:${sevColor};border-radius:2px;"></div>
              </div>
            </div>
            <div style="display:flex;gap:12px;font-size:10px;color:#94a3b8;">
              <span>${lang === 'it' ? 'Affidab.' : 'Reliability'}: <b style="color:#475569;">${Math.round(ev.source_reliability * 100)}%</b></span>
              <span>${lang === 'it' ? 'Confid.' : 'Confidence'}: <b style="color:#475569;">${Math.round(ev.confidence * 100)}%</b></span>
            </div>
            ${ev.actors.length > 0 ? `
            <div style="margin-top:6px;font-size:10px;color:#94a3b8;">
              ${lang === 'it' ? 'Attori' : 'Actors'}: <span style="color:#475569;">${ev.actors.join(', ')}</span>
            </div>` : ''}
            ${ev.locations.length > 0 ? `
            <div style="font-size:10px;color:#94a3b8;">
              ${lang === 'it' ? 'Luogo' : 'Location'}: <span style="color:#475569;">${ev.locations.join(', ')}</span>
            </div>` : ''}
            <div style="font-size:9px;color:#cbd5e1;margin-top:6px;border-top:1px solid #e2e8f0;padding-top:4px;">
              ${ev.timestamp ? new Date(ev.timestamp).toLocaleString(lang === 'it' ? 'it-IT' : 'en-US', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              }) : ''}
            </div>
            ${ev.article_url ? `
            <div style="margin-top:6px;">
              <a href="${ev.article_url}" target="_blank" rel="noopener noreferrer"
                 style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#3b82f6;text-decoration:none;font-weight:600;"
                 onmouseover="this.style.color='#2563eb';this.style.textDecoration='underline'"
                 onmouseout="this.style.color='#3b82f6';this.style.textDecoration='none'">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                ${lang === 'it' ? 'Leggi la notizia' : 'Read article'}
              </a>
            </div>` : ''}
          </div>
        `;

        const icon = L.divIcon({
          html: `<div style="
            width:${radius * 2}px;
            height:${radius * 2}px;
            border-radius:50%;
            background:${color};
            opacity:${opacity};
            border:${isHighSeverity ? '2px' : '1.5px'} solid rgba(255,255,255,${isHighSeverity ? 0.6 : 0.25});
            box-shadow:0 0 ${isHighSeverity ? 10 : 4}px ${color}${isHighSeverity ? '99' : '44'};
            ${isHighSeverity && ageHours < 12 ? 'animation:pulse-marker 2s infinite;' : ''}
          "></div>`,
          className: '',
          iconSize: L.point(radius * 2, radius * 2),
          iconAnchor: L.point(radius, radius),
        });

        const marker = L.marker([ev.lat, ev.lon], {
          icon,
          severity: ev.severity,
          category: ev.category,
        });
        marker.bindPopup(popupHtml, {
          maxWidth: 320,
          className: 'event-popup',
        });

        clusterGroup.addLayer(marker);
      }

      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;

      return () => {
        if (clusterGroupRef.current) {
          map.removeLayer(clusterGroupRef.current);
          clusterGroupRef.current = null;
        }
      };
    }, [events, map]);

    return null;
  }

  return (
    <div style={{ position: 'relative' }}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <style>{`
        @keyframes pulse-marker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        .event-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .event-popup .leaflet-popup-tip {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      `}</style>
      <MapContainer
        center={[28, 48]}
        zoom={4}
        minZoom={3}
        maxZoom={12}
        style={{ height, width: '100%', borderRadius: '8px', background: '#0f172a' }}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OSM &copy; CARTO'
        />
        <ClusterLayer events={filteredEvents} />
      </MapContainer>

      {/* Attribution */}
      <div style={{
        position: 'absolute', bottom: 4, right: 8, zIndex: 1000,
        fontSize: 9, color: 'rgba(255,255,255,0.2)',
      }}>
        &copy; OpenStreetMap &copy; CARTO
      </div>
    </div>
  );
}

// ---------- dynamic import wrapper (no SSR) ----------
const DynamicInnerMap = dynamic(
  () => Promise.resolve(InnerMap),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-lg flex items-center justify-center" style={{ height: 420, background: 'rgba(15,23,42,0.5)' }}>
        <span className="text-white/30 text-sm">Loading map...</span>
      </div>
    ),
  }
);

// ---------- main exported component ----------
export default function EventMapLeaflet({ lang = 'it', height = 420 }: EventMapProps) {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const labels = lang === 'it' ? CATEGORY_LABELS_IT : CATEGORY_LABELS_EN;

  const fetchMap = useCallback(async () => {
    try {
      const res = await fetch(`${API}/charts/event-map?range=${timeRange}`);
      if (!res.ok) return;
      const json = await res.json();

      // Handle both old format (Plotly traces) and new format (flat events)
      if (json.events) {
        setData(json);
        // Enable all categories initially
        if (enabledCategories.size === 0) {
          const cats = new Set<string>();
          for (const ev of json.events) cats.add(ev.category);
          setEnabledCategories(cats);
        }
      } else if (json.data) {
        // Legacy Plotly format fallback
        const parsed: MapEvent[] = [];
        for (const trace of (json.data || [])) {
          const lats = trace.lat || [];
          const lons = trace.lon || [];
          const texts = trace.text || [];
          const timestamps = trace.timestamps || [];
          const severities = trace.severities || [];
          const catKey = trace.category_key || '';
          for (let i = 0; i < lats.length; i++) {
            parsed.push({
              id: `${catKey}-${i}`,
              lat: lats[i], lon: lons[i],
              lat_raw: lats[i], lon_raw: lons[i],
              title: texts[i] || '', summary: '',
              category: catKey,
              severity: severities[i] || 0.5,
              confidence: 0.5, source_reliability: 0.7,
              timestamp: timestamps[i] || '',
              precision: 'unknown',
              actors: [], locations: [], countries: [],
            });
          }
        }
        setData({
          events: parsed,
          stats: { total: parsed.length, geolocated_pct: 100, categories: {}, regions: {} },
          meta: { range: timeRange },
        });
        if (enabledCategories.size === 0) {
          const cats = new Set<string>();
          for (const ev of parsed) cats.add(ev.category);
          setEnabledCategories(cats);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    setLoading(true);
    fetchMap();
    const interval = setInterval(fetchMap, 60000);
    return () => clearInterval(interval);
  }, [fetchMap]);

  // Toggle a category filter
  const toggleCategory = (cat: string) => {
    setEnabledCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleAll = () => {
    if (!data) return;
    const allCats = new Set(data.events.map(e => e.category));
    if (enabledCategories.size === allCats.size) {
      setEnabledCategories(new Set());
    } else {
      setEnabledCategories(allCats);
    }
  };

  // Sorted categories by event count
  const sortedCategories = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    for (const ev of data.events) {
      counts[ev.category] = (counts[ev.category] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const visibleCount = useMemo(() => {
    if (!data) return 0;
    return data.events.filter(ev => enabledCategories.has(ev.category)).length;
  }, [data, enabledCategories]);

  if (loading && !data) {
    return (
      <div className="animate-pulse rounded-lg flex items-center justify-center" style={{ height, background: 'rgba(15,23,42,0.5)' }}>
        <span className="text-white/30 text-sm">{lang === 'it' ? 'Caricamento mappa...' : 'Loading map...'}</span>
      </div>
    );
  }

  if (!data || data.events.length === 0) {
    return (
      <div className="rounded-lg flex items-center justify-center" style={{ height, background: 'rgba(15,23,42,0.3)' }}>
        <span className="text-white/30 text-sm">
          {lang === 'it'
            ? 'La mappa apparirà dopo la prima raccolta di eventi geolocalizzati'
            : 'Map will appear after the first geolocated event collection'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Controls bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Time range selector */}
        <div className="flex items-center gap-1">
          {TIME_RANGES.map(tr => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className="px-2.5 py-1 text-[11px] font-mono font-medium rounded transition-all"
              style={{
                background: timeRange === tr.value ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${timeRange === tr.value ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: timeRange === tr.value ? '#fb923c' : 'rgba(255,255,255,0.4)',
              }}
            >
              {lang === 'it' ? tr.labelIT : tr.labelEN}
            </button>
          ))}
        </div>

        {/* Stats + filter toggle */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/30">
            {visibleCount}/{data.stats.total} {lang === 'it' ? 'eventi' : 'events'}
            {data.stats.geolocated_pct < 100 && (
              <span className="ml-1">({data.stats.geolocated_pct}% geo)</span>
            )}
          </span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-2.5 py-1 text-[11px] font-medium rounded transition-all"
            style={{
              background: showFilters ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showFilters ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: showFilters ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
            }}
          >
            {lang === 'it' ? 'Filtri' : 'Filters'}
          </button>
        </div>
      </div>

      {/* Category filters */}
      {showFilters && (
        <div className="rounded-lg p-3" style={{
          background: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
              {lang === 'it' ? 'Categorie' : 'Categories'}
            </span>
            <button
              onClick={toggleAll}
              className="text-[10px] text-white/30 hover:text-white/50"
            >
              {enabledCategories.size === sortedCategories.length
                ? (lang === 'it' ? 'Deseleziona tutto' : 'Deselect all')
                : (lang === 'it' ? 'Seleziona tutto' : 'Select all')}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sortedCategories.map(([cat, count]) => {
              const color = CATEGORY_COLORS[cat] || '#64748b';
              const label = labels[cat] || cat.replace(/_/g, ' ');
              const active = enabledCategories.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-all"
                  style={{
                    background: active ? `${color}22` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${active ? `${color}44` : 'rgba(255,255,255,0.06)'}`,
                    color: active ? color : 'rgba(255,255,255,0.25)',
                    opacity: active ? 1 : 0.5,
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: active ? color : 'rgba(255,255,255,0.15)',
                    flexShrink: 0,
                  }} />
                  {label}
                  <span style={{ opacity: 0.6 }}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Map */}
      <DynamicInnerMap
        events={data.events}
        lang={lang}
        height={height}
        enabledCategories={enabledCategories}
      />

      {/* Region hotspots bar */}
      {data.stats.regions && Object.keys(data.stats.regions).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-white/25 uppercase tracking-wider">
            {lang === 'it' ? 'Hotspot:' : 'Hotspots:'}
          </span>
          {Object.entries(data.stats.regions).slice(0, 8).map(([region, count]) => (
            <span key={region} className="text-[10px] font-mono px-2 py-0.5 rounded" style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.45)',
            }}>
              {region} <span style={{ color: 'rgba(255,255,255,0.25)' }}>({count})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
