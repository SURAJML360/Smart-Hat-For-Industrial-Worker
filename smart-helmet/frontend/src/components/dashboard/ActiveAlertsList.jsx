import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';

function timeAgo(dateStr) {
  if (!dateStr) return 'Unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const severityIcon = {
  critical: 'text-critical',
  warning: 'text-warning',
  info: 'text-info',
};

export default function ActiveAlertsList({ alerts = [] }) {
  const navigate = useNavigate();

  if (alerts.length === 0) {
    return (
      <div className="bg-navy-card border border-navy-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Active Alerts</h3>
        <EmptyState
          icon={AlertTriangle}
          title="No active alerts"
          message="All systems are operating normally."
        />
      </div>
    );
  }

  return (
    <div className="bg-navy-card border border-navy-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">Active Alerts</h3>
        <button
          onClick={() => navigate('/alerts')}
          className="text-xs text-accent hover:text-blue-400 flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <ul className="space-y-2">
        {alerts.slice(0, 5).map((alert) => (
          <li
            key={alert._id}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05]
                       transition-colors cursor-pointer"
            onClick={() => navigate('/alerts')}
          >
            <AlertTriangle
              className={`h-4 w-4 mt-0.5 flex-shrink-0 ${severityIcon[alert.severity] || 'text-slate-400'}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-200 truncate">{alert.message || alert.type}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={alert.severity || 'warning'} />
                <span className="text-[11px] text-slate-500">{alert.deviceId}</span>
                <span className="text-[11px] text-slate-500" title={new Date(alert.createdAt).toLocaleString()}>
                  {timeAgo(alert.createdAt || alert.timestamp)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
