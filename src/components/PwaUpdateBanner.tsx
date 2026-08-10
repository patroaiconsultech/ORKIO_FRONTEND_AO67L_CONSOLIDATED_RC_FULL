import React, { useEffect, useRef, useState } from "react";
import {
  UPDATE_EVENT,
} from "../pwa/registerServiceWorker";
import {
  activateWaitingWorker,
  type UpdateState,
  type WaitingUpdateDetail,
} from "../pwa/updateController";

export default function PwaUpdateBanner() {
  const [state, setState] = useState<UpdateState>("IDLE");
  const [error, setError] = useState("");
  const detailRef = useRef<WaitingUpdateDetail | null>(null);
  const reloadIssuedRef = useRef(false);

  useEffect(() => {
    const onUpdate = (event: Event) => {
      const custom = event as CustomEvent<WaitingUpdateDetail>;
      if (!custom.detail?.waiting || !custom.detail?.registration) return;
      detailRef.current = custom.detail;
      setError("");
      setState("UPDATE_AVAILABLE");
    };

    window.addEventListener(UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(UPDATE_EVENT, onUpdate);
  }, []);

  async function update(): Promise<void> {
    const detail = detailRef.current;
    if (!detail || state === "ACTIVATING") return;

    setState("ACTIVATING");
    setError("");

    try {
      await activateWaitingWorker(detail);
      setState("ACTIVATED");
      if (!reloadIssuedRef.current) {
        reloadIssuedRef.current = true;
        window.location.reload();
      }
    } catch (reason) {
      setState("FAILED");
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível ativar a atualização.",
      );
    }
  }

  if (state === "IDLE") return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span>
        {state === "UPDATE_AVAILABLE" &&
          "Uma nova versão da ORKIO está disponível."}
        {state === "ACTIVATING" && "Ativando atualização segura…"}
        {state === "ACTIVATED" && "Atualização ativada."}
        {state === "FAILED" &&
          `Atualização não ativada. ${error || "Tente novamente."}`}
      </span>
      {(state === "UPDATE_AVAILABLE" || state === "FAILED") && (
        <button type="button" onClick={() => void update()}>
          Atualizar
        </button>
      )}
    </div>
  );
}
