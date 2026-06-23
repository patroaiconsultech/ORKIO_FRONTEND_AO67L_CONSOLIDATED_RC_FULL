import { useMemo } from "react";

function normalizeSlug(value = "") {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function readGlipAriaConsoleMode() {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search || "");
    const source = normalizeSlug(params.get("source"));
    const product = normalizeSlug(params.get("product"));
    const agent = normalizeSlug(params.get("agent"));
    return (
      source === "arquitech" ||
      source === "glip" ||
      product === "arquitech" ||
      product === "glip" ||
      product.includes("glip") ||
      agent === "aria"
    );
  } catch {
    return false;
  }
}

export function isGlipAriaAgentRecord(agent) {
  const name = normalizeSlug(agent?.name);
  const description = normalizeSlug(agent?.description);
  const slug = normalizeSlug(agent?.slug || agent?.id);
  return (
    name === "aria" ||
    slug === "aria" ||
    name.includes("aria") ||
    name.includes("arquitech") ||
    name.includes("glip") ||
    description.includes("aria") ||
    description.includes("arquitech") ||
    description.includes("glip")
  );
}

export function findGlipAriaAgentRecord(list) {
  const rows = Array.isArray(list) ? list : [];
  return (
    rows.find((agent) => normalizeSlug(agent?.name) === "aria") ||
    rows.find((agent) => normalizeSlug(agent?.slug || agent?.id) === "aria") ||
    rows.find((agent) => isGlipAriaAgentRecord(agent)) ||
    null
  );
}

export function coerceGlipAriaAgentName(name = "Agent") {
  const raw = String(name || "").trim();
  const slug = normalizeSlug(raw);

  if (!raw) return "Aria";

  if (
    slug === "orkio" ||
    slug === "agent" ||
    slug === "agente" ||
    slug === "assistant" ||
    slug === "model" ||
    slug === "aria" ||
    slug.includes("orkio") ||
    slug.includes("patroai") ||
    slug.includes("team") ||
    slug.includes("chris") ||
    slug.includes("orion") ||
    slug.includes("auditor")
  ) {
    return "Aria";
  }

  return raw;
}

export function normalizeGlipAriaAssistantContent(value = "") {
  const original = String(value || "");
  if (!original) return original;

  if (
    /AUDITORIA FOCADA/i.test(original) ||
    /\bAO20[A-Z0-9_-]*\b/i.test(original) ||
    /technical_audit/i.test(original) ||
    /Router Precedence/i.test(original)
  ) {
    return [
      "Sim — minha especialidade é arquitetura comercial e gestão integrada do fluxo arquitetônico.",
      "",
      "Eu atuo como Aria, a inteligência operacional da GLIP, para organizar briefing, proposta, contrato, projeto, documentação, obra, fornecedores, aprovações e indicadores.",
      "",
      "Podemos começar por um briefing, uma proposta comercial, um contrato, um cronograma de obra ou uma análise de pendências."
    ].join("\n");
  }

  return original
    .replace(/Sou\s+Orkio,\s*o\s+copiloto\s+inteligente\s+da\s+PatroAI!?/gi, "Sou Aria, a inteligência operacional da GLIP.")
    .replace(/Sou\s+Orkio/gi, "Sou Aria")
    .replace(/\bOrkio\b/g, "Aria")
    .replace(/\bORKIO\b/g, "ARIA")
    .replace(/\bPatroAI\b/g, "GLIP")
    .replace(/\bPatroai\b/g, "GLIP")
    .replace(/\bPatroaí\b/g, "GLIP")
    .replace(/\bTeam\b/g, "Aria")
    .replace(/\bChris\b/g, "Aria")
    .replace(/\bOrion\b/g, "Aria");
}

export function buildGlipAriaDestinationContract(agents = []) {
  const aria = findGlipAriaAgentRecord(agents);
  const ariaId = aria?.id || "aria";

  return {
    dest_mode: "single",
    agent_id: ariaId,
    agent_ids: [],
    target_agent_slug: "aria",
    visible_agent: "Aria",
    requested_agent_names: ["Aria"],
    source: "arquitech",
    product: "arquitech",
    context_mode: "glip_aria",
    runtime_persona: "glip_aria_architecture",
    persona_lock: "glip_aria_architecture",
  };
}

export default function useGlipAriaMode({ agents = [] } = {}) {
  const isGlipAriaMode = readGlipAriaConsoleMode();

  return useMemo(
    () => ({
      isGlipAriaMode,
      assistantName: isGlipAriaMode ? "Aria" : "Orkio",
      findAriaAgentRecord: () => findGlipAriaAgentRecord(agents),
      coerceAgentName: (name) => (isGlipAriaMode ? coerceGlipAriaAgentName(name) : name || "Agent"),
      normalizeAssistantContent: (content) =>
        isGlipAriaMode ? normalizeGlipAriaAssistantContent(content) : String(content || ""),
      buildDestinationContract: () => buildGlipAriaDestinationContract(agents),
    }),
    [isGlipAriaMode, agents],
  );
}
