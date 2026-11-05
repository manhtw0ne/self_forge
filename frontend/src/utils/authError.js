const STORAGE_UNAVAILABLE = 'Browser storage unavailable';

function isStorageUnavailable(error) {
  const message = String(error?.message || '');
  return message === STORAGE_UNAVAILABLE
    || /(?:local|session)?storage/i.test(message)
    || /(?:get|set|remove)Item/.test(message);
}

/** Converts auth failures into a message the login screen can safely translate. */
export function authErrorMessage(error, storageUnavailable = false) {
  const detail = error?.response?.data?.detail || error?.response?.data?.message;
  if (detail === 'Invalid email or password') return 'Email hoặc mật khẩu không đúng.';
  if (detail) return detail;
  if (storageUnavailable || isStorageUnavailable(error)) {
    return 'Trình duyệt đang chặn lưu trữ. Hãy cho phép trang web lưu dữ liệu trong cài đặt trình duyệt, rồi thử lại.';
  }
  return 'Có lỗi xảy ra';
}
