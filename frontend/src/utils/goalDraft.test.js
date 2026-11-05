import test from 'node:test';
import assert from 'node:assert/strict';
import { readGoalDraft, writeGoalDraft, removeGoalDraft } from './goalDraft.js';
import { clearAccountDrafts } from './accountDraftCleanup.js';
const fixture = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k), get length() { return data.size; }, key: i => [...data.keys()][i] }; };
test('goal drafts preserve incomplete input and Unicode separately for each account', () => {
  const storage = fixture(), form = { name: 'Đọc sách 📚', description: 'Ngày mai\nBắt đầu nhỏ', targetValue: '', unit: 'cuốn', deadline: '' };
  writeGoalDraft(storage, 1, form);
  assert.deepEqual(readGoalDraft(storage, 1), form);
  assert.equal(readGoalDraft(storage, 10), null);
  writeGoalDraft(storage, 10, { ...form, targetValue: 12 });
  clearAccountDrafts(storage, 1);
  assert.equal(readGoalDraft(storage, 1), null);
  assert.equal(readGoalDraft(storage, 10).targetValue, '12');
  removeGoalDraft(storage, 10); assert.equal(readGoalDraft(storage, 10), null);
});
test('corrupt drafts and blocked storage report failure rather than silently dropping input', () => {
  assert.throws(() => readGoalDraft({ getItem: () => '{bad' }, 1));
  assert.throws(() => readGoalDraft({ getItem: () => '{"version":1,"form":{}}' }, 1));
  assert.throws(() => readGoalDraft({ getItem: () => null }, '1:10'));
  assert.throws(() => writeGoalDraft({ setItem: () => { throw Error('blocked'); } }, 1, { name: '', description: '', targetValue: '', unit: '', deadline: '' }));
});

import { goalDraftExport } from './goalDraft.js';
import { translate } from './language.js';
test('goal draft download preserves invalid intermediate input and Unicode without implying a server save', () => {
  const form = { name: 'Đọc sách 📚', description: 'Mục tiêu nhỏ\n'.repeat(300), targetValue: '1.5', unit: 'cuốn', deadline: '' };
  const before = structuredClone(form);
  const result = goalDraftExport(form, 'America/Los_Angeles', (text, params) => translate('en', text, params), new Date('2026-10-13T00:00:00Z'));
  assert.equal(result.filename, 'selfforge-new-goal-draft-2026-10-12.txt');
  assert.ok(result.text.includes('not confirmed saved on the server'));
  for (const field of ['name', 'description', 'targetValue', 'unit']) assert.ok(result.text.includes(form[field]));
  assert.deepEqual(form, before);
  assert.throws(() => goalDraftExport({ ...form, description: {} }, 'UTC', text => text));
});

import { readGoalEditDraft, writeGoalEditDraft, removeGoalEditDraft } from './goalDraft.js';
const editBase = { id: 7, name: 'Read', description: '', targetValue: 12, currentValue: 0, unit: 'books', deadline: null, status: 'ACTIVE' };
const editForm = { name: 'Đọc sách 📚', description: 'Keep my edit', targetValue: '20', unit: 'books', deadline: '' };
test('restored edit drafts keep the original server snapshot when progress later changes', () => {
  const storage = fixture(), base = { ...editBase };
  writeGoalEditDraft(storage, 1, base, editForm);
  base.currentValue = 4; base.name = 'New name elsewhere';
  const restored = readGoalEditDraft(storage, 1, 7);
  assert.deepEqual(restored.form, editForm);
  assert.equal(restored.expected.currentValue, 0);
  assert.equal(restored.expected.name, 'Read');
  assert.equal(readGoalEditDraft(storage, 1, 8), null);
  assert.equal(readGoalEditDraft(storage, 10, 7), null);
});
test('edit draft cleanup isolates accounts and altered goal identifiers cannot be restored', () => {
  const storage = fixture();
  writeGoalEditDraft(storage, 1, editBase, editForm);
  writeGoalEditDraft(storage, 10, editBase, editForm);
  const altered = JSON.parse(storage.getItem('sf_goal_edit_form:1:7')); altered.expected.id = 8;
  storage.setItem('sf_goal_edit_form:1:7', JSON.stringify(altered));
  assert.throws(() => readGoalEditDraft(storage, 1, 7));
  clearAccountDrafts(storage, 1);
  assert.equal(readGoalEditDraft(storage, 1, 7), null);
  assert.deepEqual(readGoalEditDraft(storage, 10, 7).form, editForm);
  removeGoalEditDraft(storage, 10, 7);
  assert.equal(readGoalEditDraft(storage, 10, 7), null);
});
test('editing draft exports do not describe the file as a new goal or a confirmed save', () => {
  const result = goalDraftExport(editForm, 'UTC', text => text, new Date('2026-10-13T00:00:00Z'), true);
  assert.equal(result.filename, 'selfforge-goal-edit-draft-2026-10-13.txt');
  assert.ok(result.text.includes('Bản nháp sửa mục tiêu'));
  assert.ok(result.text.includes(editForm.description));
});
