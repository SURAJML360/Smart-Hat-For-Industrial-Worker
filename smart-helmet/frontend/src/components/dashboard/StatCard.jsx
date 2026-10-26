export default function StatCard({ icon: Icon, label, value, color = 'accent', trend, className = '' }) {
  const colorMap = {
    accent: 'text-accent bg-accent/10',
    safe: 'text-safe bg-safe/10',
    warning: 'text-warning bg-warning/10',
    critical: 'text-critical bg-critical/10',
    offline: 'text-offline bg-offline/10',
    info: 'text-info bg-info/10',
    flame: 'text-flame bg-flame/10',
  };

  const iconClasses = colorMap[color] || colorMap.accent;

  return (
    <div className={`bg-navy-card border border-navy-border rounded-xl p-4 flex items-start gap-4 ${className}`}>
      <div className={`flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${iconClasses}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-400 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-100 mt-0.5">{value ?? '—'}</p>
        {trend !== undefined && trend !== null && (
          <p className={`text-xs mt-1 ${trend >= 0 ? 'text-safe' : 'text-critical'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </p>
        )}
      </div>
    </div>
  );
}
