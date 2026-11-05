import { useEffect, useRef, useState } from 'react';
import { AppInstallContext } from './AppInstallContext';

export default function AppInstallProvider({ children }) {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
  const [busy, setBusy] = useState(false);
  const installing = useRef(false);
  useEffect(() => {
    const ready = event => { event.preventDefault(); setPrompt(event); };
    const done = () => { setInstalled(true); setPrompt(null); };
    const media = window.matchMedia('(display-mode: standalone)');
    const mode = () => { if (media.matches) done(); };
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', done);
    media.addEventListener('change', mode);
    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', done);
      media.removeEventListener('change', mode);
    };
  }, []);
  const install = async () => {
    if (!prompt || installing.current) return;
    installing.current = true; setBusy(true);
    try {
      await prompt.prompt();
      return (await prompt.userChoice).outcome;
    } finally { setPrompt(null); installing.current = false; setBusy(false); }
  };
  return <AppInstallContext.Provider value={{ available: Boolean(prompt), installed, busy, install }}>{children}</AppInstallContext.Provider>;
}
