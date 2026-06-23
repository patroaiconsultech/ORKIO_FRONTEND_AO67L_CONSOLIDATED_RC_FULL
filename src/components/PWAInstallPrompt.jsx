import React, { useEffect, useMemo, useState } from "react";

const DISMISS_KEY = "patroai_pwa_install_dismissed_at_v18";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 3;

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
  } catch {}
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

function userAgent() {
  try {
    return String(navigator.userAgent || "");
  } catch {
    return "";
  }
}

function isIosSafariLike() {
  const ua = userAgent();
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return isIOS && isSafari;
}

function isAndroidLike() {
  return /android/i.test(userAgent());
}

function isSamsungInternet() {
  return /SamsungBrowser/i.test(userAgent());
}

function isChromiumDesktopLike() {
  const ua = userAgent();
  return /Chrome|Chromium|Edg/i.test(ua) && !/Android|iPhone|iPad|iPod/i.test(ua);
}

function hasKnownInstallSurface() {
  return isIosSafariLike() || isAndroidLike() || isChromiumDesktopLike();
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [manualHintVisible, setManualHintVisible] = useState(false);

  const pt = useMemo(() => isPortuguese(), []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (isStandalone() || wasRecentlyDismissed()) return undefined;

    if (isIosSafariLike()) {
      setManualHintVisible(true);
    }

    const manualTimer = window.setTimeout(() => {
      if (!isStandalone() && hasKnownInstallSurface()) {
        setManualHintVisible(true);
      }
    }, 4000);

    const onBeforeInstallPrompt = (event) => {
      try {
        event.preventDefault?.();
      } catch {}

      setDeferredPrompt(event);
      setVisible(true);
      setManualHintVisible(false);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setManualHintVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.clearTimeout(manualTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (isStandalone()) return null;
  if (!visible && !manualHintVisible) return null;

  const title = pt ? "Instalar Patroai" : "Install Patroai";

  const manualBody = pt
    ? isIosSafariLike()
      ? "No iPhone/iPad, toque em Compartilhar e escolha “Adicionar à Tela de Início”."
      : isSamsungInternet()
        ? "No Samsung Internet, toque no menu e escolha “Adicionar página a” ou “Adicionar à tela inicial”."
        : "No Chrome, toque no menu ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”."
    : isIosSafariLike()
      ? "On iPhone/iPad, tap Share and choose “Add to Home Screen”."
      : isSamsungInternet()
        ? "In Samsung Internet, open the menu and choose “Add page to” or “Add to Home screen”."
        : "In Chrome, open the ⋮ menu and choose “Install app” or “Add to Home screen”.";

  const body = visible
    ? pt
      ? "Adicione a Patroai à tela inicial para acessar o ambiente privado com mais rapidez."
      : "Add Patroai to your home screen for faster access."
    : manualBody;

  const installLabel = pt ? "Instalar" : "Install";
  const dismissLabel = pt ? "Agora não" : "Not now";

  async function handleInstall() {
    const prompt = deferredPrompt;

    if (!prompt) {
      setManualHintVisible(true);
      return;
    }

    try {
      await prompt.prompt?.();
      await prompt.userChoice;
    } catch {}

    setVisible(false);
    setManualHintVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    safeLocalStorageSet(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setManualHintVisible(false);
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
        background: "rgba(3,7,19,0.94)",
        color: "#fff",
        boxShadow: "0 18px 54px rgba(0,0,0,0.38)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <strong style={{ display: "block", fontSize: 16, marginBottom: 6 }}>
        {title}
      </strong>

      <p style={{ margin: 0, opacity: 0.84, lineHeight: 1.45 }}>
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
              background: "linear-gradient(135deg, #ffe9a6, #c88719)",
              color: "#111827",
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
