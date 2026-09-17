/*
 * Firebase Cloud Messaging service worker.
 *
 * MUST live at the web root (/firebase-messaging-sw.js) — a service worker can
 * only control pages at or below its own path, and push has to work for every
 * route in the app.
 *
 * This file is served as-is by Vite, so it never sees import.meta.env: the
 * config below is hardcoded. Those values are public by design (they ship in
 * every client bundle anyway), but they MUST be kept in sync with the
 * VITE_FIREBASE_* vars in frontend/.env — a mismatch means the token minted by
 * the page belongs to a different project than this worker listens on, and
 * pushes silently never arrive.
 */

importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC-s8HtcGjJcJhnwaSxlNNAKZy3VIVieCI',
  authDomain: 'offerly-b2e1a.firebaseapp.com',
  projectId: 'offerly-b2e1a',
  storageBucket: 'offerly-b2e1a.firebasestorage.app',
  messagingSenderId: '246962620294',
  appId: '1:246962620294:web:88de04f286f515a56c0e07',
  measurementId: 'G-YD65E82PVD',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // When the payload carries a `notification` block, the FCM SDK has already
  // displayed it by the time we get here. Calling showNotification again would
  // put a duplicate in the tray, so only render data-only payloads ourselves.
  if (payload.notification) {
    return;
  }

  const data = payload.data || {};

  self.registration.showNotification(data.title || 'Offerly', {
    body: data.body || '',
    icon: '/offerly-logo-ring.png',
    badge: '/offerly-logo-ring.png',
    tag: data.type || 'offerly',
    data: { link: data.link || '/notifications' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // `webpush.fcmOptions.link` (set server-side) already handles clicks on
  // auto-displayed notifications; this covers the data-only ones above.
  const link = event.notification?.data?.link || '/notifications';
  const target = new URL(link, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Reuse an already-open tab rather than stacking up new ones.
      for (const client of clientList) {
        if (client.url === target && 'focus' in client) {
          return client.focus();
        }
      }

      for (const client of clientList) {
        if ('navigate' in client && 'focus' in client) {
          return client.navigate(target).then((navigated) => navigated?.focus());
        }
      }

      return self.clients.openWindow(target);
    })
  );
});

// A freshly installed worker otherwise waits for every existing tab to close
// before it can receive anything.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
