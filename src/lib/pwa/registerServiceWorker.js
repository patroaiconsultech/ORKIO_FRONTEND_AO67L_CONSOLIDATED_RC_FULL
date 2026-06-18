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

  if (!isSecure) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.info("[PWA] Service Worker registrado:", registration.scope);
      })
      .catch((error) => {
        console.warn(
          "[PWA] Service Worker não registrado:",
          error?.message || error
        );
      });
  });
}
