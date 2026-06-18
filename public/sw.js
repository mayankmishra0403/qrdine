const CACHE = "rb-static-v2"
const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
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
  if (!isStaticAsset(event.request.url)) return

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
})
