export function rewardPayload(form) {
  const name = form.name.trim();
  const xpCost = Number(form.xpCost);
  if (!name || name.length > 255 || form.description.length > 255) throw new Error('Nhập tên phần thưởng và giữ nội dung trong 255 ký tự.');
  if (!Number.isInteger(xpCost) || xpCost < 1 || xpCost > 1000000) throw new Error('Chi phí XP phải là số nguyên từ 1 đến 1000000.');
  return { name, description: form.description.trim(), xpCost };
}
