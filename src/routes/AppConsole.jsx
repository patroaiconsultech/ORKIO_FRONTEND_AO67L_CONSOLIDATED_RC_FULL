// PATCH37_REV_B_PREMIUM_CONTEXT_ISOLATION_ALL_SENDS
// Arquivo: frontend/src/routes/AppConsole.jsx

// 1) ADICIONAR perto dos demais marcadores PATCH_37:
const PATCH_37_REV_B_CONTEXT_ISOLATION_ALL_SENDS_VERSION =
  "PATCH_37_REV_B_PREMIUM_CONTEXT_ISOLATION_ALL_SENDS_V1";


// 2) SUBSTITUIR stripInternalRuntimeEnvelope por:
function stripInternalRuntimeEnvelope(rawContent = "") {
  let content = String(rawContent || "").trim();
  if (!content) return "";

  const userMessageMarker = "MENSAGEM_DO_USUARIO:";
  const markerIndex = content.lastIndexOf(userMessageMarker);
  if (markerIndex >= 0) {
    content = content.slice(markerIndex + userMessageMarker.length).trim();
  }

  content = content
    .replace(/^\s*PREFERENCIA_DE_TRATAMENTO_DO_USUARIO[\s\S]*?(?=\n\s*\n|$)/gim, "")
    .replace(/^\s*PROFILE_ADDRESS_PREFERENCE[\s\S]*?(?=\n\s*\n|$)/gim, "")
    .replace(/^\s*PATCH_\d+[^\n]*(?:\n(?!\s*(?:@|Origem:|Modo:|Regra crítica:|MENSAGEM_DO_USUARIO:)).*)*/gim, "")
    .replace(/^\s*@(Orkio|Orion|Chris|Laura)\s+orchestration_audit\s*$/gim, "")
    .replace(/^\s*Origem:\s*Realtime voice transcript\.final\s*$/gim, "")
    .replace(/^\s*Modo:\s*readonly\s*$/gim, "")
    .replace(/^\s*Regra crítica:[^\n]*$/gim, "")
    .trim();

  return content;
}


// 3) SUBSTITUIR shouldIsolatePromptContextForSend por:
function shouldIsolatePromptContextForSend(options = {}) {
  const source = String(options?.source || "").trim().toLowerCase();

  let selectedSlug = "";
  let authoritySlug = "";
  let manualSlug = "";
  let manualLock = false;
  let teamRoom = false;

  try { selectedSlug = canonicalAgentSlug(selectedManualAgentSlugRef.current || ""); } catch {}
  try { authoritySlug = canonicalAgentSlug(getManualAuthoritySlug?.() || ""); } catch {}

  try {
    const authority = manualAuthorityRef.current || {};
    manualSlug = canonicalAgentSlug(
      authority?.slug ||
      authority?.manual_target_slug ||
      authority?.teamConversationFocusSlug ||
      authority?.manual_team_focus_slug ||
      ""
    );
    manualLock = Boolean(
      authority?.slug ||
      authority?.manual_agent_lock ||
      authority?.lockKind ||
      authority?.teamConversationActive ||
      authority?.manual_team_conversation_active
    );
  } catch {}

  try {
    teamRoom = Boolean(
      isPatch34TeamRoomActive?.() ||
      isManualTeamConversationActive?.() ||
      String(destMode || "").trim().toLowerCase() === "team"
    );
  } catch {}

  const optionRequestsIsolation = Boolean(
    options?.realtimeTurn ||
    options?.voiceRequested ||
    options?.explicitVoiceRequested ||
    options?.manualAgent ||
    options?.manual_agent ||
    options?.manualAgentSend ||
    options?.team ||
    options?.teamMode ||
    options?.promptContextIsolation ||
    options?.prompt_context_isolation_version ||
    source === "voice" ||
    source === "realtime" ||
    source === "manual_agent" ||
    source === "manual_button" ||
    source === "team" ||
    source === "fallback_text" ||
    source === "mic_fallback" ||
    source.startsWith("realtime_")
  );

  const manualOrTeamActive = Boolean(
    selectedSlug ||
    authoritySlug ||
    manualSlug ||
    manualLock ||
    teamRoom
  );

  return Boolean(optionRequestsIsolation || manualOrTeamActive);
}


// 4) NO INÍCIO DE sendMessage, substituir:
const rawMsg = ((presetMsg ?? text) || "").trim();
const isolatePromptContextForThisSend = shouldIsolatePromptContextForSend(opts);
const msg = isolatePromptContextForThisSend
  ? stripInternalRuntimeEnvelope(rawMsg)
  : rawMsg;
if (!msg || sendingRef.current) return false;


// 5) DENTRO do try de sendMessage, substituir:
const isolatePromptContext = isolatePromptContextForThisSend;


// 6) NO internalRuntimeContext:
version: PATCH_37_REV_B_CONTEXT_ISOLATION_ALL_SENDS_VERSION,


// 7) NO log patch37:send_message_context_isolated, acrescentar:
rev_b_version: PATCH_37_REV_B_CONTEXT_ISOLATION_ALL_SENDS_VERSION,
manual_or_team_active: isolatePromptContextForThisSend,
