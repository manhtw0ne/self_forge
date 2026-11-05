import { validCalendarDate, calendarWeekStart, formatCalendarDate } from './dates.js';
import { readJournalDraft } from './journalDraft.js';
import { readReviewDraft } from './reviewDraft.js';

export function listAccountDrafts(storage, userId, kind, maximumDate) {
  if (!Number.isSafeInteger(userId) || userId <= 0 || !['journal', 'review'].includes(kind)) throw Error('Invalid draft owner or kind');
  const prefix = (kind === 'journal' ? 'sf_journal_draft:' : 'sf_review_draft:') + userId + ':';
  const drafts = []; let invalidCount = 0;
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const date = key.slice(prefix.length);
    if (!validCalendarDate(date, maximumDate) || (kind === 'review' && calendarWeekStart(date) !== date)) { invalidCount++; continue; }
    try {
      const form = kind === 'journal' ? readJournalDraft(storage, userId, date) : readReviewDraft(storage, userId, date);
      if (form) drafts.push({ date, form });
    } catch { invalidCount++; }
  }
  drafts.sort((a, b) => b.date.localeCompare(a.date));
  return { drafts, invalidCount };
}

export const draftFields = {
  journal: { win: 'Chiến thắng hôm nay', obstacle: 'Trở ngại', lesson: 'Bài học', tomorrowFocus: 'Tập trung ngày mai' },
  review: { wins: 'Chiến thắng tuần này', improvements: 'Cần cải thiện', nextWeekPlan: 'Kế hoạch tuần sau', rating: 'Đánh giá' },
};
export function draftText(kind, date, form, language, t) {
  if (!draftFields[kind] || !validCalendarDate(date)) throw Error('Invalid draft export');
  return 'SelfForge — ' + t('Bản sao nội dung trên trình duyệt') + '\n' + formatCalendarDate(date, language) + '\n\n' + Object.entries(draftFields[kind]).map(([field, label]) => t(label) + '\n' + (form[field] ?? '')).join('\n\n');
}
