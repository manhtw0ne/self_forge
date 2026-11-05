import test from 'node:test';
import assert from 'node:assert/strict';
import { changesProgress, observeProgress, PROGRESS_CHANGED } from './progressSync.js';

test('XP changes refresh only for the authenticated session and relevant mutations', () => {
  const config = { method: 'post', headers: { Authorization: 'Bearer current' } };
  for (const url of ['/check-ins', '/pomodoro/12/complete', '/custom-rewards/7/claim']) {
    assert.equal(changesProgress({ ...config, url }, 'current'), true);
    assert.equal(changesProgress({ ...config, url }, 'new-session'), false);
    assert.equal(changesProgress({ ...config, url }, null), false);
    assert.equal(changesProgress({ ...config, method: 'get', url }, 'current'), false);
  }
  for (const url of ['/rewards/progress', '/pomodoro/start', '/pomodoro/12/note', '/custom-rewards', '/auth/login']) {
    assert.equal(changesProgress({ ...config, url }, 'current'), false);
  }
  assert.equal(changesProgress({ ...config, url: '/check-ins?date=2026-10-11', headers: { get: () => 'Bearer current' } }, 'current'), true);
});

test('late XP reads cannot replace newer balances; leaving removes listeners', async () => {
  const target = new EventTarget();
  const document = new EventTarget();
  const pending = [];
  const published = [];
  const failures = [];
  const stop = observeProgress({ target, document,
    load: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
    publish: value => published.push(value), fail: error => failures.push(error),
  });
  target.dispatchEvent(new Event(PROGRESS_CHANGED));
  pending[1].resolve(30);
  await Promise.resolve();
  pending[0].resolve(10);
  await Promise.resolve();
  assert.deepEqual(published, [30]);
  target.dispatchEvent(new Event(PROGRESS_CHANGED));
  stop();
  pending[2].reject(new Error('old session'));
  await Promise.resolve();
  target.dispatchEvent(new Event(PROGRESS_CHANGED));
  target.dispatchEvent(new Event('online'));
  document.visibilityState = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(pending.length, 3);
  assert.deepEqual(failures, []);
});

test('returning to the app or reconnecting recovers failed XP reads', async () => {
  const target = new EventTarget();
  const document = new EventTarget();
  let calls = 0;
  const values = [];
  const failures = [];
  const stop = observeProgress({ target, document,
    load: async () => { if (++calls === 1) throw new Error('offline'); return calls; },
    publish: value => values.push(value), fail: error => failures.push(error.message),
  });
  await Promise.resolve();
  assert.deepEqual(failures, ['offline']);
  document.visibilityState = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 1);
  target.dispatchEvent(new Event('online'));
  await Promise.resolve();
  document.visibilityState = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve();
  assert.deepEqual(values, [2, 3]);
  stop();
});
