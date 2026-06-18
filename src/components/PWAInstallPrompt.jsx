import React, { useEffect, useState } from "react";

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
  const lang = detectPreferredLanguage();
  return lang.startsWith("pt");
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onBeforeInstallPrompt = (event) => {
      try { event.preventDefault?.(); } catch {}
      setDeferredPrompt(event);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!visible || !deferredPrompt) return null;

  const pt = isPortuguese();
  const title = pt ? "Instalar Orkio" : "Install Orkio";
  const body = pt
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
    } catch {}
    setVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setVisible(false);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 9999,
        display: "grid",
        gap: 10,
        padding: "14px",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(15,23,42,0.94)",
        color: "#fff",
        boxShadow: "0 22px 70px rgba(0,0,0,0.38)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        maxWidth: 460,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "grid", gap: 3 }}>
        <div style={{ fontWeight: 950, fontSize: 15 }}>{title}</div>
        <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.45 }}>
          {body}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            borderRadius: 12,
            padding: "10px 12px",
            fontWeight: 800,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          {dismissLabel}
        </button>
        <button
          type="button"
          onClick={handleInstall}
          style={{
            border: 0,
            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
            color: "#04111d",
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 950,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          {installLabel}
        </button>
      </div>
    </div>
  );
}
