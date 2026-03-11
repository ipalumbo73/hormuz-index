'use client';
import { useEffect, useState, useRef } from 'react';
import type { EventItem } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const CATEGORY_COLORS: Record<string, string> = {
  military_strike: '#ef4444',
  missile_drone_attack: '#f97316',
  nuclear_posture_signal: '#a855f7',
  nuclear_verification_gap: '#9333ea',
  enrichment_signal: '#7c3aed',
  nuclear_site_damage: '#dc2626',
  proxy_activity: '#f59e0b',
  gulf_infrastructure_attack: '#ef4444',
  shipping_disruption: '#3b82f6',
  hormuz_threat: '#3b82f6',
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

const CATEGORY_LABELS_EN: Record<string, string> = {
  military_strike: 'Military Strike',
  missile_drone_attack: 'Missiles/Drones',
  nuclear_posture_signal: 'Nuclear Posture',
  nuclear_verification_gap: 'Verification Gap',
  enrichment_signal: 'Enrichment',
  proxy_activity: 'Proxy Activity',
  gulf_infrastructure_attack: 'Gulf Infrastructure',
  shipping_disruption: 'Shipping Disruption',
  hormuz_threat: 'Hormuz Threat',
  strategic_rhetoric: 'Strategic Rhetoric',
  diplomatic_contact: 'Diplomacy',
  deescalation_signal: 'De-escalation',
  sanctions_or_economic_pressure: 'Sanctions',
  cyber_operation: 'Cyber',
  civilian_casualty_mass_event: 'Civilian Casualties',
  nuclear_site_damage: 'Nuclear Site Damage',
  underground_activity_signal: 'Underground Activity',
};

function timeAgo(timestamp: string, lang: 'it' | 'en'): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'it' ? 'ora' : 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

interface EventFeedProps {
  lang?: 'it' | 'en';
  maxItems?: number;
}

export default function EventFeed({ lang = 'it', maxItems = 15 }: EventFeedProps) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const labels = lang === 'it' ? CATEGORY_LABELS_IT : CATEGORY_LABELS_EN;

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API}/events?page=1&page_size=${maxItems}`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [maxItems]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse h-12 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        {lang === 'it' ? 'Nessun evento recente' : 'No recent events'}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      {events.map((ev, i) => {
        const color = CATEGORY_COLORS[ev.category] || '#64748b';
        const catLabel = labels[ev.category] || ev.category?.replace(/_/g, ' ') || 'Unknown';
        return (
          <div
            key={ev.id || i}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-white/[0.03]"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <div className="flex-1 min-w-0">
              {ev.article_url ? (
                <a href={ev.article_url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-blue-400/80 hover:text-blue-300 hover:underline leading-snug line-clamp-2 block">{ev.title} ↗</a>
              ) : (
                <p className="text-[12.5px] text-white/80 leading-snug line-clamp-2">{ev.title}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>{catLabel}</span>
                <span className="text-[10px] text-white/25 font-mono">{timeAgo(ev.timestamp_utc, lang)}</span>
                {ev.severity > 0.6 && (
                  <span className="text-[10px] text-red-400/60 font-mono">sev {(ev.severity * 100).toFixed(0)}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
