export const OEP_001_EVOLUTION_FRONTEND_API_VERSION = "OEP_001_EVOLUTION_FRONTEND_API_V1";

export async function fetchEvolutionSnapshot(apiFetch) {
  if (typeof apiFetch !== "function") {
    return { ok: false, error: "apiFetch_missing", incidents: [], proposals: [] };
  }
  try {
    return await apiFetch("/api/evolution/snapshot");
  } catch (err) {
    return { ok: false, error: String(err?.message || err || "snapshot_failed"), incidents: [], proposals: [] };
  }
}

export async function createEvolutionIncident(apiFetch, payload) {
  if (typeof apiFetch !== "function") throw new Error("apiFetch_missing");
  return apiFetch("/api/evolution/incidents", { method: "POST", body: JSON.stringify(payload || {}) });
}

export async function reviewEvolutionProposal(apiFetch, proposalId, payload) {
  if (typeof apiFetch !== "function") throw new Error("apiFetch_missing");
  return apiFetch(`/api/evolution/proposals/${encodeURIComponent(proposalId)}/review`, { method: "POST", body: JSON.stringify(payload || {}) });
}
