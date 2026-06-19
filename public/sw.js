const CACHE = "rb-static-v2"
const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/offline.html",
]

function isStaticAsset(url) {
  const path = new URL(url).pathname
  return (
    path.startsWith("/_next/static/") ||
    path.startsWith("/icons/") ||
    path === "/manifest.json"
  )
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener("fetch", (event) => {
  if (isStaticAsset(event.request.url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        const response = await fetch(event.request)
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        }
        return response
      })()
    )
    return
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request)
        } catch {
          const cached = await caches.match("/offline.html")
          if (cached) return cached
          return new Response("Offline", { status: 503 })
        }
      })()
    )
  }
})

self.addEventListener("push", (event) => {
  if (!event.data) return
  try {
    const data = event.data.json()
    const title = data.title || "Ritam Bharat POS"
    const options = {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: data.data || {},
      vibrate: [200, 100, 200],
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch {
    const text = event.data.text()
    event.waitUntil(self.registration.showNotification(text))
  }
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/waiter-app"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && "focus" in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
