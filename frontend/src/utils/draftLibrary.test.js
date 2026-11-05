import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listAccountDrafts } from './draftLibrary.js';
const journal = win => JSON.stringify({ version: 1, form: { win, obstacle: '', lesson: '', tomorrowFocus: '' } });
const review = wins => JSON.stringify({ version: 1, form: { wins, improvements: '', nextWeekPlan: '', rating: 3 } });
function storage(entries) { const data = new Map(entries); return { data, get length() { return data.size; }, key: i => [...data.keys()][i], getItem: k => data.get(k) ?? null }; }
test('draft library isolates exact owner, sorts dates and preserves invalid data', () => {
  const state = storage([
    ['sf_journal_draft:1:2026-10-10', journal('Older')],
    ['sf_journal_draft:1:2026-10-12', journal('Newest')],
    ['sf_journal_draft:10:2026-10-12', journal('Other account')],
    ['sf_review_draft:1:2026-10-12', review('Other kind')],
    ['sf_journal_draft:1:2026-02-30', journal('Invalid date')],
    ['sf_journal_draft:1:2026-10-11', '{bad JSON'],
    ['sf_journal_draft:1:2026-10-14', journal('Future')],
  ]);
  const result = listAccountDrafts(state, 1, 'journal', '2026-10-13');
  assert.deepEqual(result.drafts.map(item => item.form.win), ['Newest', 'Older']);
  assert.equal(result.invalidCount, 3);
  assert.equal(state.data.size, 7);
});
test('review library accepts real week starts and reports corrupt or inaccessible storage', () => {
  const state = storage([
    ['sf_review_draft:1:2026-10-12', review('Current')],
    ['sf_review_draft:1:2026-10-05', review('Previous')],
    ['sf_review_draft:1:2026-10-06', review('Wrong weekday')],
    ['sf_review_draft:1:2026-09-28', JSON.stringify({ version: 1, form: { rating: 9 } })],
  ]);
  const result = listAccountDrafts(state, 1, 'review', '2026-10-13');
  assert.deepEqual(result.drafts.map(item => item.date), ['2026-10-12', '2026-10-05']);
  assert.equal(result.invalidCount, 2);
  assert.throws(() => listAccountDrafts({ get length() { throw Error('blocked'); } }, 1, 'journal'));
  assert.throws(() => listAccountDrafts(state, '1:10', 'journal'));
  assert.throws(() => listAccountDrafts(state, 1, 'password'));
});

import { draftText } from './draftLibrary.js';
test('text export preserves long Unicode content and does not imply server save', () => {
  const text = 'Đọc sách 🌱\n'.repeat(500);
  const output = draftText('journal', '2026-10-13', { win: text, obstacle: '', lesson: '', tomorrowFocus: '' }, 'vi', value => value);
  assert.ok(output.includes(text));
  assert.ok(output.includes('Bản sao nội dung trên trình duyệt'));
  assert.throws(() => draftText('password', '2026-10-13', {}, 'vi', value => value));
  assert.throws(() => draftText('journal', '2026-02-30', {}, 'vi', value => value));
});
