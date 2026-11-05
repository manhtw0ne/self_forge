import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAccountDrafts } from './accountDraftCleanup.js';
test('deleted account draft cleanup preserves other accounts, token and preferences', () => {
  const keys = ['sf_journal_draft:1:2026-10-12', 'sf_journal_coach:1:2026-10-12', 'sf_review_draft:1:2026-10-12', 'sf_goal_progress_v1:1:uuid',
    'sf_pomodoro_note_v1:1:8', 'sf_challenge_create:1', 'sf_habit_batch:1', 'sf_pomodoro_start:1', 'sf_pomodoro_v1:1',
    'sf_restart_coach:1', 'sf_journal_draft:10:2026-10-12', 'sf_pomodoro_v1:10', 'sf_restart_coach:10', 'sf_token', 'sf_language', 'sf_theme'];
  const data = new Map(keys.map(k => [k, 'value']));
  const storage = { get length() { return data.size; }, key: i => [...data.keys()][i], removeItem: k => data.delete(k) };
  clearAccountDrafts(storage, 1);
  assert.deepEqual([...data.keys()], keys.slice(10));
});
test('blocked draft cleanup reports failure and invalid owners cannot clear anything', () => {
  const storage = { get length() { throw Error('blocked'); } };
  assert.throws(() => clearAccountDrafts(storage, 1));
  assert.throws(() => clearAccountDrafts(storage, 0));
});

test('reminder retries are removed for the deleted owner only', () => {
  const data = new Map([['sf_reminder_create:1', 'private'], ['sf_reminder_create:10', 'other']]);
  const storage = { get length() { return data.size; }, key: i => [...data.keys()][i], removeItem: k => data.delete(k) };
  clearAccountDrafts(storage, 1);
  assert.deepEqual([...data.keys()], ['sf_reminder_create:10']);
});

test('weekly plans for one owner are removed without touching similarly numbered accounts', () => {
  const data = new Map([['sf_week_plan:1:2026-10-19','private'],['sf_week_plan:10:2026-10-19','other']]);
  const storage = { get length() { return data.size; }, key: i => [...data.keys()][i], removeItem: k => data.delete(k) };
  clearAccountDrafts(storage,1);
  assert.deepEqual([...data.keys()],['sf_week_plan:10:2026-10-19']);
});
