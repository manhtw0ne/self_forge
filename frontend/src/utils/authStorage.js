export function checkAuthStorage(storage) {
  // Probe storage without changing the existing credential.
  const token = storage.getItem('sf_token');
  const key = 'sf_storage_check';
  const previous = storage.getItem(key);
  try {
    storage.setItem(key, '1');
    if (storage.getItem(key) !== '1') throw new Error('Storage write failed');
  } finally {
    if (previous === null) storage.removeItem(key);
    else storage.setItem(key, previous);
  }
  return token;
}
