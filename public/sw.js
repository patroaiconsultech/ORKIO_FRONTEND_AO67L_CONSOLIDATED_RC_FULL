// EFATA777 V12 — PWA installability + official Patroai logo
// Scope: public shell only. API/realtime requests are never cached.

const CACHE_NAME = "patroai-pwa-shell-v12-logo-patroai";
const APP_SHELL = [
  "/",
  "/app",
  "/auth",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon-48x48.png",
  "/favicon-192x192.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/patroai-assets/logo-patroai-novo.png",
  "/icons/patroai-192.png",
  "/icons/patroai-512.png"
];

function isSameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch {
    return false;
  }
}

function shouldBypass(request) {
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return true;
    if (url.pathname.startsWith("/api/")) return true;
    if (url.pathname.startsWith("/realtime/")) return true;
    if (url.pathname === "/env.js") return true;
    if (url.pathname.includes("sockjs-node")) return true;
    if (url.pathname.includes("__vite")) return true;
    return false;
  } catch {
    return true;
  }
}

async function putIfCacheable(cache, request, response) {
  try {
    if (!response || response.status !== 200) return;
    if (response.type && !["basic", "default"].includes(response.type)) return;
    await cache.put(request, response.clone());
  } catch {
    // Cache is best-effort only.
  }
}

async function warmAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(
    APP_SHELL.map(async (url) => {
      try {
        const response = await fetch(url, {
          cache: "reload",
          credentials: "same-origin"
        });
        await putIfCacheable(cache, url, response);
      } catch {
        // Never block Service Worker installation because one shell asset failed.
      }
    })
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(warmAppShell());
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

self.addEventListener("message", (event) => {
  try {
    if (event?.data?.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
  } catch {}
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (!request || request.method !== "GET") return;
  if (!isSameOrigin(request.url)) return;
  if (shouldBypass(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          const fresh = await fetch(request);
          await putIfCacheable(cache, request, fresh);
          return fresh;
        } catch {
          return (
            (await cache.match(request)) ||
            (await cache.match("/app")) ||
            (await cache.match("/")) ||
            new Response(
              "<!doctype html><title>Patroai offline</title><meta name='viewport' content='width=device-width,initial-scale=1'><body style='font-family:sans-serif;background:#030713;color:white;padding:24px'>Patroai temporariamente offline. Verifique a conexão e tente novamente.</body>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } }
            )
          );
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;

      const fresh = await fetch(request);
      await putIfCacheable(cache, request, fresh);
      return fresh;
    })()
  );
});
