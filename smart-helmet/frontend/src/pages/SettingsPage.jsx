import { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Thermometer,
  Flame,
  Wifi,
  Save,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Sparkles,
} from 'lucide-react';
import { getThresholds, updateThresholds } from '../api/settings';
import { useDemo } from '../context/DemoContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function SettingsPage() {
  const [warningTemp, setWarningTemp] = useState(45);
  const [criticalTemp, setCriticalTemp] = useState(60);
  const [flameActiveHigh, setFlameActiveHigh] = useState(true);
  const [offlineTimeout, setOfflineTimeout] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const { isDemoMode, toggleDemoMode } = useDemo();

  useEffect(() => {
    getThresholds()
      .then((res) => {
        const d = res.data;
        if (d.temperatureWarningC) setWarningTemp(d.temperatureWarningC);
        if (d.temperatureCriticalC) setCriticalTemp(d.temperatureCriticalC);
        if (d.flameActiveHigh !== undefined) setFlameActiveHigh(d.flameActiveHigh);
        if (d.deviceOfflineTimeoutS) setOfflineTimeout(d.deviceOfflineTimeoutS);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (Number(criticalTemp) <= Number(warningTemp)) {
      setFeedback({
        type: 'error',
        message: 'Critical threshold must be strictly greater than warning threshold.',
      });
      return;
    }

    setSaving(true);
    try {
      await updateThresholds({
        temperatureWarningC: Number(warningTemp),
        temperatureCriticalC: Number(criticalTemp),
        flameActiveHigh: Boolean(flameActiveHigh),
        deviceOfflineTimeoutS: Number(offlineTimeout),
      });
      setFeedback({
        type: 'success',
        message: 'Threshold settings updated and applied across all active alert monitors.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading threshold configuration..." />;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="p-5 bg-[#111827] border border-slate-800 rounded-2xl shadow-lg">
        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-500" />
          Safety Threshold & System Settings
        </h1>
        <p className="text-xs text-slate-400">
          Configure authoritative server-side sensor trip-wires and simulated demonstration mode
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/40 border border-red-500/40 text-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Threshold Configuration Form */}
      <form onSubmit={handleSave} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-400" />
          Hazard Detection Thresholds
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Temperature Warning */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-amber-500" />
              Temperature Warning Level (°C)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="150"
              required
              value={warningTemp}
              onChange={(e) => setWarningTemp(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500">
              Triggers visual amber warnings and local intermittent buzzer beeps.
            </p>
          </div>

          {/* Temperature Critical */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-red-500" />
              Temperature Critical Level (°C)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="200"
              required
              value={criticalTemp}
              onChange={(e) => setCriticalTemp(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-red-500"
            />
            <p className="text-[11px] text-slate-500">
              Triggers critical evacuation alarms and escalates incident severity.
            </p>
          </div>

          {/* Flame Polarity */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-500" />
              Optical Flame Sensor Polarity
            </label>
            <select
              value={flameActiveHigh ? 'true' : 'false'}
              onChange={(e) => setFlameActiveHigh(e.target.value === 'true')}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="true">Active HIGH (HIGH pin = Flame Detected)</option>
              <option value="false">Active LOW (LOW pin = Flame Detected)</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Adjusts to match your specific flame sensor module comparator output.
            </p>
          </div>

          {/* Offline Timeout */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Wifi className="h-4 w-4 text-slate-400" />
              Device Inactivity Offline Timeout (Seconds)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              required
              value={offlineTimeout}
              onChange={(e) => setOfflineTimeout(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-500">
              Time without incoming HTTP telemetry before node is marked OFFLINE.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving Changes...' : 'Save Threshold Settings'}
          </button>
        </div>
      </form>

      {/* Presentation Demo Mode Toggle Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Academic Demo Mode (Telemetry Simulator)
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Simulates live worker telemetry packets when hardware nodes are unpowered or during classroom presentation. Simulated readings are distinctly flagged as DEMO in all database records.
            </p>
          </div>

          <button
            onClick={toggleDemoMode}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              isDemoMode
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isDemoMode ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop Demo Stream
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Launch Demo Mode
              </>
            )}
          </button>
        </div>

        {isDemoMode && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>
              Demo stream active: publishing simulated data for <strong>HELMET-DEMO-001</strong> at 2-second intervals.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

