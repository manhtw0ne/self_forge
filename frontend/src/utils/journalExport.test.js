import test from 'node:test';
import assert from 'node:assert/strict';
import { journalExport } from './journalExport.js';
import { translate } from './language.js';
test('saved journal copy preserves every field, Unicode and its calendar date without modifying server data', () => {
  const entry = { id: 7, date: '2026-10-12', win: 'Đọc sách 🌱\n'.repeat(300), obstacle: 'Mệt', lesson: 'Bắt đầu nhỏ', tomorrowFocus: '5 phút', token: 'DO_NOT_EXPORT' };
  const before = structuredClone(entry);
  const result = journalExport(entry, 'en', (text, params) => translate('en', text, params));
  assert.equal(result.filename, 'selfforge-journal-2026-10-12.txt');
  for (const field of ['win', 'obstacle', 'lesson', 'tomorrowFocus']) assert.ok(result.text.includes(entry[field]));
  assert.ok(result.text.includes('Saved journal copy'));
  assert.ok(result.text.includes('excluding unsaved changes'));
  assert.ok(!result.text.includes('DO_NOT_EXPORT'));
  assert.deepEqual(entry, before);
});
test('saved export handles empty fields and refuses malformed date, identifiers or content', () => {
  assert.ok(journalExport({ id: 1, date: '2026-10-12', win: null }, 'vi', text => text).text.includes('Chiến thắng hôm nay'));
  for (const entry of [null, { id: 0, date: '2026-10-12' }, { id: 1, date: '2026-02-30' }, { id: '../secret', date: '2026-10-12' }, { id: 1, date: '2026-10-12', win: {} }]) assert.throws(() => journalExport(entry, 'vi', text => text));
});
