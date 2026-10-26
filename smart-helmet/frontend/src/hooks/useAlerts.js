import { useState, useEffect, useCallback } from 'react';
import { getAlerts as fetchAlertsApi, acknowledgeAlert, resolveAlert } from '../api/alerts';
import useSocket from './useSocket';

export default function useAlerts(filters = {}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const newAlert = useSocket('alert:new');
  const updatedAlert = useSocket('alert:updated');

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await fetchAlertsApi(filters);
      setAlerts(Array.isArray(data) ? data : data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Real-time: new alert
  useEffect(() => {
    if (newAlert) {
      setAlerts((prev) => [newAlert, ...prev]);
    }
  }, [newAlert]);

  // Real-time: updated alert
  useEffect(() => {
    if (updatedAlert) {
      setAlerts((prev) =>
        prev.map((a) => (a._id === updatedAlert._id ? updatedAlert : a)),
      );
    }
  }, [updatedAlert]);

  const acknowledge = useCallback(async (id) => {
    try {
      const { data } = await acknowledgeAlert(id);
      setAlerts((prev) => prev.map((a) => (a._id === id ? data : a)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to acknowledge');
    }
  }, []);

  const resolve = useCallback(async (id, note) => {
    try {
      const { data } = await resolveAlert(id, note);
      setAlerts((prev) => prev.map((a) => (a._id === id ? data : a)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resolve');
    }
  }, []);

  return { alerts, loading, error, refetch: fetchAlerts, acknowledge, resolve };
}
