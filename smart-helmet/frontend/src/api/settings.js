import api from './axios';

export const getThresholds = (deviceId) =>
  api.get('/api/settings/thresholds', { params: deviceId ? { deviceId } : {} });

export const updateThresholds = (data) =>
  api.patch('/api/settings/thresholds', data);

export const getDashboardSummary = () =>
  api.get('/api/dashboard/summary');
