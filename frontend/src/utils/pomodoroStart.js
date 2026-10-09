const key = userId => `sf_pomodoro_start:${userId}`;
export class InvalidPendingStart extends Error {}
export function readPendingStart(storage, userId) {
  const raw = storage.getItem(key(userId));
  if (raw === null) return null;
  let payload;
  try { payload = JSON.parse(raw); } catch { throw new InvalidPendingStart('Invalid pending request'); }
  if (!payload || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.requestId)
      || payload.durationMinutes !== 25
      || (payload.habitId !== null && (!Number.isSafeInteger(payload.habitId) || payload.habitId <= 0))) {
    throw new InvalidPendingStart('Invalid pending request');
  }
  return { requestId: payload.requestId, habitId: payload.habitId, durationMinutes: payload.durationMinutes };
}
export function removePendingStart(storage, userId) { storage.removeItem(key(userId)); }
export async function requestPomodoroStart(storage, userId, habitId, post, makeId = () => crypto.randomUUID()) {
  const payload = readPendingStart(storage, userId) ?? { requestId: makeId(), habitId, durationMinutes: 25 };
  storage.setItem(key(userId), JSON.stringify(payload));
  try {
    return await post(payload);
  } catch (error) {
    // Conflict may refer to an existing session: retain its identity for explicit resolution.
    if ([400, 404, 422].includes(error.response?.status)) removePendingStart(storage, userId);
    throw error;
  }
}
