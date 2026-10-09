import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayInTimezone, shiftDate } from './dates.js';

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
