'use client';
import { useState } from 'react';
import type { Alert } from '@/lib/types';

interface AlertBannerProps {
  alerts: Alert[];
}

export default function AlertBanner({ alerts }: AlertBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!alerts.length) return null;

  return (
    <div
      className="rounded-[10px] px-4 py-2.5 cursor-pointer transition-all"
      style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(249,115,22,0.06))',
        border: '1px solid rgba(239,68,68,0.2)',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-[10px] flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
            {alerts.length} alert attiv{alerts.length === 1 ? 'o' : 'i'}
          </span>
          <span className="text-[12px] sm:text-[13px] text-white/70 line-clamp-2">{alerts[0].title}: {alerts[0].message}</span>
        </div>
        <span className="text-white/30 text-xs transition-transform flex-shrink-0" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </div>
      {expanded && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {alerts.map(a => (
            <div key={a.id} className="flex justify-between items-center px-2.5 py-1.5 rounded-md" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <span className="text-xs text-white/60">⚠ {a.title}: {a.message}</span>
              <span className="font-mono text-[11px] text-white/30">{new Date(a.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
