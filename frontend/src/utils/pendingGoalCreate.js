import { validCalendarDate } from './dates.js';
import { readRequestId } from './requestId.js';
const key = userId => {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw Error('Invalid goal owner');
  return 'sf_goal_create:' + userId;
};
export function readGoalCreation(storage, userId) {
  const raw = storage.getItem(key(userId));
  if (raw === null) return null;
  const value = JSON.parse(raw), p = value?.payload;
  if (!p || typeof p.name !== 'string' || !p.name.trim() || !Number.isInteger(p.targetValue) || p.targetValue < 1 || p.targetValue > 2147483647 ||
      ['description', 'unit'].some(field => p[field] != null && typeof p[field] !== 'string') ||
      (p.deadline != null && !validCalendarDate(p.deadline)) ||
      (p.requestId != null && !readRequestId(String(p.requestId).toLowerCase()))) throw Error('Invalid pending goal');
  return value;
}
export function clearGoalCreation(storage, userId) { storage.removeItem(key(userId)); }
function pendingPayload(payload, makeId) {
  const requestId = makeId();
  if (!readRequestId(requestId)) throw Error('Invalid goal request ID');
  return { ...payload, requestId };
}
function clearAfterDefinitiveRejection(storage, userId, error) {
  if ([400, 403, 404, 409, 422].includes(error.response?.status)) {
    try { clearGoalCreation(storage, userId); } catch { /* Keep original error. */ }
  }
}
export async function createGoalSafely(storage, userId, payload, post, makeId = () => crypto.randomUUID()) {
  if (readGoalCreation(storage, userId)) throw Error('Kiểm tra yêu cầu tạo mục tiêu đang chờ trước khi tạo mới.');
  const pending = { payload: pendingPayload(payload, makeId) };
  try { storage.setItem(key(userId), JSON.stringify(pending)); }
  catch { throw Error('Chưa lưu được yêu cầu trên tab. Mục tiêu chưa được gửi.'); }
  let response;
  try { response = await post(pending.payload); }
  catch (error) {
    clearAfterDefinitiveRejection(storage, userId, error);
    throw error;
  }
  try { clearGoalCreation(storage, userId); return { response, pending: null }; }
  catch { return { response, pending: { ...pending, confirmed: true } }; }
}

// Legacy requests from before request IDs remain review-only. New requests can be retried safely.
export async function retryGoalCreation(storage, userId, post) {
  const pending = readGoalCreation(storage, userId);
  if (!pending?.payload?.requestId || pending.confirmed) throw Error('Yêu cầu tạo mục tiêu này không thể gửi lại an toàn.');
  let response;
  try { response = await post(pending.payload); }
  catch (error) {
    clearAfterDefinitiveRejection(storage, userId, error);
    throw error;
  }
  try { clearGoalCreation(storage, userId); return { response, pending: null }; }
  catch { return { response, pending: { ...pending, confirmed: true } }; }
}

// Matches are review suggestions, never proof that an unconfirmed request succeeded.
export function matchingGoalCreations(goals, pending) {
  const payload = pending?.payload;
  if (!payload) return [];
  const text = value => value ?? '';
  return goals.filter(goal => goal.name?.trim() === payload.name.trim() &&
    goal.targetValue === payload.targetValue && text(goal.description) === text(payload.description) &&
    text(goal.unit) === text(payload.unit) && text(goal.deadline) === text(payload.deadline));
}
