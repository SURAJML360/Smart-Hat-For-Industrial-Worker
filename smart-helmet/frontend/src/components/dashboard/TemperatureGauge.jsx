import { useMemo } from 'react';

/**
 * TemperatureGauge – semi-circular gauge using pure SVG.
 * Shows current temperature with green/yellow/red zones.
 */
export default function TemperatureGauge({
  value,
  min = 0,
  max = 100,
  warningThreshold = 45,
  criticalThreshold = 60,
  unit = '°C',
  size = 200,
}) {
  const safeValue = value != null ? Math.min(Math.max(value, min), max) : null;

  // SVG arc geometry
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size / 2 - 16;
  const startAngle = Math.PI;
  const endAngle = 0;

  const polarToCartesian = (angle) => ({
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  });

  const arcPath = (fromAngle, toAngle) => {
    const start = polarToCartesian(fromAngle);
    const end = polarToCartesian(toAngle);
    const largeArc = fromAngle - toAngle > Math.PI ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Angle for a value
  const valueToAngle = (v) => Math.PI - ((v - min) / (max - min)) * Math.PI;

  const warnAngle = valueToAngle(warningThreshold);
  const critAngle = valueToAngle(criticalThreshold);

  // Needle angle
  const needleAngle = safeValue != null ? valueToAngle(safeValue) : valueToAngle(min);
  const needleTip = polarToCartesian(needleAngle);

  // Color based on value
  const color = safeValue == null ? '#64748b' : safeValue >= criticalThreshold ? '#ef4444' : safeValue >= warningThreshold ? '#f59e0b' : '#22c55e';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        {/* Background arcs */}
        <path d={arcPath(startAngle, warnAngle)} fill="none" stroke="#22c55e" strokeWidth={10} strokeLinecap="round" opacity={0.3} />
        <path d={arcPath(warnAngle, critAngle)} fill="none" stroke="#f59e0b" strokeWidth={10} strokeLinecap="round" opacity={0.3} />
        <path d={arcPath(critAngle, endAngle)} fill="none" stroke="#ef4444" strokeWidth={10} strokeLinecap="round" opacity={0.3} />

        {/* Value arc */}
        {safeValue != null && (
          <path d={arcPath(startAngle, needleAngle)} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
        )}

        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke={color} strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={color} />

        {/* Labels */}
        <text x={cx} y={cy - 20} textAnchor="middle" className="fill-slate-100 text-2xl font-bold" fontSize={28}>
          {safeValue != null ? safeValue.toFixed(1) : '—'}
        </text>
        <text x={cx} y={cy} textAnchor="middle" className="fill-slate-400 text-xs" fontSize={12}>
          {unit}
        </text>
      </svg>
    </div>
  );
}
