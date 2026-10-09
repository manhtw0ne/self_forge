export const JOURNAL_LIMIT = 5000;
export const journalFields = {win: 'Chiến thắng hôm nay', obstacle: 'Trở ngại', lesson: 'Bài học', tomorrowFocus: 'Tập trung ngày mai'};
export function oversizedJournalFields(form) {
  return Object.keys(journalFields).filter(field => (form[field]?.length ?? 0) > JOURNAL_LIMIT);
}
