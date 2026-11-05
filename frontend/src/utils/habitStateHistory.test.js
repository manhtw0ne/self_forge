import assert from 'node:assert/strict';
import test from 'node:test';
import { appendHabitStateHistory, readHabitStateHistoryPage } from './habitStateHistory.js';

const first = { id: 12, kind: 'CHANGED', targetPerWeek: 5, scheduledDays: 'MON,TUE,WED,THU,FRI', active: false, recordedAt: '2026-10-30T08:00:00Z', calendarDate: '2026-10-30', timezone: 'Asia/Ho_Chi_Minh' };
const second = { id: 11, kind: 'CREATED', targetPerWeek: 7, scheduledDays: 'MON,TUE,WED,THU,FRI,SAT,SUN', active: true, recordedAt: '2026-10-20T08:00:00Z', calendarDate: '2026-10-20', timezone: 'Asia/Ho_Chi_Minh' };

test('reads an owner history page with a stable continuation cursor', () => {
  assert.deepEqual(readHabitStateHistoryPage({ items: [first, second], nextCursor: 11 }), { items: [first, second], nextCursor: 11 });
  assert.deepEqual(readHabitStateHistoryPage({ items: [second], nextCursor: null }), { items: [second], nextCursor: null });
});

test('rejects malformed, unordered and non-continuable history pages', () => {
  assert.throws(() => readHabitStateHistoryPage({ items: [{ ...first, kind: 'UNKNOWN' }], nextCursor: null }));
  assert.throws(() => readHabitStateHistoryPage({ items: [second, first], nextCursor: null }));
  assert.throws(() => readHabitStateHistoryPage({ items: [first], nextCursor: 10 }));
  assert.throws(() => readHabitStateHistoryPage({ items: [], nextCursor: 1 }));
});

test('does not duplicate historical events after a repeated pagination response', () => {
  assert.deepEqual(appendHabitStateHistory([first], [first, second]), [first, second]);
});

test('continuation rejects rows outside its requested cursor including repeated pages', () => {
  assert.deepEqual(readHabitStateHistoryPage({ items: [second], nextCursor: null }, 12).items, [second]);
  assert.throws(() => readHabitStateHistoryPage({ items: [first], nextCursor: null }, 12));
  assert.throws(() => readHabitStateHistoryPage({ items: [first], nextCursor: null }, 10));
  assert.throws(() => readHabitStateHistoryPage({ items: [], nextCursor: null }, 0));
});

test('keeps observed legacy states and same-instant transitions without inventing dates', () => {
  const observed = { ...first, id: 10, kind: 'OBSERVED', active: true };
  const page = readHabitStateHistoryPage({ items: [first, observed], nextCursor: null });
  assert.equal(page.items.length, 2);
  assert.equal(page.items[1].kind, 'OBSERVED');
  assert.equal(page.items[0].recordedAt, page.items[1].recordedAt);
  assert.deepEqual(readHabitStateHistoryPage({ items: [], nextCursor: null }).items, []);
});

test('rejects invalid targets, states, dates and oversized or incomplete responses', () => {
  for (const invalid of [
    { targetPerWeek: 0 }, { targetPerWeek: 8 }, { scheduledDays: 'MON,MON' }, { active: 'false' },
    { recordedAt: 'not-a-date' }, { calendarDate: '2026-02-30' },
    { timezone: '' }, { id: Number.MAX_SAFE_INTEGER + 1 },
  ]) assert.throws(() => readHabitStateHistoryPage({ items: [{ ...first, ...invalid }], nextCursor: null }));
  assert.throws(() => readHabitStateHistoryPage({ items: [first] }));
  assert.throws(() => readHabitStateHistoryPage({ items: Array(21).fill(first), nextCursor: null }));
});
