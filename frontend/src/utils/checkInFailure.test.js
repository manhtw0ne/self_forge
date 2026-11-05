import test from 'node:test';
import assert from 'node:assert/strict';
import { needsCheckInRefresh } from './checkInFailure.js';
test('explicit rejections allow correcting the form while uncertain outcomes require a refresh', () => {
  for (const status of [400, 422]) assert.equal(needsCheckInRefresh({ response: { status } }), false);
  for (const status of [409, 401, 403, 404, 408, 429, 500, 502, 503]) assert.equal(needsCheckInRefresh({ response: { status } }), true);
  assert.equal(needsCheckInRefresh(new Error('offline')), true);
  assert.equal(needsCheckInRefresh({ code: 'ECONNABORTED' }), true);
});
