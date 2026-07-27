const CORE_AGENT_ALIASES = Object.freeze({
  orkio: "orkio",
  orquio: "orkio",
  workio: "orkio",
  team: "team",
  time: "team",
  equipe: "team",
  chris: "chris",
  cris: "chris",
  cfo: "chris",
  orion: "orion",
  cto: "orion",
  laura: "laura",
});

function canonicalAvailabilitySlug(value = "") {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”"']/g, " ")
    .replace(/[\s\-/]+/g, "_")
    .replace(/[^a-z0-9_:]+/g, "")
    .replace(/^roster::/, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return CORE_AGENT_ALIASES[raw] || raw;
}

export const EXECUTABLE_AGENT_AVAILABILITY_VERSION =
  "R12_LAURA_EXECUTABLE_AGENT_REGISTRY_PREMIUM_V1";

export const AGENT_UNAVAILABLE_NOT_PERSISTED = "AGENT_NOT_PERSISTED";

export function normalizeAgentAvailability(agent = null) {
  const item = agent && typeof agent === "object" ? agent : {};
  const slug = canonicalAvailabilitySlug(
    item.slug ||
      item.agent_key ||
      item.agent_slug ||
      item.name ||
      item.display_name ||
      item.id ||
      "",
  );
  const selectionKind = String(item.selection_kind || "").trim().toLowerCase() ||
    (slug === "team" ? "room" : "agent");

  if (selectionKind === "room") {
    return {
      version:
        item.availability_contract_version ||
        EXECUTABLE_AGENT_AVAILABILITY_VERSION,
      slug,
      selection_kind: "room",
      executable: false,
      available: true,
      selectable: true,
      reason_unavailable: null,
    };
  }

  const explicitExecutable =
    typeof item.executable === "boolean" ? item.executable : null;
  const explicitAvailable =
    typeof item.available === "boolean" ? item.available : null;
  const legacyRosterOnly =
    item.persisted === false ||
    String(item.source_status || "").trim().toLowerCase() === "roster_only" ||
    String(item.id || "").startsWith("roster::");

  const executable =
    explicitExecutable === null ? !legacyRosterOnly : explicitExecutable;
  const available =
    explicitAvailable === null ? executable && !legacyRosterOnly : explicitAvailable;
  const selectable = Boolean(executable && available);

  return {
    version:
      item.availability_contract_version ||
      EXECUTABLE_AGENT_AVAILABILITY_VERSION,
    slug,
    selection_kind: "agent",
    executable: Boolean(executable),
    available: Boolean(available),
    selectable,
    reason_unavailable:
      selectable
        ? null
        : String(
            item.reason_unavailable ||
              (legacyRosterOnly ? AGENT_UNAVAILABLE_NOT_PERSISTED : "AGENT_UNAVAILABLE")
          ).trim(),
  };
}

export function isAgentSelectable(agent = null) {
  return normalizeAgentAvailability(agent).selectable;
}

export function filterSelectableAgents(agents = []) {
  return (Array.isArray(agents) ? agents : []).filter((agent) =>
    isAgentSelectable(agent)
  );
}

export function findAgentAvailabilityBySlug(agents = [], value = "") {
  const wanted = canonicalAvailabilitySlug(value);
  if (!wanted) {
    return {
      version: EXECUTABLE_AGENT_AVAILABILITY_VERSION,
      slug: "",
      selection_kind: "agent",
      executable: false,
      available: false,
      selectable: false,
      reason_unavailable: "AGENT_NOT_REGISTERED",
      agent: null,
    };
  }

  const item =
    (Array.isArray(agents) ? agents : []).find((agent) => {
      const candidates = [
        agent?.slug,
        agent?.agent_key,
        agent?.agent_slug,
        agent?.name,
        agent?.display_name,
        agent?.id,
      ];
      return candidates.some(
        (candidate) =>
          canonicalAvailabilitySlug(candidate || "") === wanted
      );
    }) || null;

  if (!item) {
    return {
      version: EXECUTABLE_AGENT_AVAILABILITY_VERSION,
      slug: wanted,
      selection_kind: wanted === "team" ? "room" : "agent",
      executable: false,
      available: wanted === "team",
      selectable: wanted === "team",
      reason_unavailable:
        wanted === "team" ? null : "AGENT_NOT_REGISTERED",
      agent: null,
    };
  }

  return {
    ...normalizeAgentAvailability(item),
    agent: item,
  };
}

export function agentUnavailableMessage(availability = null) {
  const state =
    availability && typeof availability === "object"
      ? availability
      : normalizeAgentAvailability(null);

  if (state.selectable) return "";
  if (state.reason_unavailable === AGENT_UNAVAILABLE_NOT_PERSISTED) {
    return "Agente cadastrado no roster, mas ainda não disponível para execução.";
  }
  if (state.reason_unavailable === "AGENT_NOT_REGISTERED") {
    return "Agente ainda não registrado no runtime.";
  }
  return "Agente temporariamente indisponível.";
}
