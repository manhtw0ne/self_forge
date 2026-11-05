import { todayInTimezone, shiftDate } from './dates.js';

const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const encoder = new TextEncoder();
const escapeText = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const stamp = value => value.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
function scheduledForHabit(reminder, weekday) {
  if (typeof reminder.habitScheduledDays !== 'string') throw new Error('Invalid habit schedule');
  const days = reminder.habitScheduledDays.split(',');
  if (!days.length || new Set(days).size !== days.length || days.some(day => !weekdays.includes(day))) {
    throw new Error('Invalid habit schedule');
  }
  return days.includes(weekday);
}
function fold(line) {
  let result = '', bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) { result += '\r\n '; bytes = 1; }
    result += char; bytes += size;
  }
  return result;
}

// Explicit UTC occurrences keep the account's wall-clock time across DST changes.
export function reminderCalendar(reminders, timezone, now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const localEpoch = date => {
    const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SelfForge//Reminders//EN', 'CALSCALE:GREGORIAN'];
  let count = 0;
  const firstDay = todayInTimezone(timezone, now);
  for (let day = 0; day < 90; day++) {
    const date = shiftDate(firstDay, day);
    const midnight = new Date(date + 'T00:00:00Z');
    const weekday = weekdays[midnight.getUTCDay()];
    const offsets = new Set([-1, 0, 1].map(delta => {
      const sample = new Date(midnight.getTime() + delta * 86400000);
      return localEpoch(sample) - sample.getTime();
    }));
    for (const reminder of reminders) {
      if (!reminder.enabled || reminder.habitActive === false || !String(reminder.daysOfWeek).split(',').includes(weekday)) continue;
      if (!scheduledForHabit(reminder, weekday)) continue;
      if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(reminder.reminderTime)) throw new Error('Invalid reminder time');
      const [hour, minute, second = 0] = reminder.reminderTime.split(':').map(Number);
      const wall = midnight.getTime() + hour * 3600000 + minute * 60000 + second * 1000;
      const matches = [...offsets].map(offset => new Date(wall - offset)).filter(candidate => localEpoch(candidate) === wall).sort((a, b) => a - b);
      // A missing spring-forward time has no occurrence; a repeated time fires once.
      const start = matches[0];
      if (!start || start < now) continue;
      const summary = 'SelfForge: ' + reminder.habitName;
      lines.push('BEGIN:VEVENT', 'UID:' + reminder.id + '-' + date + '-' + start.getTime() + '@selfforge.local', 'DTSTAMP:' + stamp(now), 'DTSTART:' + stamp(start), 'DURATION:PT5M', 'SUMMARY:' + escapeText(summary), 'DESCRIPTION:' + escapeText(reminder.message), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0S', 'DESCRIPTION:' + escapeText(summary), 'END:VALARM', 'END:VEVENT');
      count++;
    }
  }
  lines.push('END:VCALENDAR');
  return { content: lines.map(fold).join('\r\n') + '\r\n', count };
}
