const CACHE_NAME = 'liftlab-shell-v2'
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/liftlab-192.png',
  './icons/liftlab-512.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('liftlab-shell-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Never intercept cross-origin requests (including Supabase).
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        return (await cache.match('./index.html')) || Response.error()
      })
    )
    return
  }

  // Network-first keeps deployed app assets current, with cache fallback offline.
  if (/\.(?:js|css|svg|png|webp|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        try {
          const response = await fetch(request)
          if (response.ok) {
            await cache.put(request, response.clone())
          }
          return response
        } catch {
          return (await cache.match(request)) || Response.error()
        }
      })()
    )
  }
})
