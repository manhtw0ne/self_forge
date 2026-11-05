import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectReviewHistory } from './reviewHistory.js';
const reviews = [
  { id: 1, weekStart: '2025-12-29', wins: 'Đọc sách đều đặn', improvements: '', nextWeekPlan: '', rating: 4 },
  { id: 2, weekStart: '2026-10-12', wins: '', improvements: 'Đọc thêm sách', nextWeekPlan: 'Nghỉ ngơi', rating: 3 },
  { id: 3, weekStart: '2026-10-05', wins: 'Finished a book', improvements: '', nextWeekPlan: '', rating: 4 },
];
test('review search matches accents, multiple words and all narrative fields', () => {
  assert.deepEqual(selectReviewHistory(reviews, { query: 'doc sach' }).map(r => r.id), [2, 1]);
  assert.deepEqual(selectReviewHistory(reviews, { query: 'nghi ngoi' }).map(r => r.id), [2]);
  assert.deepEqual(selectReviewHistory(reviews, { query: '2026-10-05' }).map(r => r.id), [3]);
});
test('year uses week start and rating filters combine without mutating input', () => {
  assert.deepEqual(selectReviewHistory(reviews, { year: '2025', rating: '4' }).map(r => r.id), [1]);
  assert.deepEqual(selectReviewHistory(reviews, { year: '2026', rating: '4' }).map(r => r.id), [3]);
  assert.deepEqual(selectReviewHistory(reviews, { year: '2026', rating: '5' }), []);
  assert.deepEqual(reviews.map(r => r.id), [1, 2, 3]);
});
