import React from "react";

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function formatClock(seconds) {
  const safe = Math.max(0, Math.ceil(Number(seconds || 0)));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function resolveStatusLabel(status, statusLabel) {
  const explicit = String(statusLabel || "").trim();
  if (explicit) return explicit;

  const key = String(status || "").trim().toLowerCase();
  if (key === "connecting") return "Conectando voz em tempo real";
  if (key === "listening") return "Orkio está ouvindo";
  if (key === "transcribing") return "Transcrição ativa";
  if (key === "responding") return "Orkio está respondendo";
  if (key === "ending") return "Encerrando sessão";
  return "Realtime ativo";
}

export default function RealtimeTimeboxOverlay({
  active = false,
  remainingSeconds = 0,
  maxSeconds = 120,
  status = "listening",
  statusLabel = "",
  detail = "",
  voiceLabel = "Orkio em tempo real",
  onStop,
  onClose,
  onEnd,
}) {
  if (!active) return null;

  const max = clampNumber(maxSeconds, 1, 24 * 60 * 60, 120);
  const remaining = clampNumber(remainingSeconds, 0, max, max);
  const elapsedPct = Math.max(0, Math.min(100, ((max - remaining) / max) * 100));
  const urgency = remaining <= 10 ? "danger" : remaining <= 20 ? "warning" : "normal";

  const accent =
    urgency === "danger"
      ? "rgba(248,113,113,0.98)"
      : urgency === "warning"
        ? "rgba(251,191,36,0.98)"
        : "rgba(125,211,252,0.96)";

  const softAccent =
    urgency === "danger"
      ? "rgba(248,113,113,0.18)"
      : urgency === "warning"
        ? "rgba(251,191,36,0.16)"
        : "rgba(56,189,248,0.16)";

  const ringBackground = `conic-gradient(${accent} ${elapsedPct}%, rgba(255,255,255,0.12) ${elapsedPct}% 100%)`;
  const label = resolveStatusLabel(status, statusLabel);
  const cleanDetail = String(detail || "").trim();

  function handleStopClick(event) {
    try { event?.preventDefault?.(); } catch {}
    try { event?.stopPropagation?.(); } catch {}

    try {
      console.log("REALTIME_MANUAL_END", {
        source: "RealtimeTimeboxOverlay",
        marker: "AO66R-HF1",
      });
    } catch {}

    const callbacks = [onStop, onEnd, onClose].filter((cb, index, arr) => (
      typeof cb === "function" && arr.indexOf(cb) === index
    ));

    for (const cb of callbacks) {
      try { cb(); } catch (err) {
        try { console.warn("REALTIME_OVERLAY_STOP_CALLBACK_FAILED", err); } catch {}
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Sessão de voz em tempo real ativa"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        display: "grid",
        placeItems: "center",
        padding: "24px",
        color: "#fff",
        background:
          "radial-gradient(circle at 50% 38%, rgba(20,184,166,0.20), rgba(2,6,23,0.96) 42%, rgba(0,0,0,0.98) 100%)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          width: "min(92vw, 680px)",
          minHeight: "min(78vh, 640px)",
          borderRadius: "38px",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "linear-gradient(180deg, rgba(15,23,42,0.82), rgba(2,6,23,0.92))",
          boxShadow:
            "0 42px 130px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.14)",
          display: "grid",
          placeItems: "center",
          padding: "32px 22px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: softAccent,
            filter: "blur(68px)",
            top: "12%",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />

        <div style={{ position: "relative", display: "grid", gap: 22, justifyItems: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.86)",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: accent,
                boxShadow: `0 0 22px ${accent}`,
              }}
            />
            {voiceLabel}
          </div>

          <div
            style={{
              width: "min(62vw, 340px)",
              height: "min(62vw, 340px)",
              maxWidth: 340,
              maxHeight: 340,
              minWidth: 232,
              minHeight: 232,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: ringBackground,
              boxShadow: `0 0 82px ${softAccent}`,
              padding: 12,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "radial-gradient(circle, rgba(15,23,42,0.96), rgba(2,6,23,1))",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "clamp(48px, 12vw, 88px)",
                    fontWeight: 950,
                    letterSpacing: "-0.08em",
                    lineHeight: 1,
                  }}
                >
                  {formatClock(remaining)}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    color: "rgba(255,255,255,0.56)",
                    fontSize: 13,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                  }}
                >
                  tempo restante
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
            <div style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 900 }}>
              {label}
            </div>
            <div style={{ maxWidth: 520, color: "rgba(255,255,255,0.62)", lineHeight: 1.55 }}>
              {cleanDetail ||
                "A conversa está sendo acompanhada para entregar a transcrição ao final da sessão."}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStopClick}
            style={{
              marginTop: 4,
              border: "1px solid rgba(248,113,113,0.34)",
              background: "rgba(248,113,113,0.14)",
              color: "#fecaca",
              borderRadius: 999,
              padding: "13px 20px",
              fontWeight: 900,
              cursor: "pointer",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              boxShadow: "0 14px 32px rgba(248,113,113,0.10)",
            }}
          >
            Encerrar voz agora
          </button>
        </div>
      </div>
    </div>
  );
}
