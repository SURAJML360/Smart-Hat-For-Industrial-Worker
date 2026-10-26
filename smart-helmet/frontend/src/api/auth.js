import api from './axios';

export const login = (email, password) =>
  api.post('/api/auth/login', { email, password });
