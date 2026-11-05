const pages = new Set(['/', '/habits', '/journal', '/check-in-history', '/stats', '/challenges', '/rewards',
  '/pomodoro', '/review', '/goals', '/reminders', '/companion', '/profile', '/premium', '/help']);
export function safeReturnPath(value) {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const url = new URL(value, 'https://selfforge.invalid');
    if (url.origin !== 'https://selfforge.invalid' || !pages.has(url.pathname)) return '/';
    return url.pathname + url.search + url.hash;
  } catch { return '/'; }
}
