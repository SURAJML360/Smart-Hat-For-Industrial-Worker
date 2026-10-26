import api from './axios';

export const getLatest = (deviceId) =>
  api.get(`/api/telemetry/latest/${deviceId}`);

export const getHistory = (deviceId, params) =>
  api.get(`/api/telemetry/history/${deviceId}`, { params });
