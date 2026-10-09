import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChallengeSafely, readPendingChallenge } from './pendingChallenge.js';
const uuid = '12345678-1234-1234-1234-123456789abc';
const form = { name: 'Read', description: 'Daily', habitId: 7, targetDays: 7 };
const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k,v) => m.set(k,v), removeItem: k => m.delete(k) }; };
test('challenge timeout then reload preserves identity and original content until confirmed', async () => {
  const store = memory(); let first;
  await assert.rejects(createChallengeSafely(store, 1, form, async p => { first = p; throw Error('timeout'); }, () => uuid));
  assert.equal(readPendingChallenge(store, 2), null);
  await createChallengeSafely(store, 1, { ...form, name: 'Changed' }, async p => { assert.deepEqual(p, first); return { id: 8 }; });
  assert.equal(readPendingChallenge(store, 1), null);
});
test('challenge rejection classification retains uncertain or conflicting requests', async () => {
  for (const status of [400,404,422,401,403,408,409,429,500]) {
    const store = memory();
    await assert.rejects(createChallengeSafely(store, 1, form, async () => { throw { response: { status } }; }, () => uuid));
    assert.equal(readPendingChallenge(store, 1) === null, [400,404,422].includes(status));
  }
});
test('challenge invalid storage or failed persistence cannot send a new request', async () => {
  const store = memory(); store.setItem('sf_challenge_create:1', '{');
  let calls = 0;
  await assert.rejects(createChallengeSafely(store, 1, form, async () => { calls++; }));
  await assert.rejects(createChallengeSafely({ getItem: () => null, setItem() { throw Error('full'); } }, 1, form, async () => { calls++; }, () => uuid));
  assert.equal(calls, 0);
});
