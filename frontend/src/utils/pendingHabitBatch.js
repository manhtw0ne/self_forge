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

function validateHabits(habits) {
  if (!Array.isArray(habits) || habits.length < 1 || habits.length > 10 || habits.some(h =>
      !h || typeof h.name !== 'string' || !h.name.trim() || h.name.length > 255 ||
      ['description', 'tags'].some(field => h[field] != null && (typeof h[field] !== 'string' || h[field].length > 255)) ||
      (h.difficulty != null && !['EASY', 'MEDIUM', 'HARD'].includes(h.difficulty)) ||
      (h.targetPerWeek != null && (!Number.isInteger(h.targetPerWeek) || h.targetPerWeek < 1 || h.targetPerWeek > 7)) ||
      (h.categoryId != null && (!Number.isSafeInteger(h.categoryId) || h.categoryId <= 0)) ||
      (h.points != null && (!Number.isInteger(h.points) || h.points < 1)))) throw new Error('Dữ liệu thói quen chưa hợp lệ. Kiểm tra tên, mô tả, độ khó và mục tiêu tuần.');
}
export async function submitHabitBatch(storage, userId, habits, post, makeId = () => crypto.randomUUID()) {
  const payload = readHabitBatch(storage, userId) ?? { requestId: makeId(), habits };
  validateHabits(payload.habits);
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(payload.requestId)) throw new Error('Invalid habit request ID');
  saveHabitBatch(storage, userId, payload);
  let response;
  try { response = await post(payload); }
  catch (error) {
    if ([400, 404, 422].includes(error.response?.status)) { try { clearHabitBatch(storage, userId); } catch { /* Preserve original server error. */ } }
    throw error;
  }
  try { clearHabitBatch(storage, userId); return { response, pending: null }; }
  catch { return { response, pending: payload }; }
}

export function habitCreationError(error) {
  const validation = 'Dữ liệu thói quen chưa hợp lệ. Kiểm tra tên, mô tả, độ khó và mục tiêu tuần.';
  return error.response?.data?.detail || (error.message === validation ? validation : 'Chưa xác nhận được kết quả. Hãy kiểm tra danh sách trước khi tạo lại.');
}
