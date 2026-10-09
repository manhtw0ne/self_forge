const key = userId => 'sf_habit_batch:' + userId;
export function readHabitBatch(storage, userId) {
  const raw = storage.getItem(key(userId));
  if (raw === null) return null;
  const value = JSON.parse(raw);
  if (!value || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.requestId)
      || !Array.isArray(value.habits) || value.habits.length < 1 || value.habits.length > 10
      || value.habits.some(h => !h || typeof h.name !== 'string' || !h.name.trim())) throw new Error('Invalid habit batch');
  return value;
}
export function saveHabitBatch(storage, userId, payload) { storage.setItem(key(userId), JSON.stringify(payload)); }
export function clearHabitBatch(storage, userId) { storage.removeItem(key(userId)); }
