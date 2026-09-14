/* ============================================================
   SERVICE WORKER — Total Monitoramento Moto Ronda
   Cache offline + Notificações + Atualização automática
   ============================================================ */

const CACHE_NAME = 'moto-ronda-v2.1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('[SW]', err))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map(n => n !== CACHE_NAME ? caches.delete(n) : null))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCDN = url.hostname.includes('jsdelivr.net') || url.hostname.includes('cloudflare.com') || url.hostname.includes('gstatic.com');
  if (!isSameOrigin && !isCDN) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        fetch(event.request).then((net) => {
          if (net && net.status === 200) caches.open(CACHE_NAME).then((c) => c.put(event.request, net.clone()));
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then((net) => {
        if (!net || net.status !== 200 || net.type === 'opaque') return net;
        const clone = net.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return net;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});

/* ============================================================
   🔔 NOTIFICAÇÕES — clique abre/foca o app
   ============================================================ */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já tem uma janela aberta, foca nela
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      // Senão abre uma nova
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});

/* Quando a notificação é fechada */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada:', event.notification.tag);
});

/* Mensagens do cliente */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  // Permite disparar notificação direto do app via SW
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, event.data.options || {});
  }
});
