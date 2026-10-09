const fields = ['win', 'obstacle', 'lesson', 'tomorrowFocus'];
const key = (userId, date) => `sf_journal_draft:${userId}:${date}`;
export function readJournalDraft(storage, userId, date) {
  const raw = storage.getItem(key(userId, date));
  if (raw === null) return null;
  const draft = JSON.parse(raw);
  if (draft?.version !== 1 || !fields.every(f => typeof draft.form?.[f] === 'string')) throw Error('Invalid journal draft');
  return Object.fromEntries(fields.map(f => [f, draft.form[f]]));
}
export function writeJournalDraft(storage, userId, date, form) {
  if (!fields.every(f => typeof form[f] === 'string')) throw Error('Invalid journal draft');
  storage.setItem(key(userId, date), JSON.stringify({ version: 1, form: Object.fromEntries(fields.map(f => [f, form[f]])) }));
}
export function removeJournalDraft(storage, userId, date) { storage.removeItem(key(userId, date)); }
