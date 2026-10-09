import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPendingProgress, savePendingProgress, removePendingProgress, isDefinitiveProgressRejection } from './pendingProgress.js';

function storage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key: i => [...values.keys()][i] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}
const first = { goalId: 10, amount: 2, requestId: '10000000-0000-4000-8000-000000000001' };
const second = { goalId: 11, amount: 3, requestId: '10000000-0000-4000-8000-000000000002' };

test('reload restores the same payload and key without allocating another operation', () => {
  const disk = storage();
  savePendingProgress(disk, 1, first);
  const restored = readPendingProgress(disk, 1)[0];
  assert.deepEqual(restored, first);
  savePendingProgress(disk, 1, restored);
  assert.deepEqual(readPendingProgress(disk, 1), [first]);
});

test('accounts are isolated and removing one receipt keeps other pending operations', () => {
  const disk = storage();
  savePendingProgress(disk, 1, first);
  savePendingProgress(disk, 1, second);
  savePendingProgress(disk, 2, first);
  removePendingProgress(disk, 1, first.requestId);
  assert.deepEqual(readPendingProgress(disk, 1), [second]);
  assert.deepEqual(readPendingProgress(disk, 2), [first]);
  assert.deepEqual(readPendingProgress(disk, 3), []);
});

test('an uncertain request cannot be changed to a different amount', () => {
  const disk = storage();
  savePendingProgress(disk, 1, first);
  assert.throws(() => savePendingProgress(disk, 1, { ...first, amount: 5 }));
  assert.deepEqual(readPendingProgress(disk, 1), [first]);
});

test('malformed pending storage fails closed rather than silently discarding retry keys', () => {
  const disk = storage();
  disk.setItem('sf_goal_progress_v1:1:broken', '{');
  assert.throws(() => readPendingProgress(disk, 1));
  assert.deepEqual(readPendingProgress(disk, 2), []);
  assert.throws(() => savePendingProgress(storage(), 1, { ...first, amount: -1 }));
  assert.throws(() => readPendingProgress(storage(), null));
});

test('storage quota errors propagate before a caller can submit a new action', () => {
  const disk = storage();
  disk.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => savePendingProgress(disk, 1, first), /QuotaExceededError/);
});

test('auth expiry, throttling and ambiguous network failures retain the request', () => {
  for (const status of [undefined, 401, 403, 408, 429, 500, 502, 503, 504]) {
    assert.equal(isDefinitiveProgressRejection(status), false);
  }
  for (const status of [400, 404, 409, 422]) assert.equal(isDefinitiveProgressRejection(status), true);
});