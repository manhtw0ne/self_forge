import test from 'node:test';
import assert from 'node:assert/strict';
import { readReviewDraft, writeReviewDraft, removeReviewDraft } from './reviewDraft.js';
const storage = () => { const values = new Map(); return { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) }; };
const form = { wins: 'A good week', improvements: '', nextWeekPlan: 'Read', rating: 4 };
test('review drafts survive reload and stay isolated by account and week', () => {
  const s = storage();
  writeReviewDraft(s, 1, '2026-10-05', form);
  assert.deepEqual(readReviewDraft(s, 1, '2026-10-05'), form);
  assert.equal(readReviewDraft(s, 2, '2026-10-05'), null);
  assert.equal(readReviewDraft(s, 1, '2026-10-12'), null);
  removeReviewDraft(s, 1, '2026-10-05');
  assert.equal(readReviewDraft(s, 1, '2026-10-05'), null);
});
test('invalid or oversized drafts cannot overwrite the recoverable copy', () => {
  const s = storage();
  writeReviewDraft(s, 1, '2026-10-05', form);
  for (const invalid of [{ ...form, wins: 'x'.repeat(2001) }, { ...form, rating: 6 }, { ...form, rating: 2.5 }]) {
    assert.throws(() => writeReviewDraft(s, 1, '2026-10-05', invalid));
  }
  assert.deepEqual(readReviewDraft(s, 1, '2026-10-05'), form);
  s.setItem('sf_review_draft:1:2026-10-05', '{broken');
  assert.throws(() => readReviewDraft(s, 1, '2026-10-05'));
  assert.throws(() => writeReviewDraft({ setItem: () => { throw Error('quota'); } }, 1, '2026-10-05', form));
});
