import { useEffect, useMemo, useState } from 'react';
import { LanguageContext } from './language-context';
import { initialLanguage, normalizeLanguage, translate } from '../utils/language';

export function LanguageProvider({ children }) {
  const [language, updateLanguage] = useState(() => {
    try { return initialLanguage(window.localStorage, navigator.language); }
    catch { return initialLanguage(null, navigator.language); }
  });
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem('sf_language', language); } catch { /* Optional persistence. */ }
  }, [language]);
  const value = useMemo(() => ({
    language,
    setLanguage: next => { const supported = normalizeLanguage(next); if (supported) updateLanguage(supported); },
    t: (source, parameters) => translate(language, source, parameters),
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
