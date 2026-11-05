const KINDS = new Set(['CREATED', 'OBSERVED', 'CHANGED']);

function readPositiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid habit state history ${name}`);
  return value;
}

function readDate(value, name) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new Error(`Invalid habit state history ${name}`);
  return value;
}

function readCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid habit state history calendar date');
  }
  return value;
}

function readItem(value, previousId) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid habit state history item');
  const id = readPositiveInteger(value.id, 'id');
  if (previousId !== null && id >= previousId) throw new Error('Habit state history must be newest first');
  if (!KINDS.has(value.kind)) throw new Error('Invalid habit state history kind');
  if (!Number.isInteger(value.targetPerWeek) || value.targetPerWeek < 1 || value.targetPerWeek > 7) throw new Error('Invalid habit state history weekly target');
  const scheduledDays = typeof value.scheduledDays === 'string' ? value.scheduledDays.split(',') : [];
  if (scheduledDays.length !== value.targetPerWeek || scheduledDays.length !== new Set(scheduledDays).size
      || scheduledDays.some(day => !['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].includes(day))) throw new Error('Invalid habit state history weekday schedule');
  if (typeof value.active !== 'boolean') throw new Error('Invalid habit state history activity');
  const recordedAt = readDate(value.recordedAt, 'recorded time');
  const calendarDate = readCalendarDate(value.calendarDate);
  if (typeof value.timezone !== 'string' || !value.timezone.trim() || value.timezone.length > 64) throw new Error('Invalid habit state history timezone');
  return { id, kind: value.kind, targetPerWeek: value.targetPerWeek, scheduledDays: value.scheduledDays, active: value.active, recordedAt, calendarDate, timezone: value.timezone };
}

/** Accept only the owner-scoped, newest-first page emitted by the API. */
export function readHabitStateHistoryPage(value, beforeId = null) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.items) || value.items.length > 20) {
    throw new Error('Invalid habit state history page');
  }
  let previousId = beforeId === null ? null : readPositiveInteger(beforeId, 'requested cursor');
  const items = value.items.map(item => {
    const next = readItem(item, previousId);
    previousId = next.id;
    return next;
  });
  const nextCursor = value.nextCursor === null ? null : readPositiveInteger(value.nextCursor, 'cursor');
  if (nextCursor !== null && (items.length === 0 || nextCursor !== items.at(-1).id)) {
    throw new Error('Invalid habit state history cursor');
  }
  return { items, nextCursor };
}

/** Keep a repeated page from duplicating an event in a retrying browser. */
export function appendHabitStateHistory(current, incoming) {
  const seen = new Set(current.map(item => item.id));
  return [...current, ...incoming.filter(item => !seen.has(item.id))];
}
