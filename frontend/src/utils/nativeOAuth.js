const HANDOFF = /^[A-Za-z0-9_-]{43}$/;

export function readNativeOAuthStart(value) {
  if (!value || typeof value !== 'object' || typeof value.authorizationUrl !== 'string' || typeof value.handoff !== 'string') return null;
  if (!HANDOFF.test(value.handoff)) return null;
  try {
    const url = new URL(value.authorizationUrl);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.hash) return null;
    return { authorizationUrl: url.toString(), handoff: value.handoff };
  } catch {
    return null;
  }
}
