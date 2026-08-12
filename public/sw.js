const CACHE_NAME = 'lumicrm-shell-v5'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192-v2.png', '/icon-512-v2.png']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)),
    )),
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return

  const destination = event.request.destination
  const mustRevalidate = event.request.mode === 'navigate'
    || destination === 'script'
    || destination === 'style'

  if (mustRevalidate) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone()
            const cacheKey = event.request.mode === 'navigate' ? '/index.html' : event.request
            caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, copy))
          }
          return response
        })
        .catch(() => event.request.mode === 'navigate'
          ? caches.match('/index.html')
          : caches.match(event.request)),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy))
      }
      return response
    })),
  )
})

self.addEventListener('push', event => {
  let payload = { title: 'LumiCRM', body: 'В вашем офисе новое событие', link: '/' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    if (event.data) payload.body = event.data.text()
  }

  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/icon-192-v2.png',
    badge: '/icon-192-v2.png',
    data: { link: payload.link || '/' },
    tag: payload.tag || 'lumicrm-notification',
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const link = event.notification.data?.link || '/'
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(openClients => {
    for (const client of openClients) {
      if ('focus' in client) {
        client.navigate(link)
        return client.focus()
      }
    }
    return clients.openWindow(link)
  }))
})
