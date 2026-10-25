// DietDecode Firebase Cloud Messaging Service Worker
// Enables background mobile push notifications when the website tab is closed or backgrounded.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Lifecycle: Install & Activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Initialize Firebase in Service Worker with DietDecode project credentials
try {
  firebase.initializeApp({
    apiKey: 'AIzaSyC4boAb6gnjoVOeYBNKcJ34sI-e864yrHg',
    authDomain: 'dietdecode-808be.firebaseapp.com',
    projectId: 'dietdecode-808be',
    storageBucket: 'dietdecode-808be.firebasestorage.app',
    messagingSenderId: '933546181945',
    appId: '1:933546181945:web:d07588ac8d4dc9ce5ed4e8',
  });

  const messaging = firebase.messaging();

  // Background message handler from Firebase Cloud Messaging
  messaging.onBackgroundMessage((payload) => {
    console.info('[SW] Received FCM background message:', payload);

    const title =
      payload.notification?.title ||
      payload.data?.title ||
      '🍽️ Meal Reminder Active';

    const body =
      payload.notification?.body ||
      payload.data?.body ||
      'It is time for your scheduled meal! Your ESP32 buzzer is alerting now.';

    const reminderId = payload.data?.reminderId || 'active';
    const targetUrl = payload.data?.url || '/reminders';

    const options = {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `dietdecode-meal-${reminderId}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: {
        reminderId,
        url: targetUrl,
        timestamp: Date.now(),
      },
      actions: [
        { action: 'open', title: 'Open DietDecode' },
      ],
    };

    return self.registration.showNotification(title, options);
  });
} catch (err) {
  console.warn('[SW] Firebase Messaging background handler init error:', err);
}

// Handle notification click: focus existing window or open target page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/reminders';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If DietDecode is already open in any tab, focus it and navigate
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            if ('navigate' in client && targetUrl) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // If not open, open a new window at the target URL
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Fallback push event handler for direct Web Push payloads
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title =
      payload.notification?.title ||
      payload.data?.title ||
      '🍽️ Meal Reminder Active';

    const body =
      payload.notification?.body ||
      payload.data?.body ||
      'It is time for your scheduled meal!';

    const reminderId = payload.data?.reminderId || 'active';
    const targetUrl = payload.data?.url || '/reminders';

    const options = {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `dietdecode-meal-${reminderId}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: {
        reminderId,
        url: targetUrl,
        timestamp: Date.now(),
      },
      actions: [
        { action: 'open', title: 'Open DietDecode' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.warn('[SW] Push payload parse fallback:', err);
  }
});
