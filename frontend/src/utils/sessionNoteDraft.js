const key = (userId, sessionId) => {
  if (![userId, sessionId].every(id => Number.isSafeInteger(id) && id > 0)) throw new Error('Invalid draft owner');
  return `sf_pomodoro_note_v1:${userId}:${sessionId}`;
};
const validate = note => {
  if (typeof note !== 'string' || note.length > 255) throw new Error('Invalid note draft');
  return note;
};
export function readSessionNoteDraft(storage, userId, sessionId) {
  const raw = storage.getItem(key(userId, sessionId));
  if (raw === null) return null;
  const draft = JSON.parse(raw);
  if (draft?.version !== 1) throw new Error('Invalid draft version');
  return validate(draft.note);
}
export function writeSessionNoteDraft(storage, userId, sessionId, note) {
  const value = { version: 1, note: validate(note) };
  storage.setItem(key(userId, sessionId), JSON.stringify(value));
}
export function removeSessionNoteDraft(storage, userId, sessionId) {
  storage.removeItem(key(userId, sessionId));
}
