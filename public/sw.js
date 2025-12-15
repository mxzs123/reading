const CACHE_NAME = "reading-pwa-v3";
const PRECACHE_URLS = [
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
  const isPageRequest =
    event.request.mode === "navigate" ||
    event.request.destination === "document";
  const isNextAsset =
    url.pathname.startsWith("/_next/") && !url.pathname.includes("/static/");

  // API 和页面请求使用网络优先
  if (isApiRequest || isPageRequest || isNextAsset) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() =>
        caches.match(event.request),
      ),
    );
    return;
  }

  // 仅静态资源（图标、manifest）使用缓存优先
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
