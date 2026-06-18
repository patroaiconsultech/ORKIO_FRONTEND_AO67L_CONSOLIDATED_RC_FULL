// DEF-01_APP_CONSOLE_DEFLATION
// Realtime selected-agent identity utilities.
// Pure functions only; no React, no network calls, no storage side effects.

function compactString(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return compactString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function canonicalizeAgentName(raw) {
  const text = compactString(raw);
  if (!text) return "Orkio";

  const key = normalizeKey(text);
  const map = {
    orkio: "Orkio",
    orion: "Orion",
    chris: "Chris",
    warren: "Warren",
    auditor: "Auditor",
    systems_architect: "Systems Architect",
    backend_engineer: "Backend Engineer",
    frontend_engineer: "Frontend Engineer",
    qa_release_engineer: "QA Release Engineer",
    devops_sre: "DevOps SRE",
    security_guardian: "Security Guardian",
    data_db_architect: "Data DB Architect",
    realtime_voice_engineer: "Realtime Voice Engineer",
  };

  return map[key] || text;
}

export function resolveSelectedRealtimeAgentIdentity({
  agents = [],
  selectedAgentId = null,
  destMode = "team",
  destSingle = "",
  destMulti = [],
  publicBetaOrkioOnly = false,
} = {}) {
  const list = Array.isArray(agents) ? agents : [];
  const namedOrkio =
    list.find((a) => normalizeKey(a?.name || a?.slug || a?.key) === "orkio") ||
    list.find((a) => a?.is_default) ||
    list[0] ||
    null;

  const requestedId = compactString(selectedAgentId || (String(destMode || "").toLowerCase() === "single" ? destSingle : ""));
  const selected =
    list.find((a) => compactString(a?.id || a?.agent_id || a?.slug || a?.key) === requestedId) ||
    list.find((a) => normalizeKey(a?.slug || a?.key || a?.name) === normalizeKey(requestedId)) ||
    null;

  let agent = selected || namedOrkio || null;

  if (!selected && String(destMode || "").toLowerCase() === "multi" && Array.isArray(destMulti)) {
    const picked = list.filter((a) => destMulti.map(String).includes(String(a?.id || "")));
    if (picked.length === 1) agent = picked[0];
  }

  if (publicBetaOrkioOnly && namedOrkio) {
    agent = namedOrkio;
  }

  const rawName =
    agent?.name ||
    agent?.agent_name ||
    agent?.display_name ||
    agent?.slug ||
    agent?.key ||
    "Orkio";
  const name = canonicalizeAgentName(rawName);
  const id = compactString(agent?.id || agent?.agent_id || agent?.slug || agent?.key || requestedId || name);
  const role = compactString(agent?.role || agent?.title || agent?.specialty || agent?.description || "");
  const slug = normalizeKey(agent?.slug || agent?.key || name);

  return {
    id,
    name,
    slug,
    role,
    agent,
  };
}

export function buildSelectedRealtimeInstructions(agentIdentity, preferredLang = "auto") {
  const identity = agentIdentity || {};
  const agentName = compactString(identity.name || "Orkio") || "Orkio";
  const role = compactString(identity.role || "");
  const rolePt = role ? ` Papel/função do agente selecionado: ${role}.` : "";
  const roleEn = role ? ` Selected agent role: ${role}.` : "";
  const roleEs = role ? ` Rol/función del agente seleccionado: ${role}.` : "";

  const lang = compactString(preferredLang).toLowerCase();

  if (lang === "pt" || lang.startsWith("pt")) {
    return (
      `Você é ${agentName} em tempo real. Responda como ${agentName}, o agente selecionado no console.` +
      rolePt +
      ` Não se apresente como Orkio quando o agente selecionado for ${agentName}.` +
      " Comece falando primeiro. Use o mesmo idioma do usuário." +
      " Faça uma pergunta curta por vez. Se o áudio estiver confuso, peça para o usuário repetir." +
      " Não use saudações privadas, marcadores internos, nomes de patch ou códigos operacionais."
    );
  }

  if (lang === "es" || lang.startsWith("es")) {
    return (
      `Eres ${agentName} en tiempo real. Responde como ${agentName}, el agente seleccionado en la consola.` +
      roleEs +
      ` No te presentes como Orkio cuando el agente seleccionado sea ${agentName}.` +
      " Empieza hablando primero. Usa el mismo idioma del usuario." +
      " Haz una pregunta corta por vez. Si el audio no está claro, pide que el usuario repita." +
      " No uses saludos privados, marcadores internos, nombres de patch ni códigos operativos."
    );
  }

  return (
    `You are ${agentName} in real time. Respond as ${agentName}, the agent selected in the console.` +
    roleEn +
    ` Do not introduce yourself as Orkio when the selected agent is ${agentName}.` +
    " Start by speaking first. Use the user's language." +
    " Ask one short question at a time. If the audio is unclear, ask the user to repeat." +
    " Do not use private greetings, internal markers, patch names, or operational codes."
  );
}

export function buildRealtimeActivationProbeForAgent(languageProfile, agentIdentity) {
  const lang = compactString(languageProfile).toLowerCase();
  const agentName = compactString(agentIdentity?.name || "Orkio") || "Orkio";

  if (lang === "en" || lang.startsWith("en")) {
    return {
      inputText: `Say only: Hello, I am ${agentName} in real time.`,
      instructions: `Answer by audio in English, saying only: Hello, I am ${agentName} in real time.`,
    };
  }

  if (lang === "es" || lang.startsWith("es")) {
    return {
      inputText: `Di solamente: Hola, soy ${agentName} en tiempo real.`,
      instructions: `Responde en audio en español, diciendo solamente: Hola, soy ${agentName} en tiempo real.`,
    };
  }

  return {
    inputText: `Diga apenas: Olá, eu sou ${agentName} em tempo real.`,
    instructions: `Responda em áudio em português, dizendo apenas: Olá, eu sou ${agentName} em tempo real.`,
  };
}

export function buildRealtimeOpeningGreetingForAgent({
  languageProfile = "pt",
  agentIdentity,
  limited = false,
  durationLabel = "",
} = {}) {
  const lang = compactString(languageProfile).toLowerCase();
  const agentName = compactString(agentIdentity?.name || "Orkio") || "Orkio";
  const duration = compactString(durationLabel);

  if (lang === "en" || lang.startsWith("en")) {
    return limited && duration
      ? `Hello, I am ${agentName}. It is a pleasure to speak with you in real time. We have ${duration} of conversation starting now. Where would you like to begin?`
      : `Hello, I am ${agentName}. It is a pleasure to speak with you in real time. Where would you like to begin?`;
  }

  if (lang === "es" || lang.startsWith("es")) {
    return limited && duration
      ? `Hola, soy ${agentName}. Es un placer hablar contigo en tiempo real. Tenemos ${duration} de conversación a partir de ahora. ¿Por dónde quieres empezar?`
      : `Hola, soy ${agentName}. Es un placer hablar contigo en tiempo real. ¿Por dónde quieres empezar?`;
  }

  return limited && duration
    ? `Olá, eu sou ${agentName}. Prazer em falar com você em tempo real. Temos ${duration} de conversa a partir de agora. Por onde você quer começar?`
    : `Olá, eu sou ${agentName}. Prazer em falar com você em tempo real. Por onde você quer começar?`;
}
