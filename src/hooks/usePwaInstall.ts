import { useCallback, useEffect, useMemo, useState } from "react";
import {
  detectPwaPlatform,
  isStandalone,
  type PwaPlatform,
} from "../pwa/platform";

export type InstallOutcome =
  | "accepted"
  | "dismissed"
  | "ios-instructions"
  | "already-installed"
  | "unavailable";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const platform: PwaPlatform = useMemo(() => detectPwaPlatform(), []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setInstructionsOpen(false);
    };

    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt,
    );
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const requestInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (installed || isStandalone()) {
      setInstalled(true);
      return "already-installed";
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return choice.outcome;
    }

    if (platform === "ios") {
      setInstructionsOpen(true);
      return "ios-instructions";
    }

    setInstructionsOpen(true);
    return "unavailable";
  }, [deferredPrompt, installed, platform]);

  return {
    canPrompt: Boolean(deferredPrompt),
    installed,
    instructionsOpen,
    platform,
    requestInstall,
    closeInstructions: () => setInstructionsOpen(false),
  };
}
