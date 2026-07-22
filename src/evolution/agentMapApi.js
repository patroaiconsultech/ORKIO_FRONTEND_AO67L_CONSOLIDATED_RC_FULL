export const AGENT_EVOLUTION_MAP_UI_VERSION = "ORKIO_AGENT_EVOLUTION_MAP_R20_PREMIUM_UI_V1";

export async function fetchAgentEvolutionMap(apiFetch, { token, org } = {}) {
  if (typeof apiFetch !== "function") throw new Error("apiFetch_missing");
  return apiFetch("/api/admin/evolution/agents", { token, org });
}

export async function fetchAgentEvolutionSnapshot(apiFetch, agentId, { token, org } = {}) {
  if (typeof apiFetch !== "function") throw new Error("apiFetch_missing");
  if (!agentId) throw new Error("agent_id_missing");
  return apiFetch(`/api/admin/evolution/agents/${encodeURIComponent(agentId)}`, { token, org });
}
