// Web Push Service Worker
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const title = data.title || '晏';
  const options = {
    body: data.body || '',
    icon: '/static/icon-192.png',
    badge: '/static/icon-192.png',
    tag: 'yan-message',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
