import { useNavigate } from 'react-router-dom';
import { Thermometer, HardHat } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import FlameIndicator from './FlameIndicator';

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getStatus(device) {
  if (!device) return 'unknown';
  if (device.status === 'offline') return 'offline';
  if (!device.lastSeen) return 'unknown';
  const diff = Date.now() - new Date(device.lastSeen).getTime();
  if (diff > 5 * 60 * 1000) return 'offline'; // > 5 min stale
  if (diff > 2 * 60 * 1000) return 'warning'; // > 2 min stale
  if (device.status === 'online') return 'online';
  return 'unknown';
}

function getTempColor(temp) {
  if (temp == null) return 'text-slate-500';
  if (temp >= 60) return 'text-critical';
  if (temp >= 45) return 'text-warning';
  return 'text-safe';
}

export default function DeviceStatusCard({ device, latestTelemetry }) {
  const navigate = useNavigate();
  const status = getStatus(device);
  const temp = latestTelemetry?.temperature ?? device?.lastTemperature;
  const flame = latestTelemetry?.flameDetected ?? device?.lastFlame;

  return (
    <div
      onClick={() => navigate(`/helmets/${device?.deviceId || device?._id}`)}
      className="bg-navy-card border border-navy-border rounded-xl p-4 hover:border-accent/40
                 transition-colors cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <HardHat className="h-5 w-5 text-accent flex-shrink-0" />
          <span className="text-sm font-medium text-slate-200 truncate">
            {device?.name || device?.deviceId || 'Unknown Device'}
          </span>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Temperature */}
        <div className="flex items-center gap-2">
          <Thermometer className={`h-4 w-4 ${getTempColor(temp)}`} />
          <span className={`text-lg font-bold ${getTempColor(temp)}`}>
            {temp != null ? `${temp.toFixed(1)}°C` : '—'}
          </span>
        </div>

        {/* Flame */}
        <div className="flex items-center justify-end">
          <FlameIndicator detected={flame} size="sm" />
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800">
        <p className="text-[11px] text-slate-500" title={device?.lastSeen ? new Date(device.lastSeen).toLocaleString() : ''}>
          Last seen: {timeAgo(device?.lastSeen)}
        </p>
      </div>
    </div>
  );
}
