import { validCalendarDate } from './dates.js';
export function goalPayload(form, editing = false) {
  const targetValue = Number(form.targetValue);
  if (!Number.isInteger(targetValue) || targetValue < 1 || targetValue > 2147483647) {
    throw new Error('Số lượng phải là số nguyên từ 1 đến 2147483647.');
  }
  if (typeof form.name !== 'string' || ['description', 'unit'].some(field => typeof form[field] !== 'string')) {
    throw new Error('Nội dung mục tiêu không hợp lệ. Hãy kiểm tra lại biểu mẫu.');
  }
  if (['name', 'description', 'unit'].some(field => form[field].length > 255)) {
    throw new Error('Tên, mô tả và đơn vị mục tiêu không được vượt 255 ký tự.');
  }
  if (form.deadline !== '' && !validCalendarDate(form.deadline)) {
    throw new Error('Hạn chót phải là ngày hợp lệ.');
  }
  const name = form.name.trim();
  if (!name) throw new Error('Tên mục tiêu không được để trống.');
  const payload = { name, description: form.description, targetValue, unit: form.unit, deadline: form.deadline || null };
  if (editing) payload.clearDeadline = !form.deadline;
  return payload;
}

export function goalSnapshot(goal) {
  return { id: goal.id, name: goal.name, description: goal.description || '', targetValue: goal.targetValue,
    currentValue: goal.currentValue, unit: goal.unit || '', deadline: goal.deadline || null, status: goal.status };
}
export function goalFormFrom(goal) {
  return { name: goal.name, description: goal.description || '', targetValue: goal.targetValue, unit: goal.unit || '', deadline: goal.deadline || '' };
}
export function reviewedGoalForm(form, latest, keepInput) {
  if (!keepInput) return goalFormFrom(latest);
  return { ...form, targetValue: latest.status === 'ACTIVE' ? form.targetValue : latest.targetValue };
}
