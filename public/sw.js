// EFATA777 V15 — HARD cache/SW expulsion for landing recovery
// Escopo temporário: matar SW antigo, limpar caches e não interceptar nenhum request.
// Não reativar cache/PWA até a landing estabilizar.

const EFATA777_SW_RECOVERY_VERSION = "v15-hard-cache-expulsion";

async function clearAllCaches() {
  try {
    if (!self.caches) return;
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {}
}

async function navigateClientsOnce() {
  try {
    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    await Promise.all(
      clients.map((client) => {
        try {
          const url = new URL(client.url);
          if (url.searchParams.get("sw_recovered") === "v15") return Promise.resolve();
          url.searchParams.set("sw_recovered", "v15");
          return client.navigate(url.toString());
        } catch {
          return Promise.resolve();
        }
      })
    );
  } catch {}
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(clearAllCaches());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await clearAllCaches();

      try {
        await self.registration.unregister();
      } catch {}

      await navigateClientsOnce();
    })()
  );
});

// Intencionalmente vazio.
// Não usar event.respondWith aqui.
self.addEventListener("fetch", () => {});

self.addEventListener("message", (event) => {
  try {
    if (event?.data?.type === "EFATA777_CLEAR_SW") {
      event.waitUntil(
        (async () => {
          await clearAllCaches();
          try {
            await self.registration.unregister();
          } catch {}
          await navigateClientsOnce();
        })()
      );
    }
  } catch {}
});
