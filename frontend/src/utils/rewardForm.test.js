import test from 'node:test';
import assert from 'node:assert/strict';
import { rewardPayload } from './rewardForm.js';
const form = { name: '  Movie  ', description: ' Weekend ', xpCost: '100' };
test('reward cost rejects fractions, malformed and out-of-range amounts without truncating', () => {
  for (const xpCost of ['1.5', '100abc', '', 0, -1, 1000001, Infinity]) assert.throws(() => rewardPayload({ ...form, xpCost }));
  for (const xpCost of [1, 1000000]) assert.equal(rewardPayload({ ...form, xpCost }).xpCost, xpCost);
});
test('reward names are required and valid payloads preserve exact cost', () => {
  assert.deepEqual(rewardPayload(form), { name: 'Movie', description: 'Weekend', xpCost: 100 });
  assert.throws(() => rewardPayload({ ...form, name: '   ' }));
  assert.throws(() => rewardPayload({ ...form, description: 'a'.repeat(256) }));
});
