const DEFAULT_ZONE = 'Asia/Ho_Chi_Minh';

export function profileTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone || DEFAULT_ZONE });
    return timezone || DEFAULT_ZONE;
  } catch {
    return DEFAULT_ZONE;
  }
}

export function todayInTimezone(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: profileTimezone(timezone), year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

// Calendar arithmetic must not turn browser-local midnight into a UTC date.
export function shiftDate(date, offset) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

// Date-only values must remain on the same calendar day in every browser timezone.
export function formatCalendarDate(date, language, options = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' }) {
  const value = new Date(date + 'T00:00:00Z');
  if (!date || Number.isNaN(value.getTime())) return date || '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    ...options, timeZone: 'UTC',
  }).format(value);
}
