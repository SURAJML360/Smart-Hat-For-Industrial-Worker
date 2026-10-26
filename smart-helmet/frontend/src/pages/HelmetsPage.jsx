import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HardHat,
  Plus,
  User,
  Clock,
  Cpu,
  ArrowRight,
  Shield,
  Search,
} from 'lucide-react';
import { getHelmets } from '../api/helmets';
import api from '../api/axios';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/common/EmptyState';

export default function HelmetsPage() {
  const [helmets, setHelmets] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newWorker, setNewWorker] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchHelmets = async () => {
    try {
      setError(null);
      const res = await getHelmets();
      setHelmets(res.data.helmets || res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load registered helmets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHelmets();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDeviceId) return;
    setCreating(true);
    try {
      await api.post('/api/helmets', {
        deviceId: newDeviceId.trim(),
        displayName: newDisplayName.trim() || newDeviceId.trim(),
        assignedWorker: newWorker.trim(),
      });
      setShowModal(false);
      setNewDeviceId('');
      setNewDisplayName('');
      setNewWorker('');
      fetchHelmets();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to register helmet.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = helmets.filter(
    (h) =>
      h.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      (h.displayName && h.displayName.toLowerCase().includes(search.toLowerCase())) ||
      (h.assignedWorker && h.assignedWorker.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#111827] border border-slate-800 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <HardHat className="h-5 w-5 text-blue-500" />
            Registered Safety Helmets
          </h1>
          <p className="text-xs text-slate-400">
            Industrial hardware node inventory, personnel assignments, and active link states
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter helmets..."
              className="pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Register Helmet
          </button>
        </div>
      </div>

      {/* Grid of Helmet Cards */}
      {loading ? (
        <LoadingSpinner message="Loading registered helmets..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchHelmets} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="No helmets found"
          description="No helmet devices matched your search or none are registered yet."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((helmet) => (
            <Link
              key={helmet.deviceId}
              to={`/helmets/${helmet.deviceId}`}
              className="group p-5 bg-[#111827] border border-slate-800 hover:border-blue-500/50 rounded-2xl transition-all shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                      <HardHat className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100 text-sm group-hover:text-blue-400 transition-colors">
                        {helmet.displayName || helmet.deviceId}
                      </h3>
                      <span className="font-mono text-xs text-slate-400">{helmet.deviceId}</span>
                    </div>
                  </div>
                  <StatusBadge status={helmet.status} />
                </div>

                <div className="space-y-2 py-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Worker
                    </span>
                    <span className="font-medium">{helmet.assignedWorker || 'Unassigned'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Last Telemetry
                    </span>
                    <span className="font-mono text-slate-400">
                      {helmet.lastSeenAt ? new Date(helmet.lastSeenAt).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5" /> Firmware
                    </span>
                    <span className="font-mono text-slate-400">v{helmet.firmwareVersion || '1.0.0'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-blue-400 group-hover:text-blue-300 font-medium">
                <span>View Full Telemetry Profile</span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Register Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-1">Register New Helmet Node</h3>
            <p className="text-xs text-slate-400 mb-5">
              Add a hardware unit identifier matching the DEVICE_ID in your Arduino firmware.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Device ID (e.g. HELMET-002) *
                </label>
                <input
                  type="text"
                  required
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  placeholder="HELMET-002"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Worker Helmet Beta"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assigned Worker
                </label>
                <input
                  type="text"
                  value={newWorker}
                  onChange={(e) => setNewWorker(e.target.value)}
                  placeholder="Jane Smith (Safety Inspector)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                >
                  {creating ? 'Registering...' : 'Register Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

