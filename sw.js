// Pocket-Med service worker.
// Bump CACHE_VERSION whenever the shell list below changes; activate() drops
// every older cache, so a deploy never serves a half-stale shell.
const CACHE_VERSION = 'pocket-med-v20'

// The app is served from a sub-path on GitHub Pages, so every URL is derived
// from where this worker actually lives rather than hard-coded to '/'.
const BASE = new URL('./', self.location).pathname
const INDEX = BASE + 'index.html'
const SHELL = [
  BASE,
  INDEX,
  BASE + 'favicon.svg',
  BASE + 'logo.png',
  BASE + 'manifest.webmanifest',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
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
    const res = await fetch(INDEX, { cache: 'reload' })
    if (!res.ok) return
    const html = await res.text()
    await cache.put(INDEX, new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }))
    const assets = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)]
      .map((m) => BASE + m[1])
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

/**
 * Navigations: fresh when online, cached shell when not — never a browser
 * error page. cache:'no-cache' revalidates past the HTTP cache (GitHub Pages
 * sends max-age=600), so a reopen shows the newest deploy, not a stale copy.
 */
async function navigationHandler(request) {
  try {
    const response = await fetch(request, { cache: 'no-cache' })
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(INDEX, response.clone())
    }
    return response
  } catch {
    return (
      (await caches.match(INDEX)) ||
      (await caches.match(BASE)) ||
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

  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request))
    return
  }

  // Build output is content-hashed, so a hit is always correct.
  if (url.pathname.startsWith(BASE + 'assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})
