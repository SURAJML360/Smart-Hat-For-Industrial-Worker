import { useState, useEffect } from 'react';
import {
  Activity,
  HardHat,
  Thermometer,
  Flame,
  Clock,
  Cpu,
  Wifi,
  WifiOff,
  Radio,
  Layers,
} from 'lucide-react';
import { getHelmets } from '../api/helmets';
import { getThresholds } from '../api/settings';
import useTelemetry from '../hooks/useTelemetry';
import { useSocketCtx } from '../context/SocketContext';
import TemperatureGauge from '../components/dashboard/TemperatureGauge';
import FlameIndicator from '../components/dashboard/FlameIndicator';
import TemperatureChart from '../components/charts/TemperatureChart';
import FlameTimeline from '../components/charts/FlameTimeline';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function LiveMonitorPage() {
  const [helmets, setHelmets] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('HELMET-001');
  const [thresholds, setThresholds] = useState({
    temperatureWarningC: 45,
    temperatureCriticalC: 60,
  });
  const { connected } = useSocketCtx();

  // Load available helmets
  useEffect(() => {
    getHelmets()
      .then((res) => {
        const list = res.data.helmets || [];
        setHelmets(list);
        if (list.length > 0 && !list.some((h) => h.deviceId === selectedDeviceId)) {
          setSelectedDeviceId(list[0].deviceId);
        }
      })
      .catch(() => {});

    getThresholds()
      .then((res) => {
        setThresholds(res.data);
      })
      .catch(() => {});
  }, []);

  // Use hook for selected device
  const { latest, history, loading } = useTelemetry(selectedDeviceId);

  const formatUptime = (ms) => {
    if (!ms && ms !== 0) return 'N/A';
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Device Selector & Stream Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#111827] border border-slate-800 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Telemetry Telemetry Stream
            </h2>
            <p className="text-xs text-slate-400">
              Direct telemetry from industrial helmet wireless node
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Monitoring Device:</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 font-medium focus:outline-none focus:border-blue-500"
          >
            {helmets.length > 0 ? (
              helmets.map((h) => (
                <option key={h.deviceId} value={h.deviceId}>
                  {h.displayName || h.deviceId} ({h.deviceId})
                </option>
              ))
            ) : (
              <option value="HELMET-001">HELMET-001</option>
            )}
          </select>
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
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
            {connected ? 'ONLINE' : 'DISCONNECTED'}
          </div>
        </div>
      </div>

      {/* Main Gauges & Indicator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Temperature Gauge */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-blue-400" />
              Core Temperature
            </span>
            <span className="text-xs text-slate-500 font-mono">LM35 Precision Sensor</span>
          </div>

          <div className="my-2">
            <TemperatureGauge
              temperature={latest?.temperatureC}
              warningThreshold={thresholds.temperatureWarningC}
              criticalThreshold={thresholds.temperatureCriticalC}
            />
          </div>

          <div className="w-full grid grid-cols-2 gap-2 text-center text-xs pt-3 border-t border-slate-800 text-slate-400">
            <div>
              <span className="block text-[10px] text-slate-500">RAW ADC (10-bit)</span>
              <span className="font-mono text-slate-200">
                {latest?.temperatureRaw !== undefined ? `${latest.temperatureRaw} / 1023` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500">EST. SENSOR VOLTS</span>
              <span className="font-mono text-slate-200">
                {latest?.temperatureRaw !== undefined
                  ? `${((latest.temperatureRaw * 5.0) / 1023).toFixed(3)} V`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Flame Detector Status */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-400" />
              IR Flame Detection
            </span>
            <span className="text-xs text-slate-500 font-mono">Digital Optical Sensor</span>
          </div>

          <div className="my-6">
            <FlameIndicator flameDetected={latest?.flameDetected} />
          </div>

          <div className="w-full grid grid-cols-2 gap-2 text-center text-xs pt-3 border-t border-slate-800 text-slate-400">
            <div>
              <span className="block text-[10px] text-slate-500">RAW PIN STATE (D2)</span>
              <span className="font-mono text-slate-200">
                {latest?.flameRaw !== undefined
                  ? `LOGIC ${latest.flameRaw}`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500">HAZARD STATE</span>
              <span
                className={`font-semibold ${
                  latest?.flameDetected ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}
              >
                {latest?.flameDetected ? 'CRITICAL EVAC' : 'NORMAL'}
              </span>
            </div>
          </div>
        </div>

        {/* Microcontroller & Node Diagnostics */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-emerald-400" />
              Embedded Diagnostics
            </span>
            <span className="text-xs text-slate-500 font-mono">Uno + ESP8266</span>
          </div>

          <div className="space-y-3.5 my-2 text-sm">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" /> System Uptime
              </span>
              <span className="font-mono text-xs text-slate-200">
                {formatUptime(latest?.deviceUptimeMs)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-500" /> Sequence #
              </span>
              <span className="font-mono text-xs text-blue-400">
                {latest?.sequence !== undefined ? `#${latest.sequence}` : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-slate-500" /> Firmware Ver
              </span>
              <span className="font-mono text-xs text-slate-200">
                v{latest?.firmwareVersion || '1.0.0'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-slate-500" /> Telemetry Source
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {latest?.source || 'hardware'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            Last packet: {latest?.receivedAt ? new Date(latest.receivedAt).toLocaleTimeString() : 'Awaiting packet'}
          </div>
        </div>
      </div>

      {/* Real-Time Rolling Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                Live Temperature Waveform
              </h3>
              <p className="text-xs text-slate-400">
                Continuous rolling stream with safety threshold boundaries
              </p>
            </div>
          </div>
          <TemperatureChart
            data={history}
            warningThreshold={thresholds.temperatureWarningC}
            criticalThreshold={thresholds.temperatureCriticalC}
            height={260}
          />
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-400" />
              Flame Event Activity
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Chronological optical flame detector detections
            </p>
          </div>
          <FlameTimeline data={history} height={200} />
          <div className="text-[11px] text-slate-500 text-center pt-3 border-t border-slate-800">
            Red pulses indicate immediate optical IR trigger
          </div>
        </div>
      </div>
    </div>
  );
}

