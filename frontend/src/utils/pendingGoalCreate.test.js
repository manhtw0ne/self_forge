import test from 'node:test';
import assert from 'node:assert/strict';
import { readGoalCreation, clearGoalCreation, createGoalSafely, retryGoalCreation } from './pendingGoalCreate.js';
import { clearAccountDrafts } from './accountDraftCleanup.js';
const fixture = () => {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key), get length() { return data.size; }, key: index => [...data.keys()][index] };
};
const payload = { name: 'Read 12 books', description: '', targetValue: 12, unit: 'books', deadline: null };
const requestId = '12345678-1234-1234-1234-123456789012';
test('lost response preserves the original request and blocks a second creation until reviewed', async () => {
  const storage = fixture(); let writes = 0;
  const post = async () => { writes++; throw Error('Lost response after server commit'); };
  await assert.rejects(createGoalSafely(storage, 1, payload, post, () => requestId));
  assert.deepEqual(readGoalCreation(storage, 1).payload, { ...payload, requestId });
  await assert.rejects(createGoalSafely(storage, 1, { ...payload, name: 'Changed form' }, post));
  assert.equal(writes, 1);
  assert.equal(readGoalCreation(storage, 10), null);
  clearGoalCreation(storage, 1);
  assert.equal(readGoalCreation(storage, 1), null);
});
test('validation rejection clears the request; blocked storage sends nothing; confirmed save survives cleanup failure', async () => {
  const storage = fixture();
  await assert.rejects(createGoalSafely(storage, 1, payload, async () => { throw { response: { status: 400 } }; }, () => requestId));
  assert.equal(readGoalCreation(storage, 1), null);
  let writes = 0;
  await assert.rejects(createGoalSafely({ ...storage, setItem: () => { throw Error('blocked'); } }, 1, payload, async () => { writes++; }, () => requestId), /Mục tiêu chưa được gửi/);
  assert.equal(writes, 0);
  const result = await createGoalSafely({ ...storage, removeItem: () => { throw Error('blocked'); } }, 1, payload, async () => ({ data: { id: 9 } }), () => requestId);
  assert.equal(result.response.data.id, 9);
  assert.equal(result.pending.confirmed, true);
});
test('a pending request with an ID retries the exact payload and retains legacy requests for review only', async () => {
  const storage = fixture();
  await assert.rejects(createGoalSafely(storage, 1, payload, async () => { throw Error('offline'); }, () => requestId));
  const result = await retryGoalCreation(storage, 1, async body => {
    assert.deepEqual(body, { ...payload, requestId });
    return { data: { id: 9 } };
  });
  assert.equal(result.response.data.id, 9);
  assert.equal(readGoalCreation(storage, 1), null);
  storage.setItem('sf_goal_create:1', JSON.stringify({ payload }));
  await assert.rejects(retryGoalCreation(storage, 1, async () => ({ data: { id: 10 } })), /không thể gửi lại an toàn/);
});
test('account cleanup and corrupted pending requests cannot affect another owner', () => {
  const storage = fixture();
  storage.setItem('sf_goal_create:1', JSON.stringify({ payload }));
  storage.setItem('sf_goal_create:10', JSON.stringify({ payload }));
  clearAccountDrafts(storage, 1);
  assert.equal(readGoalCreation(storage, 1), null);
  assert.deepEqual(readGoalCreation(storage, 10).payload, payload);
  storage.setItem('sf_goal_create:1', '{bad');
  assert.throws(() => readGoalCreation(storage, 1));
  assert.throws(() => readGoalCreation(storage, '1:10'));
});

import { matchingGoalCreations } from './pendingGoalCreate.js';
test('goal review compares all creation fields and retains candidates even after progress changes', () => {
  const original = { id: 1, ...payload, currentValue: 5, status: 'ACTIVE' };
  const goals = [original, { ...original, id: 2, unit: 'chapters' }, { ...original, id: 3, targetValue: 13 },
    { ...original, id: 4, deadline: '2026-12-31' }, { ...original, id: 5, description: 'Edited' },
    { ...original, id: 6, currentValue: 12, status: 'COMPLETED' }];
  const pending = { payload: { ...payload } };
  const before = structuredClone({ goals, pending });
  assert.deepEqual(matchingGoalCreations(goals, pending).map(goal => goal.id), [1, 6]);
  assert.deepEqual({ goals, pending }, before);
});
test('missing or unreadable creation requests do not guess a matching goal', () => {
  assert.deepEqual(matchingGoalCreations([{ id: 1, ...payload }], null), []);
  assert.deepEqual(matchingGoalCreations([{ id: 1, ...payload }], { invalid: true }), []);
  assert.deepEqual(matchingGoalCreations([], { payload }), []);
});
