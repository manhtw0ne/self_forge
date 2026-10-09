// Per-tab, per-account state. Server remains the authority for completion and XP.
const durations = [1500, 300, 900];
const key = userId => `sf_pomodoro_v1:${userId}`;
export function readTimer(storage, userId, now = Date.now()) {
  const raw = storage.getItem(key(userId));
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (value.version !== 1 || !Number.isInteger(value.mode) || !durations[value.mode]
      || !Number.isInteger(value.secondsLeft) || value.secondsLeft < 0 || value.secondsLeft > durations[value.mode]
      || typeof value.running !== 'boolean' || typeof value.selectedHabit !== 'string'
      || (value.sessionId !== null && (!Number.isSafeInteger(value.sessionId) || value.sessionId <= 0))
      || (value.mode !== 0 && value.sessionId !== null)
      || (value.running && (!Number.isFinite(value.deadline) || value.deadline <= 0))
      || (value.running && value.mode === 0 && value.sessionId === null)) {
    throw new Error('Invalid timer state');
  }
  const remaining = value.running ? Math.min(durations[value.mode], Math.max(0, Math.ceil((value.deadline - now) / 1000))) : value.secondsLeft;
  // Expired sessions require explicit confirmation after restoring; never award XP locally.
  return { ...value, secondsLeft: remaining, running: value.running && remaining > 0 };
}
export function writeTimer(storage, userId, value) {
  storage.setItem(key(userId), JSON.stringify({ ...value, version: 1 }));
}
