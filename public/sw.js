// EFATA777 V14 — HARD Service Worker kill / landing recovery
// Objetivo: retirar imediatamente controle de SW antigo que trava JS/CSS/landing.
// Escopo temporário: sem cache, sem precache, sem respondWith.

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {}

      try {
        await self.registration.unregister();
      } catch {}

      try {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        await Promise.all(
          clients.map((client) => {
            try {
              return client.navigate(client.url);
            } catch {
              return Promise.resolve();
            }
          })
        );
      } catch {}
    })()
  );
});

// Deliberadamente sem respondWith.
// Um fetch listener vazio evita cache agressivo e não intercepta recursos.
self.addEventListener("fetch", () => {});

self.addEventListener("message", (event) => {
  try {
    if (event?.data?.type === "SKIP_WAITING") self.skipWaiting();
    if (event?.data?.type === "CLEAR_PATROAI_CACHES") {
      event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      );
    }
  } catch {}
});
