import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAuthStorage } from './authStorage.js';
import { shouldExpireSession, restoreSession, revokeStoredSession } from './authSession.js';
const failure = (token, url = '/profile', status = 401) => ({ response: { status }, config: { url, headers: { Authorization: 'Bearer ' + token } } });
test('late logout cannot clear a newer session', async () => {
  let token = 'old';
  let finish;
  let cleared = false;
  const storage = { getItem: () => token, removeItem: () => { token = null; } };
  const pending = revokeStoredSession(storage, credential => {
    assert.equal(credential, 'old');
    return new Promise(resolve => { finish = resolve; });
  }, () => { cleared = true; });
  token = 'new';
  finish();
  await pending;
  assert.equal(token, 'new');
  assert.equal(cleared, false);
});
test('offline logout clears only its own local credential', async () => {
  let token = 'old';
  let cleared = false;
  await revokeStoredSession({ getItem: () => token, removeItem: () => { token = null; } },
    async () => { throw new Error('offline'); }, () => { cleared = true; });
  assert.equal(token, null);
  assert.equal(cleared, true);
});
test('storage readiness preserves credentials and existing probe data', () => {
  const values = new Map([['sf_token', 'existing'], ['sf_storage_check', 'previous']]);
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  assert.equal(checkAuthStorage(storage), 'existing');
  assert.equal(values.get('sf_token'), 'existing');
  assert.equal(values.get('sf_storage_check'), 'previous');
  values.delete('sf_storage_check');
  checkAuthStorage(storage);
  assert.equal(values.has('sf_storage_check'), false);
});
test('blocked and silently failing storage cannot pass the auth preflight', () => {
  assert.throws(() => checkAuthStorage({ getItem() { throw new Error('blocked'); } }));
  assert.throws(() => checkAuthStorage({ getItem: () => null, setItem() {}, removeItem() {} }));
  assert.throws(() => checkAuthStorage({ getItem: () => null, setItem() { throw new Error('quota'); }, removeItem() {} }));
});
test('session restoration can retry after a network failure without removing credentials', async () => {
  const getToken = () => 'session';
  assert.deepEqual(await restoreSession(async () => { throw new Error('offline'); }, getToken, 'session'),
    { user: null, failed: true });
  assert.deepEqual(await restoreSession(async () => ({ id: 7 }), getToken, 'session'),
    { user: { id: 7 }, failed: false });
});
test('restoration ignores both stale success and failure after credential changes', async () => {
  for (const current of [null, 'new-session']) {
    assert.equal(await restoreSession(async () => ({ id: 7 }), () => current, 'old-session'), null);
    assert.equal(await restoreSession(async () => { throw new Error('expired'); }, () => current, 'old-session'), null);
  }
});
test('late unauthorized responses cannot clear a newer login', () => {
  assert.equal(shouldExpireSession(failure('old'), 'new'), false);
  assert.equal(shouldExpireSession(failure('old'), null), false);
  assert.equal(shouldExpireSession(failure('current'), 'current'), true);
});
test('public auth errors and non-auth failures retain the session', () => {
  for (const path of ['/auth/login', '/auth/register', '/auth/logout']) assert.equal(shouldExpireSession(failure('a', path), 'a'), false);
  assert.equal(shouldExpireSession(failure('a', '/profile', 500), 'a'), false);
  assert.equal(shouldExpireSession({response: {status: 401}}, 'a'), false);
});
test('supports AxiosHeaders credential lookup', () => {
  assert.equal(shouldExpireSession({response: {status: 401}, config: {headers: {get: () => 'Bearer a'}}}, 'a'), true);
});
