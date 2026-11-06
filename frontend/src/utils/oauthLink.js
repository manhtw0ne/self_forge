/**
 * The API may return an authorization URI configured by an operator. Do not
 * navigate a signed-in browser to an arbitrary or credential-bearing URI.
 */
export function readOAuthLinkAuthorization(value) {
  if (!value || typeof value.authorizationUrl !== 'string' || value.authorizationUrl.length > 4096) return null;
  try {
    const url = new URL(value.authorizationUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
