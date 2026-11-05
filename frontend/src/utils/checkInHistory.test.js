import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCheckInHistory } from './checkInHistory.js';
const entries = [
  { id: 1, habitName: 'Đọc sách', note: 'Buổi sáng rất tốt', status: 'COMPLETED' },
  { id: 2, habitName: 'Đi bộ', note: null, status: 'SKIPPED' },
  { id: 3, habitName: 'Đọc sách', note: 'Quá mệt', status: 'FAILED' },
];
test('search combines words across habit and note, ignoring Vietnamese accents and case', () => {
  assert.deepEqual(selectCheckInHistory(entries, { query: ' DOC   SANG ' }).map(e => e.id), [1]);
  assert.deepEqual(selectCheckInHistory(entries, { query: 'di bo' }).map(e => e.id), [2]);
  assert.deepEqual(selectCheckInHistory(entries, { query: 'sách mệt', status: 'FAILED' }).map(e => e.id), [3]);
  assert.deepEqual(selectCheckInHistory(entries, { query: 'sách mệt', status: 'COMPLETED' }), []);
});
test('filters preserve source order, entries and unfiltered results', () => {
  const original = structuredClone(entries);
  assert.deepEqual(selectCheckInHistory(entries), entries);
  assert.deepEqual(selectCheckInHistory(entries, { status: 'SKIPPED' }).map(e => e.id), [2]);
  assert.deepEqual(selectCheckInHistory(entries, { query: '<script>' }), []);
  assert.deepEqual(entries, original);
});
