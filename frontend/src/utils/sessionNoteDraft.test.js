import test from 'node:test';
import assert from 'node:assert/strict';
import { readSessionNoteDraft, writeSessionNoteDraft, removeSessionNoteDraft } from './sessionNoteDraft.js';
const storage = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }; };
test('session note drafts survive remount, preserve cleared notes and stay isolated', () => {
  const store = storage();
  writeSessionNoteDraft(store, 1, 7, 'draft');
  assert.equal(readSessionNoteDraft(store, 1, 7), 'draft');
  assert.equal(readSessionNoteDraft(store, 2, 7), null);
  assert.equal(readSessionNoteDraft(store, 1, 8), null);
  writeSessionNoteDraft(store, 1, 7, '');
  assert.equal(readSessionNoteDraft(store, 1, 7), '');
  removeSessionNoteDraft(store, 1, 7);
  assert.equal(readSessionNoteDraft(store, 1, 7), null);
});
test('invalid new drafts cannot overwrite a recoverable copy and storage failures surface', () => {
  const store = storage(); writeSessionNoteDraft(store, 1, 7, 'recover');
  assert.throws(() => writeSessionNoteDraft(store, 1, 7, 'x'.repeat(256)));
  assert.equal(readSessionNoteDraft(store, 1, 7), 'recover');
  store.setItem('sf_pomodoro_note_v1:1:7', '{');
  assert.throws(() => readSessionNoteDraft(store, 1, 7));
  assert.throws(() => writeSessionNoteDraft({ setItem() { throw Error('full'); } }, 1, 7, 'draft'));
  assert.throws(() => readSessionNoteDraft(store, 0, 7));
});
