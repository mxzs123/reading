const CACHE_NAME = "reading-pwa-v2";
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isApiRequest = url.pathname.startsWith("/api/");

  if (isApiRequest) {
    // API 请求使用网络优先并跳过缓存，确保拿到最新数据
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() =>
        caches.match(event.request),
      ),
    );
    return;
  }

  // 其它静态资源仍使用 cache-first，以提升离线体验
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request, { cache: "no-store" })
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => cachedResponse);
    }),
  );
});
