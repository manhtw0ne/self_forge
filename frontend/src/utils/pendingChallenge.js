const key = userId => `sf_challenge_create:${userId}`;
export function readPendingChallenge(storage, userId) {
  const raw = storage.getItem(key(userId));
  if (raw === null) return null;
  const value = JSON.parse(raw);
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.requestId)
      || !Number.isSafeInteger(value.habitId) || value.habitId <= 0
      || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 255
      || typeof value.description !== 'string' || value.description.length > 255
      || !Number.isInteger(value.targetDays) || value.targetDays < 1 || value.targetDays > 365) throw new Error('Invalid pending challenge');
  return value;
}
export function removePendingChallenge(storage, userId) { storage.removeItem(key(userId)); }
export async function createChallengeSafely(storage, userId, form, post, makeId = () => crypto.randomUUID()) {
  const payload = readPendingChallenge(storage, userId) ?? { ...form, requestId: makeId() };
  storage.setItem(key(userId), JSON.stringify(payload));
  // Validate before any network activity, including newly entered data.
  readPendingChallenge(storage, userId);
  let result;
  try { result = await post(payload); }
  catch (error) {
    if ([400,404,422].includes(error.response?.status)) removePendingChallenge(storage, userId);
    throw error;
  }
  removePendingChallenge(storage, userId);
  return result;
}
