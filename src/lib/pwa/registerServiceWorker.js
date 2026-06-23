// EFATA777 V20 — conservative installability Service Worker registration
// Reabilita PWA install com SW network-only.
// Não usa cache agressivo. Não faz warmAppShell. Não compete com o primeiro render.

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

  const params = new URLSearchParams(window.location.search || "");
  if (params.get("sw") === "off") {
    console.info("[PWA] EFATA777 V20: Service Worker pulado por sw=off.");
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

  const exposeDiagnostic = async (registration = null) => {
    try {
      window.__PATROAI_PWA_STATUS__ = {
        version: "v20-polish-pwa-network-only",
        hasServiceWorker: "serviceWorker" in navigator,
        controller: Boolean(navigator.serviceWorker.controller),
        registrationScope: registration?.scope || null,
        displayModeStandalone:
          window.matchMedia?.("(display-mode: standalone)")?.matches ||
          window.navigator?.standalone === true,
      };
    } catch {}
  };

  const register = async () => {
    try {
      await clearLegacyCaches();

      const registration = await navigator.serviceWorker.register("/sw.js?v=20", {
        scope: "/",
        updateViaCache: "none",
      });

      console.info("[PWA] EFATA777 V20: Service Worker installability/network-only registrado:", registration.scope);

      try {
        registration.active?.postMessage?.({ type: "EFATA777_CLEAR_LEGACY_CACHES" });
        registration.waiting?.postMessage?.({ type: "SKIP_WAITING" });
      } catch {}

      try {
        await registration.update();
      } catch {}

      try {
        await navigator.serviceWorker.ready;
      } catch {}

      await exposeDiagnostic(registration);

      registration.addEventListener?.("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener?.("statechange", () => {
          if (installing.state === "installed") {
            console.info("[PWA] EFATA777 V20: nova versão do SW instalada.");
          }
        });
      });
    } catch (error) {
      console.warn("[PWA] EFATA777 V20: Service Worker não registrado:", error?.message || error);
      await exposeDiagnostic(null);
    }
  };

  const deferRegister = () => {
    window.setTimeout(register, 800);
  };

  if (document.readyState === "complete") {
    deferRegister();
  } else {
    window.addEventListener("load", deferRegister, { once: true });
  }

  navigator.serviceWorker.addEventListener?.("controllerchange", () => {
    console.info("[PWA] EFATA777 V20: controller atualizado. Recarregue uma vez se o botão de instalação ainda não aparecer.");
    exposeDiagnostic(null);
  });
}
