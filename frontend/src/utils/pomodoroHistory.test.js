import test from 'node:test';
import assert from 'node:assert/strict';
import { readPomodoroHistory } from './pomodoroHistory.js';
const rows = Array.from({ length: 20 }, (_, i) => ({ id: 100-i, completed: i % 2 === 0, note: 'Ghi chú 🌱' }));
test('history accepts bounded pages and preserves notes, order and an exact next cursor', () => {
  assert.deepEqual(readPomodoroHistory({ items: rows, nextCursor: 81 }), { items: rows, nextCursor: 81 });
  assert.deepEqual(readPomodoroHistory({ items: rows.slice(0, 3), nextCursor: null }).items, rows.slice(0, 3));
  assert.deepEqual(readPomodoroHistory({ items: [], nextCursor: null }), { items: [], nextCursor: null });
});
test('unsafe cursors, duplicate or unordered sessions fail instead of silently skipping or repeating history', () => {
  for (const data of [null, [], { items: null }, { items: [...rows, { id: 80, completed: true }] },
    { items: rows, nextCursor: 1 }, { items: rows, nextCursor: '81' }, { items: [], nextCursor: 81 },
    { items: [rows[0], rows[0]] }, { items: [rows[1], rows[0]] }, { items: [{ id: 0, completed: true }] },
    { items: [{ id: 1, completed: 'false' }] }]) assert.throws(() => readPomodoroHistory(data));
});
