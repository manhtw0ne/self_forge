import test from 'node:test';
import assert from 'node:assert/strict';
import { isConnectionFailure } from './networkStatus.js';
test('timeouts, gateway failures and network failures reveal uncertain connection status', () => {
  for (const code of ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT']) assert.equal(isConnectionFailure({ code }), true);
  for (const status of [408, 502, 503, 504]) assert.equal(isConnectionFailure({ response: { status } }), true);
});
test('business, authentication, rate limits, cancellations and local exceptions are not reported as lost connection', () => {
  for (const status of [400, 401, 403, 404, 409, 422, 429, 500]) assert.equal(isConnectionFailure({ response: { status } }), false);
  assert.equal(isConnectionFailure({ code: 'ERR_CANCELED' }), false);
  assert.equal(isConnectionFailure({ code: 'ERR_CANCELED', response: { status: 503 } }), false);
  assert.equal(isConnectionFailure(Error('Storage blocked')), false);
  assert.equal(isConnectionFailure(null), false);
});
