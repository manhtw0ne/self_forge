import test from 'node:test';
import assert from 'node:assert/strict';
import { selectGoals, isOverdueGoal } from './goalList.js';
import { todayInTimezone } from './dates.js';

const goals = [
  { id: 1, name: 'Đọc sách', description: 'Mỗi ngày', unit: 'cuốn', status: 'ACTIVE', deadline: '2026-10-11', progress: 0.2 },
  { id: 2, name: 'Chạy bộ', status: 'COMPLETED', deadline: '2026-10-10', progress: 1 },
  { id: 3, name: 'Đọc báo', status: 'ACTIVE', deadline: '2026-10-12', progress: 0.8 },
  { id: 4, name: 'Nghỉ ngơi', status: 'ABANDONED', deadline: null, progress: 0 },
  { id: 5, name: 'Học đàn', status: 'ACTIVE', deadline: null, progress: 0.1 },
];
const today = '2026-10-12';
const ids = rows => rows.map(row => row.id);

test('search matches Vietnamese without accents, multiple words and optional fields', () => {
  assert.deepEqual(ids(selectGoals(goals, { query: '  DOC cuon NGAY ', today })), [1]);
  assert.deepEqual(ids(selectGoals(goals, { query: 'đọc', today })), [1, 3]);
  assert.deepEqual(ids(selectGoals(goals, { query: 'missing', today })), []);
  assert.deepEqual(ids(selectGoals(goals, { query: ' ', today })), [1, 2, 3, 4, 5]);
});

test('overdue excludes completed, abandoned, undated and due-today goals', () => {
  assert.deepEqual(ids(selectGoals(goals, { status: 'OVERDUE', today })), [1]);
  assert.equal(isOverdueGoal({ ...goals[0], status: 'ABANDONED' }, today), false);
  const instant = new Date('2026-10-11T17:00:00Z');
  assert.equal(isOverdueGoal(goals[0], todayInTimezone('Asia/Ho_Chi_Minh', instant)), true);
  assert.equal(isOverdueGoal(goals[0], todayInTimezone('America/Los_Angeles', instant)), false);
});

test('filters compose with sorting and leave original API order intact', () => {
  assert.deepEqual(ids(selectGoals(goals, { status: 'ACTIVE', sort: 'deadline', today })), [1, 3, 5]);
  assert.deepEqual(ids(selectGoals(goals, { query: 'doc', sort: 'progress', today })), [3, 1]);
  assert.deepEqual(ids(selectGoals(goals, { status: 'COMPLETED', today })), [2]);
  assert.deepEqual(ids(selectGoals(goals, { status: 'ABANDONED', today })), [4]);
  assert.deepEqual(ids(goals), [1, 2, 3, 4, 5]);
});

test('due soon includes today and sixth future day, excludes overdue and ended goals', () => {
  const dates = ['2026-10-11', '2026-10-12', '2026-10-18', '2026-10-19'];
  const rows = dates.map((deadline, id) => ({ id, deadline, status: 'ACTIVE' }));
  rows.push({ id: 9, deadline: '2026-10-14', status: 'COMPLETED' });
  assert.deepEqual(ids(selectGoals(rows, { status: 'DUE_SOON', today })), [1, 2]);
  assert.deepEqual(ids(selectGoals(rows, { status: 'DUE_SOON', today: 'invalid' })), []);
});
