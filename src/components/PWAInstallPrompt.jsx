import React, { useEffect, useMemo, useState } from "react";

const DISMISS_KEY = "orkio_pwa_install_dismissed_at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function detectPreferredLanguage() {
  try {
    const raw =
      document?.documentElement?.lang ||
      navigator?.language ||
      navigator?.languages?.[0] ||
      "pt-BR";

    return String(raw || "pt-BR").toLowerCase();
  } catch {
    return "pt-br";
  }
}

function isPortuguese() {
  return detectPreferredLanguage().startsWith("pt");
}

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable in private mode. Ignore safely.
  }
}

function wasRecentlyDismissed() {
  const dismissedAt = Number(safeLocalStorageGet(DISMISS_KEY) || 0);

  if (!dismissedAt) return false;

  return Date.now() - dismissedAt < DISMISS_TTL_MS;
}

function isStandalone() {
  try {
    return (
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator?.standalone === true
    );
  } catch {
    return false;
  }
}

function isIosSafariLike() {
  try {
    const ua = String(navigator.userAgent || "");
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);

    return isIOS && isSafari;
  } catch {
    return false;
  }
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHintVisible, setIosHintVisible] = useState(false);

  const pt = useMemo(() => isPortuguese(), []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    if (!wasRecentlyDismissed() && isIosSafariLike() && !isStandalone()) {
      setIosHintVisible(true);
    }

    const onBeforeInstallPrompt = (event) => {
      try {
        event.preventDefault?.();
      } catch {
        // Some browsers expose a non-standard event. Ignore safely.
      }

      setDeferredPrompt(event);
      setVisible(true);
      setIosHintVisible(false);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setIosHintVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (isStandalone()) return null;
  if (!visible && !iosHintVisible) return null;

  const title = pt ? "Instalar Orkio" : "Install Orkio";

  const body = iosHintVisible
    ? pt
      ? "No iPhone, toque em Compartilhar e escolha “Adicionar à Tela de Início”."
      : "On iPhone, tap Share and choose “Add to Home Screen”."
    : pt
      ? "Adicione o Orkio à tela inicial para acessar mais rápido."
      : "Add Orkio to your home screen for faster access.";

  const installLabel = pt ? "Instalar" : "Install";
  const dismissLabel = pt ? "Agora não" : "Not now";

  async function handleInstall() {
    const prompt = deferredPrompt;

    if (!prompt) return;

    try {
      await prompt.prompt?.();
      await prompt.userChoice;
    } catch {
      // User cancellation or browser issue. Close prompt without blocking UI.
    }

    setVisible(false);
    setIosHintVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    safeLocalStorageSet(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setIosHintVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label={title}
      aria-live="polite"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 9999,
        maxWidth: 520,
        margin: "0 auto",
        padding: 16,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(3,7,19,0.92)",
        color: "#fff",
        boxShadow: "0 18px 54px rgba(0,0,0,0.38)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <strong style={{ display: "block", fontSize: 16, marginBottom: 6 }}>
        {title}
      </strong>

      <p style={{ margin: 0, opacity: 0.82, lineHeight: 1.45 }}>
        {body}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 14,
        }}
      >
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            borderRadius: 999,
            padding: "10px 14px",
            fontWeight: 800,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          {dismissLabel}
        </button>

        {deferredPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            style={{
              border: 0,
              background: "linear-gradient(135deg, #8b5cf6, #f59e0b)",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 16px",
              fontWeight: 900,
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            {installLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
