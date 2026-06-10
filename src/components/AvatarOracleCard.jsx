import React from "react";

export default function AvatarOracleCard({
  title = "Entrar com avatar",
  subtitle = "Comece sua jornada com uma conversa inicial guiada.",
  ctaLabel = "Iniciar conversa",
  onAction,
}) {
  return (
    <div
      style={{
        borderRadius: 28,
        padding: 24,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(240,246,255,0.98) 100%)",
        border: "1px solid rgba(148,163,184,0.22)",
        boxShadow: "0 24px 60px rgba(15,23,42,0.10)",
        display: "grid",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.98), rgba(147,197,253,0.9) 55%, rgba(99,102,241,0.9) 100%)",
          boxShadow: "0 0 0 8px rgba(255,255,255,0.55), 0 18px 40px rgba(59,130,246,0.24)",
        }}
      />
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 800, color: "#0f172a" }}>{title}</div>
        <div style={{ color: "#334155", fontSize: 15, lineHeight: 1.7 }}>{subtitle}</div>
      </div>

      <button
        type="button"
        onClick={onAction}
        style={{
          border: "none",
          borderRadius: 999,
          padding: "14px 20px",
          fontWeight: 800,
          color: "#fff",
          cursor: "pointer",
          background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
          boxShadow: "0 14px 28px rgba(59,130,246,0.25)",
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
