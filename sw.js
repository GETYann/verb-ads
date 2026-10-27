/* ============================================================
   Verb - Service Worker (vérification Monetag + notifications)
   ------------------------------------------------------------
   IMPORTANT : Ce fichier doit être à la RACINE du site.
   URL : https://getyann.github.io/verb-ads/sw.js
   ------------------------------------------------------------
   Si Monetag te fournit son propre sw.js depuis le dashboard
   (Sites -> ton site -> télécharger sw.js), REMPLACE le contenu
   de ce fichier par celui téléchargé, en gardant le nom sw.js.
   ============================================================ */

const CACHE_NAME = 'verb-ads-v1';
const PRECACHE = [
  './',
  './index.html',
  './ad.html',
  './confidentialite.html'
];

// Installation : mise en cache des pages de base
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .catch(() => undefined)
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Stratégie : réseau d'abord, cache en secours
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => undefined);
        }
        return response;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./index.html'))
      )
  );
});

// Réception d'une notification push
self.addEventListener('push', (event) => {
  let data = { title: 'Verb', body: 'Nouvelle notification', url: './' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    try { if (event.data) data.body = event.data.text(); } catch (e2) {}
  }

  const title = data.title || 'Verb';
  const options = {
    body: data.body || '',
    icon: './assets/icons/app_icon.png',
    badge: './assets/icons/app_icon.png',
    data: { url: data.url || './' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur une notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
