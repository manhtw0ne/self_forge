import { profileTimezone, todayInTimezone } from './dates.js';
export function pomodoroExport(session, timezone, language, t) {
  if (!Number.isSafeInteger(session.id) || session.id <= 0 || !Number.isInteger(session.durationMinutes) || session.durationMinutes < 25 || session.durationMinutes > 120 || typeof session.completed !== 'boolean') throw Error('Invalid session');
  const zone = profileTimezone(timezone);
  const format = value => {
    if (!value) return t('Không có dữ liệu thời gian');
    const instant = new Date(value);
    if (!Number.isFinite(instant.getTime())) throw Error('Invalid session timestamp');
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }).format(instant);
  };
  if (!session.startedAt) throw Error('Missing session timestamp');
  const start = format(session.startedAt);
  return {
    filename: 'selfforge-pomodoro-' + todayInTimezone(zone, new Date(session.startedAt)) + '-' + session.id + '.txt',
    text: 'SelfForge — ' + t('Bản sao phiên Pomodoro đã lưu') + '\n\n' + [
      [t('Thói quen'), session.habitName || t('Phiên tự do')],
      [t('Trạng thái'), t(session.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành')],
      [t('Thời lượng đã đặt'), t('{count} phút', { count: session.durationMinutes })],
      [t('Thời điểm bắt đầu'), start],
      [t('Thời điểm kết thúc'), format(session.endedAt)],
      [t('Múi giờ'), zone],
      [t('Ghi chú đã lưu'), session.note ?? ''],
    ].map(([label, value]) => label + '\n' + value).join('\n\n'),
  };
}
