import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  HardHat,
  User,
  Clock,
  Cpu,
  ArrowLeft,
  AlertTriangle,
  Flame,
  Thermometer,
  Shield,
  Activity,
} from 'lucide-react';
import { getHelmet } from '../api/helmets';
import { getHistory } from '../api/telemetry';
import { getThresholds } from '../api/settings';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import SensorHistoryChart from '../components/charts/SensorHistoryChart';
import AlertCard from '../components/alerts/AlertCard';

export default function HelmetDetailPage() {
  const { id } = useParams();
  const [helmet, setHelmet] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [thresholds, setThresholds] = useState({ temperatureWarningC: 45, temperatureCriticalC: 60 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [hRes, tRes, thRes] = await Promise.all([
        getHelmet(id),
        getHistory(id, { limit: 50 }),
        getThresholds(id),
      ]);
      setHelmet(hRes.data.helmet || hRes.data);
      setTelemetryHistory(tRes.data.telemetry || tRes.data || []);
      setThresholds(thRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load helmet details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return <LoadingSpinner message="Fetching helmet device profile..." />;
  if (error) return <ErrorDisplay message={error} onRetry={fetchData} />;
  if (!helmet) return <ErrorDisplay message="Helmet not found." />;

  return (
    <div className="space-y-6">
      {/* Back button & Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/helmets"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">
                {helmet.displayName || helmet.deviceId}
              </h1>
              <StatusBadge status={helmet.status} />
            </div>
            <p className="text-xs text-slate-400 font-mono">Device ID: {helmet.deviceId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/monitor`}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors"
          >
            <Activity className="h-4 w-4" />
            Open Live Telemetry
          </Link>
        </div>
      </div>

      {/* Meta Profile Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#111827] border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
            <User className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Assigned Worker</span>
            <span className="text-sm font-semibold text-slate-200">
              {helmet.assignedWorker || 'Unassigned'}
            </span>
          </div>
        </div>

        <div className="p-4 bg-[#111827] border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Firmware Version</span>
            <span className="text-sm font-semibold font-mono text-slate-200">
              v{helmet.firmwareVersion || '1.0.0'}
            </span>
          </div>
        </div>

        <div className="p-4 bg-[#111827] border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Last Telemetry Seen</span>
            <span className="text-sm font-semibold text-slate-200">
              {helmet.lastSeenAt ? new Date(helmet.lastSeenAt).toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>

        <div className="p-4 bg-[#111827] border border-slate-800 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Safety Status</span>
            <span className="text-sm font-semibold text-slate-200">
              {helmet.status === 'online' ? 'Active Monitoring' : 'Offline / Standby'}
            </span>
          </div>
        </div>
      </div>

      {/* Sensor History Graph */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-base font-semibold text-slate-100 mb-1">Telemetry Sensor Record</h3>
        <p className="text-xs text-slate-400 mb-4">
          Historical log of temperature curves and optical flame alerts
        </p>
        <SensorHistoryChart
          data={telemetryHistory}
          warningThreshold={thresholds.temperatureWarningC}
          criticalThreshold={thresholds.temperatureCriticalC}
          height={300}
        />
      </div>

      {/* Recent Telemetry Readings Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-base font-semibold text-slate-100 mb-4">Latest 10 Ingested Packets</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 uppercase text-[10px] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Sequence</th>
                <th className="py-2.5 px-3">Received Time</th>
                <th className="py-2.5 px-3">Temp (°C)</th>
                <th className="py-2.5 px-3">Raw ADC</th>
                <th className="py-2.5 px-3">Flame State</th>
                <th className="py-2.5 px-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {telemetryHistory.slice(0, 10).map((row, i) => (
                <tr key={row._id || i} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-blue-400">#{row.sequence}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {new Date(row.receivedAt).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-100">
                    {row.temperatureC?.toFixed(1)} °C
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{row.temperatureRaw}</td>
                  <td className="py-2.5 px-3">
                    {row.flameDetected ? (
                      <span className="text-red-400 font-bold">⚠️ FLAME</span>
                    ) : (
                      <span className="text-emerald-400">CLEAR</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 uppercase text-slate-400 text-[10px]">
                    {row.source || 'hardware'}
                  </td>
                </tr>
              ))}
              {telemetryHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500">
                    No telemetry records stored yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

