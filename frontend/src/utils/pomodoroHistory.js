export function readPomodoroHistory(data) {
  if (!data || !Array.isArray(data.items) || data.items.length > 20) throw Error('Invalid session history');
  let previous = Infinity;
  for (const session of data.items) {
    if (!session || !Number.isSafeInteger(session.id) || session.id <= 0 || session.id >= previous || typeof session.completed !== 'boolean') throw Error('Invalid history session');
    previous = session.id;
  }
  const nextCursor = data.nextCursor ?? null;
  if (nextCursor !== null && (data.items.length !== 20 || !Number.isSafeInteger(nextCursor) || nextCursor <= 0 || nextCursor !== data.items.at(-1).id)) throw Error('Invalid history cursor');
  return { items: data.items, nextCursor };
}
