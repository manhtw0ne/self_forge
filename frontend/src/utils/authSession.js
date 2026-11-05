import { safeReturnPath } from './returnPath.js';
// Only the credential that failed may invalidate the currently stored session.
export async function restoreSession(loadUser, getToken, token) {
  try {
    const user = await loadUser();
    return getToken() === token ? { user, failed: false } : null;
  } catch {
    return getToken() === token ? { user: null, failed: true } : null;
  }
}

export function shouldExpireSession(error, currentToken) {
  if (!currentToken || error.response?.status !== 401) return false;
  if (['/auth/login', '/auth/register', '/auth/logout'].includes(error.config?.url)) return false;
  const headers = error.config?.headers;
  const authorization = headers?.get?.('Authorization') ?? headers?.Authorization;
  return authorization === 'Bearer ' + currentToken;
}

export async function revokeStoredSession(storage, revoke, onCleared) {
  const token = storage.getItem('sf_token');
  try { if (token) await revoke(token); }
  catch { /* Local sign-out remains available when the server cannot be reached. */ }
  finally {
    if (storage.getItem('sf_token') === token) {
      storage.removeItem('sf_token');
      onCleared();
    }
  }
}

export function expireFailedSession(error, getStorage, returnPath, redirect) {
  try {
    const storage = getStorage();
    const token = storage.getItem('sf_token');
    if (!shouldExpireSession(error, token)) return false;
    storage.removeItem('sf_token');
    if (storage.getItem('sf_token') === token) return false;
    redirect('/login?next=' + encodeURIComponent(safeReturnPath(returnPath)));
    return true;
  } catch { return false; }
}
