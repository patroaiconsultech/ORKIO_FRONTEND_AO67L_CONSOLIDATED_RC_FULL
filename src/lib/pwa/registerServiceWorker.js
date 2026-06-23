// EFATA777 V16 — conservative PWA Service Worker registration
// Reabilita PWA install sem cache agressivo.
// Registro atrasado para não competir com o primeiro render da landing.

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const isSecure =
    window.location.protocol === "https:" ||
    isLocalhost ||
    window.isSecureContext === true;

  if (!isSecure) {
    console.warn("[PWA] Service Worker não registrado: contexto não seguro.");
    return;
  }

  const shouldSkip =
    new URLSearchParams(window.location.search || "").get("sw") === "off";

  if (shouldSkip) {
    console.info("[PWA] Service Worker pulado por sw=off.");
    return;
  }

  const clearLegacyCaches = async () => {
    try {
      if (!window.caches) return;
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => /orkio|patroai|efata777/i.test(String(key || "")))
          .map((key) => caches.delete(key))
      );
    } catch {}
  };

  const register = async () => {
    try {
      await clearLegacyCaches();

      const registration = await navigator.serviceWorker.register("/sw.js?v=16", {
        scope: "/",
        updateViaCache: "none",
      });

      console.info("[PWA] EFATA777 V16: Service Worker conservador registrado:", registration.scope);

      try {
        registration.active?.postMessage?.({ type: "EFATA777_CLEAR_LEGACY_CACHES" });
      } catch {}

      try {
        await registration.update();
      } catch {}

      if (registration.waiting) {
        try {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        } catch {}
      }

      registration.addEventListener?.("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener?.("statechange", () => {
          if (installing.state === "installed") {
            console.info("[PWA] EFATA777 V16: nova versão do SW instalada.");
          }
        });
      });
    } catch (error) {
      console.warn("[PWA] EFATA777 V16: Service Worker não registrado:", error?.message || error);
    }
  };

  const deferRegister = () => {
    const delayMs = 1800;
    window.setTimeout(register, delayMs);
  };

  if (document.readyState === "complete") {
    deferRegister();
  } else {
    window.addEventListener("load", deferRegister, { once: true });
  }

  navigator.serviceWorker.addEventListener?.("controllerchange", () => {
    console.info("[PWA] EFATA777 V16: controller atualizado.");
  });
}
