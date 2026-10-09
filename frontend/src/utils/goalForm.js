export function goalPayload(form, editing = false) {
  const targetValue = Number(form.targetValue);
  if (!Number.isInteger(targetValue) || targetValue < 1 || targetValue > 2147483647) {
    throw new Error('Số lượng phải là số nguyên từ 1 đến 2147483647.');
  }
  const name = form.name.trim();
  if (!name) throw new Error('Tên mục tiêu không được để trống.');
  const payload = { name, description: form.description, targetValue, unit: form.unit, deadline: form.deadline || null };
  if (editing) payload.clearDeadline = !form.deadline;
  return payload;
}
