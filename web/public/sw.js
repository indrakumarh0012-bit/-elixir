// Smart-Elixir service worker.
// Bump CACHE_VERSION whenever the shell list below changes; activate() drops
// every older cache, so a deploy never serves a half-stale shell.
const CACHE_VERSION = 'pocket-med-v4'
const SHELL = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/logo.png',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
]

/**
 * The app's JS/CSS filenames are content-hashed, so they cannot be listed here.
 * They are also fetched before this worker takes control on a first visit, so
 * waiting to catch them in fetch() leaves the app broken offline. Read them out
 * of index.html at install time instead.
 */
async function precache() {
  const cache = await caches.open(CACHE_VERSION)
  // add() is per-URL rather than addAll() so one 404 cannot void the whole shell.
  await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})))

  try {
    const res = await fetch('/index.html', { cache: 'reload' })
    if (!res.ok) return
    const html = await res.text()
    await cache.put('/index.html', new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }))
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
    await Promise.all(assets.map((url) => cache.add(url).catch(() => {})))
  } catch {
    // Offline at install time: fetch() below fills the cache on a later visit.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
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
