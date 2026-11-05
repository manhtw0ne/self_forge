import test from 'node:test';
import assert from 'node:assert/strict';
import { moodTimeline, moodY } from './moodTimeline.js';
test('mood chart preserves missing calendar days and sorts without changing input', () => {
  const entries = [{ date: '2026-03-10', score: 4 }, { date: '2026-03-07', score: 2 }];
  const result = moodTimeline(entries);
  assert.deepEqual(result.points.map(p => [p.date, p.x, p.score]), [['2026-03-07', 10, 2], ['2026-03-10', 70, 4]]);
  assert.equal(result.width, 600);
  assert.equal(entries[0].date, '2026-03-10');
});
test('calendar spacing handles leap days, year boundaries and single entries', () => {
  for (const [a, b] of [['2024-02-28', '2024-03-01'], ['2025-12-31', '2026-01-02']]) {
    assert.equal(moodTimeline([{ date: a, score: 1 }, { date: b, score: 5 }]).points[1].x, 50);
  }
  assert.deepEqual(moodTimeline([]), { points: [], width: 600 });
  assert.equal(moodTimeline([{ date: '2026-10-11', score: 3 }]).width, 600);
});

test('mood scale covers 1 through 5 with equal spacing and room for endpoint markers', () => {
  assert.deepEqual([5, 4, 3, 2, 1].map(score => moodY(score)), [8, 34, 60, 86, 112]);
  assert.equal(moodY(3, 200), 100);
});
