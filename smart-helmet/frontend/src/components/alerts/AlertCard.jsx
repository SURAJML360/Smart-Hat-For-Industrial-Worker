import { AlertTriangle, Flame, Thermometer, WifiOff, CheckCircle2, Clock } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function AlertCard({ alert, onAcknowledge, onResolve }) {
  const getIcon = () => {
    switch (alert.type) {
      case 'flame_detected':
        return <Flame className="h-5 w-5 text-red-500 animate-pulse" />;
      case 'temperature_critical':
        return <Thermometer className="h-5 w-5 text-red-500" />;
      case 'temperature_warning':
        return <Thermometer className="h-5 w-5 text-amber-500" />;
      case 'device_offline':
        return <WifiOff className="h-5 w-5 text-slate-400" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    }
  };

  const getBorderColor = () => {
    if (alert.status === 'resolved') return 'border-slate-800 bg-slate-900/30';
    if (alert.severity === 'critical') return 'border-red-500/40 bg-red-950/20';
    if (alert.severity === 'warning') return 'border-amber-500/40 bg-amber-950/20';
    return 'border-slate-700 bg-slate-900/50';
  };

  const timeFormatted = alert.createdAt
    ? new Date(alert.createdAt).toLocaleString()
    : 'Unknown';

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${getBorderColor()} flex flex-col md:flex-row md:items-center justify-between gap-4`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
          {getIcon()}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-100 text-sm">
              {alert.deviceId}
            </span>
            <StatusBadge status={alert.severity} />
            <StatusBadge status={alert.status} />
            {alert.source === 'demo' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Demo
              </span>
            )}
          </div>
          <p className="text-sm text-slate-200">{alert.message}</p>
          <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {timeFormatted}
            </span>
            {alert.acknowledgedBy && (
              <span className="text-amber-400">
                Acknowledged by {alert.acknowledgedBy.displayName || alert.acknowledgedBy.email}
              </span>
            )}
            {alert.resolvedBy && (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Resolved: {alert.resolutionNote || 'Cleared'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 self-end md:self-center">
        {alert.status === 'active' && onAcknowledge && (
          <button
            onClick={() => onAcknowledge(alert._id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
          >
            Acknowledge
          </button>
        )}
        {alert.status !== 'resolved' && onResolve && (
          <button
            onClick={() => onResolve(alert)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}

