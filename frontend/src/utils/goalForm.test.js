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

test('restored goal drafts are validated without truncating content or accepting impossible dates', () => {
  for (const field of ['name', 'description', 'unit']) {
    const draft = { ...form, [field]: 'x'.repeat(256) };
    const before = structuredClone(draft);
    assert.throws(() => goalPayload(draft), /255/);
    assert.deepEqual(draft, before);
    assert.equal(goalPayload({ ...form, [field]: 'x'.repeat(255) })[field].length, 255);
  }
  for (const deadline of ['2026-02-30', '2025-02-29', '2026-13-01', '../private', null]) assert.throws(() => goalPayload({ ...form, deadline }));
  assert.equal(goalPayload({ ...form, deadline: '2028-02-29' }).deadline, '2028-02-29');
  assert.throws(() => goalPayload({ ...form, description: {} }));
});

import { goalSnapshot, goalFormFrom, reviewedGoalForm } from './goalForm.js';
test('goal editing snapshots include progress and status without mixing current form edits', () => {
  const goal = { id: 7, name: 'Read', description: null, targetValue: 12, currentValue: 3, unit: null, deadline: null, status: 'ACTIVE', progress: 0.25 };
  assert.deepEqual(goalSnapshot(goal), { id: 7, name: 'Read', description: '', targetValue: 12, currentValue: 3, unit: '', deadline: null, status: 'ACTIVE' });
  const edit = { name: 'Đọc sách 📚', description: 'Keep me', targetValue: '20', unit: 'books', deadline: '' };
  assert.deepEqual(reviewedGoalForm(edit, goal, true), edit);
  assert.equal(reviewedGoalForm(edit, { ...goal, status: 'COMPLETED' }, true).targetValue, 12);
  assert.equal(edit.targetValue, '20');
  assert.deepEqual(reviewedGoalForm(edit, goal, false), goalFormFrom(goal));
});
