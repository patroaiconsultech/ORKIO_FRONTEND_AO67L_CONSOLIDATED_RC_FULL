import React from "react";

export default function ProposalPanel({ proposals = [] }) {
  return (
    <article style={panelStyle}>
      <h3 style={titleStyle}>Propostas</h3>
      {!proposals.length ? <p style={emptyStyle}>Nenhuma proposal carregada.</p> : <div style={{ display: "grid", gap: 8 }}>{proposals.map((proposal) => <div key={proposal.proposal_id || proposal.id} style={itemStyle}><strong>{proposal.summary || "Proposal sem resumo"}</strong><div style={metaStyle}>risco: {proposal.risk || "medium"} • confiança: {Number.isFinite(Number(proposal.confidence)) ? `${Math.round(Number(proposal.confidence) * 100)}%` : "n/a"}</div></div>)}</div>}
    </article>
  );
}

const panelStyle = { border: "1px solid rgba(148,163,184,0.25)", borderRadius: 16, padding: 14 };
const titleStyle = { margin: "0 0 10px", fontSize: 16 };
const emptyStyle = { margin: 0, opacity: 0.7 };
const itemStyle = { padding: 10, borderRadius: 12, background: "rgba(15,23,42,0.35)" };
const metaStyle = { marginTop: 4, fontSize: 12, opacity: 0.68 };
