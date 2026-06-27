import React from "react";

export default function KnowledgePanel({ knowledge = null }) {
  const entries = Object.entries(knowledge?.components || {});
  return (
    <article style={panelStyle}>
      <h3 style={titleStyle}>Knowledge Graph Lite</h3>
      {!entries.length ? <p style={emptyStyle}>Sem relações carregadas ainda.</p> : <div style={{ display: "grid", gap: 8 }}>{entries.map(([name, data]) => <div key={name} style={itemStyle}><strong>{name}</strong><div style={metaStyle}>evidências: {data.evidence || 0} • propostas: {data.proposals || 0} • regressões: {data.regression || 0}</div></div>)}</div>}
    </article>
  );
}
const panelStyle = { border: "1px solid rgba(148,163,184,0.25)", borderRadius: 16, padding: 14 };
const titleStyle = { margin: "0 0 10px", fontSize: 16 };
const emptyStyle = { margin: 0, opacity: 0.7 };
const itemStyle = { padding: 10, borderRadius: 12, background: "rgba(15,23,42,0.35)" };
const metaStyle = { marginTop: 4, fontSize: 12, opacity: 0.68 };
