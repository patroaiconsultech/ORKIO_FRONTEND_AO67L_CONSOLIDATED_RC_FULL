// EFATA777 V14 — temporary no-op Service Worker registration
// Motivo: recuperar a landing de SW antigo que ficou controlando requests.
// Reabilitar PWA install em versão posterior, quando a landing estiver estável.

export function registerServiceWorker() {
  if (typeof window === "undefined") return;

  try {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations?.()
      ?.then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      ?.then(() => {
        if (!window.caches) return null;
        return caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
      })
      ?.then(() => {
        console.info("[PWA] EFATA777 V14: Service Worker desativado temporariamente para recuperar a landing.");
      })
      ?.catch((error) => {
        console.warn("[PWA] EFATA777 V14: limpeza de Service Worker falhou:", error?.message || error);
      });
  } catch (error) {
    console.warn("[PWA] EFATA777 V14: Service Worker no-op falhou:", error?.message || error);
  }
}
