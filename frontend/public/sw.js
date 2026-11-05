const OFFLINE_CACHE = 'selfforge-offline-v1';
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache => cache.add(OFFLINE_PAGE)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('selfforge-offline-') && key !== OFFLINE_CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  // A visible, user-initiated update in AppUpdate asks a waiting worker to
  // activate. API data is never cached, so taking the new shell immediately
  // cannot mix another account's private data into this client.
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Only document navigation has an offline fallback. Never cache API responses or account data.
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin
      || url.pathname.startsWith('/api/') || url.pathname.startsWith('/assets/')) return;
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(OFFLINE_CACHE);
    return await cache.match(OFFLINE_PAGE) || Response.error();
  }));
});
