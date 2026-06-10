import React, { useMemo, useState } from "react";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function formatTime(value) {
  try {
    if (!value) return "";
    const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function buildCopyText(summary) {
  const user = normalizeText(summary?.userText);
  const assistant = normalizeText(summary?.assistantText);
  const lines = ["Transcrição Realtime — ORKIO/PATROAI"];

  if (summary?.sessionId) lines.push(`Sessão: ${summary.sessionId}`);
  if (summary?.endedAt) lines.push(`Encerrada: ${formatTime(summary.endedAt)}`);

  lines.push("");
  lines.push("Você disse:");
  lines.push(user || "Nenhuma fala final do usuário foi registrada nesta sessão.");
  lines.push("");
  lines.push("Orkio respondeu:");
  lines.push(assistant || "Orkio não retornou resposta nesta sessão.");
  lines.push("");

  return lines.join("\n").trim();
}

function TranscriptBlock({ title, text, emptyText }) {
  const clean = normalizeText(text);

  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.055)",
        padding: "16px 16px",
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          color: "rgba(255,255,255,0.64)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: clean ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.48)",
          lineHeight: 1.58,
          whiteSpace: "pre-wrap",
        }}
      >
        {clean || emptyText}
      </div>
    </div>
  );
}

export default function RealtimeTranscriptSummary({
  open = false,
  summary = null,
  onClose,
}) {
  const [copied, setCopied] = useState(false);

  const safeSummary = summary || {
    endedAt: Math.floor(Date.now() / 1000),
    userText: "",
    assistantText: "",
    turns: [],
  };

  const copyText = useMemo(() => buildCopyText(safeSummary), [safeSummary]);
  const userText = normalizeText(safeSummary?.userText);
  const assistantText = normalizeText(safeSummary?.assistantText);

  if (!open) return null;

  async function copyTranscript() {
    try {
      await navigator.clipboard?.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function handleClose(event) {
    try { event?.preventDefault?.(); } catch {}
    try { event?.stopPropagation?.(); } catch {}
    if (typeof onClose === "function") onClose();
  }

  return (
    <div
      role="dialog"
      aria-label="Transcrição final da sessão Realtime"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9985,
        display: "grid",
        placeItems: "center",
        padding: 18,
        color: "#fff",
        background: "rgba(2,6,23,0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          width: "min(94vw, 760px)",
          maxHeight: "86vh",
          overflow: "auto",
          borderRadius: 30,
          border: "1px solid rgba(255,255,255,0.13)",
          background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.98))",
          boxShadow: "0 34px 120px rgba(0,0,0,0.68)",
          padding: "22px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(56,189,248,0.13)",
                border: "1px solid rgba(125,211,252,0.18)",
                color: "rgba(186,230,253,0.92)",
                fontSize: 12,
                fontWeight: 900,
                marginBottom: 10,
              }}
            >
              Transcrição concluída
            </div>
            <div
              style={{
                fontSize: "clamp(22px, 4vw, 34px)",
                fontWeight: 950,
                letterSpacing: "-0.04em",
              }}
            >
              Resumo da conversa por voz
            </div>
            <div style={{ marginTop: 6, color: "rgba(255,255,255,0.58)", fontSize: 13 }}>
              {safeSummary?.endedAt ? `Encerrada às ${formatTime(safeSummary.endedAt)}` : "Sessão encerrada"}
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar transcrição"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.07)",
              color: "#fff",
              borderRadius: 999,
              width: 38,
              height: 38,
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <TranscriptBlock
            title="Você disse"
            text={userText}
            emptyText="Nenhuma fala final do usuário foi registrada nesta sessão."
          />

          <TranscriptBlock
            title="Orkio respondeu"
            text={assistantText}
            emptyText="Orkio não retornou resposta nesta sessão."
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 18,
          }}
        >
          <button
            type="button"
            onClick={copyTranscript}
            style={{
              border: "1px solid rgba(125,211,252,0.22)",
              background: "rgba(56,189,248,0.12)",
              color: "#bae6fd",
              borderRadius: 999,
              padding: "11px 15px",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            {copied ? "Copiado" : "Copiar transcrição"}
          </button>

          <button
            type="button"
            onClick={handleClose}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.07)",
              color: "#fff",
              borderRadius: 999,
              padding: "11px 15px",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
