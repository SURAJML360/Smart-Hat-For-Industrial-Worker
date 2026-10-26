const variants = {
  online: { bg: 'bg-safe/20', text: 'text-safe', dot: 'bg-safe', label: 'Online' },
  offline: { bg: 'bg-offline/20', text: 'text-offline', dot: 'bg-offline', label: 'Offline' },
  warning: { bg: 'bg-warning/20', text: 'text-warning', dot: 'bg-warning', label: 'Warning' },
  critical: { bg: 'bg-critical/20', text: 'text-critical', dot: 'bg-critical', label: 'Critical' },
  unknown: { bg: 'bg-slate-700/40', text: 'text-slate-400', dot: 'bg-slate-500', label: 'Unknown' },
  active: { bg: 'bg-critical/20', text: 'text-critical', dot: 'bg-critical', label: 'Active' },
  acknowledged: { bg: 'bg-warning/20', text: 'text-warning', dot: 'bg-warning', label: 'Acknowledged' },
  resolved: { bg: 'bg-safe/20', text: 'text-safe', dot: 'bg-safe', label: 'Resolved' },
};

export default function StatusBadge({ status = 'unknown', label, className = '' }) {
  const v = variants[status] || variants.unknown;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${v.bg} ${v.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
      {label || v.label}
    </span>
  );
}
