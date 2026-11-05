import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayInTimezone, shiftDate, validCalendarDate } from './dates.js';

test('profile dates differ across the new-year boundary at the same instant', () => {
  const now = new Date('2025-12-31T18:00:00Z');
  assert.equal(todayInTimezone('Asia/Ho_Chi_Minh', now), '2026-01-01');
  assert.equal(todayInTimezone('America/New_York', now), '2025-12-31');
  assert.equal(todayInTimezone('invalid', now), '2026-01-01');
});

test('calendar navigation crosses leap days and DST without skipping dates', () => {
  assert.equal(shiftDate('2024-03-01', -1), '2024-02-29');
  assert.equal(shiftDate('2026-03-08', 1), '2026-03-09');
  assert.equal(shiftDate('2026-01-01', -1), '2025-12-31');
});
import { formatCalendarDate } from './dates.js';

test('localized calendar dates preserve the day across browser timezones', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = zone;
      assert.equal(formatCalendarDate('2026-01-01', 'en', { year: 'numeric', month: 'numeric', day: 'numeric' }), '1/1/2026');
      assert.equal(formatCalendarDate('2024-02-29', 'vi', { year: 'numeric', month: 'numeric', day: 'numeric' }), '29/2/2024');
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
  assert.equal(formatCalendarDate('', 'en'), '');
  assert.equal(formatCalendarDate('invalid', 'en'), 'invalid');
});

test('shared calendar dates reject impossible, future and malformed input', () => {
  assert.equal(validCalendarDate('2024-02-29', '2026-10-12'), '2024-02-29');
  for (const value of ['2025-02-29', '2026-02-30', '2026-13-01', '2026-10-13', '2026-1-1', '', null, '2026-10-12T00:00:00Z'])
    assert.equal(validCalendarDate(value, '2026-10-12'), null);
});

import { calendarWeekStart } from './dates.js';
test('week boundaries use account calendar dates, including Sunday and new year', () => {
  assert.equal(calendarWeekStart('2026-10-18'), '2026-10-12');
  assert.equal(calendarWeekStart('2026-10-19'), '2026-10-19');
  assert.equal(calendarWeekStart('2026-01-01'), '2025-12-29');
  assert.throws(() => calendarWeekStart('2026-02-30'));
  const instant = new Date('2026-10-18T18:00:00Z');
  assert.equal(calendarWeekStart(todayInTimezone('Asia/Ho_Chi_Minh', instant)), '2026-10-19');
  assert.equal(calendarWeekStart(todayInTimezone('America/New_York', instant)), '2026-10-12');
});
