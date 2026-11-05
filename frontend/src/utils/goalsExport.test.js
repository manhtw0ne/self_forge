import test from 'node:test';
import assert from 'node:assert/strict';
import { goalsExport } from './goalsExport.js';
const goal = { id: 1, name: 'Đọc sách', description: 'Một bước nhỏ\nMỗi ngày', currentValue: 2, targetValue: 12, unit: 'cuốn', status: 'ACTIVE', deadline: '2026-12-31' };
test('export follows displayed order and keeps Unicode, multiline text and exact progress', () => {
  const output = goalsExport([{ ...goal, name: 'First', email: 'SECRET' }, { ...goal, id: 2 }], '2026-10-13');
  assert.ok(output.text.indexOf('1. First') < output.text.indexOf('2. Đọc sách'));
  assert.match(output.text, /2\/12 cuốn/);
  assert.match(output.text, /Một bước nhỏ\nMỗi ngày/);
  assert.ok(!output.text.includes('SECRET'));
  assert.equal(output.filename, 'selfforge-goals-2026-10-13.txt');
});
test('empty, invalid or unsaved goal data cannot produce a misleading saved export', () => {
  for (const rows of [[], [{ ...goal, id: null }], [{ ...goal, currentValue: -1 }], [{ ...goal, deadline: '2026-02-30' }]])
    assert.throws(() => goalsExport(rows, '2026-10-13'));
  assert.match(goalsExport([{ ...goal, deadline: null }], '2026-10-13').text, /Chưa đặt hạn/);
});
