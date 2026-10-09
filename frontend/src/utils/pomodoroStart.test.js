import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPendingStart, requestPomodoroStart, InvalidPendingStart } from './pomodoroStart.js';
const uuid = 'aabbccdd-1234-1234-1234-123456789abc';
const memory = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) }; };
test('timeout then reload retries identical payload despite changed selection', async () => {
  const storage = memory(); let sent;
  await assert.rejects(requestPomodoroStart(storage, 1, 7, async p => { sent = p; throw new Error('timeout'); }, () => uuid));
  await requestPomodoroStart(storage, 1, 9, async p => { assert.deepEqual(p, sent); return { id: 4 }; });
  assert.equal(readPendingStart(storage, 2), null);
  assert.equal(readPendingStart(storage, 1).requestId, uuid);
});
test('definitive validation failures clear pending; auth, conflict and network failures preserve it', async () => {
  for (const status of [400,404,422,401,403,408,409,429,500,503]) {
    const storage = memory();
    await assert.rejects(requestPomodoroStart(storage, 1, null, async () => { throw { response: { status } }; }, () => uuid));
    assert.equal(readPendingStart(storage, 1) === null, [400,404,422].includes(status));
  }
});
test('corrupt pending state blocks transmission and stays available for explicit discard', async () => {
  for (const raw of ['{', 'null', '{"requestId":"bad"}']) {
    const storage = memory(); storage.setItem('sf_pomodoro_start:1', raw);
    let calls = 0;
    await assert.rejects(requestPomodoroStart(storage, 1, null, async () => { calls++; }), InvalidPendingStart);
    assert.equal(calls, 0); assert.equal(storage.getItem('sf_pomodoro_start:1'), raw);
  }
});
test('failed persistence prevents sending a request', async () => {
  let calls = 0;
  await assert.rejects(requestPomodoroStart({ getItem: () => null, setItem() { throw new Error('quota'); } }, 1, null, async () => { calls++; }, () => uuid));
  assert.equal(calls, 0);
});
