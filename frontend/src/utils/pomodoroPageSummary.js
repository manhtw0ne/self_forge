import { todayInTimezone } from './dates.js';
export function pomodoroPageSummary(rows, timezone) {
  const groups = new Map();
  let completed = 0, minutes = 0;
  for (const row of rows) {
    const instant = new Date(row.startedAt);
    if (!Number.isFinite(instant.getTime()) || !Number.isInteger(row.durationMinutes) || row.durationMinutes < 1) throw Error('Invalid session');
    const date = todayInTimezone(timezone, instant);
    if (!groups.has(date)) groups.set(date, { date, rows: [], completed: 0, minutes: 0 });
    const group = groups.get(date); group.rows.push(row);
    if (row.completed === true) { group.completed++; group.minutes += row.durationMinutes; completed++; minutes += row.durationMinutes; }
  }
  return { completed, minutes, incomplete: rows.length - completed, groups: [...groups.values()].sort((a,b) => b.date.localeCompare(a.date)) };
}
