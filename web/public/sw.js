self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Required for Android Chrome installability.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
