'use client';

interface GaugeArcProps {
  value: number;
  size?: number;
  lang?: 'it' | 'en';
}

export default function GaugeArc({ value, size = 200, lang = 'it' }: GaugeArcProps) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size * 0.52;
  const startAngle = -210;
  const endAngle = 30;
  const totalArc = endAngle - startAngle;
  const filledAngle = startAngle + (Math.min(100, Math.max(0, value)) / 100) * totalArc;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const arcPath = (start: number, end: number, radius: number) => {
    const sx = cx + radius * Math.cos(toRad(start));
    const sy = cy + radius * Math.sin(toRad(start));
    const ex = cx + radius * Math.cos(toRad(end));
    const ey = cy + radius * Math.sin(toRad(end));
    const large = end - start > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey}`;
  };

  const getColor = (v: number) => {
    if (v < 20) return '#22c55e';
    if (v < 40) return '#f59e0b';
    if (v < 60) return '#f97316';
    return '#ef4444';
  };

  const color = getColor(value);

  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
      <path d={arcPath(startAngle, endAngle, r)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
      {value > 0 && (
        <path d={arcPath(startAngle, filledAngle, r)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }} />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#f1f5f9" fontSize="28" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
        {value.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="'JetBrains Mono', monospace">
        {lang === 'en' ? 'ESCALATION RISK' : 'RISCHIO ESCALATION'}
      </text>
    </svg>
  );
}
