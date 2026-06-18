// DEF-01_APP_CONSOLE_DEFLATION
import React from "react";

function compactString(value) {
  return String(value || "").trim();
}

function defaultAgentLabel(agent) {
  const name = compactString(agent?.name || agent?.agent_name || agent?.display_name || agent?.slug || agent?.id || "Agente");
  const role = compactString(agent?.role || agent?.title || agent?.specialty || "");
  return role ? `${name} · ${role}` : name;
}

export default function AgentSelectorMobileSafe({
  isMobile = false,
  publicBetaOrkioOnly = false,
  destMode = "team",
  setDestMode,
  effectiveDestMode = destMode,
  destSingle = "",
  setDestSingle,
  destMulti = [],
  agents = [],
  visibleAgents = agents,
  styles = {},
  formatAgentOptionLabel = defaultAgentLabel,
  onRetryAgents,
  loading = false,
  error = "",
}) {
  const agentList = Array.isArray(visibleAgents) ? visibleAgents : [];
  const baseSelect = styles.select || {};
  const mobileSelect = {
    minHeight: 44,
    minWidth: 168,
    width: isMobile ? "100%" : undefined,
    maxWidth: "100%",
    flex: isMobile ? "1 1 168px" : undefined,
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: 850,
    lineHeight: 1.2,
    color: "#fff",
    background: "rgba(15,23,42,0.94)",
    WebkitAppearance: "menulist",
    appearance: "menulist",
  };
  const selectStyle = isMobile ? { ...baseSelect, ...mobileSelect } : baseSelect;

  if (publicBetaOrkioOnly) {
    return (
      <div
        style={{
          ...baseSelect,
          minHeight: 34,
          display: "inline-flex",
          alignItems: "center",
          fontWeight: 900,
          color: "rgba(255,255,255,0.88)",
        }}
        title="Beta público: Orkio-only"
      >
        Orkio
      </div>
    );
  }

  return (
    <>
      <select
        style={selectStyle}
        value={destMode}
        onChange={(e) => {
          const nextMode = compactString(e.target.value || "team").toLowerCase();
          setDestMode?.(["team", "single", "multi"].includes(nextMode) ? nextMode : "team");
        }}
        aria-label="Modo de destino"
      >
        <option value="team">Team</option>
        <option value="single">1 agente</option>
        <option value="multi">Multi Agentes</option>
      </select>

      {effectiveDestMode === "single" ? (
        <select
          style={selectStyle}
          value={agentList.some((a) => String(a?.id || "") === String(destSingle || "")) ? destSingle : ""}
          onChange={(e) => setDestSingle?.(e.target.value)}
          aria-label="Selecionar agente"
        >
          {agentList.length ? null : (
            <option value="">
              {loading ? "Carregando agentes..." : "Agentes indisponíveis"}
            </option>
          )}
          {agentList.map((agent) => (
            <option key={agent.id || agent.slug || agent.name} value={agent.id}>
              {formatAgentOptionLabel(agent)}
            </option>
          ))}
        </select>
      ) : null}

      {effectiveDestMode === "multi" && !isMobile ? (
        <select style={selectStyle} value={String(destMulti.length || 0)} onChange={() => {}}>
          <option value={String(destMulti.length || 0)}>
            {destMulti.length ? `${destMulti.length} agentes selecionados` : "Selecionar no envio..."}
          </option>
        </select>
      ) : null}

      {isMobile && effectiveDestMode === "single" && !agentList.length && typeof onRetryAgents === "function" ? (
        <button
          type="button"
          onClick={() => onRetryAgents()}
          style={{
            minHeight: 40,
            borderRadius: 12,
            padding: "8px 12px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            fontWeight: 850,
          }}
        >
          Recarregar agentes
        </button>
      ) : null}

      {isMobile && error ? (
        <span style={{ color: "#fecaca", fontSize: 11, fontWeight: 700 }}>
          {String(error || "").slice(0, 96)}
        </span>
      ) : null}
    </>
  );
}
