import test from 'node:test';
import assert from 'node:assert/strict';
import { goalPayload } from './goalForm.js';
const form = { name: ' Read ', description: '', targetValue: '12', unit: 'books', deadline: '' };
test('goal editing explicitly clears dates while creation omits the update flag', () => {
  assert.equal(goalPayload(form).name, 'Read');
  assert.equal(goalPayload(form).targetValue, 12);
  assert.equal(goalPayload(form).clearDeadline, undefined);
  assert.equal(goalPayload(form, true).clearDeadline, true);
  assert.deepEqual(goalPayload({ ...form, deadline: '2026-12-31' }, true),
    { name: 'Read', description: '', targetValue: 12, unit: 'books', deadline: '2026-12-31', clearDeadline: false });
});
test('goal targets cannot be truncated or overflow the server integer', () => {
  for (const targetValue of ['', '1.5', '12books', 'Infinity', '2147483648', '-1', '0']) {
    assert.throws(() => goalPayload({ ...form, targetValue }));
  }
  assert.throws(() => goalPayload({ ...form, name: '  ' }));
  assert.equal(goalPayload({ ...form, targetValue: '2147483647' }).targetValue, 2147483647);
});
