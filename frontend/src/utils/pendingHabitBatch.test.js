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
