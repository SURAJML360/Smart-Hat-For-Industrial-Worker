import { useState } from 'react';
import { AlertTriangle, Filter, RefreshCw, CheckCircle, Flame, Thermometer } from 'lucide-react';
import useAlerts from '../hooks/useAlerts';
import AlertCard from '../components/alerts/AlertCard';
import AlertActions from '../components/alerts/AlertActions';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/common/EmptyState';

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [resolvingAlert, setResolvingAlert] = useState(null);

  const {
    alerts,
    loading,
    error,
    acknowledge,
    resolve,
    refetch,
  } = useAlerts({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
  });

  const handleAcknowledge = async (id) => {
    try {
      await acknowledge(id);
    } catch {
      // Error handled in hook/context
    }
  };

  const handleConfirmResolve = async (id, note) => {
    await resolve(id, note);
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#111827] border border-slate-800 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Safety Alerts & Incident Log
          </h1>
          <p className="text-xs text-slate-400">
            Real-time incident evaluation, hazard deduplication, and operator resolution log
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <button
            onClick={refetch}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh alerts"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Alert List */}
      {loading ? (
        <LoadingSpinner message="Loading alert incident log..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="No alerts found"
          description="There are currently no alerts matching your criteria. Sensors are operating normally."
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert._id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onResolve={(a) => setResolvingAlert(a)}
            />
          ))}
        </div>
      )}

      {/* Resolution Dialog Modal */}
      {resolvingAlert && (
        <AlertActions
          alert={resolvingAlert}
          onClose={() => setResolvingAlert(null)}
          onConfirm={handleConfirmResolve}
        />
      )}
    </div>
  );
}

