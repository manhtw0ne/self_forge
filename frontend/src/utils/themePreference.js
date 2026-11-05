export function readTheme(getStorage) {
  try {
    const value = getStorage().getItem('selfforge-theme');
    return value === 'light' ? 'light' : 'dark';
  } catch { return 'dark'; }
}

export function saveTheme(getStorage, theme) {
  try { getStorage().setItem('selfforge-theme', theme); return true; }
  catch { return false; }
}
