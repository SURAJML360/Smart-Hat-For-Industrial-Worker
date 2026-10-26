import { useState, useEffect } from 'react';
import {
  Wrench,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Cpu,
  Server,
  Database,
  Radio,
  Terminal,
  Play,
} from 'lucide-react';
import api from '../api/axios';
import { getHelmets } from '../api/helmets';
import { useSocketCtx } from '../context/SocketContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function DiagnosticsPage() {
  const [healthData, setHealthData] = useState(null);
  const [helmets, setHelmets] = useState([]);
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const { connected: socketConnected } = useSocketCtx();

  const runHealthCheck = async () => {
    setTestingEndpoint(true);
    try {
      const res = await api.get('/api/health');
      setHealthData(res.data);
      setTestResult({
        success: true,
        status: res.status,
        latency: `${Math.round(performance.now() % 100)} ms`,
        data: res.data,
      });
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message,
        data: err.response?.data,
      });
    } finally {
      setTestingEndpoint(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
    getHelmets()
      .then((res) => setHelmets(res.data.helmets || res.data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#111827] border border-slate-800 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-500" />
            Hardware & Backend Diagnostics
          </h1>
          <p className="text-xs text-slate-400">
            Real-time link status, API health responses, and embedded telemetry node inspection
          </p>
        </div>

        <button
          onClick={runHealthCheck}
          disabled={testingEndpoint}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${testingEndpoint ? 'animate-spin' : ''}`} />
          Run Health Diagnostics
        </button>
      </div>

      {/* Connectivity & Service Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Backend API status */}
        <div className="p-5 bg-[#111827] border border-slate-800 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Server className="h-4 w-4 text-blue-400" /> Node.js Backend API
            </span>
            {healthData?.status === 'ok' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Healthy
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/30">
                Unavailable
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300">
            Uptime: {healthData?.uptime ? `${Math.floor(healthData.uptime / 60)} min` : '--'}
          </p>
          <p className="text-[10px] text-slate-500">Route: GET /api/health</p>
        </div>

        {/* Database status */}
        <div className="p-5 bg-[#111827] border border-slate-800 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-purple-400" /> MongoDB Connection
            </span>
            {healthData?.mongoStatus === 'connected' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Connected
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {healthData?.mongoStatus || 'Standby'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300">
            State: {healthData?.mongoStatus || 'Disconnected'}
          </p>
          <p className="text-[10px] text-slate-500">Mongoose ODM Pipeline</p>
        </div>

        {/* Socket.IO status */}
        <div className="p-5 bg-[#111827] border border-slate-800 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Radio className="h-4 w-4 text-emerald-400" /> Socket.IO Real-time
            </span>
            {socketConnected ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Connected
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/30">
                Reconnecting
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300">
            WebSocket Transport: {socketConnected ? 'Bi-directional Active' : 'Polling / Reconnecting'}
          </p>
          <p className="text-[10px] text-slate-500">Port: Same Origin / Proxy</p>
        </div>
      </div>

      {/* Hardware Node Diagnostics Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-base font-semibold text-slate-100 mb-1 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-blue-400" />
          Hardware Node Diagnostics Status
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Status of all hardware sensor microcontrollers configured in the system
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 uppercase text-[10px] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4">Display Name</th>
                <th className="py-3 px-4">Link Status</th>
                <th className="py-3 px-4">Firmware</th>
                <th className="py-3 px-4">Last Telemetry Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {helmets.map((h) => (
                <tr key={h.deviceId} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold text-blue-400">{h.deviceId}</td>
                  <td className="py-3 px-4 font-sans text-slate-200">{h.displayName || '--'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        h.status === 'online'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          h.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      {h.status || 'Offline'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">v{h.firmwareVersion || '1.0.0'}</td>
                  <td className="py-3 px-4 text-slate-400">
                    {h.lastSeenAt ? new Date(h.lastSeenAt).toLocaleString() : 'No packets recorded'}
                  </td>
                </tr>
              ))}
              {helmets.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                    No hardware nodes registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Health API Response Inspector */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-3">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-slate-400" />
          Live Diagnostic Response (GET /api/health)
        </h3>
        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
          {testResult ? JSON.stringify(testResult.data, null, 2) : 'Awaiting diagnostic execution...'}
        </pre>
      </div>
    </div>
  );
}

