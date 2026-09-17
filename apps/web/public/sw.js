self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.png', // Optional: you can add a default icon in public/
      badge: '/badge.png', // Optional
      tag: data.url ? `${data.url}-${Date.now()}` : `req-${Date.now()}`,
      renotify: true,
      data: {
        url: data.url,
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Basic fetch handler to satisfy PWA installability requirements
self.addEventListener('fetch', (event) => {
  // Let the browser do its default thing for all requests (network-only)
  // For a real offline experience, we'd add caching logic here.
});
