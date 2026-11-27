// Each release keeps the complete game in one cache entry.
const cachePrefix = 'sweetie:' + self.registration.scope + ':';
const currentCache = cachePrefix + 'c74f8626a55a46ffebd6';
const directory = new URL(self.registration.scope);
const entry = new URL('index.html', directory).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(entry, { cache: 'reload' });
    if (!response.ok) throw new Error('无法缓存游戏');
    const cache = await caches.open(currentCache);
    await cache.put(entry, response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(cachePrefix) && name !== currentCache)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  const url = new URL(event.request.url);
  if (url.origin !== directory.origin ||
      (url.pathname !== directory.pathname && url.pathname !== new URL(entry).pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(currentCache);
    return (await cache.match(entry)) || fetch(event.request);
  })());
});
