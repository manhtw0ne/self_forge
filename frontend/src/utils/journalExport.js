import { validCalendarDate, formatCalendarDate } from './dates.js';
import { draftFields } from './draftLibrary.js';
export function journalExport(entry, language, t) {
  if (!entry || !Number.isSafeInteger(entry.id) || entry.id <= 0 || !validCalendarDate(entry.date)) throw Error('Invalid saved journal');
  const fields = Object.entries(draftFields.journal);
  if (fields.some(([field]) => entry[field] != null && typeof entry[field] !== 'string')) throw Error('Invalid journal content');
  return {
    filename: 'selfforge-journal-' + entry.date + '.txt',
    text: 'SelfForge — ' + t('Bản sao nhật ký đã lưu') + '\n' + formatCalendarDate(entry.date, language) + '\n' +
      t('Nội dung đã tải từ máy chủ, không gồm thay đổi chưa lưu.') + '\n\n' +
      fields.map(([field, label]) => t(label) + '\n' + (entry[field] ?? '')).join('\n\n'),
  };
}
