// Smart-Elixir service worker.
// Bump CACHE_VERSION whenever the shell list below changes; activate() drops
// every older cache, so a deploy never serves a half-stale shell.
const CACHE_VERSION = 'smart-elixir-v1'
const SHELL = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // addAll is all-or-nothing; a single 404 would leave us with no shell.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

/** Only cache our own successful, non-partial responses. */
function isCacheable(response) {
  return response && response.status === 200 && response.type === 'basic'
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (isCacheable(response)) {
    const cache = await caches.open(CACHE_VERSION)
    cache.put(request, response.clone())
  }
  return response
}

/** Navigations: fresh when online, cached shell when not — never a browser error page. */
async function navigationHandler(request) {
  try {
    const response = await fetch(request)
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put('/index.html', response.clone())
    }
    return response
  } catch {
    return (
      (await caches.match('/index.html')) ||
      (await caches.match('/')) ||
      Response.error()
    )
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (isCacheable(response)) {
        const cache = await caches.open(CACHE_VERSION)
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cached)
  return cached || network
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // AI calls must always hit the network — never serve a cached completion.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return

  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request))
    return
  }

  // Build output is content-hashed, so a hit is always correct.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})
