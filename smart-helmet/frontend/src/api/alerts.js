import api from './axios';

export const getAlerts = (params) =>
  api.get('/api/alerts', { params });

export const acknowledgeAlert = (id) =>
  api.patch(`/api/alerts/${id}/acknowledge`);

export const resolveAlert = (id, note) =>
  api.patch(`/api/alerts/${id}/resolve`, { resolution_note: note });
