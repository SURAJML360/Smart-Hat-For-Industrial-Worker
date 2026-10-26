import { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Thermometer,
  Flame,
  TrendingUp,
  Clock,
  Layers,
} from 'lucide-react';
import { getHistory } from '../api/telemetry';
import { getThresholds } from '../api/settings';
import SensorHistoryChart from '../components/charts/SensorHistoryChart';
import StatCard from '../components/dashboard/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function AnalyticsPage() {
  const [deviceId, setDeviceId] = useState('HELMET-001');
  const [dataPoints, setDataPoints] = useState(100);
  const [telemetry, setTelemetry] = useState([]);
  const [thresholds, setThresholds] = useState({ temperatureWarningC: 45, temperatureCriticalC: 60 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [deviceId, dataPoints]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [histRes, threshRes] = await Promise.all([
        getHistory(deviceId, { limit: dataPoints }),
        getThresholds(deviceId),
      ]);
      setTelemetry(histRes.data.telemetry || histRes.data || []);
      setThresholds(threshRes.data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  // Compute metrics
  const validTemps = telemetry
    .map((t) => t.temperatureC)
    .filter((v) => typeof v === 'number' && !isNaN(v));

  const avgTemp = validTemps.length
    ? (validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1)
    : '--';

  const maxTemp = validTemps.length
    ? Math.max(...validTemps).toFixed(1)
    : '--';

  const flameCount = telemetry.filter((t) => t.flameDetected).length;

  const exportCSV = () => {
    if (!telemetry.length) return;
    const headers = ['Sequence', 'ReceivedAt', 'TemperatureC', 'TemperatureRaw', 'FlameDetected', 'Source'];
    const rows = telemetry.map((t) => [
      t.sequence,
      t.receivedAt,
      t.temperatureC,
      t.temperatureRaw,
      t.flameDetected ? 1 : 0,
      t.source,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `telemetry_${deviceId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#111827] border border-slate-800 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Sensor Telemetry Analytics
          </h1>
          <p className="text-xs text-slate-400">
            Historical aggregate telemetry analytics and CSV export
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={dataPoints}
            onChange={(e) => setDataPoints(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value={30}>Last 30 Readings</option>
            <option value={100}>Last 100 Readings</option>
            <option value={500}>Last 500 Readings</option>
          </select>

          <button
            onClick={exportCSV}
            disabled={!telemetry.length}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Thermometer}
          label="Average Temp"
          value={avgTemp !== '--' ? `${avgTemp} °C` : '--'}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Max Temp Peak"
          value={maxTemp !== '--' ? `${maxTemp} °C` : '--'}
          color={Number(maxTemp) >= thresholds.temperatureWarningC ? 'red' : 'emerald'}
        />
        <StatCard
          icon={Flame}
          label="Flame Events Detected"
          value={flameCount}
          color={flameCount > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          icon={Layers}
          label="Sample Points"
          value={telemetry.length}
          color="slate"
        />
      </div>

      {/* Chart Section */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-base font-semibold text-slate-100 mb-1">
          Historical Trend Curves ({deviceId})
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Integrated time series showing thermal gradients against optical flame triggers
        </p>

        {loading ? (
          <LoadingSpinner message="Calculating sensor statistics..." />
        ) : (
          <SensorHistoryChart
            data={telemetry}
            warningThreshold={thresholds.temperatureWarningC}
            criticalThreshold={thresholds.temperatureCriticalC}
            height={360}
          />
        )}
      </div>
    </div>
  );
}

