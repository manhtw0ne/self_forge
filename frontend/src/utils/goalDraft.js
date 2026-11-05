import { goalSnapshot } from './goalForm.js';
import { validCalendarDate, todayInTimezone } from './dates.js';
const fields = ['name', 'description', 'targetValue', 'unit', 'deadline'];
const key = userId => {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw Error('Invalid goal draft owner');
  return 'sf_goal_form:' + userId;
};
export function readGoalDraft(storage, userId) {
  const raw = storage.getItem(key(userId));
  if (raw === null) return null;
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !fields.every(field => typeof value.form?.[field] === 'string')) throw Error('Invalid goal draft');
  return Object.fromEntries(fields.map(field => [field, value.form[field]]));
}
export function writeGoalDraft(storage, userId, form) {
  const value = Object.fromEntries(fields.map(field => [field, field === 'targetValue' ? String(form[field]) : form[field]]));
  if (!fields.every(field => typeof value[field] === 'string')) throw Error('Invalid goal draft');
  storage.setItem(key(userId), JSON.stringify({ version: 1, form: value }));
}
export function removeGoalDraft(storage, userId) { storage.removeItem(key(userId)); }

export function goalDraftExport(form, timezone, t, now = new Date(), editing = false) {
  if (!form || fields.some(field => field === 'targetValue' ? !['string', 'number'].includes(typeof form[field]) : typeof form[field] !== 'string')) throw Error('Invalid goal draft export');
  const labels = { name: 'Tên mục tiêu', description: 'Mô tả', targetValue: 'Số lượng mục tiêu', unit: 'Đơn vị', deadline: 'Hạn chót' };
  return {
    filename: (editing ? 'selfforge-goal-edit-draft-' : 'selfforge-new-goal-draft-') + todayInTimezone(timezone, now) + '.txt',
    text: 'SelfForge — ' + t(editing ? 'Bản nháp sửa mục tiêu, chưa xác nhận lưu lên máy chủ' : 'Bản nháp tạo mục tiêu, chưa xác nhận lưu lên máy chủ') + '\n\n' +
      fields.map(field => t(labels[field]) + '\n' + String(form[field])).join('\n\n'),
  };
}

const editKey = (userId, goalId) => {
  key(userId);
  if (!Number.isSafeInteger(goalId) || goalId <= 0) throw Error('Invalid edited goal');
  return 'sf_goal_edit_form:' + userId + ':' + goalId;
};
function validGoalBase(base, goalId) {
  return base && base.id === goalId && typeof base.name === 'string' &&
    ['description', 'unit'].every(field => base[field] == null || typeof base[field] === 'string') &&
    Number.isInteger(base.targetValue) && base.targetValue > 0 && base.targetValue <= 2147483647 &&
    Number.isInteger(base.currentValue) && base.currentValue >= 0 && base.currentValue <= 2147483647 &&
    ['ACTIVE', 'COMPLETED', 'ABANDONED'].includes(base.status) && (base.deadline == null || validCalendarDate(base.deadline));
}
export function readGoalEditDraft(storage, userId, goalId) {
  const raw = storage.getItem(editKey(userId, goalId));
  if (raw === null) return null;
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !fields.every(field => typeof value.form?.[field] === 'string') || !validGoalBase(value.expected, goalId)) throw Error('Invalid goal edit draft');
  return { form: Object.fromEntries(fields.map(field => [field, value.form[field]])), expected: goalSnapshot(value.expected) };
}
export function writeGoalEditDraft(storage, userId, goal, form) {
  const draftKey = editKey(userId, goal.id), expected = goalSnapshot(goal);
  const value = Object.fromEntries(fields.map(field => [field, field === 'targetValue' ? String(form[field]) : form[field]]));
  if (!validGoalBase(expected, goal.id) || !fields.every(field => typeof value[field] === 'string')) throw Error('Invalid goal edit draft');
  storage.setItem(draftKey, JSON.stringify({ version: 1, form: value, expected }));
}
export function removeGoalEditDraft(storage, userId, goalId) { storage.removeItem(editKey(userId, goalId)); }
