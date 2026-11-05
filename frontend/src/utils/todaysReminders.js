import { profileTimezone, todayInTimezone } from './dates.js';
export function todaysReminders(reminders, habits, timezone, dashboardDate, now = new Date()) {
  const date = todayInTimezone(timezone, now);
  if (date !== dashboardDate) return { stale: true, items: [] };
  const weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(date + 'T00:00:00Z').getUTCDay()];
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: profileTimezone(timezone), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const time = parts.find(p => p.type === 'hour').value + ':' + parts.find(p => p.type === 'minute').value;
  // A reminder's own weekday is not sufficient: the habit must also be due today.
  // Dashboard supplies scheduledToday from the account's timezone and schedule history.
  const pending = new Set(habits.filter(h => h?.scheduledToday === true && !h.todayStatus).map(h => h.habitId));
  const items = reminders.filter(r => r.enabled && pending.has(r.habitId) && r.daysOfWeek.split(',').map(d => d.trim()).includes(weekday))
    .map(r => ({ ...r, time: r.reminderTime.slice(0, 5), due: r.reminderTime.slice(0, 5) <= time }))
    .sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id);
  return { stale: false, items };
}
