import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reminderCalendar } from './reminderCalendar.js';
const reminder = { id: 12, enabled: true, habitName: 'Read', message: '', daysOfWeek: 'MON,TUE,WED,THU,FRI,SAT,SUN', habitScheduledDays: 'MON,TUE,WED,THU,FRI,SAT,SUN', reminderTime: '07:00:00' };
const unfold = text => text.replace(/\r\n /g, '');
test('exports only future enabled reminders on selected weekdays in account timezone', () => {
  const result = reminderCalendar([{ ...reminder, daysOfWeek: 'TUE' }, { ...reminder, id: 13, enabled: false }], 'Asia/Ho_Chi_Minh', new Date('2026-10-12T23:00:00Z'));
  assert.equal(result.count, 13);
  assert.match(result.content, /DTSTART:20261013T000000Z/);
  assert.doesNotMatch(result.content, /UID:13-/);
  assert.match(result.content, /TRIGGER:PT0S/);
  assert.equal(reminderCalendar([reminder], 'Asia/Ho_Chi_Minh', new Date('2026-10-13T01:00:00Z')).count, 89);
});
test('UTC occurrences preserve wall-clock time across daylight saving transitions', () => {
  const result = reminderCalendar([reminder], 'America/New_York', new Date('2026-03-07T00:00:00Z'));
  assert.match(result.content, /DTSTART:20260307T120000Z/);
  assert.match(result.content, /DTSTART:20260308T110000Z/);
  const gap = reminderCalendar([{ ...reminder, reminderTime: '02:30' }], 'America/New_York', new Date('2026-03-07T12:00:00Z'));
  assert.doesNotMatch(gap.content, /UID:12-2026-03-08-/);
  const repeated = reminderCalendar([{ ...reminder, reminderTime: '01:30' }], 'America/New_York', new Date('2026-10-31T12:00:00Z'));
  assert.equal((repeated.content.match(/UID:12-2026-11-01-/g) || []).length, 1);
  assert.match(repeated.content, /DTSTART:20261101T053000Z/);
});
test('escapes calendar injection and folds UTF-8 without splitting characters', () => {
  const result = reminderCalendar([{ ...reminder, habitName: 'Thói quen 🌱'.repeat(20), message: 'hello,world;\nEND:VEVENT\nBEGIN:VEVENT' }], 'UTC', new Date('2026-10-13T00:00:00Z'));
  assert.equal((result.content.match(/^BEGIN:VEVENT$/gm) || []).length, result.count);
  assert.ok(unfold(result.content).includes('DESCRIPTION:hello\\,world\\;\\nEND:VEVENT\\nBEGIN:VEVENT'));
  for (const line of result.content.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.ok(!result.content.includes('�'));
});
test('rejects invalid timezone or reminder time rather than exporting misleading events', () => {
  assert.throws(() => reminderCalendar([reminder], 'bad timezone'));
  assert.throws(() => reminderCalendar([{ ...reminder, reminderTime: '25:00' }], 'UTC'));
});

test('preserves stored seconds and handles fractional-hour timezone offsets', () => {
  const result = reminderCalendar([{ ...reminder, reminderTime: '07:00:30' }], 'Asia/Kathmandu', new Date('2026-10-13T00:00:00Z'));
  assert.match(result.content, /DTSTART:20261013T011530Z/);
});

test('inactive habits retain schedules but produce no exported occurrences', () => {
  assert.equal(reminderCalendar([{ ...reminder, habitActive: false }], 'UTC', new Date('2026-10-13T00:00:00Z')).count, 0);
});

test('calendar export omits reminder weekdays that are habit rest days', () => {
  const result = reminderCalendar([{ ...reminder, daysOfWeek: 'MON,WED', habitScheduledDays: 'MON' }], 'UTC', new Date('2026-10-12T00:00:00Z'));
  assert.equal(result.count, 13);
  assert.doesNotMatch(result.content, /UID:12-2026-10-14-/);
  assert.throws(() => reminderCalendar([{ ...reminder, habitScheduledDays: 'MON,MON' }], 'UTC'));
});
