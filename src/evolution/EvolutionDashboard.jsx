import React, { useEffect, useState } from "react";
import IncidentPanel from "./IncidentPanel.jsx";
import ProposalPanel from "./ProposalPanel.jsx";
import KnowledgePanel from "./KnowledgePanel.jsx";
import MetricsPanel from "./MetricsPanel.jsx";
import { fetchEvolutionSnapshot } from "./api.js";

export const OEP_001_EVOLUTION_DASHBOARD_VERSION = "OEP_001_EVOLUTION_DASHBOARD_V1";

export default function EvolutionDashboard({ apiFetch }) {
  const [snapshot, setSnapshot] = useState({ incidents: [], proposals: [], knowledge: null, metrics: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const data = await fetchEvolutionSnapshot(apiFetch);
      if (!cancelled) {
        setSnapshot(data || { incidents: [], proposals: [] });
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [apiFetch]);

  return (
    <section style={{ padding: 16, display: "grid", gap: 16 }}>
      <header>
        <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 800 }}>{OEP_001_EVOLUTION_DASHBOARD_VERSION}</div>
        <h2 style={{ margin: "6px 0 4px" }}>ORKIO Evolution Platform</h2>
        <p style={{ margin: 0, opacity: 0.78 }}>Evolution Kernel: evidências, propostas, governança e aprendizado assistido.</p>
      </header>
      {loading ? <div>Carregando Evolution Snapshot...</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <IncidentPanel incidents={snapshot.incidents || []} />
        <ProposalPanel proposals={snapshot.proposals || []} />
        <KnowledgePanel knowledge={snapshot.knowledge || snapshot.components || null} />
        <MetricsPanel metrics={snapshot.metrics || null} />
      </div>
    </section>
  );
}
