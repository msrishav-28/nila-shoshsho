/* eslint-env serviceworker */
/* global SHELL_CACHE, STATIC_ASSETS */

const appFiles = new Set(STATIC_ASSETS);

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(cache =>
        cache.addAll(
          STATIC_ASSETS.map(
            url => new Request(url, {cache: 'reload', credentials: 'omit'}),
          ),
        ),
      ),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith('nila-shell-') && key !== SHELL_CACHE)
            .map(key => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const {request} = event;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    request.headers.has('authorization')
  ) {
    return;
  }

  if (
    request.mode === 'navigate' &&
    (url.pathname === '/' || url.pathname === '/index.html')
  ) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('/index.html')) || Response.error();
      }),
    );
    return;
  }

  // Leave every API request with the browser, including same-origin GETs.
  if (appFiles.has(url.pathname) && !url.search) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async cache => {
        return (await cache.match(request)) || fetch(request);
      }),
    );
  }
});
