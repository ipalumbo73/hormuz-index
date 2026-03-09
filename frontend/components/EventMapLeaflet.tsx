'use client';
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ---------- types ----------
interface MapEvent {
  lat: number;
  lon: number;
  title: string;
  category: string;
  severity: number;
  timestamp: string;
  hover: string;
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
  sanctions_or_economic_pressure: 'Sanzioni/Pressione economica',
  cyber_operation: 'Operazione cyber',
  civilian_casualty_mass_event: 'Vittime civili',
  underground_activity_signal: 'Attività sotterranea',
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  military_strike: 'Military Strike',
  missile_drone_attack: 'Missiles / Drones',
  nuclear_posture_signal: 'Nuclear Posture',
  nuclear_verification_gap: 'Nuclear Verification Gap',
  enrichment_signal: 'Enrichment Signal',
  nuclear_site_damage: 'Nuclear Site Damage',
  nuclear_transfer_signal: 'Nuclear Transfer',
  proxy_activity: 'Proxy Activity',
  gulf_infrastructure_attack: 'Gulf Infrastructure Attack',
  shipping_disruption: 'Shipping Disruption',
  hormuz_threat: 'Hormuz Threat',
  strategic_rhetoric: 'Strategic Rhetoric',
  diplomatic_contact: 'Diplomatic Contact',
  deescalation_signal: 'De-escalation Signal',
  sanctions_or_economic_pressure: 'Sanctions / Economic Pressure',
  cyber_operation: 'Cyber Operation',
  civilian_casualty_mass_event: 'Civilian Casualties',
  underground_activity_signal: 'Underground Activity',
};

// ---------- inner map (loaded dynamically, no SSR) ----------
function InnerMap({ events, lang, height }: { events: MapEvent[]; lang: 'it' | 'en'; height: number }) {
  const L = require('leaflet');
  const { MapContainer, TileLayer, CircleMarker, Popup, useMap } = require('react-leaflet');

  // fix default leaflet icon (not needed for CircleMarker but just in case)
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  const labels = lang === 'it' ? CATEGORY_LABELS_IT : CATEGORY_LABELS_EN;

  // Group events by category for legend
  const categories = useMemo(() => {
    const cats = new Map<string, { color: string; label: string; count: number }>();
    for (const ev of events) {
      if (!cats.has(ev.category)) {
        cats.set(ev.category, {
          color: CATEGORY_COLORS[ev.category] || '#64748b',
          label: labels[ev.category] || ev.category?.replace(/_/g, ' '),
          count: 0,
        });
      }
      cats.get(ev.category)!.count++;
    }
    return Array.from(cats.values()).sort((a, b) => b.count - a.count);
  }, [events, labels]);

  return (
    <div style={{ position: 'relative' }}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <MapContainer
        center={[28, 48]}
        zoom={4}
        minZoom={3}
        maxZoom={10}
        style={{ height, width: '100%', borderRadius: '8px', background: '#0f172a' }}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        {/* Dark map tiles from CartoDB */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        {events.map((ev, i) => {
          const color = CATEGORY_COLORS[ev.category] || '#64748b';
          const radius = Math.max(5, Math.min(16, ev.severity * 18));
          const catLabel = labels[ev.category] || ev.category?.replace(/_/g, ' ');
          return (
            <CircleMarker
              key={i}
              center={[ev.lat, ev.lon]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.6,
                weight: 1.5,
                opacity: 0.9,
              }}
            >
              <Popup>
                <div style={{ maxWidth: 260, fontFamily: 'system-ui, sans-serif' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#1e293b' }}>
                    {ev.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      background: `${color}22`,
                      color: color,
                    }}>
                      {catLabel}
                    </span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>
                      sev {(ev.severity * 100).toFixed(0)}
                    </span>
                  </div>
                  {ev.timestamp && (
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                      {new Date(ev.timestamp).toLocaleString(lang === 'it' ? 'it-IT' : 'en-US', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend overlay */}
      {categories.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 1000,
          background: 'rgba(15,23,42,0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          padding: '8px 10px',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: 180,
          overflowY: 'auto',
        }}>
          {categories.slice(0, 8).map((cat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: cat.color, flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                {cat.label} ({cat.count})
              </span>
            </div>
          ))}
        </div>
      )}

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
        <span className="text-white/30 text-sm">Caricamento mappa...</span>
      </div>
    ),
  }
);

// ---------- main exported component ----------
export default function EventMapLeaflet({ lang = 'it', height = 420 }: EventMapProps) {
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const res = await fetch(`${API}/charts/event-map?range=7d`);
        if (!res.ok) return;
        const fig = await res.json();
        // Parse Plotly scattergeo traces into flat event list
        const parsed: MapEvent[] = [];
        for (const trace of (fig.data || [])) {
          const lats = trace.lat || [];
          const lons = trace.lon || [];
          const texts = trace.text || [];
          const hovers = trace.hovertext || [];
          const sizes = trace.marker?.size || [];
          const timestamps = trace.timestamps || [];
          const severities = trace.severities || [];
          const catKey = trace.category_key || '';
          for (let i = 0; i < lats.length; i++) {
            parsed.push({
              lat: lats[i],
              lon: lons[i],
              title: texts[i] || '',
              category: catKey,
              severity: severities[i] || (sizes[i] || 10) / 20,
              timestamp: timestamps[i] || '',
              hover: hovers[i] || '',
            });
          }
        }
        setEvents(parsed);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchMap();
    const interval = setInterval(fetchMap, 60000);
    return () => clearInterval(interval);
  }, [lang]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-lg flex items-center justify-center" style={{ height, background: 'rgba(15,23,42,0.5)' }}>
        <span className="text-white/30 text-sm">{lang === 'it' ? 'Caricamento mappa...' : 'Loading map...'}</span>
      </div>
    );
  }

  if (events.length === 0) {
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

  return <DynamicInnerMap events={events} lang={lang} height={height} />;
}
