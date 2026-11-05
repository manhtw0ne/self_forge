const key = userId => 'sf_reminder_create:' + userId;
function validate(value) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.requestId)
      || !Number.isSafeInteger(value.habitId) || value.habitId <= 0
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.reminderTime)
      || typeof value.message !== 'string' || value.message.length > 255
      || !/^(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*$/.test(value.daysOfWeek) || value.daysOfWeek.length > 27) throw new Error('Invalid pending reminder');
  return {requestId:value.requestId,habitId:value.habitId,reminderTime:value.reminderTime,daysOfWeek:value.daysOfWeek,message:value.message};
}
export function readPendingReminder(storage, userId) {
  const raw = storage.getItem(key(userId));
  return raw === null ? null : validate(JSON.parse(raw));
}
export function removePendingReminder(storage, userId) { storage.removeItem(key(userId)); }
export async function createReminderSafely(storage, userId, form, post, makeId = () => crypto.randomUUID()) {
  const payload = readPendingReminder(storage, userId) ?? { ...form, habitId: Number(form.habitId), requestId: makeId() };
  validate(payload);
  storage.setItem(key(userId), JSON.stringify(payload));
  let result;
  try { result = await post(payload); }
  catch (error) {
    if ([400, 404, 422].includes(error.response?.status)) removePendingReminder(storage, userId);
    throw error;
  }
  removePendingReminder(storage, userId);
  return result;
}
