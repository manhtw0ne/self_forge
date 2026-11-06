import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LanguageContext } from './language-context';
import { initialLanguage, normalizeLanguage, pendingAccountLanguage, translate } from '../utils/language';
import { useAuth } from './useAuth';
import api from '../api/client';

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const [language, updateLanguage] = useState(() => {
    try { return initialLanguage(window.localStorage, navigator.language); }
    catch { return initialLanguage(null, navigator.language); }
  });
  const ownerRef = useRef(null);
  const pendingRef = useRef(null);
  const explicitPublicLanguageRef = useRef(null);
  const syncingRef = useRef(false);

  const syncLanguage = useCallback(async () => {
    const owner = ownerRef.current;
    if (!Number.isSafeInteger(owner) || owner < 1 || syncingRef.current || !pendingRef.current) return;
    syncingRef.current = true;
    while (ownerRef.current === owner && pendingRef.current) {
      const selected = pendingRef.current;
      pendingRef.current = null;
      try {
        await api.patch('/profile', { language: selected });
      } catch {
        // Keep the local preference and retry only when connectivity returns or
        // the person makes another deliberate selection. A failed preference
        // sync must never block using the application.
        if (ownerRef.current === owner) pendingRef.current = selected;
        break;
      }
    }
    syncingRef.current = false;
  }, []);

  useEffect(() => {
    const owner = Number.isSafeInteger(user?.id) ? user.id : null;
    if (ownerRef.current !== owner) {
      ownerRef.current = owner;
      pendingRef.current = null;
    }
    const saved = normalizeLanguage(user?.language);
    // A server setting wins across devices, except while this device has a
    // newer explicit selection awaiting sync.
    if (saved) {
      explicitPublicLanguageRef.current = null;
      if (!pendingRef.current) updateLanguage(current => current === saved ? current : saved);
      return;
    }
    const chosenBeforeAuth = pendingAccountLanguage(user?.language, explicitPublicLanguageRef.current);
    if (owner && chosenBeforeAuth && !pendingRef.current) {
      pendingRef.current = chosenBeforeAuth;
      explicitPublicLanguageRef.current = null;
      void syncLanguage();
    }
  }, [user?.id, user?.language, syncLanguage]);

  useEffect(() => {
    const retry = () => { void syncLanguage(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [syncLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem('sf_language', language); } catch { /* Optional persistence. */ }
  }, [language]);
  const setLanguage = useCallback(next => {
    const selected = normalizeLanguage(next);
    if (!selected) return;
    updateLanguage(selected);
    const owner = ownerRef.current;
    if (!Number.isSafeInteger(owner) || owner < 1) {
      explicitPublicLanguageRef.current = selected;
      return;
    }
    if (normalizeLanguage(user?.language) === selected) return;
    pendingRef.current = selected;
    void syncLanguage();
  }, [syncLanguage, user?.language]);
  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (source, parameters) => translate(language, source, parameters),
  }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
