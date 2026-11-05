import test from 'node:test';
import assert from 'node:assert/strict';
import { pomodoroExport } from './pomodoroExport.js';
import { translate } from './language.js';
const session = { id: 42, durationMinutes: 25, completed: true, startedAt: '2026-10-13T00:05:00Z', endedAt: '2026-10-13T00:30:00Z', habitName: 'Đọc sách 📚', note: 'Đã đọc chương 1.\nNgày mai tiếp tục 😊' };
const t = (text, params) => translate('en', text, params);
test('saved session export preserves Unicode notes and uses the account-local date for its safe filename', () => {
  const original = structuredClone(session);
  const result = pomodoroExport(session, 'America/Los_Angeles', 'en', t);
  assert.equal(result.filename, 'selfforge-pomodoro-2026-10-12-42.txt');
  assert.ok(result.text.includes('America/Los_Angeles'));
  assert.ok(result.text.includes('Oct 12, 2026'));
  assert.ok(result.text.includes(session.note));
  assert.ok(result.text.includes(session.habitName));
  assert.ok(result.text.includes('Planned duration\n25 minutes'));
  assert.ok(result.text.includes('Saved note\n' + session.note));
  assert.deepEqual(session, original);
});
test('incomplete session does not invent an end time or completed status', () => {
  const result = pomodoroExport({ ...session, completed: false, endedAt: null, note: null, habitName: null }, 'UTC', 'en', t);
  assert.ok(result.text.includes('Incomplete'));
  assert.ok(result.text.includes('Ended at\nNo time data available'));
  assert.ok(result.text.includes('Unlinked session'));
  assert.equal(result.filename, 'selfforge-pomodoro-2026-10-13-42.txt');
});
test('export rejects invalid identifiers and timestamps before creating a download', () => {
  for (const changes of [{ id: '../private' }, { id: 0 }, { startedAt: 'invalid' }, { startedAt: null }, { endedAt: 'invalid' }, { durationMinutes: 0 }]) {
    assert.throws(() => pomodoroExport({ ...session, ...changes }, 'UTC', 'en', t));
  }
});
