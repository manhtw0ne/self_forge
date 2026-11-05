const searchable = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
export function selectReviewHistory(reviews, { query = '', year = 'ALL', rating = 'ALL' } = {}) {
  const words = searchable(query).trim().split(/\s+/).filter(Boolean);
  return reviews.filter(review =>
    (year === 'ALL' || review.weekStart?.slice(0, 4) === year) &&
    (rating === 'ALL' || review.rating === Number(rating)) &&
    words.every(word => searchable([review.weekStart, review.wins, review.improvements, review.nextWeekPlan].join(' ')).includes(word)))
    .sort((a, b) => String(b.weekStart).localeCompare(String(a.weekStart)));
}
