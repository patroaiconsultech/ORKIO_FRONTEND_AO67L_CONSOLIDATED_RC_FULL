const CACHE_NAME = "patroai-executive-shell-v1";

const APP_SHELL = [
  "/",
  "/app",
  "/auth",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.allSettled(
    APP_SHELL.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "reload" });

        if (!response || !response.ok) return;

        await cache.put(url, response);
      } catch {
        // Non-critical asset. Do not block Service Worker installation.
      }
    })
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(cacheAppShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (!request || request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/realtime/")) return;
  if (url.pathname === "/env.js") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        return (
          (await caches.match("/app")) ||
          (await caches.match("/")) ||
          Response.error()
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const copy = response.clone();

          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch(() => undefined);

          return response;
        })
        .catch(() => cached || Response.error());
    })
  );
});
