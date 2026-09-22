import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !['/auth/login', '/auth/register', '/auth/logout'].includes(err.config?.url)) {
      localStorage.removeItem('sf_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
