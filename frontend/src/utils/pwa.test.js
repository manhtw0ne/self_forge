import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
function worker(fetch) {
  const handlers = {}, cached = [], deleted = []; let skipped = 0;
  const offline = new Response('offline page', { headers: { 'Content-Type': 'text/html' } });
  vm.runInNewContext(source, {
    self: { location: { origin: 'https://selfforge.test' }, addEventListener: (name, handler) => { handlers[name] = handler; }, clients: { claim: async () => {} }, skipWaiting: async () => { skipped++; } },
    URL, Response, fetch,
    caches: { open: async () => ({ add: async path => cached.push(path), match: async () => offline }),
      keys: async () => ['other-app-cache', 'selfforge-offline-v0', 'selfforge-offline-v1'], delete: async name => deleted.push(name) },
  });
  return { handlers, cached, deleted, skipped: () => skipped };
}
test('PWA cache contains only public offline fallback and removes only its own old cache', async () => {
  const w = worker(); let pending;
  w.handlers.install({ waitUntil: promise => { pending = promise; } }); await pending;
  assert.deepEqual(w.cached, ['/offline.html']);
  w.handlers.activate({ waitUntil: promise => { pending = promise; } }); await pending;
  assert.deepEqual(w.deleted, ['selfforge-offline-v0']);
});
test('PWA never intercepts private APIs, mutations, scripts or other origins', () => {
  const w = worker(() => { throw Error('unexpected fetch'); });
  for (const request of [
    { method: 'GET', mode: 'navigate', url: 'https://selfforge.test/api/profile/data' },
    { method: 'POST', mode: 'navigate', url: 'https://selfforge.test/journal' },
    { method: 'GET', mode: 'cors', url: 'https://selfforge.test/assets/page.js' },
    { method: 'GET', mode: 'navigate', url: 'https://other.test/' },
  ]) w.handlers.fetch({ request, respondWith: () => assert.fail('Unexpected interception') });
});
test('only the explicit update message activates a waiting worker', async () => {
  const w = worker();
  await w.handlers.message({ data: { type: 'OTHER' } });
  assert.equal(w.skipped(), 0);
  await w.handlers.message({ data: { type: 'SKIP_WAITING' } });
  assert.equal(w.skipped(), 1);
});
test('offline fallback is used only when navigation network fails; server errors are preserved', async () => {
  const request = { method: 'GET', mode: 'navigate', url: 'https://selfforge.test/journal' };
  let response;
  worker(async () => { throw Error('offline'); }).handlers.fetch({ request, respondWith: promise => { response = promise; } });
  assert.equal(await (await response).text(), 'offline page');
  worker(async () => new Response('server unavailable', { status: 503 })).handlers.fetch({ request, respondWith: promise => { response = promise; } });
  assert.equal((await response).status, 503);
});
test('install manifest points to real PNG icons with declared sizes', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const png = readFileSync(new URL('../../public' + icon.src, import.meta.url));
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(icon.sizes, `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);
  }
});
