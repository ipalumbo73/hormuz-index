'use client';
import { useEffect, useState } from 'react';
import type { EventItem } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const CATEGORY_INFO: Record<string, { color: string; label: string }> = {
  nuclear_posture_signal: { color: 'bg-red-500', label: 'Nuclear Posture (armed states)' },
  nuclear_verification_gap: { color: 'bg-purple-500', label: 'Nuclear Verification Gap' },
  enrichment_signal: { color: 'bg-purple-600', label: 'Enrichment Signal' },
  military_strike: { color: 'bg-red-600', label: 'Military Strike' },
  missile_drone_attack: { color: 'bg-red-500', label: 'Missile / Drone Attack' },
  proxy_activity: { color: 'bg-orange-500', label: 'Proxy Activity' },
  gulf_infrastructure_attack: { color: 'bg-red-700', label: 'Gulf Infrastructure Attack' },
  shipping_disruption: { color: 'bg-blue-500', label: 'Shipping Disruption' },
  hormuz_threat: { color: 'bg-blue-700', label: 'Hormuz Threat' },
  strategic_rhetoric: { color: 'bg-yellow-500', label: 'Strategic Rhetoric' },
  diplomatic_contact: { color: 'bg-green-500', label: 'Diplomatic Contact' },
  deescalation_signal: { color: 'bg-green-400', label: 'De-escalation Signal' },
  sanctions_or_economic_pressure: { color: 'bg-yellow-600', label: 'Sanctions / Economic Pressure' },
  cyber_operation: { color: 'bg-indigo-500', label: 'Cyber Operation' },
  civilian_casualty_mass_event: { color: 'bg-red-800', label: 'Civilian Casualties' },
  nuclear_site_damage: { color: 'bg-red-900', label: 'Nuclear Site Damage' },
  underground_activity_signal: { color: 'bg-purple-700', label: 'Underground Activity' },
};

export default function TimelinePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: '30' });
    if (category) params.set('category', category);

    fetch(`${API}/events?${params}`)
      .then(r => r.json())
      .then(data => {
        setEvents(data.events || []);
        setTotal(data.total || 0);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [page, category]);

  const categories = Object.keys(CATEGORY_INFO);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Event Timeline</h2>
        <span className="text-sm text-gray-400">{total} total events</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setCategory(''); setPage(1); }} className={`px-3 py-1 text-xs rounded-full border ${!category ? 'bg-white/10 text-white border-white/30' : 'text-gray-400 border-gray-700 hover:border-gray-500'}`}>All</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setPage(1); }} className={`px-3 py-1 text-xs rounded-full border ${category === cat ? 'bg-white/10 text-white border-white/30' : 'text-gray-400 border-gray-700 hover:border-gray-500'}`}>
            {CATEGORY_INFO[cat]?.label || cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No events found. Data will appear after ingestion runs.</div>
      ) : (
        <div className="space-y-2">
          {events.map(event => (
            <div key={event.id} className="card flex gap-4 items-start">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${CATEGORY_INFO[event.category]?.color || 'bg-gray-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{CATEGORY_INFO[event.category]?.label || event.category.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-500">{new Date(event.timestamp_utc).toLocaleString()}</span>
                  <span className="text-xs text-gray-500">Severity: {(event.severity * 100).toFixed(0)}%</span>
                </div>
                {event.article_url ? (
                  <a href={event.article_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline mt-1 inline-block">
                    {event.title} ↗
                  </a>
                ) : (
                  <h4 className="text-sm font-medium text-white mt-1">{event.title}</h4>
                )}
                {event.summary && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{event.summary}</p>}
                <div className="flex gap-1 mt-1 flex-wrap">
                  {event.actor_tags?.map(tag => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300">{tag}</span>
                  ))}
                  {event.location_tags?.map(tag => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-green-900/50 text-green-300">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-sm bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700">Previous</button>
        <span className="px-4 py-2 text-sm text-gray-400">Page {page}</span>
        <button disabled={events.length < 30} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-sm bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700">Next</button>
      </div>
    </div>
  );
}
