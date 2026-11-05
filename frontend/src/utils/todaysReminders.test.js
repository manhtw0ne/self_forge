import test from 'node:test';
import assert from 'node:assert/strict';
import { todaysReminders } from './todaysReminders.js';

const reminder = (id, changes = {}) => ({ id, habitId: 1, enabled: true, daysOfWeek: 'MON', reminderTime: '08:00:00', ...changes });
const habits = [{ habitId: 1, scheduledToday: true, todayStatus: null }];

test('only enabled reminders for unrecorded dashboard habits on this weekday remain', () => {
  const rows = [reminder(1), reminder(2, { enabled: false }), reminder(3, { habitId: 2 }),
    reminder(4, { habitId: 3 }), reminder(5, { habitId: 4 }), reminder(6, { habitId: 5 }), reminder(7, { daysOfWeek: 'TUE' })];
  const result = todaysReminders(rows, [...habits, { habitId: 2, scheduledToday: true, todayStatus: 'COMPLETED' },
    { habitId: 3, scheduledToday: true, todayStatus: 'SKIPPED' }, { habitId: 4, scheduledToday: true, todayStatus: 'FAILED' }], 'UTC', '2026-10-12', new Date('2026-10-12T09:00:00Z'));
  assert.deepEqual(result.items.map(r => r.id), [1]);
  assert.equal(result.stale, false);
});

test('account timezone controls weekday and due time across UTC midnight', () => {
  const rows = [reminder(3, { reminderTime: '00:02:00' }), reminder(2, { reminderTime: '00:01:00' }),
    reminder(1, { reminderTime: '00:00:00', daysOfWeek: 'SUN, MON' })];
  const result = todaysReminders(rows, habits, 'Asia/Ho_Chi_Minh', '2026-10-12', new Date('2026-10-11T17:01:00Z'));
  assert.deepEqual(result.items.map(r => [r.id, r.due]), [[1, true], [2, true], [3, false]]);
  assert.deepEqual(rows.map(r => r.id), [3, 2, 1]);
  const western = todaysReminders([reminder(4, { daysOfWeek: 'SUN' })], habits, 'America/Los_Angeles', '2026-10-11', new Date('2026-10-12T01:00:00Z'));
  assert.equal(western.items[0].due, true);
});

test('new local day hides reminders until dashboard check-in state is refreshed', () => {
  assert.deepEqual(todaysReminders([reminder(1)], habits, 'Asia/Ho_Chi_Minh', '2026-10-11', new Date('2026-10-11T17:00:00Z')), { stale: true, items: [] });
  assert.equal(todaysReminders([reminder(1)], habits, 'invalid-zone', '2026-10-12', new Date('2026-10-12T01:00:00Z')).items[0].due, true);
});

test('a habit on a scheduled rest day never appears even when its reminder weekday matches', () => {
  const result = todaysReminders([reminder(1)], [{ habitId: 1, scheduledToday: false, todayStatus: null }], 'UTC', '2026-10-12', new Date('2026-10-12T09:00:00Z'));
  assert.deepEqual(result, { stale: false, items: [] });
});
