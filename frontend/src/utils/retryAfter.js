export function retryAfterSeconds(headers, now = Date.now()) {
  const value = headers?.get?.('retry-after') ?? headers?.['retry-after'];
  if (value == null || String(value).trim() === '') return 60;
  const text = String(value).trim();
  const seconds = /^\d+$/.test(text) ? Number(text) : Math.ceil((Date.parse(text) - now) / 1000);
  return Number.isFinite(seconds) ? Math.min(86400, Math.max(1, seconds)) : 60;
}
export function remainingSeconds(deadline, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
