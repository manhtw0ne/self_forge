// UTC calendar dates avoid daylight-saving shifts in chart spacing.
export function moodTimeline(entries) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return { points: [], width: 600 };
  const first = Date.parse(sorted[0].date + 'T00:00:00Z');
  const points = sorted.map(entry => ({ ...entry,
    x: (Date.parse(entry.date + 'T00:00:00Z') - first) / 86400000 * 20 + 10,
  }));
  return { points, width: Math.max(600, points.at(-1).x + 10) };
}

export function moodY(score, height = 120) {
  return 8 + (5 - score) / 4 * (height - 16);
}
