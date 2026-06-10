// AO67H — Admin Agent Room Contract
//
// Purpose:
// - Founder/admin may test internal agents and sub-agents directly.
// - Public/AMCHAM users must only see Orkio.
// - This file is a frontend contract helper only; it is not wired into AdminConsole yet.

export const ORKIO_PUBLIC_SPEAKER = "Orkio";

export const ADMIN_PRINCIPAL_AGENTS = Object.freeze([
  { slug: "orkio", label: "Orkio", role: "Chief synthesis and decision" },
  { slug: "chris", label: "Chris", role: "Business, finance and strategy advisor" },
  { slug: "orion", label: "Orion", role: "Technical architecture and runtime advisor" },
]);

export const ADMIN_AGENT_ROOM_MODES = Object.freeze({
  DIRECT: "direct",
  MEETING: "meeting",
  AUDIT: "audit",
  REALTIME: "realtime",
});

export function sanitizePublicAgentName(value) {
  return ORKIO_PUBLIC_SPEAKER;
}

export function normalizeAgentSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.-]/g, "");
}

export function buildAdminAgentRoomPayload({
  message = "",
  agents = ADMIN_PRINCIPAL_AGENTS.map((a) => a.slug),
  mode = ADMIN_AGENT_ROOM_MODES.MEETING,
  realtime = false,
  threadId = null,
} = {}) {
  const selectedAgents = Array.isArray(agents)
    ? agents.map(normalizeAgentSlug).filter(Boolean)
    : [normalizeAgentSlug(agents)].filter(Boolean);

  return {
    message: String(message || ""),
    agents: selectedAgents.length ? selectedAgents : ADMIN_PRINCIPAL_AGENTS.map((a) => a.slug),
    mode,
    realtime: Boolean(realtime),
    thread_id: threadId || null,
    surface: "admin",
  };
}

export function buildPublicRealtimePayload({
  threadId = null,
  voice = "cedar",
  model = "gpt-realtime-mini",
  languageProfile = "pt-BR",
} = {}) {
  return {
    agent_id: null,
    thread_id: threadId || null,
    voice,
    model,
    mode: "public_orkio_only",
    response_profile: "amcham_public_orkio_realtime",
    language_profile: languageProfile,
    modalities: ["audio", "text"],
    public_speaker: ORKIO_PUBLIC_SPEAKER,
  };
}
