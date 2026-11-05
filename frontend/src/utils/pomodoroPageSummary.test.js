import test from 'node:test';
import assert from 'node:assert/strict';
import { pomodoroPageSummary } from './pomodoroPageSummary.js';
const rows = [
 { id: 1, startedAt: '2026-10-12T17:10:00Z', durationMinutes: 25, completed: true },
 { id: 2, startedAt: '2026-10-12T16:10:00Z', durationMinutes: 50, completed: true },
 { id: 3, startedAt: '2026-10-12T18:10:00Z', durationMinutes: 120, completed: false },
];
test('page totals exclude unfinished time and group by account calendar day', () => {
 const result = pomodoroPageSummary(rows, 'Asia/Ho_Chi_Minh');
 assert.equal(result.completed, 2); assert.equal(result.minutes, 75); assert.equal(result.incomplete, 1);
 assert.deepEqual(result.groups.map(g => [g.date,g.minutes,g.rows.length]), [['2026-10-13',25,2],['2026-10-12',50,1]]);
 assert.equal(pomodoroPageSummary(rows, 'America/Los_Angeles').groups.length, 1);
 assert.deepEqual(rows.map(row => row.id), [1,2,3]);
});
test('empty and invalid histories never fabricate completed time', () => {
 assert.equal(pomodoroPageSummary([], 'UTC').minutes, 0);
 assert.throws(() => pomodoroPageSummary([{ ...rows[0], startedAt:'bad' }], 'UTC'));
});
