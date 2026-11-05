import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReminderSafely, readPendingReminder } from './pendingReminder.js';
const form = { habitId: '1', reminderTime: '07:00', daysOfWeek: 'MON,WED', message: 'Read' };
const id = '12345678-1234-1234-1234-123456789abc';
function storage() { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) }; }
test('lost response survives reload and retries the original request, isolated by user', async () => {
  const state = storage(); let first;
  await assert.rejects(createReminderSafely(state, 1, form, async payload => { first = payload; throw Error('offline'); }, () => id));
  assert.equal(readPendingReminder(state, 2), null);
  let retried;
  await createReminderSafely(state, 1, { ...form, message: 'Changed' }, async payload => { retried = payload; return { id: 4 }; });
  assert.deepEqual(retried, first);
  assert.equal(readPendingReminder(state, 1), null);
});
test('invalid input and blocked storage prevent network calls, while validation errors clear pending', async () => {
  let calls = 0;
  await assert.rejects(createReminderSafely(storage(), 1, { ...form, reminderTime: '25:00' }, () => { calls++; }, () => id));
  const blocked = { getItem: () => null, setItem: () => { throw Error('blocked'); } };
  await assert.rejects(createReminderSafely(blocked, 1, form, () => { calls++; }, () => id));
  assert.equal(calls, 0);
  const state = storage();
  await assert.rejects(createReminderSafely(state, 1, form, async () => { throw { response: { status: 400 } }; }, () => id));
  assert.equal(readPendingReminder(state, 1), null);
});
