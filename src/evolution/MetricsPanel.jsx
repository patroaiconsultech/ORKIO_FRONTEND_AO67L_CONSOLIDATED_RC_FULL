import React from "react";

export default function MetricsPanel({ metrics = null }) {
  const items = metrics || { patch_success_rate: null, regression_rate: null, mean_time_to_resolution: null, evidence_coverage: null };
  return (
    <article style={panelStyle}>
      <h3 style={titleStyle}>Evolution Health Index</h3>
      <div style={{ display: "grid", gap: 8 }}>{Object.entries(items).map(([key, value]) => <div key={key} style={itemStyle}><strong>{String(key).replaceAll("_", " ")}</strong><div style={metaStyle}>{value == null ? "a medir" : String(value)}</div></div>)}</div>
    </article>
  );
}
const panelStyle = { border: "1px solid rgba(148,163,184,0.25)", borderRadius: 16, padding: 14 };
const titleStyle = { margin: "0 0 10px", fontSize: 16 };
const itemStyle = { padding: 10, borderRadius: 12, background: "rgba(15,23,42,0.35)" };
const metaStyle = { marginTop: 4, fontSize: 12, opacity: 0.68 };
