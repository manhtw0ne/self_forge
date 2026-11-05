const fields = ['wins', 'improvements', 'nextWeekPlan'];
const key = (user, week) => {
  if (!user || !/^\d{4}-\d{2}-\d{2}$/.test(week)) throw Error('Invalid draft owner or week');
  return 'sf_review_draft:' + user + ':' + week;
};
function validate(form) {
  if (!form || !fields.every(f => typeof form[f] === 'string' && form[f].length <= 2000)
      || !Number.isInteger(form.rating) || form.rating < 1 || form.rating > 5) throw Error('Invalid review draft');
  return Object.fromEntries([...fields, 'rating'].map(f => [f, form[f]]));
}
export function readReviewDraft(storage, user, week) {
  const raw = storage.getItem(key(user, week));
  if (raw === null) return null;
  const draft = JSON.parse(raw);
  if (draft.version !== 1) throw Error('Invalid review draft version');
  return validate(draft.form);
}
export function writeReviewDraft(storage, user, week, form) {
  storage.setItem(key(user, week), JSON.stringify({ version: 1, form: validate(form) }));
}
export function removeReviewDraft(storage, user, week) { storage.removeItem(key(user, week)); }
