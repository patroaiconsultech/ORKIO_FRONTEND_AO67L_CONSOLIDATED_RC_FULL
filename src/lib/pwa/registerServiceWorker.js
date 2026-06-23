// EFATA777 V15 — temporary no-op Service Worker registration
// Motivo: expulsar SW/cache antigo que pode deixar a landing em branco.
// Reabilitar PWA install apenas em versão posterior, sem cache agressivo.

export function registerServiceWorker() {
  if (typeof window === "undefined") return;

  try {
    if (!("serviceWorker" in navigator)) return;

    const clearCaches = () => {
      try {
        if (!window.caches) return Promise.resolve();
        return caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
      } catch {
        return Promise.resolve();
      }
    };

    navigator.serviceWorker.getRegistrations?.()
      ?.then((registrations) => Promise.all(registrations.map((registration) => {
        try {
          if (registration?.active) {
            registration.active.postMessage({ type: "EFATA777_CLEAR_SW" });
          }
        } catch {}
        return registration.unregister();
      })))
      ?.then(clearCaches)
      ?.then(() => {
        console.info("[PWA] EFATA777 V15: Service Worker/cache desativado temporariamente para recuperar a landing.");
      })
      ?.catch((error) => {
        console.warn("[PWA] EFATA777 V15: limpeza de Service Worker/cache falhou:", error?.message || error);
      });
  } catch (error) {
    console.warn("[PWA] EFATA777 V15: Service Worker no-op falhou:", error?.message || error);
  }
}
