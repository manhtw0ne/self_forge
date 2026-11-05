const DAYS = Object.freeze({ SUN: 1, MON: 2, TUE: 3, WED: 4, THU: 5, FRI: 6, SAT: 7 });
const MAX_NOTIFICATION_ID = 2147483646;

function parseTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(String(value ?? ''));
  if (!match) throw new Error('Invalid reminder time');
  return { hour: Number(match[1]), minute: Number(match[2]), second: Number(match[3] ?? 0) };
}

function stableId(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % MAX_NOTIFICATION_ID + 1;
}

function nextAvailableId(seed, used) {
  let id = seed;
  for (let attempts = 0; attempts < MAX_NOTIFICATION_ID; attempts += 1) {
    if (!used.has(id)) return id;
    id = id === MAX_NOTIFICATION_ID ? 1 : id + 1;
  }
  throw new Error('No notification identifiers available');
}

function notificationBody(reminder, language) {
  const message = String(reminder.message ?? '').trim();
  if (message) return message;
  return language === 'en'
    ? `Time for ${reminder.habitName}.`
    : `Đến giờ thực hiện ${reminder.habitName}.`;
}

function activeReminder(reminder) {
  if (!reminder || !Number.isSafeInteger(reminder.id) || reminder.id < 1 || typeof reminder.enabled !== 'boolean') {
    throw new Error('Invalid reminder');
  }
  if (!reminder.enabled || reminder.habitActive === false) return null;
  if (!Number.isSafeInteger(reminder.habitId) || reminder.habitId < 1
    || typeof reminder.habitName !== 'string' || !reminder.habitName.trim() || reminder.habitName.length > 255) {
    throw new Error('Invalid reminder name');
  }
  if (reminder.message != null && (typeof reminder.message !== 'string' || reminder.message.length > 255)) {
    throw new Error('Invalid reminder message');
  }
  if (typeof reminder.daysOfWeek !== 'string') throw new Error('Invalid reminder days');
  const days = reminder.daysOfWeek.split(',');
  if (!days.length || new Set(days).size !== days.length || days.some(day => !Object.hasOwn(DAYS, day))) {
    throw new Error('Invalid reminder days');
  }
  if (typeof reminder.habitScheduledDays !== 'string') throw new Error('Invalid habit schedule');
  const scheduledDays = reminder.habitScheduledDays.split(',');
  if (!scheduledDays.length || new Set(scheduledDays).size !== scheduledDays.length || scheduledDays.some(day => !Object.hasOwn(DAYS, day))) {
    throw new Error('Invalid habit schedule');
  }
  return {
    ...reminder,
    habitName: reminder.habitName.trim(),
    days: days.filter(day => scheduledDays.includes(day)),
    time: parseTime(reminder.reminderTime),
  };
}

/**
 * Converts saved SelfForge reminders into deterministic, device-local schedules.
 * This intentionally uses the phone's local timezone, matching how Android and iOS
 * schedule recurring local notifications after a traveller changes timezone.
 */
export function nativeReminderNotifications(reminders, language = 'vi') {
  if (!Array.isArray(reminders) || !['vi', 'en'].includes(language)) throw new Error('Invalid native reminder input');
  const sourceIds = new Set();
  const items = reminders.map(activeReminder).filter(Boolean).flatMap(reminder => {
    if (sourceIds.has(reminder.id)) throw new Error('Duplicate reminder');
    sourceIds.add(reminder.id);
    return reminder.days.map(day => ({ reminder, day }));
  }).sort((left, right) => left.reminder.id - right.reminder.id || DAYS[left.day] - DAYS[right.day]);

  const used = new Set();
  const notifications = items.map(({ reminder, day }) => {
    const id = nextAvailableId(stableId(`${reminder.id}:${day}`), used);
    used.add(id);
    return {
      id,
      title: 'SelfForge',
      body: notificationBody(reminder, language),
      schedule: {
        on: { weekday: DAYS[day], ...reminder.time },
      },
      extra: { source: 'self-forge-reminder', reminderId: String(reminder.id), habitId: String(reminder.habitId), path: '/' },
    };
  });
  return { notifications, ids: notifications.map(notification => notification.id) };
}

export function nativeReminderStorageKeys(owner) {
  if (!Number.isSafeInteger(owner) || owner < 1) throw new Error('Invalid reminder owner');
  const prefix = `sf_native_reminders:${owner}`;
  return { enabled: `${prefix}:enabled`, ids: `${prefix}:ids` };
}

export function nativeRemindersEnabled(storage, owner) {
  return storage.getItem(nativeReminderStorageKeys(owner).enabled) === '1';
}

export function nativeReminderIds(storage, owner) {
  const raw = storage.getItem(nativeReminderStorageKeys(owner).ids);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length > 500 || new Set(parsed).size !== parsed.length
    || parsed.some(id => !Number.isSafeInteger(id) || id < 1 || id > MAX_NOTIFICATION_ID)) {
    throw new Error('Invalid saved notification identifiers');
  }
  return parsed;
}

export function saveNativeReminderIds(storage, owner, ids) {
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length
    || ids.some(id => !Number.isSafeInteger(id) || id < 1 || id > MAX_NOTIFICATION_ID)) {
    throw new Error('Invalid notification identifiers');
  }
  storage.setItem(nativeReminderStorageKeys(owner).ids, JSON.stringify(ids));
}

export function setNativeRemindersEnabled(storage, owner, enabled) {
  const keys = nativeReminderStorageKeys(owner);
  if (enabled) storage.setItem(keys.enabled, '1');
  else {
    storage.removeItem(keys.enabled);
    storage.removeItem(keys.ids);
  }
}

export function nativeReminderTarget(extra) {
  if (!extra || extra.source !== 'self-forge-reminder' || extra.path !== '/') return null;
  const raw = String(extra.habitId ?? '');
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) return null;
  return `/?habit=${encodeURIComponent(raw)}`;
}
