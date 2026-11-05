export function selectCheckInHistory(entries, { query = '', status = 'ALL' } = {}) {
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return entries.filter(entry => (status === 'ALL' || entry.status === status) &&
    words.every(word => normalize([entry.habitName, entry.note].join(' ')).includes(word)));
}
