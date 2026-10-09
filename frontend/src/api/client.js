import axios from 'axios';
import { shouldExpireSession } from '../utils/authSession';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (shouldExpireSession(err, localStorage.getItem('sf_token'))) {
      localStorage.removeItem('sf_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
