import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nativeReminderIds,
  nativeReminderNotifications,
  nativeReminderTarget,
  nativeReminderStorageKeys,
  nativeRemindersEnabled,
  saveNativeReminderIds,
  setNativeRemindersEnabled,
} from './nativeReminders.js';

function memory() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}

const reminder = {
  id: 17, habitId: 4, enabled: true, habitActive: true, habitName: 'Read', reminderTime: '07:30:15',
  daysOfWeek: 'MON,WED', habitScheduledDays: 'MON,WED', message: '',
};

test('native reminders create one deterministic, device-safe schedule per enabled weekday', () => {
  const first = nativeReminderNotifications([reminder], 'en');
  const second = nativeReminderNotifications([reminder], 'en');
  assert.deepEqual(first, second);
  assert.equal(first.notifications.length, 2);
  assert.deepEqual(first.notifications.map(item => item.schedule.on), [
    { weekday: 2, hour: 7, minute: 30, second: 15 },
    { weekday: 4, hour: 7, minute: 30, second: 15 },
  ]);
  assert.ok(first.notifications.every(item => item.id > 0 && item.id <= 2147483646));
  assert.equal(first.notifications[0].body, 'Time for Read.');
  assert.deepEqual(first.notifications[0].extra, { source: 'self-forge-reminder', reminderId: '17', habitId: '4', path: '/' });
});

test('native reminders omit disabled and archived habits, but reject malformed active data', () => {
  assert.deepEqual(nativeReminderNotifications([{ ...reminder, enabled: false }, { ...reminder, id: 18, habitActive: false }]), { notifications: [], ids: [] });
  assert.throws(() => nativeReminderNotifications([{ ...reminder, daysOfWeek: 'MON,MON' }]));
  assert.throws(() => nativeReminderNotifications([{ ...reminder, reminderTime: '25:00' }]));
  assert.throws(() => nativeReminderNotifications([{ ...reminder, id: 0 }]));
  assert.throws(() => nativeReminderNotifications([{ ...reminder, habitScheduledDays: 'MON,MON' }]));
});

test('native schedules use the overlap of reminder and habit weekdays', () => {
  const result = nativeReminderNotifications([{ ...reminder, daysOfWeek: 'MON,WED,FRI', habitScheduledDays: 'MON,FRI' }], 'en');
  assert.deepEqual(result.notifications.map(item => item.schedule.on.weekday), [2, 6]);
  assert.deepEqual(nativeReminderNotifications([{ ...reminder, daysOfWeek: 'WED', habitScheduledDays: 'MON' }]), { notifications: [], ids: [] });
});

test('native reminder preference isolates identifiers by account and clears them when disabled', () => {
  const store = memory();
  assert.deepEqual(nativeReminderStorageKeys(7), { enabled: 'sf_native_reminders:7:enabled', ids: 'sf_native_reminders:7:ids' });
  setNativeRemindersEnabled(store, 7, true);
  saveNativeReminderIds(store, 7, [12, 42]);
  assert.equal(nativeRemindersEnabled(store, 7), true);
  assert.deepEqual(nativeReminderIds(store, 7), [12, 42]);
  assert.deepEqual(nativeReminderIds(store, 8), []);
  setNativeRemindersEnabled(store, 7, false);
  assert.equal(nativeRemindersEnabled(store, 7), false);
  assert.deepEqual(nativeReminderIds(store, 7), []);
});

test('notification actions only target a verified, safe habit identity', () => {
  assert.equal(nativeReminderTarget({ source: 'self-forge-reminder', path: '/', habitId: '44' }), '/?habit=44');
  for (const value of [null, {}, { source: 'other', path: '/', habitId: '4' }, { source: 'self-forge-reminder', path: '/reminders', habitId: '4' }, { source: 'self-forge-reminder', path: '/', habitId: '0' }, { source: 'self-forge-reminder', path: '/', habitId: '9007199254740992' }]) {
    assert.equal(nativeReminderTarget(value), null);
  }
});
