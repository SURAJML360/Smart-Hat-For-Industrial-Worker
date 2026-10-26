import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HardHat,
  Wifi,
  WifiOff,
  AlertTriangle,
  Flame,
  ArrowRight,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { getDashboardSummary } from '../api/settings';
import { getHelmets } from '../api/helmets';
import { useSocketCtx } from '../context/SocketContext';
import { useDemo } from '../context/DemoContext';
import useSocket from '../hooks/useSocket';
import StatCard from '../components/dashboard/StatCard';
import DeviceStatusCard from '../components/dashboard/DeviceStatusCard';
import ActiveAlertsList from '../components/dashboard/ActiveAlertsList';
import TemperatureChart from '../components/charts/TemperatureChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [helmets, setHelmets] = useState([]);
  const [rollingTelemetry, setRollingTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { connected } = useSocketCtx();
  const { isDemoMode } = useDemo();

  // Socket updates
  const newTelemetry = useSocket('telemetry:new');
  const newAlert = useSocket('alert:new');
  const alertUpdate = useSocket('alert:updated');
  const deviceStatus = useSocket('device:status');

  const fetchData = async () => {
    try {
      setError(null);
      const [sumRes, helmRes] = await Promise.all([
        getDashboardSummary(),
        getHelmets(),
      ]);
      setSummary(sumRes.data);
      setHelmets(helmRes.data.helmets || []);
      if (sumRes.data.recentTelemetry?.length) {
        setRollingTelemetry([...sumRes.data.recentTelemetry].reverse());
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard overview data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time telemetry ingest
  useEffect(() => {
    if (newTelemetry) {
      setRollingTelemetry((prev) => {
        const next = [...prev, newTelemetry];
        return next.slice(-40); // keep last 40 samples
      });

      // Update helmet in local state if matching
      setHelmets((prev) =>
        prev.map((h) =>
          h.deviceId === newTelemetry.deviceId
            ? {
                ...h,
                status: 'online',
                lastSeenAt: newTelemetry.receivedAt || new Date().toISOString(),
                latestTemp: newTelemetry.temperatureC,
                latestFlame: newTelemetry.flameDetected,
              }
            : h
        )
      );
    }
  }, [newTelemetry]);

  // Handle live alert events
  useEffect(() => {
    if (newAlert || alertUpdate) {
      getDashboardSummary()
        .then((res) => setSummary(res.data))
        .catch(() => {});
    }
  }, [newAlert, alertUpdate]);

  // Handle device status changes
  useEffect(() => {
    if (deviceStatus) {
      setHelmets((prev) =>
        prev.map((h) =>
          h.deviceId === deviceStatus.deviceId
            ? { ...h, status: deviceStatus.status }
            : h
        )
      );
      getDashboardSummary()
        .then((res) => setSummary(res.data))
        .catch(() => {});
    }
  }, [deviceStatus]);

  if (loading) return <LoadingSpinner message="Loading safety dashboard telemetry..." />;
  if (error) return <ErrorDisplay message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={HardHat}
          label="Total Helmets"
          value={summary?.totalHelmets ?? helmets.length}
          color="blue"
        />
        <StatCard
          icon={Wifi}
          label="Online"
          value={summary?.onlineHelmets ?? 0}
          color="emerald"
        />
        <StatCard
          icon={WifiOff}
          label="Offline"
          value={summary?.offlineHelmets ?? 0}
          color="slate"
        />
        <StatCard
          icon={AlertTriangle}
          label="Active Alerts"
          value={summary?.activeAlerts ?? 0}
          color="amber"
        />
        <StatCard
          icon={Flame}
          label="Critical Incidents"
          value={summary?.criticalAlerts ?? 0}
          color="red"
        />
      </div>

      {/* Main Grid: Telemetry Trends & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Telemetry Chart */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Live Temperature Stream
              </h3>
              <p className="text-xs text-slate-400">
                Real-time rolling temperature data received from helmet sensor modules
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  connected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                  }`}
                />
                {connected ? 'Live Stream' : 'Disconnected'}
              </span>
              <button
                onClick={fetchData}
                title="Refresh"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <TemperatureChart data={rollingTelemetry} height={260} />

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              Thresholds: Warn at 45°C • Critical at 60°C
            </span>
            <Link
              to="/monitor"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              Full Screen Monitor <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Right Col: Active Alerts List */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Active Incident Feed
            </h3>
            <Link
              to="/alerts"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View All
            </Link>
          </div>
          <div className="flex-1">
            <ActiveAlertsList />
          </div>
        </div>
      </div>

      {/* Registered Helmets Status Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <HardHat className="h-4 w-4 text-blue-400" />
              Deployed Safety Helmets
            </h3>
            <p className="text-xs text-slate-400">
              Live hardware health, worker assignments, and immediate alert statuses
            </p>
          </div>
          <Link
            to="/helmets"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            Manage Devices <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {helmets.length === 0 ? (
          <div className="p-8 text-center bg-[#111827] border border-slate-800 rounded-2xl text-slate-400 text-sm">
            No helmets registered yet. Turn on hardware or trigger demo mode.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {helmets.map((helmet) => (
              <DeviceStatusCard key={helmet.deviceId} helmet={helmet} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

