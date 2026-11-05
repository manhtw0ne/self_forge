import {validCalendarDate} from './dates.js';
const key = userId => `sf_challenge_create:${userId}`;
function validate(value) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.requestId)
      || !Number.isSafeInteger(value.habitId) || value.habitId <= 0
      || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 255
      || typeof value.description !== 'string' || value.description.length > 255
      || !Number.isInteger(value.targetDays) || value.targetDays < 1 || value.targetDays > 365
      || value.startDate!=null&&!validCalendarDate(value.startDate)
      || value.windowDays!=null&&(!Number.isInteger(value.windowDays)||value.windowDays<value.targetDays||value.windowDays>365)) throw new Error('Invalid pending challenge');
  return {requestId:value.requestId,habitId:value.habitId,name:value.name,description:value.description,targetDays:value.targetDays,...(value.startDate!=null?{startDate:value.startDate}:{}),...(value.windowDays!=null?{windowDays:value.windowDays}:{})};
}
export function readPendingChallenge(storage, userId) {
  const raw = storage.getItem(key(userId));
  return raw === null ? null : validate(JSON.parse(raw));
}
export function challengePayload(form) {
  const habitId = Number(form.habitId);
  const targetDays = Number(form.targetDays);
  const name = form.name.trim();
  if (!Number.isSafeInteger(habitId) || habitId <= 0) throw new Error('Hãy chọn một thói quen.');
  if (!name || name.length > 255 || form.description.length > 255) throw new Error('Tên thử thách không được trống; tên và mô tả tối đa 255 ký tự.');
  if (!Number.isInteger(targetDays) || targetDays < 1 || targetDays > 365) throw new Error('Số ngày phải là số nguyên từ 1 đến 365.');
  if(form.startDate!=null&&!validCalendarDate(form.startDate))throw Error('Ngày thử thách không hợp lệ.');
  const windowDays=form.windowDays==null?null:Number(form.windowDays);if(windowDays!==null&&(!Number.isInteger(windowDays)||windowDays<targetDays||windowDays>365))throw Error('Khoảng thử thách phải từ số ngày cần hoàn thành đến 365 ngày.');
  return { habitId, targetDays, name, description: form.description,...(form.startDate!=null?{startDate:form.startDate}:{}),...(windowDays!==null?{windowDays}:{}) };
}
export function removePendingChallenge(storage, userId) { storage.removeItem(key(userId)); }
export async function createChallengeSafely(storage, userId, form, post, makeId = () => crypto.randomUUID()) {
  const payload = readPendingChallenge(storage, userId) ?? { ...form, requestId: makeId() };
  validate(payload);
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
