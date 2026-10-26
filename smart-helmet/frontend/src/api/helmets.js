import api from './axios';

export const getHelmets = () =>
  api.get('/api/helmets');

export const getHelmet = (id) =>
  api.get(`/api/helmets/${id}`);
