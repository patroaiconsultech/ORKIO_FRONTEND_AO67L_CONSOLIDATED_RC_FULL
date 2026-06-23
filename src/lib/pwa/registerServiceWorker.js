// EFATA777 V13 — safe PWA Service Worker registration
// Registra /sw.js sem cache e tenta ativar a versão nova sem recarregar em loop.

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

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      console.info("[PWA] Service Worker registrado:", registration.scope);

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
            try {
              registration.waiting?.postMessage({ type: "SKIP_WAITING" });
            } catch {}
            console.info("[PWA] Nova versão do Service Worker instalada.");
          }
        });
      });
    } catch (error) {
      console.warn("[PWA] Service Worker não registrado:", error?.message || error);
    }
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }

  navigator.serviceWorker.addEventListener?.("controllerchange", () => {
    console.info("[PWA] Service Worker controller atualizado.");
  });
}
