const prefix = (userId) => {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('Chưa xác định được tài khoản.');
  return `sf_goal_progress_v1:${userId}:`;
};
const valid = (entry) => entry && Number.isSafeInteger(entry.goalId) && entry.goalId > 0
  && Number.isInteger(entry.amount) && entry.amount > 0 && entry.amount <= 2147483647
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.requestId);

export function readPendingProgress(storage, userId) {
  const scope = prefix(userId);
  const entries = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(scope)) continue;
    const entry = JSON.parse(storage.getItem(key));
    if (!valid(entry) || key !== scope + entry.requestId) {
      throw new Error('Dữ liệu tiến độ chờ xác nhận không hợp lệ. Chưa gửi thao tác mới.');
    }
    entries.push(entry);
  }
  return entries;
}

export function savePendingProgress(storage, userId, entry) {
  if (!valid(entry)) throw new Error('Tiến độ không hợp lệ.');
  const key = prefix(userId) + entry.requestId;
  const existing = storage.getItem(key);
  if (existing !== null) {
    const prior = JSON.parse(existing);
    if (!valid(prior) || prior.goalId !== entry.goalId || prior.amount !== entry.amount || prior.requestId !== entry.requestId) {
      throw new Error('Không thể thay đổi thao tác đang chờ xác nhận.');
    }
  }
  storage.setItem(key, JSON.stringify(entry));
}

export function removePendingProgress(storage, userId, requestId) {
  storage.removeItem(prefix(userId) + requestId);
}

export function isDefinitiveProgressRejection(status) {
  return [400, 404, 409, 422].includes(status);
}
export async function confirmGoalProgress(post, cleanup) {
  const response = await post();
  try { await cleanup(); return { response, cleanupFailed: false }; }
  catch { return { response, cleanupFailed: true }; }
}
