import test from 'node:test';
import assert from 'node:assert/strict';
import { retryAfterSeconds, remainingSeconds } from './retryAfter.js';
test('resend wait follows server seconds and HTTP dates with safe fallback', () => {
  const now = Date.parse('2026-10-11T00:00:00Z');
  assert.equal(retryAfterSeconds({ 'retry-after': '120' }, now), 120);
  assert.equal(retryAfterSeconds({ get: () => 'Sun, 11 Oct 2026 00:02:00 GMT' }, now), 120);
  assert.equal(retryAfterSeconds({}, now), 60);
  assert.equal(retryAfterSeconds({ 'retry-after': 'invalid' }, now), 60);
  assert.equal(retryAfterSeconds({ 'retry-after': '0' }, now), 1);
});
test('cooldown reflects elapsed time after background tabs and never goes negative', () => {
  assert.equal(remainingSeconds(61000, 1000), 60);
  assert.equal(remainingSeconds(61000, 60500), 1);
  assert.equal(remainingSeconds(61000, 125000), 0);
});
