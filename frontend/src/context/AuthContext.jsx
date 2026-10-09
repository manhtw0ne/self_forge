import { checkAuthStorage } from '../utils/authStorage';
import { restoreSession, revokeStoredSession } from '../utils/authSession';
import { useState, useEffect } from 'react';
import api from '../api/client';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [sessionError, setSessionError] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const retrySession = () => { setLoading(true); setSessionError(false); setSessionAttempt(a => a + 1); };

  // Reload on another tab's login/logout so all account-scoped page state resets.
  useEffect(() => {
    const onStorage = event => {
      if (event.storageArea === localStorage && (event.key === 'sf_token' || event.key === null)) {
        window.location.reload();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    let active = true;
    setSessionError(false);
    let token;
    try { token = checkAuthStorage(window.localStorage); setStorageUnavailable(false); }
    catch { setStorageUnavailable(true); setLoading(false); return; }
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    restoreSession(
      async () => (await api.get('/auth/me')).data,
      () => localStorage.getItem('sf_token'), token,
    ).then(result => {
      if (!active || !result) return;
      setSessionError(result.failed);
      if (!result.failed) setUser(result.user);
    }).catch(() => { if (active) setStorageUnavailable(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionAttempt]);

  const login = async (email, password) => {
    try { checkAuthStorage(window.localStorage); }
    catch { setStorageUnavailable(true); throw new Error('Browser storage unavailable'); }
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('sf_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, displayName, password, code) => {
    try { checkAuthStorage(window.localStorage); }
    catch { setStorageUnavailable(true); throw new Error('Browser storage unavailable'); }
    const res = await api.post('/auth/register', { email, displayName, password, code });
    localStorage.setItem('sf_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await revokeStoredSession(window.localStorage,
        token => api.post('/auth/logout', null, { headers: { Authorization: 'Bearer ' + token } }),
        () => { setUser(null); setSessionError(false); });
    } catch {
      setUser(null);
      setStorageUnavailable(true);
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('sf_token');
    const res = await api.get('/auth/me');
    if (token && localStorage.getItem('sf_token') === token) setUser(res.data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, sessionError, storageUnavailable, retrySession, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
