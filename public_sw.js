// EFATA777 V19 — installability network-only Service Worker com ícone Patroai
// Objetivo:
// - satisfazer critérios Chromium de installability com fetch handler real;
// - manter landing rápida e sem cache agressivo;
// - não fazer precache, não fazer warmAppShell, não cachear API;
// - limpar caches legados e responder sempre pela rede.

const EFATA777_SW_VERSION = "v19-installability-network-only-landing-button";

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
  event.waitUntil(clearLegacyCaches());
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

function shouldNetworkHandle(request) {
  try {
    if (!request || request.method !== "GET") return false;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;

    // Nunca interceptar API/eventos/sockets/transcrições/env runtime.
    if (url.pathname.startsWith("/api/")) return false;
    if (url.pathname === "/env.js") return false;
    if (url.pathname.startsWith("/sockjs")) return false;

    // Critério de installability Chromium: SW precisa ter fetch handler real.
    // Usamos network-only para todos os GET same-origin elegíveis.
    return true;
  } catch {
    return false;
  }
}

// Fetch handler real, porém conservador:
// - event.respondWith(fetch(...)) somente para GET same-origin elegíveis;
// - sem cache, sem fallback offline, sem shell pré-carregado;
// - evita pending por cache antigo e satisfaz installability.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!shouldNetworkHandle(request)) return;

  event.respondWith(
    fetch(request).catch(() => {
      // Sem fallback HTML para não mascarar erro real nem travar landing.
      return new Response("", {
        status: 503,
        statusText: "Network unavailable",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-EFATA777-SW": EFATA777_SW_VERSION,
        },
      });
    })
  );
});

self.addEventListener("message", (event) => {
  try {
    const type = event?.data?.type;

    if (type === "SKIP_WAITING") {
      self.skipWaiting();
      return;
    }

    if (type === "EFATA777_CLEAR_LEGACY_CACHES") {
      event.waitUntil(clearLegacyCaches());
      return;
    }

    if (type === "EFATA777_PWA_DIAGNOSTIC") {
      event?.source?.postMessage?.({
        type: "EFATA777_PWA_DIAGNOSTIC_RESULT",
        sw_version: EFATA777_SW_VERSION,
        cache_policy: "network-only",
        cache_keys_cleared: true,
      });
    }
  } catch {}
});
