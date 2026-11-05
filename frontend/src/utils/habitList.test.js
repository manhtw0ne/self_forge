import test from 'node:test';
import assert from 'node:assert/strict';
import { selectHabits } from './habitList.js';
const rows = [
  { id: 3, name: 'Đọc sách', description: 'Mỗi sáng', tags: 'học tập', categoryId: 1, difficulty: 'EASY' },
  { id: 1, name: 'Đạp xe', tags: 'sức khỏe', categoryId: 2, difficulty: 'HARD' },
  { id: 2, name: 'Ngủ sớm', categoryId: null, difficulty: 'EASY' },
];
test('habit search accepts accents, tags and multiple words with missing optional fields', () => {
  assert.deepEqual(selectHabits(rows, { query: ' DOC hoc sang ' }).map(h => h.id), [3]);
  assert.deepEqual(selectHabits(rows, { query: 'ĐẠP' }).map(h => h.id), [1]);
  assert.deepEqual(selectHabits(rows, { query: 'ngu' }).map(h => h.id), [2]);
});
test('category and difficulty filters compose without changing saved order', () => {
  assert.deepEqual(selectHabits(rows, { category: '1', difficulty: 'HARD' }), []);
  assert.deepEqual(selectHabits(rows, { difficulty: 'EASY' }).map(h => h.id), [3, 2]);
  assert.deepEqual(selectHabits(rows, { category: '2', query: 'khoe' }).map(h => h.id), [1]);
  assert.deepEqual(selectHabits(rows, {}).map(h => h.id), [3, 1, 2]);
  assert.deepEqual(rows.map(h => h.id), [3, 1, 2]);
});
