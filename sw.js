const CACHE_NAME = 'daily-tracker-v2';
const APP_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/app-icon.svg',
  './icons/app-icon-monochrome.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'SYNC_REMINDERS') return;
  self.reminders = event.data.reminders || [];
});

self.addEventListener('sync', event => {
  if (event.tag !== 'daily-tracker-sync') return;
  event.waitUntil(Promise.resolve());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const existing = windowClients.find(client => 'focus' in client);
      if (existing) {
        return existing.focus();
      }
      return clients.openWindow('./');
    })
  );
});
