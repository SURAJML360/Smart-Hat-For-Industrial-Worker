import { useState, useEffect, useCallback } from 'react';
import { getLatest, getHistory } from '../api/telemetry';
import useSocket from './useSocket';

export default function useTelemetry(deviceId) {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const socketTelemetry = useSocket('telemetry:new');

  const fetchLatest = useCallback(async () => {
    if (!deviceId) return;
    try {
      const { data } = await getLatest(deviceId);
      setLatest(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch telemetry');
    }
  }, [deviceId]);

  const fetchHistory = useCallback(async (params = {}) => {
    if (!deviceId) return;
    try {
      setLoading(true);
      const { data } = await getHistory(deviceId, params);
      setHistory(Array.isArray(data) ? data : data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchLatest();
      await fetchHistory({ limit: 50 });
      setLoading(false);
    };
    init();
  }, [fetchLatest, fetchHistory]);

  // Real-time updates via socket
  useEffect(() => {
    if (socketTelemetry && socketTelemetry.deviceId === deviceId) {
      setLatest(socketTelemetry);
      setHistory((prev) => [...prev.slice(-49), socketTelemetry]);
    }
  }, [socketTelemetry, deviceId]);

  return { latest, history, loading, error, refetch: fetchLatest, refetchHistory: fetchHistory };
}
