const swUrl = new URL(self.location.href)
const appVersion = swUrl.searchParams.get('v') || 'dev'
const cacheName = `astrobooox-cache-${appVersion}`

const appShellPaths = [
  './',
  './index.html',
  './cc/',
  './cc/index.html',
  './cc/help/',
  './cc/help/index.html',
  './favicon.svg'
]

const toAbsoluteUrl = (path) => new URL(path, self.registration.scope).toString()

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName)
    const requests = appShellPaths.map((path) => new Request(toAbsoluteUrl(path), { cache: 'reload' }))
    await cache.addAll(requests)
    self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((key) => key.startsWith('astrobooox-cache-') && key !== cacheName)
        .map((key) => caches.delete(key))
    )
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request)
        const cache = await caches.open(cacheName)
        cache.put(request, networkResponse.clone())
        return networkResponse
      } catch {
        const cachedResponse = await caches.match(request)
        return cachedResponse || caches.match(toAbsoluteUrl('./index.html'))
      }
    })())
    return
  }

  const isStaticAsset = /\.(?:js|css|woff2?|png|svg|jpg|jpeg|gif|webp|ico|json)$/i.test(url.pathname)
  if (!isStaticAsset) {
    return
  }

  event.respondWith((async () => {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      event.waitUntil((async () => {
        try {
          const fresh = await fetch(request)
          await cache.put(request, fresh.clone())
        } catch {
          // ignore network update errors for background refresh
        }
      })())
      return cachedResponse
    }

    const networkResponse = await fetch(request)
    await cache.put(request, networkResponse.clone())
    return networkResponse
  })())
})
