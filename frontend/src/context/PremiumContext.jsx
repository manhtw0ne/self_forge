import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';
import { useAuth } from './useAuth';
import { matchesPremiumSession, readPremiumStatus } from '../utils/premiumStatus';
import { PremiumContext } from './premium-context';

const FREE_PREMIUM_STATUS = Object.freeze({
  isPremium: false,
  premiumTier: 'FREE',
  premiumExpiresAt: null,
  limits: null,
});

function readStoredToken() {
  try {
    return window.localStorage.getItem('sf_token');
  } catch {
    return null;
  }
}

export function PremiumProvider({ children }) {
  const { user } = useAuth();
  const [status, setStatus] = useState(FREE_PREMIUM_STATUS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const ownerRef = useRef(null);
  const requestRef = useRef(0);

  const refreshPremium = useCallback(async () => {
    const ownerId = user?.id;
    const token = readStoredToken();
    const request = ++requestRef.current;
    if (!Number.isSafeInteger(ownerId) || ownerId <= 0 || typeof token !== 'string' || token.length === 0) {
      setStatus(FREE_PREMIUM_STATUS);
      setLoading(false);
      setError(false);
      return null;
    }

    setLoading(true);
    setError(false);
    try {
      const response = await api.get('/premium/status');
      const next = readPremiumStatus(response.data);
      if (request !== requestRef.current
        || !matchesPremiumSession(ownerRef.current, readStoredToken(), ownerId, token)) return null;
      setStatus(next);
      return next;
    } catch {
      if (request === requestRef.current
        && matchesPremiumSession(ownerRef.current, readStoredToken(), ownerId, token)) {
        // An unavailable or malformed response must never leave Premium features unlocked.
        setStatus(FREE_PREMIUM_STATUS);
        setError(true);
      }
      return null;
    } finally {
      if (request === requestRef.current
        && matchesPremiumSession(ownerRef.current, readStoredToken(), ownerId, token)) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    ownerRef.current = user?.id ?? null;
    requestRef.current += 1;
    if (!user?.id) {
      setStatus(FREE_PREMIUM_STATUS);
      setLoading(false);
      setError(false);
      return undefined;
    }

    setStatus(FREE_PREMIUM_STATUS);
    void refreshPremium();
    const refreshWhenAvailable = () => { void refreshPremium(); };
    window.addEventListener('focus', refreshWhenAvailable);
    window.addEventListener('online', refreshWhenAvailable);
    return () => {
      requestRef.current += 1;
      window.removeEventListener('focus', refreshWhenAvailable);
      window.removeEventListener('online', refreshWhenAvailable);
    };
  }, [user, refreshPremium]);

  const value = useMemo(() => ({ ...status, loading, error, refreshPremium }), [status, loading, error, refreshPremium]);

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

