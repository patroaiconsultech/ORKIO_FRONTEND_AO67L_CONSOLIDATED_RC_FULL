// EFATA777 V13 — PWA landing recovery / network-first kill switch
// Motivo: recuperar landing quando um Service Worker anterior prende fetch/precache.
// Escopo: não intercepta respostas. Mantém registro PWA, limpa caches antigos e deixa tudo ir para a rede.

const CACHE_NAME = "patroai-pwa-shell-v13-network-recovery";

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
      } catch {
        // Best-effort cache cleanup.
      }

      try {
        await self.clients.claim();
      } catch {
        // Best-effort immediate control.
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  try {
    if (event?.data?.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
    if (event?.data?.type === "CLEAR_PATROAI_CACHES") {
      event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      );
    }
  } catch {}
});

// Importante:
// Não chamar event.respondWith aqui.
// Isso devolve o controle total ao navegador/rede e evita travar JS/CSS/landing/PWA.
// Manter um fetch listener sem respondWith preserva compatibilidade com navegadores
// que esperam Service Worker registrado para installability, sem criar cache agressivo.
self.addEventListener("fetch", () => {});
