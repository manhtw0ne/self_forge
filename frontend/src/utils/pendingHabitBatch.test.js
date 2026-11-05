import test from 'node:test';
import assert from 'node:assert/strict';
import {readHabitBatch, saveHabitBatch, clearHabitBatch} from './pendingHabitBatch.js';
test('batch survives reload and stays scoped to its account', () => {
 const map = new Map(); const storage = {getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k)};
 const payload = {requestId: '12345678-1234-1234-1234-123456789012', habits: [{name: 'Read'}]};
 saveHabitBatch(storage, 1, payload); assert.deepEqual(readHabitBatch(storage, 1), payload);
 assert.equal(readHabitBatch(storage, 2), null); clearHabitBatch(storage, 1); assert.equal(readHabitBatch(storage, 1), null);
});
test('corrupt or inaccessible pending storage is surfaced', () => {
 for(const raw of ['{', '{}', JSON.stringify({requestId:'bad',habits:[]})]) assert.throws(() => readHabitBatch({getItem:()=>raw},1));
 assert.throws(() => readHabitBatch({getItem:()=>{throw new Error('blocked');}},1));
});

import { submitHabitBatch, habitCreationError } from './pendingHabitBatch.js';
function memory() { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) }; }
const one = [{ name: 'Read', difficulty: 'EASY', targetPerWeek: 7, categoryId: null, tags: '' }];
const requestId = '12345678-1234-1234-1234-123456789012';
test('single habit retry after a lost response preserves ID and original content', async () => {
  const state = memory(); let original;
  await assert.rejects(submitHabitBatch(state, 1, one, async payload => { original = payload; throw Error('offline'); }, () => requestId));
  assert.equal(readHabitBatch(state, 2), null);
  let retried;
  const result = await submitHabitBatch(state, 1, [{ name: 'Changed' }], async payload => { retried = payload; return { data: [{ id: 8 }] }; });
  assert.deepEqual(retried, original); assert.equal(result.pending, null); assert.equal(readHabitBatch(state, 1), null);
});
test('invalid single habit and unavailable storage prevent requests', async () => {
  let calls = 0;
  for (const invalid of [{ name: ' ' }, { name: 'Read', targetPerWeek: 8 }, { name: 'Read', tags: 'x'.repeat(256) }]) {
    await assert.rejects(submitHabitBatch(memory(), 1, [invalid], () => { calls++; }, () => requestId));
  }
  await assert.rejects(submitHabitBatch({ getItem: () => null, setItem: () => { throw Error('blocked'); } }, 1, one, () => { calls++; }, () => requestId));
  assert.equal(calls, 0);
});
test('confirmed server success survives local cleanup failure and definitive rejection clears retry', async () => {
  const state = memory(); state.removeItem = () => { throw Error('blocked'); };
  const result = await submitHabitBatch(state, 1, one, async () => ({ data: [{ id: 8 }] }), () => requestId);
  assert.equal(result.response.data[0].id, 8); assert.equal(result.pending.requestId, requestId);
  const rejected = memory(); const error = { response: { status: 400 } };
  await assert.rejects(submitHabitBatch(rejected, 1, one, async () => { throw error; }, () => requestId));
  assert.equal(readHabitBatch(rejected, 1), null);
  assert.equal(habitCreationError(Error('Network Error')), 'Chưa xác nhận được kết quả. Hãy kiểm tra danh sách trước khi tạo lại.');
});
