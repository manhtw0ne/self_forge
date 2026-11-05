import MotionProvider from './context/MotionProvider';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { initialLanguage, translate } from './utils/language'

let fallbackLanguage;
try { fallbackLanguage = initialLanguage(window.localStorage, navigator.language); }
catch { fallbackLanguage = initialLanguage(null, navigator.language); }
const fallbackTranslate = text => translate(fallbackLanguage, text);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary t={fallbackTranslate}><MotionProvider><App /></MotionProvider></ErrorBoundary>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
  const register = () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => { /* Installation remains optional. */ });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
