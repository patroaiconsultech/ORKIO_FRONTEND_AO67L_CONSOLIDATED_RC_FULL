export const TEAM_EXECUTION_CONTRACT_VERSION = "ORKIO_TEAM_EXECUTION_ENGINE_R14_V1";
export const TEAM_ORCHESTRATOR_SLUG = "orkio";
export const TEAM_CANONICAL_TARGET_SLUGS = Object.freeze([
  "orkio",
  "chris",
  "orion",
  "laura",
]);

function canonicalSlug(value = "") {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[\s/-]+/g, "_");
  if (raw === "time" || raw === "equipe") return "team";
  return raw;
}

export function isTeamExecutionRequest(payload = {}) {
  const mode = canonicalSlug(payload?.dest_mode);
  const markers = [
    payload?.target_kind,
    payload?.target_team_slug,
    payload?.manual_target_slug,
    payload?.visible_agent,
    payload?.target_agent_slug,
  ].map(canonicalSlug);
  const targets = Array.isArray(payload?.target_agent_slugs)
    ? payload.target_agent_slugs.map(canonicalSlug).filter(Boolean)
    : [];
  return (
    markers.includes("team") ||
    (mode === "team" && (payload?.multi_agent_turn === true || targets.length > 1))
  );
}

export function normalizeTeamTargetSlugs(values = []) {
  const requested = new Set(
    (Array.isArray(values) ? values : [])
      .map(canonicalSlug)
      .filter((slug) => TEAM_CANONICAL_TARGET_SLUGS.includes(slug))
  );
  const selected = TEAM_CANONICAL_TARGET_SLUGS.filter(
    (slug) => requested.size === 0 || requested.has(slug)
  );
  return selected.length ? selected : [...TEAM_CANONICAL_TARGET_SLUGS];
}

export function normalizeTeamExecutionRequest(payload = {}) {
  const source = { ...(payload || {}) };
  if (!isTeamExecutionRequest(source)) return source;

  const targetAgentSlugs = normalizeTeamTargetSlugs(source.target_agent_slugs);
  const requestedAgentNames = Array.from(
    new Set([
      ...(Array.isArray(source.requested_agent_names)
        ? source.requested_agent_names
        : []),
      ...targetAgentSlugs.map(
        (slug) =>
          ({
            orkio: "Orkio",
            chris: "Chris",
            orion: "Orion",
            laura: "Laura",
          })[slug] || slug
      ),
    ])
  );

  return {
    ...source,
    dest_mode: "team",
    target_kind: "team",
    target_team_slug: "team",
    orchestrator_slug: TEAM_ORCHESTRATOR_SLUG,
    team_execution_version: TEAM_EXECUTION_CONTRACT_VERSION,
    ownership_locked: true,
    requested_agent: "team",
    resolved_agent: "team",
    turn_owner: "team",
    visible_agent: "Team",
    manual_target_slug: "team",
    multi_agent_turn: targetAgentSlugs.length > 1,
    response_control: "team_execution_engine",
    target_agent_slugs: targetAgentSlugs,
    requested_agent_names: requestedAgentNames,
    // A Team request cannot carry an executable singular destination.
    agent_id: null,
    target_agent_slug: null,
  };
}

export function isTraceOnlyTeamChildEvent(payload = {}) {
  return Boolean(
    payload?.team_child === true &&
      String(payload?.presentation_mode || "").trim().toLowerCase() === "trace_only"
  );
}

export function shouldAppendStreamEventToAssistant(eventName, payload = {}) {
  const event = String(eventName || "").trim().toLowerCase();
  if (isTraceOnlyTeamChildEvent(payload)) return false;
  return event === "chunk" || event === "agent_chunk" || event === "agent_done";
}
