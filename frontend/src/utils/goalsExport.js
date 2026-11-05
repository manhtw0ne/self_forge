import { validCalendarDate } from './dates.js';
const statuses = { ACTIVE: 'Đang thực hiện', COMPLETED: 'Đã hoàn thành', ABANDONED: 'Mục tiêu đã hủy' };
export function goalsExport(goals, today, t = value => value) {
  if (!validCalendarDate(today) || !Array.isArray(goals) || !goals.length) throw Error('No goals to export');
  if (goals.some(goal => !Number.isSafeInteger(goal.id) || goal.id <= 0 || typeof goal.name !== 'string' ||
      !Number.isSafeInteger(goal.targetValue) || goal.targetValue <= 0 || !Number.isSafeInteger(goal.currentValue) || goal.currentValue < 0 ||
      !statuses[goal.status] || (goal.deadline && !validCalendarDate(goal.deadline)))) throw Error('Invalid saved goals');
  return {
    filename: `selfforge-goals-${today}.txt`,
    text: [t('Danh sách mục tiêu đang xem'), today, t('Chỉ gồm mục tiêu đã tải và phù hợp bộ lọc, không gồm bản nháp.'), '',
      ...goals.flatMap((goal, index) => [
        `${index + 1}. ${goal.name}`, `${t('Trạng thái')}: ${t(statuses[goal.status])}`,
        `${t('Tiến độ')}: ${goal.currentValue}/${goal.targetValue} ${goal.unit || ''}`,
        `${t('Hạn chót')}: ${goal.deadline || t('Chưa đặt hạn')}`, goal.description || '', '',
      ])].join('\n'),
  };
}
