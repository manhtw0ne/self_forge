export const PROGRESS_CHANGED = 'sf:progress-changed';

// Never refresh the current account from a response belonging to an old session.
export function changesProgress(config, currentToken) {
  if (!currentToken || config?.method?.toLowerCase() !== 'post') return false;
  const headers = config.headers;
  const credential = headers?.get?.('Authorization') ?? headers?.Authorization;
  if (credential !== 'Bearer ' + currentToken) return false;
  const path = (config.url || '').split('?')[0];
  return path === '/check-ins' || /^\/pomodoro\/\d+\/complete$/.test(path)
    || /^\/custom-rewards\/\d+\/claim$/.test(path);
}

export function observeProgress({ target, document, load, publish, fail }) {
  let active = true;
  let revision = 0;
  const refresh = async () => {
    const mine = ++revision;
    try {
      const value = await load();
      if (active && mine === revision) publish(value);
    } catch (error) {
      if (active && mine === revision) fail(error);
    }
  };
  const visible = () => { if (document.visibilityState === 'visible') refresh(); };
  target.addEventListener(PROGRESS_CHANGED, refresh);
  target.addEventListener('online', refresh);
  document.addEventListener('visibilitychange', visible);
  refresh();
  return () => {
    active = false;
    target.removeEventListener(PROGRESS_CHANGED, refresh);
    target.removeEventListener('online', refresh);
    document.removeEventListener('visibilitychange', visible);
  };
}
