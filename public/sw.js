// EFATA777 V16 — conservative PWA re-enable with official Patroai icon
// Objetivo: reabilitar installability sem cache agressivo e sem controlar/interceptar a landing.
// Não faz precache. Não cacheia API. Não usa warmAppShell.

const EFATA777_SW_VERSION = "v16-conservative-pwa";

async function clearLegacyCaches() {
  try {
    if (!self.caches) return;
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => /orkio|patroai|efata777/i.test(String(key || "")))
        .map((key) => caches.delete(key))
    );
  } catch {}
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await clearLegacyCaches();
      try {
        await self.clients.claim();
      } catch {}
    })()
  );
});

// Fetch listener conservador:
// - mantém installability;
// - não intercepta a landing "/" nem assets;
// - só faz pass-through explícito de navegação do /app;
// - sem cache, sem fallback, sem warmAppShell.
self.addEventListener("fetch", (event) => {
  try {
    const request = event.request;
    if (!request || request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/api/")) return;
    if (url.pathname === "/env.js") return;

    const isAppNavigation =
      request.mode === "navigate" && url.pathname.startsWith("/app");

    if (!isAppNavigation) return;

    event.respondWith(fetch(request));
  } catch {}
});

self.addEventListener("message", (event) => {
  try {
    if (event?.data?.type === "SKIP_WAITING") {
      self.skipWaiting();
      return;
    }

    if (event?.data?.type === "EFATA777_CLEAR_LEGACY_CACHES") {
      event.waitUntil(clearLegacyCaches());
    }
  } catch {}
});
