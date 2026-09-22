import { useState, useEffect } from 'react';
import api from '../api/client';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sf_token');
    if (token) {
      api.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch((err) => { if (err.response?.status === 401) localStorage.removeItem('sf_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('sf_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, displayName, password) => {
    const res = await api.post('/auth/register', { email, displayName, password });
    localStorage.setItem('sf_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Local logout still works offline; server revocation requires connectivity.
    } finally {
      localStorage.removeItem('sf_token');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const res = await api.get('/auth/me');
    setUser(res.data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
