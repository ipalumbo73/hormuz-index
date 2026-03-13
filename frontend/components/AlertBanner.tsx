'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Alert } from '@/lib/types';

interface AlertBannerProps {
  alerts: Alert[];
}

const LEVEL_STYLES: Record<string, { bg: string; color: string; label_it: string; label_en: string }> = {
  critical: { bg: 'rgba(239,68,68,0.25)', color: '#ef4444', label_it: 'CRITICO', label_en: 'CRITICAL' },
  high:     { bg: 'rgba(249,115,22,0.20)', color: '#f97316', label_it: 'ALTO', label_en: 'HIGH' },
  warning:  { bg: 'rgba(245,158,11,0.18)', color: '#f59e0b', label_it: 'MEDIO', label_en: 'WARNING' },
  info:     { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label_it: 'INFO', label_en: 'INFO' },
};

export default function AlertBanner({ alerts }: AlertBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  const isEn = pathname.startsWith('/en');

  if (!alerts.length) return null;

  const countLabel = isEn
    ? `${alerts.length} active alert${alerts.length === 1 ? '' : 's'}`
    : `${alerts.length} alert attiv${alerts.length === 1 ? 'o' : 'i'}`;

  const expandHint = isEn
    ? (expanded ? 'Click to collapse' : 'Click to expand')
    : (expanded ? 'Clicca per chiudere' : 'Clicca per espandere');

  return (
    <div
      className="rounded-[10px] px-4 py-2.5 cursor-pointer transition-all"
      style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(249,115,22,0.06))',
        border: '1px solid rgba(239,68,68,0.2)',
      }}
      onClick={() => setExpanded(!expanded)}
      title={expandHint}
    >
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-[10px] flex-shrink-0" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
            {countLabel}
          </span>
          <span className="text-[12px] sm:text-[13px] text-white/70 line-clamp-2">{alerts[0].title}: {alerts[0].message}</span>
        </div>
        <span className="text-white/30 text-xs transition-transform flex-shrink-0" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </div>
      {expanded && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {alerts.map(a => {
            const style = LEVEL_STYLES[a.level] || LEVEL_STYLES.info;
            const levelLabel = isEn ? style.label_en : style.label_it;
            const ts = new Date(a.timestamp);
            const timeStr = ts.toLocaleString(isEn ? 'en-GB' : 'it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            return (
              <div key={a.id} className="flex items-start sm:items-center gap-2 px-2.5 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: style.bg, color: style.color }}>
                  {levelLabel}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-white/70 font-medium">{a.title}</span>
                  <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{a.message}</p>
                </div>
                <span className="font-mono text-[10px] text-white/25 flex-shrink-0">{timeStr}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
