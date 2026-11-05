import { validCalendarDate, shiftDate } from './dates.js';
const searchable = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export function isOverdueGoal(goal, today) {
  return goal.status === 'ACTIVE' && Boolean(goal.deadline) && goal.deadline < today;
}

export function selectGoals(goals, { query = '', status = 'ALL', sort = 'default', today, goalId = null }) {
  const dueLimit = validCalendarDate(today) ? shiftDate(today, 6) : null;
  const words = searchable(query).trim().split(/\s+/).filter(Boolean);
  const result = goals.filter(goal => {
    if (goalId !== null && goal.id !== goalId) return false;
    if (status === 'DUE_SOON') {
      if (!dueLimit || goal.status !== 'ACTIVE' || !validCalendarDate(goal.deadline) || goal.deadline < today || goal.deadline > dueLimit) return false;
    } else if (status === 'OVERDUE' ? !isOverdueGoal(goal, today) : status !== 'ALL' && goal.status !== status) return false;
    const text = searchable([goal.name, goal.description, goal.unit].join(' '));
    return words.every(word => text.includes(word));
  });
  if (sort === 'deadline') result.sort((a, b) => (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31'));
  if (sort === 'progress') result.sort((a, b) => b.progress - a.progress);
  return result;
}
