const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

export function selectHabits(habits, { query = '', category = 'all', difficulty = 'all' }) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return habits.filter(habit => {
    if (category === 'none' ? habit.categoryId != null : category !== 'all' && String(habit.categoryId) !== category) return false;
    if (difficulty !== 'all' && habit.difficulty !== difficulty) return false;
    const text = normalize([habit.name, habit.description, habit.tags].join(' '));
    return words.every(word => text.includes(word));
  });
}
