import React, { useEffect, useMemo, useState } from "react";

function safeNavigator() {
  try {
    return typeof navigator !== "undefined" ? navigator : null;
  } catch {
    return null;
  }
}

function safeWindow() {
  try {
    return typeof window !== "undefined" ? window : null;
  } catch {
    return null;
  }
}

function detectLanguage() {
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

function isStandalone() {
  const win = safeWindow();
  const nav = safeNavigator();

  try {
    return (
      win?.matchMedia?.("(display-mode: standalone)")?.matches ||
      win?.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      win?.matchMedia?.("(display-mode: minimal-ui)")?.matches ||
      nav?.standalone === true
    );
  } catch {
    return false;
  }
}

function getUserAgent() {
  return String(safeNavigator()?.userAgent || "");
}

function detectInstallSurface() {
  const ua = getUserAgent();
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isSamsung = /SamsungBrowser/i.test(ua);
  const isChrome = /Chrome|Chromium|CriOS/i.test(ua) && !/Edg|OPR|SamsungBrowser/i.test(ua);
  const isEdge = /Edg/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|SamsungBrowser/i.test(ua);

  if (isIOS && isSafari) return "ios-safari";
  if (isIOS) return "ios-browser";
  if (isSamsung) return "samsung";
  if (isAndroid && isChrome) return "android-chrome";
  if (isAndroid) return "android-browser";
  if (isChrome || isEdge) return "desktop-chromium";
  return "generic";
}

function getManualInstructions(pt, surface) {
  if (pt) {
    if (surface === "ios-safari" || surface === "ios-browser") {
      return {
        title: "Instalar no iPhone/iPad",
        body: "Toque em Compartilhar e escolha “Adicionar à Tela de Início”.",
        steps: ["Abra esta página no Safari.", "Toque no ícone de compartilhar.", "Escolha “Adicionar à Tela de Início”."]
      };
    }

    if (surface === "samsung") {
      return {
        title: "Instalar no Samsung Internet",
        body: "Abra o menu do navegador e escolha a opção de adicionar à tela inicial.",
        steps: ["Toque no menu do Samsung Internet.", "Escolha “Adicionar página a”.", "Selecione “Tela inicial”."]
      };
    }

    if (surface === "android-chrome") {
      return {
        title: "Instalar no Chrome Android",
        body: "Abra o menu do Chrome e escolha “Instalar app” ou “Adicionar à tela inicial”.",
        steps: ["Toque nos três pontos ⋮.", "Escolha “Instalar app” ou “Adicionar à tela inicial”.", "Confirme a instalação."]
      };
    }

    if (surface === "desktop-chromium") {
      return {
        title: "Instalar no desktop",
        body: "Quando disponível, use o ícone de instalação na barra de endereço ou o menu do navegador.",
        steps: ["Veja se há um ícone de instalação na barra de endereço.", "Ou abra o menu ⋮.", "Escolha “Instalar Patroai”."]
      };
    }

    return {
      title: "Instalar app Patroai",
      body: "Use o menu do navegador para adicionar a Patroai à tela inicial.",
      steps: ["Abra o menu do navegador.", "Procure por “Instalar app” ou “Adicionar à tela inicial”.", "Confirme a instalação."]
    };
  }

  if (surface === "samsung") {
    return {
      title: "Install in Samsung Internet",
      body: "Open the browser menu and add this page to your home screen.",
      steps: ["Open the Samsung Internet menu.", "Choose “Add page to”.", "Select “Home screen”."]
    };
  }

  if (surface === "ios-safari" || surface === "ios-browser") {
    return {
      title: "Install on iPhone/iPad",
      body: "Tap Share and choose “Add to Home Screen”.",
      steps: ["Open this page in Safari.", "Tap the share icon.", "Choose “Add to Home Screen”."]
    };
  }

  return {
    title: "Install Patroai",
    body: "Use your browser menu to install the Patroai app.",
    steps: ["Open the browser menu.", "Choose “Install app” or “Add to Home screen”.", "Confirm installation."]
  };
}

function updateDebugStatus(extra = {}) {
  const win = safeWindow();
  if (!win) return;

  try {
    win.__PATROAI_PWA_INSTALL_BUTTON__ = {
      at: new Date().toISOString(),
      standalone: isStandalone(),
      surface: detectInstallSurface(),
      hasDeferredPrompt: Boolean(win.__PATROAI_DEFERRED_INSTALL_PROMPT__),
      ...extra,
    };
  } catch {}
}

export default function PWAInstallButton({
  className = "",
  label,
  compactLabel,
  title,
  variant = "default",
}) {
  const [deferredPrompt, setDeferredPrompt] = useState(() => safeWindow()?.__PATROAI_DEFERRED_INSTALL_PROMPT__ || null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [installState, setInstallState] = useState("idle");

  const pt = useMemo(() => detectLanguage().startsWith("pt"), []);
  const surface = useMemo(() => detectInstallSurface(), []);
  const instructions = useMemo(() => getManualInstructions(pt, surface), [pt, surface]);

  const buttonLabel = label || (pt ? "Baixar app" : "Install app");
  const buttonCompactLabel = compactLabel || (pt ? "App" : "App");
  const buttonTitle = title || (pt ? "Baixar ou instalar o app Patroai" : "Download or install the Patroai app");

  useEffect(() => {
    const win = safeWindow();
    if (!win) return undefined;

    updateDebugStatus({ source: "mount" });

    const onBeforeInstallPrompt = (event) => {
      try {
        event.preventDefault?.();
      } catch {}

      win.__PATROAI_DEFERRED_INSTALL_PROMPT__ = event;
      setDeferredPrompt(event);
      updateDebugStatus({ source: "beforeinstallprompt" });
    };

    const onAppInstalled = () => {
      setInstallState("installed");
      setDialogOpen(false);
      setDeferredPrompt(null);
      try {
        win.__PATROAI_DEFERRED_INSTALL_PROMPT__ = null;
      } catch {}
      updateDebugStatus({ source: "appinstalled" });
    };

    win.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    win.addEventListener("appinstalled", onAppInstalled);

    win.__PATROAI_TRY_INSTALL_PWA__ = async () => {
      setDialogOpen(true);
      await tryInstall();
    };

    return () => {
      win.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      win.removeEventListener("appinstalled", onAppInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tryInstall() {
    const win = safeWindow();
    const prompt = deferredPrompt || win?.__PATROAI_DEFERRED_INSTALL_PROMPT__;

    if (isStandalone()) {
      setInstallState("installed");
      setDialogOpen(true);
      updateDebugStatus({ source: "already_standalone" });
      return;
    }

    if (!prompt) {
      setInstallState("manual");
      setDialogOpen(true);
      updateDebugStatus({ source: "manual_no_prompt" });
      return;
    }

    try {
      setInstallState("prompting");
      await prompt.prompt?.();
      const choice = await prompt.userChoice;

      setDeferredPrompt(null);
      try {
        win.__PATROAI_DEFERRED_INSTALL_PROMPT__ = null;
      } catch {}

      if (choice?.outcome === "accepted") {
        setInstallState("accepted");
        setDialogOpen(false);
      } else {
        setInstallState("manual");
        setDialogOpen(true);
      }

      updateDebugStatus({ source: "prompt_result", outcome: choice?.outcome || "unknown" });
    } catch {
      setInstallState("manual");
      setDialogOpen(true);
      updateDebugStatus({ source: "prompt_failed" });
    }
  }

  const isHero = variant === "hero";

  return (
    <>
      <button
        type="button"
        onClick={tryInstall}
        title={buttonTitle}
        className={
          className ||
          (isHero
            ? "w-full rounded-2xl border border-emerald-200/25 bg-emerald-200/10 px-5 py-4 text-center text-sm font-black text-emerald-50 transition hover:border-emerald-200/55 hover:bg-emerald-200/16 sm:w-auto sm:px-6"
            : "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-emerald-200/25 bg-emerald-200/10 px-2 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-50 transition hover:border-emerald-200/55 hover:bg-emerald-200/16 md:h-auto md:px-3 md:py-2 md:text-[11px] md:tracking-[0.12em]")
        }
      >
        <span className={isHero ? "" : "hidden md:inline"}>{buttonLabel}</span>
        {!isHero ? <span className="md:hidden">{buttonCompactLabel}</span> : null}
      </button>

      {dialogOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={instructions.title}
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/58 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-[1.75rem] border border-white/12 bg-[#07101d] p-5 text-white shadow-2xl shadow-black/45"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/70">
              {pt ? "App Patroai" : "Patroai App"}
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">
              {installState === "installed"
                ? pt
                  ? "App já instalado"
                  : "App already installed"
                : instructions.title}
            </h2>

            <p className="mt-3 text-sm leading-7 text-white/72">
              {installState === "installed"
                ? pt
                  ? "A Patroai já está aberta em modo app ou instalada neste dispositivo."
                  : "Patroai is already open in app mode or installed on this device."
                : instructions.body}
            </p>

            {installState !== "installed" ? (
              <ol className="mt-4 space-y-2 text-sm leading-6 text-white/70">
                {instructions.steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-200/10 text-xs font-black text-emerald-100">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <a
                href="/app?source=landing_install_button"
                className="rounded-full border border-white/12 bg-white/[0.055] px-4 py-3 text-center text-sm font-black text-white/84 transition hover:border-white/24 hover:bg-white/[0.08]"
              >
                {pt ? "Abrir ambiente" : "Open app"}
              </a>

              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={tryInstall}
                  className="rounded-full bg-gradient-to-r from-emerald-300 to-cyan-200 px-4 py-3 text-sm font-black text-slate-950 transition hover:brightness-110"
                >
                  {pt ? "Instalar agora" : "Install now"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-full border border-white/12 bg-white/[0.055] px-4 py-3 text-sm font-black text-white/84 transition hover:border-white/24 hover:bg-white/[0.08]"
              >
                {pt ? "Entendi" : "Got it"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
