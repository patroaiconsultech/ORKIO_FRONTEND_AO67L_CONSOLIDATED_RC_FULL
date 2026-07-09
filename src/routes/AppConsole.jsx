// RTB05_REALTIME_CHAT_PERSISTENCE_AND_DOC_CONTEXT
// AO69C-HF1_SMART_ACTIONS_INTERACTION_GOVERNANCE
// AO69B-HF1_SMART_NEXT_ACTIONS_PREMIUM
// AO68E-HF1_REALTIME_INLINE_CHAT_NO_TRANSCRIPT_MODAL_ADMIN_ORCH_VISUAL_PARITY
// PATCH_30_SERVER_SPEAKER_AUTHORITY_CLIENT_ECHO_QUARANTINE
// PATCH_31_CANONICAL_AGENT_VOICE_PROFILE_PREMIUM
// PATCH_31_REV_A_CANONICAL_VOICE_PRECEDENCE_AND_FULL_PERSONA
// PATCH_31_FINAL_PREMIUM_REALTIME_PERSONA_VOICE_CONTRACT
// PATCH_31_FINAL_HOTFIX_RESPONSE_METADATA_STRING_VALUES
// PATCH_32_MANUAL_AGENT_AUTHORITY_MODE
// PATCH_32_PREDEPLOY_PREMIUM_MANUAL_AGENT_VOICE_SYNC
// PATCH_32_REV_C_PROFILE_ADDRESS_MERGE
// PATCH_32_REV_D_TEAM_PANEL_PRESTAGING
// PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE
// PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE
// PATCH_32_REV_G_MANUAL_LOCK_CONTRACT_PROPAGATION
// PATCH_32_REV_H_MANUAL_LOCK_STAGING_PROOF
// PATCH_32_REV_I_MANUAL_LOCK_STAGING_PROOF_SILENCE
// PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD
// PATCH_33_REV_B_REALTIME_PROVIDER_PAYLOAD_SANITIZER
// PATCH_33_REV_C_LIVE_AGENT_SWITCH_RUNTIME_FIX
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, uploadFile, chat, chatStream, transcribeAudio, requestFounderHandoff, getRealtimeClientSecret, startRealtimeSession, startSummitSession, postRealtimeEventsBatch, endRealtimeSession, getRealtimeSession, getSummitSessionScore, submitSummitSessionReview, downloadRealtimeAta as downloadRealtimeAtaFile, guardRealtimeTranscript, getOrionSquadHealth, getOrionSquadPreview, getAgentCapabilities } from "../ui/api.js";
import { clearSession, clearTenant, getTenant, getToken, getUser, isAdmin, isApproved, setSession, setUser as storeUser, logout } from "../lib/auth.js";
import { canonicalAgentSlug as registryCanonicalAgentSlug, canonicalAgentDisplayNameFromSlug as registryCanonicalAgentDisplayNameFromSlug, resolveDirectAgentAddressFromMessage as registryResolveDirectAgentAddressFromMessage, resolveAgentTurnRouteFromMessage as registryResolveAgentTurnRouteFromMessage, findAgentByCanonicalSlug as registryFindAgentByCanonicalSlug, canonicalAgentVoiceProfile as registryCanonicalAgentVoiceProfile, buildCanonicalRealtimeAgentInstructions as registryBuildCanonicalRealtimeAgentInstructions } from "../lib/agentRegistry.js";
import { ORKIO_CANONICAL_VOICE_ID, ORKIO_DEFAULT_TTS_SPEED, ORKIO_DEFAULT_VOICE_ID, ORKIO_VOICES, coerceTtsSpeed, coerceVoiceId } from "../lib/voices.js";
import TermsModal from "../ui/TermsModal.jsx";
import PWAInstallPrompt from "../components/PWAInstallPrompt.jsx";
import OnboardingModal from "../components/OnboardingModal.jsx";
import { startSessionHeartbeat } from "../lib/sessionHeartbeat.js";
import EmptyStatePremium from "../components/EmptyStatePremium.jsx";
import ExecutionTimeline from "../components/ExecutionTimeline.jsx";
import MessageBubble, { isSmartNextActionsEligible } from "../components/chat/MessageBubble.jsx";
import RealtimeTimeboxOverlay from "../components/realtime/RealtimeTimeboxOverlay.jsx";
import { useRealtimeTranscriptSummary } from "../hooks/realtime/useRealtimeTranscriptSummary.js";
import { installPwaMobileResyncListeners, normalizeDestinationForAvailableAgents, persistPwaMobileActiveThreadId, persistPwaMobileDestinationState, readPwaMobileActiveThreadId, readPwaMobileDestinationState, selectPreferredThreadIdForPwaMobile } from "../lib/pwa/pwaMobileStateSync.js";
import { bridgeRealtimeDocumentContext } from "../lib/realtime/realtimeDocumentContextBridge.js";
import { buildProfileAddressPreferenceInstruction, resolveProfileAddressNames, PROFILE_ADDRESS_PREFERENCE_VERSION } from "../lib/profilePreferences.js";

// AO64D-HF6C_PUBLIC_BETA_GUARDRAILS_EFATAH777 — public beta copy, rewards narrative and internal-agent sanitation
// AO64D-HF6E_PUBLIC_BETA_SANITIZER_SAFE_AND_TECH_BLOCK — full file generated for AppConsole + MessageBubble
// AO68A-HF6R10_NO_BACKEND_END_ON_WARMUP — suppress fake quota/cooldown on failed realtime warmup

// AO68A-HF6R9_REALTIME_NO_COOLDOWN_ON_RETRY — safe AppConsole patch applied

// ORKIO_AO60D_REALTIME_MOBILE_HARDENING
function buildRealtimeDiagnosticError(code, message, diagnostic = {}) {
  const err = new Error(message || "Falha ao iniciar Realtime");
  err.code = code || "REALTIME_DIAGNOSTIC_ERROR";
  err.userMessage = message || "Não consegui abrir a voz em tempo real agora.";
  err.diagnostic = diagnostic || {};
  return err;
}

function getRealtimeBrowserPreflight() {
  const result = {
    ok: true,
    online: true,
    secureContext: true,
    hasMediaDevices: true,
    hasGetUserMedia: true,
    protocol: "",
    host: "",
    reason: null,
  };

  try {
    if (typeof window !== "undefined") {
      result.secureContext = Boolean(
        window.isSecureContext ||
        window.location?.protocol === "https:" ||
        /^localhost$|^127\.0\.0\.1$/.test(window.location?.hostname || "")
      );
      result.protocol = window.location?.protocol || "";
      result.host = window.location?.host || "";
    }
  } catch {}

  try {
    if (typeof navigator !== "undefined") {
      result.online = navigator.onLine !== false;
      result.hasMediaDevices = Boolean(navigator.mediaDevices);
      result.hasGetUserMedia = Boolean(navigator.mediaDevices?.getUserMedia);
    }
  } catch {}

  if (!result.online) {
    result.ok = false;
    result.reason = "browser_offline";
  } else if (!result.secureContext) {
    result.ok = false;
    result.reason = "insecure_context";
  } else if (!result.hasMediaDevices || !result.hasGetUserMedia) {
    result.ok = false;
    result.reason = "media_devices_unavailable";
  }

  return result;
}

function realtimePreflightMessage(reason) {
  if (reason === "browser_offline") {
    return "Não consegui abrir a voz em tempo real porque o dispositivo parece estar sem conexão. O chat continua funcionando quando a internet voltar.";
  }
  if (reason === "insecure_context") {
    return "A voz em tempo real precisa de uma conexão segura HTTPS no navegador/PWA. O chat continua disponível por texto.";
  }
  if (reason === "media_devices_unavailable") {
    return "Este navegador/PWA não expôs o microfone para a voz em tempo real. Atualize o app, verifique permissões ou continue por texto.";
  }
  return "Não consegui abrir a voz em tempo real agora. O chat continua funcionando normalmente.";
}


function normalizeUserFacingRuntimeMessage(value, context = "") {
  let normalizedValue = value;
  if (value && typeof value === "object") {
    normalizedValue =
      value.userMessage ??
      value.message ??
      value.detail?.message ??
      value.detail ??
      value.code ??
      value.error ??
      value.statusText ??
      "";
    if (typeof normalizedValue === "object") {
      try { normalizedValue = JSON.stringify(normalizedValue); } catch { normalizedValue = ""; }
    }
  }
  const raw = String(normalizedValue || "").trim();
  const lower = raw.toLowerCase();

  // ORKIO_AO60C_PWA_REALTIME_DIAGNOSTIC_GUARD
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network_fetch_failed") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("networkerror") ||
    lower.includes("cors") ||
    lower.includes("typeerror: failed")
  ) {
    if (context === "voice" || context === "realtime") {
      return (
        "Não consegui abrir a voz em tempo real agora. O chat continua funcionando normalmente.\n\n" +
        "Motivo provável: a conexão de voz não foi concluída entre o PWA e a API. " +
        "Tente novamente em alguns segundos ou continue por texto."
      );
    }

    return (
      "Não consegui concluir a conexão agora. Verifique sua internet e tente novamente. " +
      "O chat continua disponível por texto."
    );
  }

  if (context === "voice" || context === "realtime") {
    if (
      lower.includes("browser_offline") ||
      lower.includes("insecure_context") ||
      lower.includes("media_devices_unavailable") ||
      lower.includes("mic_permission_denied") ||
      lower.includes("mic_get_user_media_failed") ||
      lower.includes("realtime_sdp_fetch_failed")
    ) {
      if (lower.includes("browser_offline")) {
        return "Não consegui abrir a voz em tempo real porque o dispositivo parece estar sem conexão. O chat continua funcionando normalmente quando a internet voltar.";
      }
      if (lower.includes("insecure_context")) {
        return "A voz em tempo real precisa de uma conexão segura HTTPS no navegador/PWA. O chat continua disponível por texto.";
      }
      if (lower.includes("media_devices_unavailable")) {
        return "Este navegador/PWA não liberou acesso ao microfone para a voz em tempo real. Verifique as permissões do app ou continue por texto.";
      }
      if (lower.includes("mic_permission_denied")) {
        return "O microfone está bloqueado para este PWA. Libere a permissão de microfone nas configurações do navegador/app e tente novamente.";
      }
      if (lower.includes("mic_get_user_media_failed")) {
        return "Não consegui capturar o áudio do microfone neste dispositivo. Tente novamente, revise as permissões ou continue por texto.";
      }
      if (lower.includes("realtime_sdp_fetch_failed")) {
        return "Não consegui concluir a conexão de voz em tempo real com o provedor agora. O chat continua disponível por texto.";
      }
    }
  }

  if (
    context === "voice" || context === "realtime"
  ) {
    if (
      lower.includes("insufficient_quota") ||
      lower.includes("current quota") ||
      lower.includes("billing") ||
      lower.includes("billing_hard_limit") ||
      lower.includes("exceeded your current quota")
    ) {
      return (
        "Realtime indisponível por quota/billing da OpenAI. " +
        "A recarga ou ajuste de billing precisa ser feito antes de novo teste. " +
        "O chat por texto continua disponível."
      );
    }

    if (
      lower.includes("rate_limited") ||
      lower.includes("status_429") ||
      lower.includes("http 429") ||
      lower.includes("realtime_cooldown_active") ||
      lower.includes("too many requests")
    ) {
      return "A voz em tempo real estará disponível novamente em alguns minutos. O chat por texto continua disponível.";
    }

    if (
      lower.includes("auth_forbidden") ||
      lower.includes("status_403") ||
      lower.includes("http 403") ||
      lower.includes("forbidden")
    ) {
      return (
        "A voz em tempo real não foi autorizada para esta sessão. " +
        "Verifique se o onboarding foi concluído e tente novamente. O chat continua disponível por texto."
      );
    }

    if (
      lower.includes("auth_session_expired") ||
      lower.includes("status_401") ||
      lower.includes("unauthorized") ||
      lower.includes("session expired")
    ) {
      return (
        "Sua sessão precisa ser atualizada antes de iniciar a voz em tempo real. " +
        "Entre novamente e tente outra vez. O chat continua disponível por texto."
      );
    }
  }

  if (!raw) {
    return context === "voice"
      ? "Não consegui acessar a voz neste momento. Você pode continuar por texto."
      : "Não consegui concluir esta ação agora.";
  }

  if (
    lower.includes("requested device not found") ||
    lower.includes("device not found") ||
    lower.includes("notfounderror") ||
    lower.includes("microphone not found") ||
    lower.includes("no input devices")
  ) {
    return "Microfone não encontrado. Verifique se há um microfone conectado e se o navegador tem permissão para usá-lo. Você também pode continuar por texto.";
  }

  if (
    lower.includes("permission denied") ||
    lower.includes("notallowederror") ||
    lower.includes("permission dismissed")
  ) {
    return "Permissão de microfone negada. Libere o acesso ao microfone no navegador ou continue por texto.";
  }

  if (
    lower.includes("realtime connection failed") ||
    lower.includes("realtime connection disconnected") ||
    lower.includes("pc_failed")
  ) {
    return "A conexão de voz oscilou. A conversa por texto segue disponível normalmente.";
  }

  if (lower.includes("onboarding incomplete") || lower.includes("cadastro complementar pendente")) {
    return "Seu cadastro complementar precisa ser concluído para liberar este recurso. Se você acabou de salvar o contexto, abra uma nova conversa ou tente novamente em instantes.";
  }

  if (lower === "[object object]") {
    return "Não consegui concluir esta ação agora. Tente novamente em instantes.";
  }

  return raw;
}

function humanizeConsoleStatusMessage(value) {
  return normalizeUserFacingRuntimeMessage(value);
}


// ORKIO_UI_SAFE_TRACE_OBJECT_NORMALIZATION_FINAL
// Normaliza valores antes de entrarem no executionTrace.
// Evita que objetos JS apareçam como "[object Object]" no painel "Ver execução".
function safeTraceText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw || raw === "[object Object]") return fallback;
    return raw;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => safeTraceText(item, ""))
      .filter(Boolean)
      .join(", ");
    return joined || fallback;
  }

  if (typeof value === "object") {
    const preferred =
      value.label ??
      value.message ??
      value.status ??
      value.reason ??
      value.detail ??
      value.name ??
      value.code ??
      value.event ??
      value.step ??
      value.type;

    if (preferred !== undefined) {
      return safeTraceText(preferred, fallback);
    }

    try {
      const compact = JSON.stringify(value);
      if (compact && compact !== "{}") {
        return compact.length > 220 ? `${compact.slice(0, 217)}...` : compact;
      }
    } catch {}
  }

  return fallback;
}

function safeTraceBadges(badges) {
  if (!Array.isArray(badges)) return [];
  return badges.map((badge) => safeTraceText(badge, "")).filter(Boolean);
}

function sanitizeExecutionTraceStep(step) {
  const source = step && typeof step === "object" ? step : {};

  return {
    ...source,
    kind: safeTraceText(source.kind, "status"),
    label: safeTraceText(source.label, "Etapa registrada"),
    detail: safeTraceText(source.detail, ""),
    agentName: safeTraceText(source.agentName, ""),
    badges: safeTraceBadges(source.badges),
    source: safeTraceText(source.source, ""),
  };
}


// ORKIO_WHATSAPP_CTA_PREMIUM
// AO69A-HF1_PREMIUM_POLISH — card language follows message language; WhatsApp cards suppress residual URL punctuation.
// Transforma links WhatsApp enviados pelo backend em um CTA visual premium,
// sem alterar o conteúdo semântico da resposta do agente.
function normalizeExternalHref(rawUrl = "") {
  let url = String(rawUrl || "").trim();
  let trailing = "";

  while (/[),.;!?]+$/.test(url)) {
    trailing = `${url.slice(-1)}${trailing}`;
    url = url.slice(0, -1);
  }

  const href = url.toLowerCase().startsWith("www.") ? `https://${url}` : url;
  return { href, displayUrl: url, trailing };
}

function isWhatsappUrl(rawUrl = "") {
  const url = String(rawUrl || "").trim().toLowerCase();
  return (
    url.includes("wa.me/") ||
    url.includes("api.whatsapp.com/send") ||
    url.includes("whatsapp.com/send")
  );
}

function isLikelyEnglishMessageContent(rawText = "") {
  const text = String(rawText || "").toLowerCase();

  const englishSignals = [
    "who is ",
    "what is ",
    "how does ",
    "implementation",
    "human support",
    "talk to someone",
    "talk to a human",
    "speak to someone",
    "speak to a human",
    "can i have",
    "whatsapp",
    "website",
    "official patroai website",
    "you can talk to",
    "our patroai",
    "our team can",
    "the team can",
    "guided implementation",
    "patroai consultech is",
    "orkio is",
    "amcham members",
  ];

  const portugueseSignals = [
    "quem é",
    "o que é",
    "como funciona",
    "implantação",
    "suporte humano",
    "falar com",
    "site institucional",
    "nossa equipe",
    "atendimento humano",
    "você pode",
  ];

  const englishHits = englishSignals.reduce((count, signal) => count + (text.includes(signal) ? 1 : 0), 0);
  const portugueseHits = portugueseSignals.reduce((count, signal) => count + (text.includes(signal) ? 1 : 0), 0);

  return englishHits > portugueseHits;
}

function isExecutiveAdvisoryContent(rawText = "") {
  const text = String(rawText || "").toLowerCase();
  return [
    "diagnostico breve",
    "diagnóstico breve",
    "visão estratégica",
    "visao estrategica",
    "risco de crescimento",
    "sinal de alerta",
    "sinais de alerta",
    "ação recomendada",
    "acao recomendada",
    "proximo passo sugerido",
    "próximo passo sugerido",
    "framework de decisão",
    "framework de decisao",
    "plano de contingência",
    "plano de contingencia",
    "kpis recomendados",
    "dashboard executivo",
  ].some((marker) => text.includes(marker));
}

function hasExplicitHumanHelpIntent(rawText = "") {
  const text = String(rawText || "").toLowerCase();
  return [
    "quero falar com",
    "falar com a equipe",
    "falar com alguem",
    "falar com alguém",
    "atendimento humano",
    "suporte humano",
    "qual e o whatsapp",
    "qual é o whatsapp",
    "me chama no whatsapp",
    "chamar no whatsapp",
    "mandar whatsapp",
    "contratar",
    "contratação",
    "contratacao",
    "preço",
    "preco",
    "custos de implantação",
    "custo de implantação",
    "custos de implementacao",
    "custo de implementacao",
    "como funciona a implantação",
    "como funciona a implementacao",
    "talk to the team",
    "talk to a human",
    "human support",
    "pricing",
    "implementation cost",
  ].some((marker) => text.includes(marker));
}

function hasCommercialCtaSignature(rawText = "") {
  const text = String(rawText || "").toLowerCase();
  return [
    "pronto para transformar isso em projeto guiado",
    "ready to turn this into a guided project",
    "a equipe patroai/orkio pode mapear",
    "the patroai/orkio team can map",
    "desenhar os agentes certos",
    "design the right agents",
    "orientar o próximo passo",
    "orientar o proximo passo",
    "talk to the team on whatsapp",
    "falar com a equipe no whatsapp",
    "atendimento humano • orkio/patroai",
    "human support • orkio/patroai",
  ].some((marker) => text.includes(marker));
}

function readCommercialCtaAllowedFromRenderContext(context = {}) {
  const message = context?.message || context?.sourceMessage || {};
  const routing = (
    message?.runtime_hints?.routing ||
    message?.metadata?.routing ||
    message?.done_payload?.runtime_hints?.routing ||
    message?.done_payload?.metadata?.routing ||
    {}
  );

  return Boolean(
    context?.commercialCtaAllowed === true ||
    message?.commercial_cta_allowed === true ||
    message?.allow_commercial_cta === true ||
    message?.metadata?.commercial_cta_allowed === true ||
    routing?.commercial_cta_allowed === true ||
    routing?.human_help_intent === true
  );
}

function shouldRenderWhatsappCtaCard(rawText = "", context = {}) {
  if (isExecutiveAdvisoryContent(rawText)) return false;

  const allowedByContext = readCommercialCtaAllowedFromRenderContext(context);
  if (!allowedByContext && hasCommercialCtaSignature(rawText)) return false;

  return Boolean(allowedByContext || hasExplicitHumanHelpIntent(rawText));
}

function renderWhatsappCtaCard(href, key, options = {}) {
  const safeHref = href || "https://wa.me/5551989697605";
  const english = Boolean(options && options.english);
  const title = english ? "Ready to turn this into a guided project?" : "Pronto para transformar isso em projeto guiado?";
  const body = english
    ? "The Patroai/Orkio team can map your demand, design the right agents and guide the next step."
    : "A equipe Patroai/Orkio pode mapear sua demanda, desenhar os agentes certos e orientar o próximo passo.";
  const button = english ? "💬 Talk to the team on WhatsApp" : "💬 Falar com a equipe no WhatsApp";
  const footer = english ? "Human support • ORKIO/PATROAI" : "Atendimento humano • ORKIO/PATROAI";

  return (
    <div
      key={key}
      style={{
        marginTop: 14,
        marginBottom: 8,
        padding: "14px",
        borderRadius: "18px",
        border: "1px solid rgba(52,211,153,0.34)",
        background:
          "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(15,23,42,0.34))",
        boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
        whiteSpace: "normal",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 950,
          color: "#d1fae5",
          letterSpacing: "0.2px",
          marginBottom: 6,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "12px",
          lineHeight: 1.45,
          color: "rgba(236,253,245,0.86)",
          marginBottom: 12,
        }}
      >
        {body}
      </div>

      <a
        href={safeHref}
        target="_blank"
        rel="noreferrer noopener"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          textDecoration: "none",
          borderRadius: "999px",
          padding: "10px 14px",
          background: "linear-gradient(135deg, #22c55e, #14b8a6)",
          color: "#04111d",
          fontSize: "13px",
          fontWeight: 950,
          boxShadow: "0 12px 28px rgba(20,184,166,0.24)",
        }}
      >
        {button}
      </a>

      <div
        style={{
          marginTop: 9,
          fontSize: "11px",
          color: "rgba(209,250,229,0.62)",
          fontWeight: 700,
        }}
      >
        {footer}
      </div>
    </div>
  );
}

function renderMessageContentPremium(value, context = {}) {
  const text = String(value || "");
  if (!text) return "";

  const whatsappCardEnglish = isLikelyEnglishMessageContent(text);
  const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
  const nodes = [];
  let lastIndex = 0;
  let matchIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const rawUrl = match[0];
    const before = text.slice(lastIndex, match.index);
    if (before) nodes.push(before);

    const { href, displayUrl, trailing } = normalizeExternalHref(rawUrl);
    const isWhatsappHref = isWhatsappUrl(href);

    if (isWhatsappHref && shouldRenderWhatsappCtaCard(text, context)) {
      nodes.push(renderWhatsappCtaCard(href, `whatsapp-cta-${match.index}-${matchIndex}`, { english: whatsappCardEnglish }));
    } else {
      nodes.push(
        <a
          key={`link-${match.index}-${matchIndex}`}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          style={{
            color: "#93c5fd",
            fontWeight: 800,
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            overflowWrap: "anywhere",
          }}
        >
          {displayUrl}
        </a>
      );
    }

    if (trailing && !isWhatsappHref) nodes.push(trailing);
    lastIndex = match.index + rawUrl.length;
    matchIndex += 1;
  }

  const after = text.slice(lastIndex);
  if (after) nodes.push(after);

  return nodes.length ? nodes : text;
}



const ORKIO_ENV = (typeof window !== "undefined" && window.__ORKIO_ENV__) ? window.__ORKIO_ENV__ : {};
const SUMMIT_VOICE_MODE = ((ORKIO_ENV.VITE_SUMMIT_VOICE_MODE || import.meta.env.VITE_SUMMIT_VOICE_MODE || "realtime").trim().toLowerCase() === "stt_tts")
  ? "stt_tts"
  : "realtime";
const SPEECH_RECOGNITION_LANG = ((ORKIO_ENV.VITE_SPEECH_RECOGNITION_LANG || import.meta.env.VITE_SPEECH_RECOGNITION_LANG || "pt-BR").trim() || "pt-BR");


// METATRON_CHAT_FORCE_STREAM_AND_TIMEOUT
// Auditoria 16/05: o stream estava sendo abortado cedo demais pelo connect timeout
// de 15s. Mantemos /api/chat/stream como rail primário e ampliamos a janela de
// conexão/turno para permitir respostas multiagente sem cancelar prematuramente.
// METATRON_PLATFORM_RECOVERY_HARD_STREAM
// Recuperação operacional 17/05:
// O runtime/env estava conseguindo desligar o stream e empurrar o chat direto
// para /api/chat, caminho que fica preso em preflight/provisional headers.
// Para restabelecer a plataforma, o chat textual SEMPRE tenta /api/chat/stream
// como trilho primário. O env não pode desativar esse trilho.
const ORKIO_CHAT_STREAM_PRIMARY = true;
const CHAT_STREAM_TIMEOUT_MS = Math.max(
  30000,
  Number(ORKIO_ENV.VITE_CHAT_STREAM_TIMEOUT_MS || import.meta.env.VITE_CHAT_STREAM_TIMEOUT_MS || 120000) || 120000
);
const CHAT_STREAM_NO_USEFUL_CHUNK_TIMEOUT_MS = Math.max(
  10000,
  Math.min(
    60000,
    Number(
      ORKIO_ENV.VITE_CHAT_STREAM_NO_USEFUL_CHUNK_TIMEOUT_MS ||
        import.meta.env.VITE_CHAT_STREAM_NO_USEFUL_CHUNK_TIMEOUT_MS ||
        25000
    ) || 25000
  )
);
// AO20K-HF4G_FRONTEND_STREAM_TERMINAL_GUARD
// Se o backend mantiver o SSE vivo apenas com keepalive/status, a UI não deve
// permanecer em "runtime" indefinidamente. O consumidor encerra com fallback
// seguro quando não vê chunk útil dentro da janela acima.

const CHAT_STREAM_CONNECT_TIMEOUT_MS = Math.max(
  30000,
  Number(ORKIO_ENV.VITE_CHAT_STREAM_CONNECT_TIMEOUT_MS || import.meta.env.VITE_CHAT_STREAM_CONNECT_TIMEOUT_MS || 90000) || 90000
);
const CHAT_TURN_RECONCILE_ATTEMPTS = Math.max(
  1,
  Number(ORKIO_ENV.VITE_CHAT_TURN_RECONCILE_ATTEMPTS || import.meta.env.VITE_CHAT_TURN_RECONCILE_ATTEMPTS || 2) || 2
);
const THREAD_RESTORE_RETRY_ATTEMPTS = Math.max(
  1,
  Number(ORKIO_ENV.VITE_THREAD_RESTORE_RETRY_ATTEMPTS || import.meta.env.VITE_THREAD_RESTORE_RETRY_ATTEMPTS || 2) || 2
);
const THREAD_RESTORE_RETRY_DELAY_MS = Math.max(
  150,
  Number(ORKIO_ENV.VITE_THREAD_RESTORE_RETRY_DELAY_MS || import.meta.env.VITE_THREAD_RESTORE_RETRY_DELAY_MS || 650) || 650
);

// METATRON_CHAT_RECOVERY_DIRECT_FALLBACK
// Recuperação operacional 17/05:
// /api/chat/stream permanece como rail primário, mas o fallback /api/chat volta a ficar
// habilitado para restaurar a plataforma quando o SSE não estabilizar.
// O fallback segue com AbortController + timeout para não travar a UI.
// METATRON_PLATFORM_RECOVERY_HARD_STREAM
// /api/chat direto está comprovadamente instável neste deploy: preflight 200,
// POST pendente/provisional headers. Mantemos o fallback DESLIGADO por padrão
// para não trocar um erro de stream por um travamento indefinido.
// Só habilite com VITE_CHAT_DIRECT_FALLBACK_ENABLED=true após o POST /api/chat
// aparecer como 200 nos logs da API.
const ORKIO_CHAT_DIRECT_FALLBACK_ENABLED = (
  String(ORKIO_ENV.VITE_CHAT_DIRECT_FALLBACK_ENABLED || import.meta.env.VITE_CHAT_DIRECT_FALLBACK_ENABLED || "false")
    .trim()
    .toLowerCase() === "true"
);

const WALLET_UI_ENABLED = false;

const PATCH_32_MANUAL_AGENT_AUTHORITY_VERSION = "PATCH_32_MANUAL_AGENT_AUTHORITY_MODE_V1";
const PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION = "PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_V1";
const PATCH_32_PREDEPLOY_PREMIUM_VERSION = "PATCH_32_PREDEPLOY_MANUAL_AGENT_AUTHORITY_VOICE_SYNC_V1";
const PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE = "manual_button";
const PATCH_32_TEAM_SEQUENCE_CONTROL = "manual_team_sequence";
const PATCH_32_SINGLE_AGENT_CONTROL = "manual_agent_authority_single";
const PATCH_32_CANONICAL_TEAM_AGENT_SLUGS = ["orkio", "orion", "chris", "laura"];
const PATCH_32_REV_D_TEAM_PANEL_VERSION = "PATCH_32_REV_D_TEAM_PANEL_PRESTAGING_V1";
const PATCH_32_REV_D_TEAM_PANEL_MODE = "manual_team_panel_deterministic_queue";
const PATCH_32_REV_D_TEAM_PANEL_VOICE_MODERATOR_SLUG = "orkio";
const PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION = "PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_V1";
const PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION = "PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_V1";
const PATCH_32_REV_G_MANUAL_LOCK_CONTRACT_PROPAGATION_VERSION = "PATCH_32_REV_G_MANUAL_LOCK_CONTRACT_PROPAGATION_V1";
const PATCH_32_REV_H_MANUAL_LOCK_STAGING_PROOF_VERSION = "PATCH_32_REV_H_MANUAL_LOCK_STAGING_PROOF_V1";
const PATCH_32_REV_I_MANUAL_LOCK_STAGING_PROOF_SILENCE_VERSION = "PATCH_32_REV_I_MANUAL_LOCK_STAGING_PROOF_SILENCE_V1";
const PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION = "PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_V1";
const PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION = "PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_V1";
const PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION = "PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_V1";
const PATCH_33_REV_B_REALTIME_PROVIDER_PAYLOAD_SANITIZER_VERSION = "PATCH_33_REV_B_REALTIME_PROVIDER_PAYLOAD_SANITIZER_V1";
const PATCH_33_REV_C_LIVE_AGENT_SWITCH_RUNTIME_FIX_VERSION = "PATCH_33_REV_C_LIVE_AGENT_SWITCH_RUNTIME_FIX_V1";
const PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL = "team_conversation_orchestrator";
const PATCH_33_TEAM_CONVERSATION_MODE = "team_conversation_room";
const PATCH_33_TEAM_CONVERSATION_SOURCE = "manual_team_conversation_orchestrator";
const PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION = "PATCH_34_REVB_REALTIME_ROOM_ENGINE_FULL_INTEGRATION_V1";
const PATCH_34_REVB_ROOM_MODE = "team";
const PATCH_34_REVB_ROOM_RESPONSE_CONTROL = "room_agent_authority";
const PATCH_35_REV_D_REALTIME_FORCE_MANUAL_SWITCH_VERSION = "PATCH_35_REV_D_REALTIME_FORCE_MANUAL_SWITCH_V1";
const PATCH_35_REV_E_FORENSIC_TEAM_AUTHORITY_CONTRACT_VERSION = "PATCH_35_REV_E_FORENSIC_TEAM_AUTHORITY_CONTRACT_V1";
const PATCH_35_REV_F_TEAM_QUEUE_CONTRACT_AUDIT_VERSION = "PATCH_35_REV_F_TEAM_QUEUE_CONTRACT_AUDIT_V1";
const PATCH_35_REV_G_REALTIME_RESPONSE_CORRELATION_AUDIT_VERSION = "PATCH_35_REV_G_REALTIME_RESPONSE_CORRELATION_AUDIT_V1";
const PATCH_37_PROMPT_CONTEXT_ISOLATION_REALTIME_VERSION = "PATCH_37_PROMPT_CONTEXT_ISOLATION_REALTIME_V1";
const PATCH_37_REV_B_CONTEXT_ISOLATION_ALL_SENDS_VERSION =
  "PATCH_37_REV_B_PREMIUM_CONTEXT_ISOLATION_ALL_SENDS_V1";
const PATCH_38_REALTIME_TEAM_ECHO_LOOP_GUARD_VERSION =
  "PATCH_38_REALTIME_TEAM_ECHO_LOOP_GUARD_V1";
const PATCH_39_REALTIME_MANUAL_SWITCH_HARD_GATE_VERSION =
  "PATCH39_REALTIME_MANUAL_SWITCH_HARD_GATE_V1";
const PATCH_32_MANUAL_LOCK_STAGING_PROOF_STORAGE_KEY = "orkio_manual_lock_staging_proof";



function normalizePatch32BooleanFlag(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (["1", "true", "yes", "y", "on", "enabled", "staging"].includes(raw)) return true;
  if (["0", "false", "no", "n", "off", "disabled", "production"].includes(raw)) return false;
  return null;
}

function readPatch32RuntimeEnv() {
  const viteEnv = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};
  const runtimeEnv = (typeof window !== "undefined" && window.__ORKIO_ENV__) ? window.__ORKIO_ENV__ : {};
  return { viteEnv, runtimeEnv };
}

function normalizePatch32EnvName(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isPatch32ManualLockProductionEnvironment() {
  try {
    const { viteEnv, runtimeEnv } = readPatch32RuntimeEnv();
    const mode = normalizePatch32EnvName(
      viteEnv?.MODE ??
      runtimeEnv?.MODE ??
      runtimeEnv?.NODE_ENV ??
      ""
    );
    const nodeEnv = normalizePatch32EnvName(
      viteEnv?.NODE_ENV ??
      runtimeEnv?.NODE_ENV ??
      ""
    );
    const appEnv = normalizePatch32EnvName(
      viteEnv?.VITE_APP_ENV ??
      viteEnv?.VITE_ORKIO_ENV ??
      runtimeEnv?.VITE_APP_ENV ??
      runtimeEnv?.VITE_ORKIO_ENV ??
      runtimeEnv?.ORKIO_ENV ??
      runtimeEnv?.APP_ENV ??
      ""
    );
    const explicitProofFlag = normalizePatch32BooleanFlag(
      viteEnv?.VITE_ORKIO_MANUAL_LOCK_STAGING_PROOF ??
      runtimeEnv?.VITE_ORKIO_MANUAL_LOCK_STAGING_PROOF ??
      ""
    );
    const prodFlag = normalizePatch32BooleanFlag(
      viteEnv?.PROD ??
      runtimeEnv?.PROD ??
      runtimeEnv?.VITE_PROD ??
      ""
    );
    const productionNames = ["production", "prod"];
    const nonProductionNames = ["staging", "stage", "development", "dev", "test", "qa", "preview"];

    // Explicit deployment environment wins over Vite build mode.
    // This keeps staging proof available in staging builds while still hard-blocking real production.
    if (nonProductionNames.includes(appEnv)) return false;
    if (productionNames.includes(appEnv)) return true;

    try {
      const host = normalizePatch32EnvName(typeof window !== "undefined" ? window.location?.hostname : "");
      const productionHosts = ["patroai.com", "www.patroai.com", "app.patroai.com"];
      if (productionHosts.includes(host)) return true;
    } catch {}

    if (nonProductionNames.includes(mode) || nonProductionNames.includes(nodeEnv)) return false;
    if (productionNames.includes(mode) || productionNames.includes(nodeEnv) || Boolean(prodFlag)) {
      // In generic production-mode bundles deployed to staging/preview hosts, allow only an explicit env flag.
      // localStorage is still blocked by the caller because this function returns before storage is read on true production.
      return explicitProofFlag !== true;
    }

    return false;
  } catch {}

  return false;
}

function isPatch32ManualLockStagingProofEnabled() {
  // PATCH 32 REV J:
  // Production guard is evaluated before both explicit env flags and localStorage.
  // This prevents console-side localStorage activation of REV H proof UI/logs in production.
  if (isPatch32ManualLockProductionEnvironment()) return false;

  try {
    const { viteEnv, runtimeEnv } = readPatch32RuntimeEnv();
    const explicitFlag = normalizePatch32BooleanFlag(
      viteEnv?.VITE_ORKIO_MANUAL_LOCK_STAGING_PROOF ??
      runtimeEnv?.VITE_ORKIO_MANUAL_LOCK_STAGING_PROOF ??
      ""
    );
    if (explicitFlag !== null) return explicitFlag;
  } catch {}

  try {
    const storageFlag = normalizePatch32BooleanFlag(
      typeof window !== "undefined"
        ? window.localStorage?.getItem(PATCH_32_MANUAL_LOCK_STAGING_PROOF_STORAGE_KEY)
        : ""
    );
    if (storageFlag !== null) return storageFlag;
  } catch {}

  try {
    const { viteEnv, runtimeEnv } = readPatch32RuntimeEnv();
    const mode = normalizePatch32EnvName(viteEnv?.MODE || runtimeEnv?.MODE || "");
    return ["staging", "stage", "development", "dev", "test", "qa"].includes(mode);
  } catch {}

  return false;
}

function getPatch32ManualLockStagingProofVersion() {
  return isPatch32ManualLockStagingProofEnabled()
    ? PATCH_32_REV_H_MANUAL_LOCK_STAGING_PROOF_VERSION
    : null;
}

const EMPTY_STATE_PREVIEW_STEPS = [
  { title: "Readiness", description: "Shell preservado, acessos visíveis e console pronto para a primeira ação com percepção premium." },
  { title: "Focus", description: "O centro da experiência destaca a próxima melhor ação sem esconder threads, wallet e navegação." },
  { title: "Activation", description: "A primeira execução nasce com prompts guiados, contexto e leitura de impacto imediato." },
  { title: "Executive output", description: "Timeline, telemetria e resposta final mantêm linguagem mais madura e decisiva." },
];

const EMPTY_STATE_PREVIEW_LOGS = [
  "Primeira vitória visível no centro do console.",
  "Prompt guiado, blueprint e próximos passos acessíveis no primeiro clique.",
  "Sidebar, usuário e navegação continuam intactos.",
  "Leitura premium reforçada por contraste, profundidade e hierarquia.",
];

class StreamSemanticError extends Error {
  constructor(payload = {}) {
    super(payload?.message || payload?.error || "Stream semantic error");
    this.name = "StreamSemanticError";
    this.payload = payload || {};
    this.status = payload?.code || "STREAM_ERROR";
  }
}

function withTimeout(promise, ms, label = "timeout") {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(label);
      err.code = "STREAM_TIMEOUT";
      reject(err);
    }, Math.max(1000, Number(ms || 0)));
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));
}

function isTemporaryLoadError(err) {
  const status = Number(err?.status || err?.response?.status || 0);
  const code = String(err?.code || "").toUpperCase();
  const message = String(err?.message || "").toLowerCase();
  return (
    [502, 503, 504].includes(status) ||
    code.includes("NETWORK") ||
    code.includes("TIMEOUT") ||
    code.includes("FETCH_ABORTED") ||
    message.includes("failed to fetch") ||
    message.includes("temporariamente") ||
    message.includes("timeout")
  );
}

function restoreErrorMessage(err, fallback = "Nao consegui carregar agora.") {
  if ([502, 503, 504].includes(Number(err?.status || 0)) || err?.isTemporaryUnavailable) {
    return "Serviço temporariamente indisponível. Tente novamente em instantes.";
  }
  if (isTemporaryLoadError(err)) {
    return "Não consegui conectar com estabilidade. Tente novamente em instantes.";
  }
  return String(err?.userMessage || err?.message || fallback || "").trim() || fallback;
}

function isAbortLikeError(err) {
  return err?.name === "AbortError" ||
    err?.code === "CHAT_STREAM_ABORTED" ||
    err?.code === "STREAM_TIMEOUT" ||
    err?.code === "CHAT_STREAM_TIMEOUT" ||
    err?.code === "FETCH_ABORTED" ||
    err?.code === "CHAT_DIRECT_TIMEOUT";
}


function isLowValueAssistantTextCandidate(value) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  const normalized = raw.toLowerCase();
  if (["completed", "complete", "done", "success", "ok", "true", "false", "null", "undefined"].includes(normalized)) return true;
  if (/^\{\s*\}$/.test(raw) || /^\[\s*\]$/.test(raw)) return true;
  return false;
}

function extractAssistantVisibleTextFromPayload(value, depth = 0, seen = new Set()) {
  if (value === null || value === undefined) return "";
  if (depth > 5) return "";

  if (typeof value === "string" || typeof value === "number") {
    const raw = String(value || "").trim();
    return isLowValueAssistantTextCandidate(raw) ? "" : raw;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractAssistantVisibleTextFromPayload(item, depth + 1, seen);
      if (extracted) return extracted;
    }
    return "";
  }

  if (typeof value !== "object") return "";
  if (seen.has(value)) return "";
  seen.add(value);

  const directKeys = [
    "content",
    "final_text",
    "finalText",
    "text",
    "body",
    "message",
    "answer",
    "output_text",
    "response_text",
    "assistant_response",
    "assistant_text",
    "summary",
    "result_text",
  ];

  for (const key of directKeys) {
    const extracted = extractAssistantVisibleTextFromPayload(value?.[key], depth + 1, seen);
    if (extracted) return extracted;
  }

  const nestedKeys = [
    "response",
    "data",
    "result",
    "payload",
    "message_payload",
    "assistant",
    "agent",
    "completion",
    "output",
    "outputs",
    "choices",
  ];

  for (const key of nestedKeys) {
    const extracted = extractAssistantVisibleTextFromPayload(value?.[key], depth + 1, seen);
    if (extracted) return extracted;
  }

  return "";
}



async function consumeChatStream(
  response,
  {
    onStatus,
    onError,
    onDone,
    onChunk,
    onAgentDone,
    onKeepalive,
    onExecution,
    signal,
    isStale,
  } = {}
) {
  const reader = response?.body?.getReader?.();


  if (!reader) return { thread_id: null, trace_id: null, event_count: 0, used_stream: false };

  const abortStream = () => {
    try { reader.cancel?.(); } catch {}
    const err = new Error("CHAT_STREAM_ABORTED");
    err.name = "AbortError";
    err.code = "CHAT_STREAM_ABORTED";
    throw err;
  };

  const decoder = new TextDecoder();
  let buf = "";
  let lastThreadId = null;
  let lastTraceId = null;
  let eventCount = 0;
  let donePayload = null;
  let draftText = "";
  let doneSeen = false;
  const streamStartedAt = Date.now();
  let lastStreamActivityAt = streamStartedAt;
  let firstUsefulChunkAt = null;

  const markStreamActivity = () => {
    lastStreamActivityAt = Date.now();
  };

  const buildStreamTerminalError = (code, message) => {
    const err = new Error(message || code);
    err.code = code;
    err.thread_id = lastThreadId;
    err.trace_id = lastTraceId;
    err.draftText = draftText;
    return err;
  };

  // AO-24_STREAM_KEEPALIVE_PROGRESS_GUARD
  // status/keepalive SSE events mean the backend is alive and still processing.
  // Do not kill a live stream just because the first useful chunk is slower.
  // Keep the terminal guard only for true stream silence/inactivity.
  const assertStreamActivityProgress = () => {
    if (doneSeen || firstUsefulChunkAt) return;

    const silentFor = Date.now() - lastStreamActivityAt;
    const maxSilentMs = Math.max(CHAT_STREAM_NO_USEFUL_CHUNK_TIMEOUT_MS, 45000);

    if (silentFor > maxSilentMs) {
      throw buildStreamTerminalError(
        "CHAT_STREAM_NO_ACTIVITY_TIMEOUT",
        "CHAT_STREAM_NO_ACTIVITY_TIMEOUT"
      );
    }
  };

  const flushBlock = (block) => {
    const rawBlock = String(block || "");

    const lines = rawBlock.split(/\r?\n/).filter(Boolean);

    if (!lines.length) {
      return;
    }

    let ev = "message";
    const dataLines = [];
    for (const line of lines) {
      if (line.startsWith("event:")) ev = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }


    let payload = {};
    if (dataLines.length) {
      const rawData = dataLines.join("\n");
      try {
        payload = JSON.parse(rawData);
      } catch (jsonErr) {
        payload = { raw: rawData };
      }
    }

    try {
      console.log("SSE_EVENT", ev, payload);
    } catch {}

    if (signal?.aborted || isStale?.()) {
      abortStream();
    }

    markStreamActivity();
    if (payload?.thread_id) lastThreadId = payload.thread_id;
    if (payload?.trace_id) lastTraceId = payload.trace_id;
    eventCount += 1;

    if (ev === "status") {
      onStatus?.(payload);
      assertStreamActivityProgress();
    }
    if (ev === "execution") {
      onExecution?.(payload);
    }
    if (ev === "agent_started" || ev === "orchestrator_merge") {
      onExecution?.({ ...(payload || {}), event: ev, step: ev });
    }
    if (ev === "agent_chunk") {
      const delta = String(payload?.delta ?? payload?.content ?? payload?.text ?? "");
      if (delta) {
        draftText += delta;
        firstUsefulChunkAt = firstUsefulChunkAt || Date.now();
      }
      onChunk?.(payload, draftText);
      onExecution?.({ ...(payload || {}), event: ev, step: ev });
    }
    if (ev === "chunk") {
      const delta = String(payload?.delta ?? payload?.content ?? "");
      if (delta) {
        draftText += delta;
        firstUsefulChunkAt = firstUsefulChunkAt || Date.now();
      }
      onChunk?.(payload, draftText);
    }
    if (ev === "agent_done") {
      const agentDoneText = extractAssistantVisibleTextFromPayload(payload);
      if (agentDoneText && (!draftText || agentDoneText.length > draftText.length)) {
        draftText = agentDoneText;
        firstUsefulChunkAt = firstUsefulChunkAt || Date.now();
      }
      onAgentDone?.(payload, draftText);
      onExecution?.({ ...(payload || {}), event: ev, step: ev });
    }
    if (ev === "keepalive") {
      onKeepalive?.(payload);
      assertStreamActivityProgress();
    }
    if (ev === "error") {
      onError?.(payload);

      // METATRON_CHAT_STREAM_TERMINAL_GUARD_CLIENT
      // O backend pode emitir um erro operacional recuperável e, em seguida,
      // enviar chunk/agent_done/done para liberar a UI com mensagem segura.
      // Não devemos abortar o parser nesses códigos; devemos continuar lendo
      // até o event: done.
      const recoverableCodes = new Set([
        "CHAT_STREAM_TERMINAL_TIMEOUT",
        "CHAT_STREAM_RUNTIME_TIMEOUT",
        "CHAT_STREAM_BACKEND_TIMEOUT",
        "CHAT_STREAM_RECOVERY_DONE",
        "CHAT_STREAM_RECOVERY_SHIM_FAILED",
        "CHAT_STREAM_FATAL",
        "STREAM_RECOVERED_WITH_OPERATIONAL_MESSAGE",
      ]);

      const agentScopedRecoverableError = !!payload?.agent_id && payload?.code !== "SERVER_BUSY";
      const terminalRecoverableError = recoverableCodes.has(String(payload?.code || ""));


      if (!agentScopedRecoverableError && !terminalRecoverableError) {
        throw new StreamSemanticError(payload);
      }
    }
    if (ev === "done") {
      donePayload = payload || {};
      onDone?.(payload);
      doneSeen = true;
      try { reader.cancel?.(); } catch {}
      return;
    }
  };

  while (true) {
    if (signal?.aborted || isStale?.()) abortStream();
      const { value, done } = await reader.read();


    if (signal?.aborted || isStale?.()) abortStream();
    if (done) break;
    const decodedChunk = decoder.decode(value, { stream: true });
    buf += decodedChunk;
    const parts = buf.split(/\r?\n\r?\n/);
    buf = parts.pop() || "";
    for (const part of parts) {
      flushBlock(part);
      if (doneSeen) break;
    }
    if (doneSeen) break;
  }
  if (!doneSeen && buf.trim()) {
    flushBlock(buf);
  }
  if (!doneSeen) {
    throw buildStreamTerminalError(
      "CHAT_STREAM_ENDED_WITHOUT_DONE",
      "CHAT_STREAM_ENDED_WITHOUT_DONE"
    );
  }
  return {
    thread_id: donePayload?.thread_id || lastThreadId,
    trace_id: donePayload?.trace_id || lastTraceId,
    event_count: eventCount,
    used_stream: true,
    runtime_hints: donePayload?.runtime_hints || null,
    execution_cursor: donePayload?.runtime_hints?.routing?.execution_cursor || null,
    execution_lifecycle: donePayload?.runtime_hints?.routing?.execution_lifecycle || null,
    routing_source: donePayload?.runtime_hints?.routing?.routing_source || null,
    route_applied: !!donePayload?.runtime_hints?.routing?.route_applied,
    done_payload: donePayload,
    draft_text: draftText,
  };
}

const REALTIME_IDLE_FOLLOWUP_ENABLED = ((ORKIO_ENV.VITE_REALTIME_IDLE_FOLLOWUP_ENABLED || import.meta.env.VITE_REALTIME_IDLE_FOLLOWUP_ENABLED || "true").toString().trim().toLowerCase() !== "false");
const REALTIME_IDLE_FOLLOWUP_MS = Math.max(5000, Number(ORKIO_ENV.VITE_REALTIME_IDLE_FOLLOWUP_MS || import.meta.env.VITE_REALTIME_IDLE_FOLLOWUP_MS || 10000) || 10000);
const REALTIME_REARM_AFTER_ASSISTANT_MS = Math.max(800, Number(ORKIO_ENV.VITE_REALTIME_RESTART_AFTER_TTS_MS || import.meta.env.VITE_REALTIME_RESTART_AFTER_TTS_MS || 1800) || 1800);

const REALTIME_AUTO_RESPONSE_ENABLED = ((ORKIO_ENV.VITE_REALTIME_AUTO_RESPONSE_ENABLED || import.meta.env.VITE_REALTIME_AUTO_RESPONSE_ENABLED || "true").toString().trim().toLowerCase() !== "false");

// AO68A-HF6R8 — stable realtime VAD defaults for PT/EN demos.
const REALTIME_SERVER_VAD_THRESHOLD = Math.min(
  0.95,
  Math.max(
    0.1,
    Number(
      ORKIO_ENV.VITE_REALTIME_VAD_THRESHOLD ||
      import.meta.env.VITE_REALTIME_VAD_THRESHOLD ||
      0.72
    ) || 0.72
  )
);
const REALTIME_SERVER_VAD_SILENCE_MS = Math.max(
  250,
  Number(
    ORKIO_ENV.VITE_REALTIME_VAD_SILENCE_MS ||
    import.meta.env.VITE_REALTIME_VAD_SILENCE_MS ||
    1800
  ) || 1800
);
const REALTIME_SERVER_VAD_PREFIX_MS = Math.max(
  0,
  Number(
    ORKIO_ENV.VITE_REALTIME_VAD_PREFIX_PADDING_MS ||
    ORKIO_ENV.VITE_REALTIME_VAD_HOLD_MS ||
    import.meta.env.VITE_REALTIME_VAD_PREFIX_PADDING_MS ||
    import.meta.env.VITE_REALTIME_VAD_HOLD_MS ||
    500
  ) || 500
);

function resolveRealtimeIdleDisplayName(userObj) {
  const raw = (userObj?.name || userObj?.full_name || "").toString().trim();
  if (!raw) return "";
  const first = raw.split(/\s+/).filter(Boolean)[0] || raw;
  return first.replace(/[^\p{L}\p{N}]/gu, "") || "";
}


function normalizeAgentVoiceId(raw, fallback = ORKIO_DEFAULT_VOICE_ID) {
  const voice = String(raw || "").trim().toLowerCase();
  const aliases = {
    marine: "marin",
    marin: "marin",
    nova: "shimmer",
    onyx: "echo",
    fable: "sage",
  };
  const valid = new Set(["alloy","ash","ballad","cedar","coral","echo","fable","marin","nova","onyx","sage","shimmer","verse"]);
  const normalized = aliases[voice] || voice;
  return valid.has(normalized) ? normalized : (String(fallback || ORKIO_DEFAULT_VOICE_ID).trim().toLowerCase() || ORKIO_DEFAULT_VOICE_ID);
}


// AO64D-HF6C_PUBLIC_BETA_GUARDRAILS_EFATAH777
// Public beta rule:
// - Orkio is the only visible public agent in the current beta.
// - Internal agent names/roles must not be offered to AMCHAM / Efatah777 users.
// - Future capability unlocks may be described generically through usage, needs and rewards.
const ORKIO_PUBLIC_BETA_AGENT_EVOLUTION_NOTICE =
  "Neste beta público, Orkio conduz a experiência principal com sobriedade, continuidade e cuidado. " +
  "Conforme a evolução das conversas, o uso correto da ferramenta e a identificação de necessidades específicas, " +
  "novas funcionalidades poderão ser liberadas futuramente para apoiar análises mais profundas. " +
  "Por enquanto, posso organizar o tema diretamente pelo chat — e, se algo falhar, devo reconhecer, pedir perdão e reparar a condução.";

const ORKIO_PUBLIC_BETA_SHORT_EVOLUTION_NOTICE =
  "Novas capacidades poderão ser liberadas conforme a evolução da conversa, sempre com continuidade, discrição e clareza.";

const ORKIO_PUBLIC_BETA_TECH_GOVERNANCE_NOTICE =
  "Neste beta público, Orkio conduz a experiência principal pelo chat por texto. " +
  "Posso organizar sua necessidade em diagnóstico, riscos e próximos passos, sem expor fluxos técnicos internos. " +
  "Se eu falhar na condução, devo reconhecer com elegância, pedir perdão e corrigir o caminho sem transferir a culpa ao usuário.";

const ORKIO_PUBLIC_INTERNAL_AGENT_NAMES = [
  "Chris",
  "Orion",
  "Warren",
  "Auditor",
  "Systems Architect",
  "Backend Engineer",
  "Frontend Engineer",
  "QA Release Engineer",
  "DevOps SRE",
  "Security Guardian",
  "Data DB Architect",
  "Realtime Voice Engineer",
];

const ORKIO_PUBLIC_INTERNAL_ROLE_WORDS = [
  "CFO",
  "CTO",
  "COO",
  "backend engineer",
  "frontend engineer",
  "systems architect",
  "auditor interno",
  "agente interno",
];

// AO64D-HF6E_PUBLIC_BETA_SANITIZER_SAFE_AND_TECH_BLOCK
// Unicode-safe exact-token replacement.
// Do NOT use plain \b here. In JS, \b is ASCII-oriented and can match inside
// words with accents; this caused "negócio" to become "negóagentes..."
// when the role token "CIO" was present.
function replacePublicBetaToken(text, token, replacement) {
  const escaped = String(token || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return text;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}_])(${escaped})(?=$|[^\\p{L}\\p{N}_])`, "giu");
  return String(text || "").replace(re, `$1${replacement}`);
}

function isPublicBetaTechnicalGovernanceLeak(text) {
  const raw = String(text || "");
  const lower = raw.toLowerCase();

  return (
    lower.includes("orkio — autoevolução controlada readonly") ||
    lower.includes("orkio - autoevolução controlada readonly") ||
    lower.includes("orkio — auto evolução controlada readonly") ||
    lower.includes("autoevolução controlada readonly") ||
    lower.includes("auto evolução controlada readonly") ||
    lower.includes("write_executed=false") ||
    lower.includes("branch_created=false") ||
    lower.includes("pr_created=false") ||
    lower.includes("deploy_executed=false") ||
    lower.includes("approval_required=true") ||
    lower.includes("pipeline correto") ||
    lower.includes("patch mínimo recomendado") ||
    lower.includes("issue map inicial") ||
    lower.includes("governed patch execution response") ||
    lower.includes("patch governance response")
  );
}

function isPublicBetaInternalAgentInvocationLeak(text) {
  const raw = String(text || "");
  if (!raw.trim()) return false;

  return (
    /(?:claro[,.\s]*|ok[,.\s]*|perfeito[,.\s]*|vou\s+|irei\s+|posso\s+|podemos\s+|vamos\s+).{0,120}(?:envolver|acionar|chamar|consultar|ativar|convidar).{0,120}(?:Chris|Orion|Warren|CFO|CTO)/isu.test(raw) ||
    /(?:Chris|Orion|Warren).{0,100}(?:est[aá]\s+dispon[ií]vel|pode\s+trazer|traga\s+sua\s+vis[aã]o|fa[zç]a\s+a\s+an[aá]lise|analisar\s+isso)/isu.test(raw) ||
    /(?:chamando|acionando|consultando)\s+(?:Chris|Orion|Warren|CFO|CTO)/isu.test(raw)
  );
}

function canSeeInternalAdminSurfaces() {
  // AO68F-HF1_ADMIN_FRONTEND_PARITY:
  // Backend may authorize the founder/admin by email even when the frontend
  // role is still "user" or "summit_investor". Use the same visible admin
  // detector used by the console instead of relying only on lib/auth.isAdmin().
  try {
    if (Boolean(isAdmin?.())) return true;
  } catch {}

  try {
    if (hasAdminAccess(getUser?.())) return true;
  } catch {}

  return false;
}

function sanitizePublicBetaAssistantText(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;

  let text = value;
  if (!text.trim()) return text;

  // AO68E-HF1_ADMIN_INTERNAL_CONTENT_PARITY:
  // Public beta users still get internal-agent names sanitized.
  // Admin/super-admin must see the actual delegated agent text so @Orion/@Chris
  // orchestration can be validated in staging without "novos agentes especializados".
  if (canSeeInternalAdminSurfaces()) return text;

  if (isPublicBetaTechnicalGovernanceLeak(text)) {
    return ORKIO_PUBLIC_BETA_TECH_GOVERNANCE_NOTICE;
  }

  if (isPublicBetaInternalAgentInvocationLeak(text)) {
    return ORKIO_PUBLIC_BETA_AGENT_EVOLUTION_NOTICE;
  }

  const evolutionNotice = ORKIO_PUBLIC_BETA_AGENT_EVOLUTION_NOTICE;

  // Replace complete invitations to call internal agents before replacing names.
  text = text.replace(
    /(?:Se\s+precisar|Caso\s+precise|Se\s+quiser|Caso\s+queira|Posso|Podemos)[^.\n]*(?:Chris|Orion|Warren|CFO|CTO)[^.\n]*(?:\.|!|\?)?/giu,
    evolutionNotice
  );

  text = text.replace(
    /(?:envolver|acionar|chamar|consultar|ativar|convidar)\s+(?:especialistas\s+como\s+)?[^.\n]*(?:Chris|Orion|Warren|CFO|CTO)[^.\n]*(?:\.|!|\?)?/giu,
    evolutionNotice
  );

  for (const name of ORKIO_PUBLIC_INTERNAL_AGENT_NAMES) {
    text = replacePublicBetaToken(text, `${name} (CFO)`, "novos agentes especializados");
    text = replacePublicBetaToken(text, `${name} (CTO)`, "novos agentes especializados");
    text = replacePublicBetaToken(text, `${name}`, "novos agentes especializados");
  }

  for (const role of ORKIO_PUBLIC_INTERNAL_ROLE_WORDS) {
    text = replacePublicBetaToken(text, role, "agentes especializados futuros");
  }

  // Clean up duplicated generic replacements.
  text = text.replace(
    /novos agentes especializados(?:\s*(?:,|e|ou|\/)\s*novos agentes especializados)+/giu,
    "novos agentes especializados"
  );
  text = text.replace(
    /agentes especializados futuros(?:\s*(?:,|e|ou|\/)\s*agentes especializados futuros)+/giu,
    "agentes especializados futuros"
  );
  text = text.replace(
    /especialistas\s+como\s+novos agentes especializados/giu,
    "novos agentes especializados"
  );
  text = text.replace(
    /novos agentes especializados\s+para\s+uma\s+análise\s+mais\s+aprofundada/giu,
    ORKIO_PUBLIC_BETA_SHORT_EVOLUTION_NOTICE
  );

  return text;
}

function sanitizePublicBetaAssistantMessage(messageLike) {
  if (!messageLike || typeof messageLike !== "object") return messageLike;

  const role = String(messageLike?.role || "").toLowerCase();
  if (role && role !== "assistant" && role !== "agent") return messageLike;

  const next = { ...messageLike };

  for (const key of ["content", "text", "message", "answer", "final_text", "finalText"]) {
    if (typeof next[key] === "string") {
      next[key] = sanitizePublicBetaAssistantText(next[key]);
    }
  }

  return next;
}

function normalizeVisibleAssistantMessage(messageLike) {
  if (!messageLike || typeof messageLike !== "object") return messageLike;

  const role = String(messageLike?.role || "").toLowerCase();
  if (role !== "assistant" && role !== "agent") return messageLike;

  const next = sanitizePublicBetaAssistantMessage({ ...messageLike });
  const currentContent = String(next?.content || "").trim();
  if (currentContent && currentContent !== "⌛ Preparando resposta...") {
    return next;
  }

  const visibleText = sanitizePublicBetaAssistantText(extractAssistantVisibleTextFromPayload(next));
  if (visibleText) {
    return {
      ...next,
      content: visibleText,
      content_recovered_from_alt_field: !currentContent,
    };
  }

  const completed = String(
    next?.status ||
    next?.state ||
    next?.lifecycle ||
    next?.trace_status ||
    next?.execution_status ||
    ""
  ).toLowerCase();

  if (completed.includes("completed") || completed.includes("done") || completed.includes("success")) {
    return {
      ...next,
      content: currentContent || "Resposta concluída. O corpo da resposta não veio no campo esperado; atualize o histórico ou tente reenviar se precisar do texto completo.",
      content_recovery_warning: true,
    };
  }

  return next;
}

function extractPatchGovernanceMeta(content) {
  const text = String(content || "");
  if (!/PATCH GOVERNANCE RESPONSE/i.test(text)) return null;
  const get = (name) => {
    const m = text.match(new RegExp(`^\\s*${name}\\s*:\\s*([^\\n]+)`, "im"));
    return m ? String(m[1] || "").trim() : "";
  };
  const auditReceiptId = get("audit_receipt_id");
  const patchMode = get("patch_mode");
  const writeAllowed = get("write_allowed");
  return {
    audit_receipt_id: auditReceiptId,
    patch_mode: patchMode,
    write_allowed: writeAllowed,
    can_approve: Boolean(auditReceiptId && /proposal_only/i.test(patchMode) && /false/i.test(writeAllowed)),
  };
}


function extractPatchApprovalMeta(content) {
  const text = String(content || "");
  const isApprovalResponse = /PATCH APPROVAL RESPONSE/i.test(text);
  const isGovernedExecutionResponse = /GOVERNED PATCH EXECUTION RESPONSE|PATCH EXECUTION RESPONSE/i.test(text);
  if (!isApprovalResponse && !isGovernedExecutionResponse) return null;

  const get = (name) => {
    const m = text.match(new RegExp(`^\\s*-?\\s*${name}\\s*:\\s*([^\\n]+)`, "im"));
    return m ? String(m[1] || "").trim() : "";
  };

  const status = get("status");
  const auditReceiptId = get("audit_receipt_id");
  const patchMode = get("patch_mode");
  const writeAllowed = get("write_allowed");
  const humanApproved = get("human_approved");
  const approvalId = get("approval_id");
  const patchId = get("patch_id");
  const executionChannel = get("execution_channel");

  const terminalExecution = /execution_completed|execution_failed|execution_cancelled|execution_blocked_no_executable_artifact|execution_blocked_executor_not_wired|execution_request_failed|execution_blocked_missing_approval|execution_blocked_invalid_context/i.test(status);
  const approvedPending =
    /approval_registered/i.test(status) ||
    /execution_blocked_conversational_channel/i.test(status) ||
    /side_channel_required/i.test(executionChannel) ||
    (/approved_apply/i.test(patchMode) && /true/i.test(humanApproved) && !terminalExecution);

  return {
    status,
    audit_receipt_id: auditReceiptId,
    approval_id: approvalId,
    patch_id: patchId,
    patch_mode: patchMode,
    write_allowed: writeAllowed,
    human_approved: humanApproved,
    execution_channel: executionChannel,
    can_execute: Boolean(approvedPending && /approved_apply/i.test(patchMode) && /true/i.test(humanApproved) && !terminalExecution),
  };
}

function findPendingApprovedPatchExecution(items) {
  const arr = Array.isArray(items) ? items : [];
  let latestApproval = null;
  let latestTerminal = null;
  let latestProposal = null;

  for (const m of arr) {
    const content = String(m?.content || "");
    const ts = Number(m?.created_at || 0) || 0;
    const id = String(m?.id || "");
    const key = `${ts}:${id}`;

    // PATCH23: any newer proposal supersedes previous approval/execution state.
    // Without this, an old approved_apply message can keep rendering an execution
    // button for a stale patch_id/audit_receipt_id after a new proposal appears.
    const isProposal =
      /PATCH GOVERNANCE RESPONSE/i.test(content) &&
      /patch_mode\s*:\s*proposal_only/i.test(content);
    if (isProposal) {
      const auditMatch = content.match(/^\s*audit_receipt_id\s*:\s*([^\n]+)/im);
      latestProposal = {
        message: m,
        key,
        audit_receipt_id: auditMatch ? String(auditMatch[1] || "").trim() : "",
      };
    }

    const approval = extractPatchApprovalMeta(content);
    if (approval?.can_execute) {
      latestApproval = { message: m, meta: approval, key };
    }

    // A conversational-channel block is NOT a terminal execution result.
    // It only tells the user to use the governed side-channel button.
    // Keep the approved execution pending so the "Executar patch aprovado" button remains visible.
    const isExecutionResponse = /GOVERNED PATCH EXECUTION RESPONSE|PATCH EXECUTION RESPONSE/i.test(content);
    const isConversationalBlock = /execution_blocked_conversational_channel/i.test(content);
    const isRealTerminalExecution =
      /execution_completed|execution_failed|execution_cancelled|execution_blocked_no_executable_artifact|execution_blocked_executor_not_wired|execution_request_failed|execution_blocked_missing_approval|execution_blocked_invalid_context/i.test(content);

    if (isExecutionResponse && isRealTerminalExecution && !isConversationalBlock) {
      latestTerminal = { message: m, key };
    }
  }

  if (!latestApproval) return null;

  // A newer proposal invalidates old approved-apply UI state.
  if (latestProposal && String(latestProposal.key) > String(latestApproval.key)) {
    return null;
  }

  if (latestTerminal && String(latestTerminal.key) > String(latestApproval.key)) return null;
  return latestApproval;
}

function buildPendingExecutionGuidance() {
  return [
    "GOVERNED PATCH EXECUTION RESPONSE",
    "",
    "- status: execution_blocked_conversational_channel",
    "- patch_mode: approved_apply",
    "- write_allowed: false",
    "- human_approved: true",
    "",
    "Resultado:",
    "Existe uma execução governada aprovada aguardando ação, mas o chat comum não executa patches.",
    "Use exclusivamente o botão “Executar patch aprovado”.",
    "Nenhuma escrita, branch, commit ou PR foi executado por esta mensagem.",
  ].join("\n");
}

function readOrkioEnvValue(key = "") {
  const k = String(key || "").trim();
  if (!k) return "";
  try {
    const runtimeEnv = (typeof window !== "undefined" && window.__ORKIO_ENV__) ? window.__ORKIO_ENV__ : {};
    return String(runtimeEnv?.[k] || import.meta.env?.[k] || "").trim();
  } catch {
    return "";
  }
}

function resolveAgentVoiceProfile(agentLike) {
  const lookup =
    agentLike?.slug ||
    agentLike?.key ||
    agentLike?.agent_slug ||
    agentLike?.agent_name ||
    agentLike?.name ||
    agentLike?.id ||
    "";
  return registryCanonicalAgentVoiceProfile(lookup || "orkio", { fallbackSlug: "orkio" });
}

function isExplicitDbVoiceOverride(agentLike) {
  const rawSource = String(agentLike?.voice_source || agentLike?.voiceSource || agentLike?.voice_authority || agentLike?.voiceAuthority || "").trim().toLowerCase();
  return Boolean(
    agentLike?.voice_override === true ||
    agentLike?.voiceOverride === true ||
    agentLike?.allow_voice_override === true ||
    agentLike?.allowVoiceOverride === true ||
    agentLike?.db_voice_override === true ||
    agentLike?.dbVoiceOverride === true ||
    rawSource === "override" ||
    rawSource === "db_override" ||
    rawSource === "explicit_db_override"
  );
}

function resolveAgentVoiceResolution(agentLike) {
  const voiceProfile = resolveAgentVoiceProfile(agentLike || {});
  const dbVoice = String(agentLike?.voice_id || agentLike?.voice || agentLike?.tts_voice || agentLike?.voiceId || "").trim();
  const envVoice = readOrkioEnvValue(voiceProfile?.env_key);
  const registryVoice = String(voiceProfile?.voice_id || "").trim();
  const defaultVoice = readOrkioEnvValue("VITE_REALTIME_VOICE") || ORKIO_DEFAULT_VOICE_ID;
  const dbOverrideAllowed = isExplicitDbVoiceOverride(agentLike || {});

  // PATCH_31_FINAL:
  // Final precedence contract for provider voice:
  //   1) per-agent env override, when configured;
  //   2) canonical Agent Registry voice;
  //   3) explicit DB/API override only when no env/registry voice exists;
  //   4) product fallback.
  //
  // This intentionally prevents stale catalog rows such as `cedar` for every
  // agent from replacing Chris/Laura/Orion canonical voices.
  let source = "fallback";
  let selected = defaultVoice;
  if (envVoice) {
    source = "env";
    selected = envVoice;
  } else if (registryVoice) {
    source = "registry";
    selected = registryVoice;
  } else if (dbOverrideAllowed && dbVoice) {
    source = "db_override";
    selected = dbVoice;
  }

  const normalizedVoice = normalizeAgentVoiceId(selected, defaultVoice);
  return {
    voice: normalizedVoice,
    voice_id: normalizedVoice,
    voice_source: source,
    voice_profile: voiceProfile,
    voice_profile_id: voiceProfile?.profile_id || null,
    voice_contract_version: voiceProfile?.contract_version || "PATCH_31_FINAL_PREMIUM_REALTIME_PERSONA_VOICE_CONTRACT_V1",
    voice_override_policy: voiceProfile?.override_policy || "db_voice_requires_explicit_override_flag_and_never_overrides_env_or_registry",
    voice_precedence: Array.isArray(voiceProfile?.precedence) ? voiceProfile.precedence : ["env", "registry", "db_override", "fallback"],
    db_voice_present: Boolean(dbVoice),
    db_voice_ignored: Boolean(dbVoice && source !== "db_override"),
    db_voice_override_allowed: Boolean(dbOverrideAllowed),
    registry_voice: registryVoice || null,
    env_voice_present: Boolean(envVoice),
    default_voice: defaultVoice,
    precedence_version: voiceProfile?.precedence_version || "PATCH_31_FINAL_CANONICAL_VOICE_PRECEDENCE_V1",
  };
}

function resolveAgentVoice(agentLike) {
  return resolveAgentVoiceResolution(agentLike || {}).voice;
}


function coerceRealtimeResponseMetadataString(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const REALTIME_RESPONSE_METADATA_MAX_KEYS = 16;

// PATCH_31_FINAL_HOTFIX_RESPONSE_METADATA_LIMIT_16_V1
// The Realtime provider accepts response.metadata as an object with string values
// and at most 16 properties. Keep this helper as the only place that prepares
// response.metadata for response.create.
function buildRealtimeResponseMetadata(payload = {}) {
  const out = {};

  const addMetadataValue = (key, value) => {
    if (Object.keys(out).length >= REALTIME_RESPONSE_METADATA_MAX_KEYS) return;
    const safeKey = String(key || "").trim();
    if (!safeKey || Object.prototype.hasOwnProperty.call(out, safeKey)) return;
    out[safeKey] = coerceRealtimeResponseMetadataString(value);
  };

  try {
    Object.entries(payload || {}).forEach(([key, value]) => {
      addMetadataValue(key, value);
    });
  } catch {}

  // Add schema only when there is room. This prevents provider rejection:
  // "Invalid response.metadata: too many properties".
  addMetadataValue(
    "metadata_schema_version",
    "PATCH_31_FINAL_HOTFIX_RESPONSE_METADATA_LIMIT_16_V1",
  );

  return out;
}




// PATCH_33_REV_B_REALTIME_PROVIDER_PAYLOAD_SANITIZER
// Provider session.update accepts only provider-native session fields. Orkio
// manual/team fields must remain in events:batch, meeting_state and internal
// telemetry, never inside the session payload sent through the Realtime
// DataChannel. This prevents provider errors such as:
// Unknown parameter: "session.manual_agent_lock".
const PATCH_33_REV_B_PROVIDER_SESSION_ALLOWED_KEYS = new Set([
  "type",
  "instructions",
  "audio",
  "modalities",
  "output_modalities",
  "input_audio_format",
  "output_audio_format",
  "input_audio_transcription",
  "turn_detection",
  "tools",
  "tool_choice",
  "temperature",
  "max_response_output_tokens",
  "model",
  "voice",
]);

const PATCH_33_REV_B_PROVIDER_INTERNAL_SESSION_KEYS = new Set([
  "agent_id",
  "agent_ids",
  "visible_agent",
  "target_agent_slug",
  "target_agent_slugs",
  "requested_agent_names",
  "multi_agent_turn",
  "response_control",
  "dest_mode",
  "manual_agent_lock",
  "manual_agent_source",
  "manual_authority_source",
  "manual_authority_updated_at",
  "manual_authority_version",
  "manual_target_slug",
  "manual_sticky_state_version",
  "manual_lock_persistence_version",
  "manual_lock_staging_proof_version",
  "manual_lock_staging_proof_production_guard_version",
  "manual_lock_contract_propagation_version",
  "manual_team_panel_required",
  "manual_team_panel_order",
  "manual_team_conversation_active",
  "manual_team_focus_slug",
  "manual_team_turn_queue",
  "manual_team_turn_index",
  "team_panel_version",
  "team_panel_mode",
  "team_panel_voice_moderator_slug",
  "team_conversation_mode",
  "team_conversation_orchestrator_version",
  "team_conversation_staging_verification_version",
  "session_voice_sync_version",
  "profile_address_preference_version",
  "preferred_address_names",
  "auto_handoff_enabled",
  "auto_handoff_ignored",
  "realtime_voice_agent_slug",
]);

function isPatch33RevBProviderInternalSessionKey(key) {
  const safeKey = String(key || "").trim();
  if (!safeKey) return false;
  return (
    safeKey.startsWith("manual_") ||
    safeKey.startsWith("team_") ||
    safeKey.startsWith("target_agent") ||
    safeKey.startsWith("requested_agent") ||
    safeKey.startsWith("profile_address") ||
    PATCH_33_REV_B_PROVIDER_INTERNAL_SESSION_KEYS.has(safeKey)
  );
}

function collectPatch33RevBProviderSessionRejectedKeys(value, prefix = "session") {
  const rejected = [];
  const visit = (node, path) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    Object.entries(node).forEach(([key, nested]) => {
      const childPath = `${path}.${key}`;
      if (
        isPatch33RevBProviderInternalSessionKey(key) ||
        (path === "session" && !PATCH_33_REV_B_PROVIDER_SESSION_ALLOWED_KEYS.has(key))
      ) {
        rejected.push(childPath);
        return;
      }
      visit(nested, childPath);
    });
  };
  visit(value, prefix);
  return Array.from(new Set(rejected));
}

function sanitizePatch33RevBProviderSessionValue(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizePatch33RevBProviderSessionValue(item));
  const out = {};
  Object.entries(value).forEach(([key, nested]) => {
    if (isPatch33RevBProviderInternalSessionKey(key)) return;
    out[key] = sanitizePatch33RevBProviderSessionValue(nested);
  });
  return out;
}

function sanitizePatch33RevBProviderSessionPayload(session = {}) {
  if (!session || typeof session !== "object" || Array.isArray(session)) return session;
  const out = {};
  Object.entries(session).forEach(([key, value]) => {
    if (!PATCH_33_REV_B_PROVIDER_SESSION_ALLOWED_KEYS.has(key)) return;
    if (isPatch33RevBProviderInternalSessionKey(key)) return;
    out[key] = sanitizePatch33RevBProviderSessionValue(value);
  });
  return out;
}

function sanitizePatch33RevBRealtimeClientEventPayload(payload = {}) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.type !== "session.update" || !payload.session || typeof payload.session !== "object") {
    return payload;
  }
  return {
    ...payload,
    session: sanitizePatch33RevBProviderSessionPayload(payload.session),
  };
}


function canonicalizeSpeakerLabel(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  const normalizedKey = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const map = {
    ux_frontend: "UX Frontend",
    auditor: "Auditor",
    systems_architect: "Systems Architect",
    backend_engineer: "Backend Engineer",
    frontend_engineer: "Frontend Engineer",
    qa_release_engineer: "QA Release Engineer",
    devops_sre: "DevOps SRE",
    security_guardian: "Security Guardian",
    data_db_architect: "Data DB Architect",
    realtime_voice_engineer: "Realtime Voice Engineer",
    realtime_assistant: "Orkio",
    longest: "Orkio",
    response_done_longest: "Orkio",
    response_done: "Orkio",
    realtime: "Orkio",
    agent: "Orkio",
    agente: "Orkio",
    assistant: "Orkio",
    model: "Orkio",
    orkio: "Orkio",
    team: "Team",
    chris: "Chris",
    cris: "Chris",
    orion: "Orion",
    laura: "Laura",
    warren: "Warren",
  };

  return map[normalizedKey] || text;
}

// AO64D — Public assistant speaker sanitation.
// Orion is an internal audit/governance agent and must not appear as the visible
// assistant for AMCHAM/public users. Backend may return blocked_agent=Orion and
// resolved_agent=Orkio; the UI must honor the resolved public speaker.
function canSeeInternalOrionSpeaker() {
  return canSeeInternalAdminSurfaces();
}

function readRuntimeRoutingField(messageLike, key) {
  try {
    return (
      messageLike?.[key] ||
      messageLike?.runtime_hints?.routing?.[key] ||
      messageLike?.runtimeHints?.routing?.[key] ||
      messageLike?.done_payload?.[key] ||
      messageLike?.done_payload?.runtime_hints?.routing?.[key] ||
      ""
    );
  } catch {
    return "";
  }
}

function sanitizePublicAssistantSpeaker(messageLike, proposedName = "Orkio") {
  const proposed = canonicalizeSpeakerLabel(proposedName || "Orkio");
  const proposedKey = String(proposed || "").trim().toLowerCase();

  const blockedAgent = canonicalizeSpeakerLabel(
    readRuntimeRoutingField(messageLike, "blocked_agent") ||
    readRuntimeRoutingField(messageLike, "blockedAgent") ||
    messageLike?.blocked_agent ||
    messageLike?.blockedAgent ||
    ""
  );
  const resolvedAgent = canonicalizeSpeakerLabel(
    readRuntimeRoutingField(messageLike, "resolved_agent") ||
    readRuntimeRoutingField(messageLike, "resolvedAgent") ||
    messageLike?.resolved_agent ||
    messageLike?.resolvedAgent ||
    ""
  );
  const finalSpeaker = canonicalizeSpeakerLabel(
    messageLike?.final_speaker ||
    readRuntimeRoutingField(messageLike, "final_speaker") ||
    ""
  );
  const visibleAgent = canonicalizeSpeakerLabel(
    messageLike?.visible_agent ||
    readRuntimeRoutingField(messageLike, "visible_agent") ||
    ""
  );

  const blockedKey = String(blockedAgent || "").trim().toLowerCase();
  const resolvedKey = String(resolvedAgent || "").trim().toLowerCase();
  const finalKey = String(finalSpeaker || "").trim().toLowerCase();
  const visibleKey = String(visibleAgent || "").trim().toLowerCase();
  const contentText = String(
    messageLike?.answer ||
    messageLike?.message ||
    messageLike?.final_text ||
    messageLike?.content ||
    messageLike?.text ||
    ""
  ).toLowerCase();

  // AO68D-HF1_ADMIN_INTERNAL_SPEAKER_PARITY:
  // Public users must still see Orkio for blocked internal-agent routes.
  // Admin users, however, need to see the real delegated speaker during staging
  // so @Orion/@Chris orchestration can be validated instead of being visually collapsed to Orkio.
  if (
    !canSeeInternalOrionSpeaker() &&
    (
      blockedKey === "orion" ||
      resolvedKey === "orkio" ||
      contentText.includes("orion é um agente interno") ||
      contentText.includes("orion faz parte da equipe interna") ||
      contentText.includes("orion e um agente interno")
    )
  ) {
    return "Orkio";
  }

  if ((finalKey === "orkio" || visibleKey === "orkio") && proposedKey === "orion" && !canSeeInternalOrionSpeaker()) {
    return "Orkio";
  }

  const publicHiddenSpeakerKeys = new Set([
    "orion",
    "chris",
    "warren",
    "auditor",
    "systems architect",
    "backend engineer",
    "frontend engineer",
    "qa release engineer",
    "devops sre",
    "security guardian",
    "data db architect",
    "realtime voice engineer",
    "longest",
  ]);

  if (publicHiddenSpeakerKeys.has(proposedKey) && !canSeeInternalOrionSpeaker()) {
    return "Orkio";
  }

  return proposed || "Orkio";
}


function inferSpeakerNameFromContent(content) {
  const text = String(content || "").trim();
  if (!text) return "";

  // EFATA777 V5 — Realtime/persisted messages can arrive from the backend with
  // a stale visible speaker ("Orkio") even when the actual spoken content says
  // Orion/Chris assumed the turn. Infer the visible speaker from explicit
  // self-identification before falling back to the first-line label heuristic.
  const normalizedText = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    /\b(eu\s+sou|sou|aqui\s+e|quem\s+fala\s+e|fala\s+o)\s+(o\s+)?orion\b/iu.test(normalizedText) ||
    /\borion\s+(entrou|assumiu|esta\s+na\s+escuta|estou\s+na\s+escuta|pode\s+assumir|assumindo)\b/iu.test(normalizedText) ||
    (/\borion\b/iu.test(normalizedText) && /\b(cto|diagnostico\s+tecnico|agente\s+tecnico)\b/iu.test(normalizedText))
  ) {
    return "Orion";
  }

  if (
    /\b(eu\s+sou|sou|aqui\s+e|quem\s+fala\s+e|fala\s+a)\s+(a\s+)?chris\b/iu.test(normalizedText) ||
    /\bchris\s+(entrou|assumiu|esta\s+na\s+escuta|estou\s+na\s+escuta|pode\s+assumir|assumindo)\b/iu.test(normalizedText) ||
    (/\bchris\b/iu.test(normalizedText) && /\b(cfo|financeir|estrategic|valuation|captacao)\b/iu.test(normalizedText))
  ) {
    return "Chris";
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => String(line || "").replace(/^[\s#>*-]+/, "").replace(/\s*[:：]\s*$/, "").trim())
    .filter(Boolean);

  if (!lines.length) return "";
  const first = lines[0];
  const inferred = canonicalizeSpeakerLabel(first);
  const normalizedFirst = String(first || "").trim().toLowerCase();
  if (!inferred) return "";
  if (["agent", "assistant", "model", "agente"].includes(normalizedFirst)) return "Agent";
  if (inferred !== first) return inferred;
  return "";
}

function resolveAssistantDisplayName(messageLike, fallback = "Agent") {
  const rawName =
    messageLike?.agent_name ||
    messageLike?.final_speaker ||
    messageLike?.visible_agent ||
    messageLike?.speaker_name ||
    messageLike?.name ||
    "";

  const explicitFromContent = inferSpeakerNameFromContent(
    messageLike?.final_text || messageLike?.content || messageLike?.text || ""
  );

  const normalizedRaw = canonicalizeSpeakerLabel(rawName);
  const rawLower = String(normalizedRaw || "").trim().toLowerCase();

  let candidate = "";

  const explicitKey = String(canonicalizeSpeakerLabel(explicitFromContent || "") || "").trim().toLowerCase();

  if (
    explicitFromContent &&
    canSeeInternalOrionSpeaker() &&
    ["orion", "chris"].includes(explicitKey)
  ) {
    candidate = explicitFromContent;
  } else if (explicitFromContent && ["agent", "assistant", "model"].includes(rawLower)) {
    candidate = explicitFromContent;
  } else if (explicitFromContent && !rawName) {
    candidate = explicitFromContent;
  } else if (normalizedRaw) {
    candidate = normalizedRaw;
  } else if (explicitFromContent) {
    candidate = explicitFromContent;
  } else {
    candidate = fallback;
  }

  return sanitizePublicAssistantSpeaker(messageLike, candidate || fallback || "Orkio");
}

function normalizeMessageSpeaker(messageLike) {
  if (!messageLike || String(messageLike?.role || "").toLowerCase() !== "assistant") {
    return messageLike;
  }

  const sanitizedMessage = sanitizePublicBetaAssistantMessage(messageLike);
  const displayName = resolveAssistantDisplayName(sanitizedMessage, "Orkio");

  return {
    ...sanitizedMessage,
    agent_name: displayName,
    final_speaker: displayName,
    visible_agent: displayName,
  };
}

function resolveRealtimeVisibleSpeakerName(content = "", fallback = "") {
  const inferred = inferSpeakerNameFromContent(content);
  if (inferred && inferred !== "Agent") return inferred;
  const active = String(fallback || "").trim();
  if (active) return canonicalizeSpeakerLabel(active);
  return "Orkio";
}

// METATRON_CHAT_ORDER_STABILITY
// Mantém a ordem visual pergunta -> resposta mesmo quando o backend retorna mensagens
// fora de ordem, com timestamps empatados ou quando a reconciliação pós-stream substitui
// o histórico local pelo histórico persistido.
function coerceMessageTimestamp(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    // Backend pode retornar segundos; frontend local pode usar milissegundos.
    return value > 10_000_000_000 ? value : value * 1000;
  }

  const raw = String(value || "").trim();
  if (!raw) return null;

  const asNumber = Number(raw);
  if (Number.isFinite(asNumber)) {
    return asNumber > 10_000_000_000 ? asNumber : asNumber * 1000;
  }

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function roleOrderForChat(role) {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "user") return 10;
  if (normalized === "assistant") return 20;
  if (normalized === "agent") return 20;
  if (normalized === "tool") return 30;
  if (normalized === "system") return 40;
  return 50;
}

function getMessageSortTimestamp(message, fallbackIndex = 0) {
  const candidates = [
    message?.client_created_at,
    message?.created_at,
    message?.createdAt,
    message?.timestamp,
    message?.updated_at,
    message?.updatedAt,
  ];

  for (const candidate of candidates) {
    const parsed = coerceMessageTimestamp(candidate);
    if (parsed != null) return parsed;
  }

  return fallbackIndex;
}

function orderChatMessages(input) {
  const list = Array.isArray(input) ? input : [];
  return list
    .map((message, index) => ({ message, index }))
    .sort((a, b) => {
      const ta = getMessageSortTimestamp(a.message, a.index);
      const tb = getMessageSortTimestamp(b.message, b.index);

      if (ta !== tb) return ta - tb;

      const roleDelta = roleOrderForChat(a.message?.role) - roleOrderForChat(b.message?.role);
      if (roleDelta !== 0) return roleDelta;

      const clientOrderA = Number(a.message?.client_order ?? a.message?.clientOrder ?? NaN);
      const clientOrderB = Number(b.message?.client_order ?? b.message?.clientOrder ?? NaN);
      if (Number.isFinite(clientOrderA) && Number.isFinite(clientOrderB) && clientOrderA !== clientOrderB) {
        return clientOrderA - clientOrderB;
      }

      return a.index - b.index;
    })
    .map((entry) => entry.message);
}

function logRealtimeStep(step, payload = undefined) {
  try {
    const stamp = new Date().toISOString();
    if (payload === undefined) {
      console.log(`[Realtime][${stamp}] ${step}`);
    } else {
      console.log(`[Realtime][${stamp}] ${step}`, payload);
    }
  } catch {}
}


function hasAdminAccess(userObj) {
  if (!userObj) return false;
  const role = String(userObj?.role || "").trim().toLowerCase();
  const email = String(userObj?.email || userObj?.user_email || "").trim().toLowerCase();

  const envAdminEmails = String(
    ORKIO_ENV.VITE_ADMIN_EMAILS ||
    import.meta.env.VITE_ADMIN_EMAILS ||
    "daniel@patroai.com"
  )
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return !!(
    role === "admin"
    || role === "owner"
    || role === "superadmin"
    || userObj?.is_admin === true
    || userObj?.admin === true
    || (email && envAdminEmails.includes(email))
  );
}


// Icons (inline SVG)
const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconPaperclip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.19 9.19a2 2 0 0 1-2.83-2.83l8.49-8.49" />
  </svg>
);

const IconEdit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </svg>
);

const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);


function tryParseEvent(content) {
  try {
    if (!content || typeof content !== "string") return null;
    const idx = content.indexOf("ORKIO_EVENT:");
    if (idx < 0) return null;
    const jsonStr = content.slice(idx + "ORKIO_EVENT:".length);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function stripEventMarker(content) {
  if (!content || typeof content !== "string") return content;
  const idx = content.indexOf("ORKIO_EVENT:");
  if (idx < 0) return content;
  return content.slice(0, idx).trim();
}

function formatTs(ts) {
  try {
    if (!ts) return "";
    return formatDateTime(ts);
  } catch {
    return "";
  }
}

function formatDateTime(ts) {
  if (ts === null || ts === undefined || ts === "") return "";
  try {
    let ms;
    if (typeof ts === "number") {
      // If value looks like milliseconds (13 digits), keep; if seconds (10 digits), convert.
      ms = ts > 10_000_000_000 ? ts : ts * 1000;
    } else {
      // ISO string or numeric string
      const n = Number(ts);
      if (!Number.isNaN(n) && Number.isFinite(n)) {
        ms = n > 10_000_000_000 ? n : n * 1000;
      } else {
        ms = new Date(ts).getTime();
      }
    }
    const d = new Date(ms);
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

function fmtUsd(value) {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}


function normalizeWalletErrorPayload(err) {
  const payload = err?.payload || err?.data || null;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (payload.code === "WALLET_INSUFFICIENT_BALANCE") return payload;
    if (payload.detail && typeof payload.detail === "object" && payload.detail.code === "WALLET_INSUFFICIENT_BALANCE") {
      return payload.detail;
    }
  }
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      if (parsed?.code === "WALLET_INSUFFICIENT_BALANCE") return parsed;
      if (parsed?.detail?.code === "WALLET_INSUFFICIENT_BALANCE") return parsed.detail;
    } catch {}
  }
  const message = String(err?.message || "").trim();
  if (message) {
    try {
      const parsed = JSON.parse(message);
      if (parsed?.code === "WALLET_INSUFFICIENT_BALANCE") return parsed;
      if (parsed?.detail?.code === "WALLET_INSUFFICIENT_BALANCE") return parsed.detail;
    } catch {}
  }
  return null;
}

function buildWalletBlockedMessage(detail) {
  if (!detail) return "Sua wallet não possui saldo suficiente para continuar.";
  const current = Number(detail.current_balance_usd || detail.wallet?.balance_usd || 0);
  const required = Number(detail.required_usd || 0);
  const missing = Number(
    detail.missing_usd != null
      ? detail.missing_usd
      : Math.max(required - current, 0)
  );
  if (missing > 0.0001) {
    return `Saldo insuficiente na wallet. Faltam ${fmtUsd(missing)} para continuar.`;
  }
  if (required > 0.0001) {
    return `Saldo insuficiente na wallet. É recomendado manter pelo menos ${fmtUsd(required)} disponível.`;
  }
  return "Sua wallet não possui saldo suficiente para continuar.";
}

function isWalletBlockedError(err) {
  if (!err) return false;
  if (String(err?.status || "") === "402") return true;
  return normalizeWalletErrorPayload(err)?.code === "WALLET_INSUFFICIENT_BALANCE";
}




function summarizeExecutionStatus(payload = {}) {
  const raw = String(payload?.status || payload?.message || "").trim();
  if (!raw) return "Executando etapa";
  return raw.length > 140 ? `${raw.slice(0, 137)}...` : raw;
}

// AO20K-HF4M_PREMIUM_EXECUTION_TRACE_UX
function formatExecutionRoutingSource(raw = "") {
  const source = String(raw || "").trim();
  if (!source) return "";
  const labels = {
    "stream_ao20k_hf4k_simple_status": "Status seguro",
    "stream_ao20k_hf4k_immediate_memory_recall": "Memória imediata",
    "stream_ao20k_hf4k_simulation_only_branch_pr_plan": "Plano simulado",
  };
  return labels[source] || source.replace(/^stream_/, "").replaceAll("_", " ");
}

// HF6R2A_PREFER_HF6R1_ROUTE_METADATA
function formatRouteBadgeLabel(raw = "") {
  const value = String(raw || "").trim();
  if (!value) return "";
  const labels = {
    multi_intent_readonly_splitter: "multi intent readonly",
    multi_intent_readonly: "multi intent readonly",
    checkpoint_ack_readonly: "checkpoint readonly",
    checkpoint_readonly: "checkpoint readonly",
    safe_agent_ping: "agent ping",
    agent_ping: "agent ping",
    safe_agent_greeting: "agent greeting",
    agent_greeting: "agent greeting",
    readonly_audit_light: "readonly audit light",
    internal_diagnostic_token_readonly: "internal diagnostic token readonly",
    simple_greeting: "simple greeting",
    system_status_readonly: "system status readonly",
    controlled_evolution_readonly: "controlled evolution readonly",
    governed_pipeline_inventory_readonly: "governed pipeline inventory readonly",
    issue_map_patch_plan_readonly: "issue map patch plan readonly",
    branch_pr_plan_simulated_readonly: "branch/pr simulated readonly",
    safe_fastpath_coverage: "safe fast-path",
    technical_audit: "technical audit",
    orchestration_audit: "orchestration audit",
    general: "general",
  };
  return labels[value] || value.replaceAll("_", " ");
}

function buildExecutionBadgesFromRouting(routing = {}) {
  const badges = [];
  if (routing?.fast_path_hit || routing?.runtime_bypassed) badges.push("Fast-path");
  if (routing?.simulation_only) badges.push("Somente simulação");
  if (routing?.write_executed === false || routing?.write_allowed === false) badges.push("Sem escrita");
  if (routing?.branch_created === false && routing?.pr_created === false) badges.push("Sem branch/PR");

  // AO44_TRACE_LABEL_COHERENCE
  const preferredRoute =
    routing?.display_label ||
    routing?.execution_lifecycle ||
    routing?.route_kind ||
    routing?.route_family ||
    routing?.routing_source ||
    "";

  const routeBadge = formatRouteBadgeLabel(preferredRoute);
  if (routeBadge) badges.push(routeBadge);

  if (routing?.route_matrix_version === "HF6R1" || routing?.metadata_normalized) {
    badges.push("HF6R1");
  }

  return Array.from(new Set(badges.filter(Boolean))).slice(0, 5);
}

function buildExecutionDoneDetail(payload = {}) {
  const routing = payload?.runtime_hints?.routing || {};
  const parts = [];
  const sourceLabel = formatExecutionRoutingSource(routing?.routing_source);
  if (sourceLabel) parts.push(sourceLabel);
  if (routing?.simulation_only) parts.push("simulação readonly");
  if (routing?.write_executed === false) parts.push("sem escrita");
  if (routing?.execution_cursor?.current_node) parts.push(`nó ${routing.execution_cursor.current_node}`);
  return parts.join(" • ");
}


function normalizeCapabilityPayload(payload = null) {
  if (!payload || typeof payload !== "object") return null;
  const multiagent = payload?.multiagent && typeof payload.multiagent === "object" ? payload.multiagent : {};
  const github = payload?.github && typeof payload.github === "object" ? payload.github : {};
  return {
    multiagent,
    github,
  };
}

function formatGithubRuntimeStatus(capabilities = null) {
  const normalized = normalizeCapabilityPayload(capabilities);
  const github = normalized?.github || {};
  if (!github?.available) return "sem acesso";
  const mode = String(github?.mode || "").trim().toLowerCase();
  if (mode === "governed_pr_only") return "PR-only";
  if (github?.read_enabled && !github?.write_enabled) return "read-only";
  if (github?.write_enabled) return "conectado";
  return "conectado";
}

function formatActiveAgentRuntime(agentName = "") {
  const slug = String(agentName || "").trim().toLowerCase();
  if (!slug) return "";
  if (slug.startsWith("orion")) return "Orion analisando";
  if (slug.startsWith("chris")) return "Chris validando";
  if (slug.startsWith("auditor")) return "Auditor revisando";
  return "Orkio respondendo";
}

// PATCH_26_UI_MEETING_ROOM:
// Small, dependency-free UI helpers to expose the persisted realtime room state.
// The backend remains the source of truth; these helpers only format what the
// backend already returns in meeting_state.
function formatMeetingRoomSpeakerName(meetingState = {}, kind = "active") {
  const prefix = kind === "last" ? "last" : "active";
  return canonicalizeSpeakerLabel(
    meetingState?.[`${prefix}_speaker_name`] ||
    meetingState?.[`${prefix}_agent_name`] ||
    meetingState?.[`${prefix}_speaker_slug`] ||
    meetingState?.[`${prefix}_agent_slug`] ||
    ""
  );
}

function extractMeetingRoomParticipants(meetingState = {}) {
  const direct = Array.isArray(meetingState?.participants)
    ? meetingState.participants
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          return item.display_name || item.name || item.slug || "";
        })
        .filter(Boolean)
    : [];
  const slugs = Array.isArray(meetingState?.participant_slugs)
    ? meetingState.participant_slugs.map((slug) => canonicalizeSpeakerLabel(slug)).filter(Boolean)
    : [];

  const out = [];
  const seen = new Set();
  for (const value of [...direct, ...slugs]) {
    const label = canonicalizeSpeakerLabel(value);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out.slice(0, 8);
}

function traceStepTone(kind = "status") {
  if (kind === "error") return { icon: "⚠️", color: "#fca5a5", border: "rgba(248,113,113,0.24)", background: "rgba(127,29,29,0.22)" };
  if (kind === "done") return { icon: "✅", color: "#86efac", border: "rgba(74,222,128,0.24)", background: "rgba(20,83,45,0.22)" };
  if (kind === "agent") return { icon: "🧩", color: "#bfdbfe", border: "rgba(96,165,250,0.24)", background: "rgba(30,64,175,0.16)" };
  if (kind === "system") return { icon: "⚙️", color: "#c4b5fd", border: "rgba(139,92,246,0.24)", background: "rgba(76,29,149,0.18)" };
  return { icon: "⏳", color: "#e5e7eb", border: "rgba(148,163,184,0.20)", background: "rgba(15,23,42,0.26)" };
}

function resolveRealtimeTranscriptionLanguage(languageProfile) {
  // AO68A-HF6R8 — Onboarding controls the language hint. "auto" keeps provider auto-detect.
  const raw = String(languageProfile || "").trim();
  if (!raw) return null;

  const normalized = raw.toLowerCase().replace("_", "-");
  if (!normalized || normalized === "auto") return null;

  if (normalized === "pt" || normalized.startsWith("pt-")) return "pt";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "es" || normalized.startsWith("es-")) return "es";
  if (normalized === "fr" || normalized.startsWith("fr-")) return "fr";

  return normalized.split("-")[0] || null;
}


const ONBOARDING_USER_TYPES = [
  { value: "founder", label: "Founder" },
  { value: "investor", label: "Investor" },
  { value: "operator", label: "Operator" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
];

const ONBOARDING_INTENTS = [
  { value: "explore", label: "Explorar a plataforma" },
  { value: "meeting", label: "Agendar conversa" },
  { value: "pilot", label: "Avaliar piloto" },
  { value: "funding", label: "Discutir investimento" },
  { value: "other", label: "Outro" },
];

const ONBOARDING_COUNTRIES = [
  { value: "BR", label: "Brasil" },
  { value: "US", label: "Estados Unidos" },
  { value: "ES", label: "Espanha" },
  { value: "PT", label: "Portugal" },
  { value: "AR", label: "Argentina" },
  { value: "MX", label: "México" },
  { value: "CO", label: "Colômbia" },
  { value: "CL", label: "Chile" },
  { value: "UY", label: "Uruguai" },
  { value: "OTHER", label: "Outro" },
];

const ONBOARDING_LANGUAGES = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" },
  { value: "pt-PT", label: "Português (Portugal)" },
];

const DEFAULT_LANGUAGE_BY_COUNTRY = {
  BR: "pt-BR",
  PT: "pt-PT",
  ES: "es-ES",
  AR: "es-ES",
  MX: "es-ES",
  CO: "es-ES",
  CL: "es-ES",
  UY: "es-ES",
  US: "en-US",
  OTHER: "en-US",
};

function normalizeOnboardingUserType(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const aliases = {
    founder: "founder",
    investor: "investor",
    operator: "operator",
    enterprise: "operator",
    developer: "operator",
    partner: "partner",
    other: "other",
  };
  return aliases[raw] || "";
}

function normalizeOnboardingIntent(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const aliases = {
    explore: "explore",
    exploring: "explore",
    curious: "explore",
    meeting: "meeting",
    partnership: "meeting",
    pilot: "pilot",
    company_eval: "pilot",
    funding: "funding",
    investment: "funding",
    other: "other",
  };
  return aliases[raw] || "";
}

function suggestOnboardingLanguage(country) {
  const code = String(country || "").trim().toUpperCase();
  return DEFAULT_LANGUAGE_BY_COUNTRY[code] || "en-US";
}

// AO68A-HF5 — Realtime language propagation from onboarding.
// Keeps AMCHAM/PT-EN demos bilingual without forcing a global STT language.
// RTB-04_REALTIME_PRODUCT_IDENTITY_LOCK
// Mantém a identidade de produto Orkio/Patroai no Realtime.
// Regra: memória/contexto da thread vem do backend RTB-03.
// Aqui o frontend apenas evita que session.update/response.create faça o modelo voltar
// para uma identidade genérica de provedor.
function normalizeRealtimeLanguageProfile(raw) {
  const value = String(raw || "").trim();
  if (!value || value.toLowerCase() === "auto") return "auto";
  const normalized = value.toLowerCase().replace("_", "-");
  if (normalized === "pt" || normalized.startsWith("pt-")) return "pt";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "es" || normalized.startsWith("es-")) return "es";
  return "auto";
}

function getUserOnboardingLanguage(userObj, formObj) {
  const candidates = [
    formObj?.language,
    userObj?.language,
    userObj?.preferred_language,
    userObj?.language_profile,
    userObj?.profile?.language,
    userObj?.profile?.preferred_language,
    userObj?.onboarding?.language,
    userObj?.onboarding_context?.language,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value) return value;
  }

  return "auto";
}

const ORKIO_RTB04_FOUNDER_ADMIN_EMAILS = new Set([
  "daniel@patroai.com",
  "dangraebin@gmail.com",
]);

function normalizeEmailForRealtimeIdentity(value) {
  return String(value || "").trim().toLowerCase();
}

function getRealtimeCurrentUserForIdentity() {
  try {
    return getUser?.() || {};
  } catch {
    return {};
  }
}

function isAuthorizedFounderRealtimeUser(userObj = null) {
  const userLike = userObj || getRealtimeCurrentUserForIdentity();
  const email = normalizeEmailForRealtimeIdentity(
    userLike?.email ||
      userLike?.user_email ||
      userLike?.login_email ||
      userLike?.profile?.email ||
      ""
  );

  return Boolean(email && ORKIO_RTB04_FOUNDER_ADMIN_EMAILS.has(email));
}

function buildOrkioRealtimeProductIdentityLock(languageProfile = "auto", activeAgentSlugOrName = "") {
  const lang = normalizeRealtimeLanguageProfile(languageProfile);
  const founder = isAuthorizedFounderRealtimeUser();
  const activeSlug = registryCanonicalAgentSlug(activeAgentSlugOrName || "orkio", { allowUnknown: true }) || "orkio";
  const activeName = registryCanonicalAgentDisplayNameFromSlug(activeSlug) || canonicalizeSpeakerLabel(activeSlug || "Orkio") || "Orkio";
  const activeAgentLine =
    activeSlug && activeSlug !== "orkio"
      ? `- Active speaking agent for this turn: ${activeName}. The product/platform identity is Orkio/Patroai, but the answer must be written and spoken as ${activeName}.`
      : "- Active speaking agent for this turn: Orkio.";

  if (lang === "en") {
    return [
      "ORKIO/PATROAI PRODUCT IDENTITY — HIGH PRIORITY",
      "- You are operating inside the Orkio/Patroai AI platform of Patroai Consultech.",
      activeAgentLine,
      "- The Orkio/Patroai platform was created by Patroai Consultech under the direct leadership of Daniel Graebin.",
      "- When asked who created the platform, answer about the Orkio/Patroai product identity, not as a generic base model.",
      "- You may mention that the platform can use external AI model providers when relevant, but do not say that the product identity was created by OpenAI.",
      "- Never claim that a common user is Daniel Graebin unless the authenticated e-mail is explicitly authorized.",
      founder
        ? "- Authenticated founder context: the current user is Daniel Graebin, Founder and CEO of Patroai Consultech, and creator of the Orkio/Patroai platform. Treat him as founder/admin in governed internal context."
        : "- For common users, do not expose founder/admin identity context; only use the user's own authorized thread context.",
    ].join("\n");
  }

  if (lang === "es") {
    return [
      "IDENTIDAD DE PRODUCTO ORKIO/PATROAI — ALTA PRIORIDAD",
      "- Estás operando dentro de la plataforma de IA Orkio/Patroai de Patroai Consultech.",
      activeSlug && activeSlug !== "orkio"
        ? `- Agente hablante activo de este turno: ${activeName}. La identidad de producto/plataforma es Orkio/Patroai, pero la respuesta debe ser escrita y hablada como ${activeName}.`
        : "- Agente hablante activo de este turno: Orkio.",
      "- La plataforma Orkio/Patroai fue creada por Patroai Consultech bajo el liderazgo directo de Daniel Graebin.",
      "- Cuando pregunten quién creó la plataforma, responde sobre la identidad del producto Orkio/Patroai, no como un modelo base genérico.",
      "- Puedes mencionar que la plataforma puede usar proveedores externos de modelos de IA cuando sea relevante, pero no digas que la identidad de producto fue creada por OpenAI.",
      "- Nunca afirmes que un usuario común es Daniel Graebin salvo que el e-mail autenticado esté explícitamente autorizado.",
      founder
        ? "- Contexto founder autenticado: el usuario actual es Daniel Graebin, Founder y CEO de Patroai Consultech, y creador de la plataforma Orkio/Patroai. Trátalo como founder/admin en contexto interno gobernado."
        : "- Para usuarios comunes, no expongas contexto founder/admin; usa solo el contexto autorizado de la propia thread del usuario.",
    ].join("\n");
  }

  return [
    "IDENTIDADE DE PRODUTO ORKIO/PATROAI — PRIORIDADE ALTA",
    "- Você está operando dentro da plataforma de IA Orkio/Patroai da Patroai Consultech.",
    activeSlug && activeSlug !== "orkio"
      ? `- Agente falante ativo deste turno: ${activeName}. A identidade de produto/plataforma é Orkio/Patroai, mas a resposta deve ser escrita e falada como ${activeName}.`
      : "- Agente falante ativo deste turno: Orkio.",
    "- A plataforma Orkio/Patroai foi criada pela Patroai Consultech sob liderança direta de Daniel Graebin.",
    "- Quando perguntarem quem criou a plataforma, responda sobre a identidade de produto Orkio/Patroai, não como modelo base genérico.",
    "- Você pode mencionar que a plataforma pode usar provedores externos de modelos de IA quando for relevante, mas não diga que a identidade de produto foi criada pela OpenAI.",
    "- Nunca afirme que um usuário comum é Daniel Graebin se o e-mail autenticado não estiver explicitamente autorizado.",
    founder
      ? "- Contexto founder autenticado: o usuário atual é Daniel Graebin, Founder e CEO da Patroai Consultech, e criador da plataforma Orkio/Patroai. Trate-o como fundador/administrador em contexto interno governado."
      : "- Para usuários comuns, não exponha contexto founder/admin; use apenas o contexto autorizado da própria thread do usuário.",
  ].join("\n");
}

function buildRealtimeVoiceInstruction(languageProfile, messageText = "", activeAgentSlugOrName = "") {
  const lang = normalizeRealtimeLanguageProfile(languageProfile);
  const msg = String(messageText || "").trim();
  const identityLock = buildOrkioRealtimeProductIdentityLock(lang, activeAgentSlugOrName);

  const base =
    lang === "en"
      ? "Answer the user by voice in English, briefly, naturally and helpfully. Preserve the Orkio/Patroai product identity above."
      : lang === "es"
        ? "Responde al usuario por voz en español, de forma breve, natural y útil. Preserva la identidad de producto Orkio/Patroai anterior."
        : lang === "pt"
          ? "Responda ao usuário por voz em português, de forma curta, natural, útil e humana. Preserve a identidade de produto Orkio/Patroai acima."
          : "Answer in the same language the user is using. Be brief, natural, useful and human. Preserve the Orkio/Patroai product identity above.";

  return msg
    ? `${identityLock}\n\n${base}\n\nMensagem do usuário: ${msg}`
    : `${identityLock}\n\n${base}`;
}

function buildFinalRealtimeIdentityLock(targetAgentSlug = "orkio", voiceResolution = {}) {
  const slug = registryCanonicalAgentSlug(targetAgentSlug || "orkio", { allowUnknown: true }) || "orkio";
  const displayName = registryCanonicalAgentDisplayNameFromSlug(slug) || canonicalizeSpeakerLabel(slug) || "Orkio";
  const profile = voiceResolution?.voice_profile || resolveAgentVoiceProfile({ slug });
  const voiceId = voiceResolution?.voice || profile?.voice_id || "";
  return [
    "PATCH_31_FINAL — contrato final de materialização de persona/voz.",
    `Agente resolvido para este response.create: ${displayName} (${slug}).`,
    `Speaker ativo obrigatório: ${slug}. Persona ativa obrigatória: ${slug}.`,
    voiceId ? `Provider voice obrigatório para este turno: ${voiceId}.` : "",
    profile?.profile_id ? `Voice profile canônico: ${profile.profile_id}.` : "",
    "Não fale como Orkio, Orion, Chris ou Laura se esse não for o speaker ativo deste turno.",
    "Não diga que outro agente ainda vai falar quando você já é o agente ativo autorizado.",
  ].filter(Boolean).join("\n");
}

function buildRealtimeActivationProbeInstruction(languageProfile) {
  const lang = normalizeRealtimeLanguageProfile(languageProfile);
  const identityLock = buildOrkioRealtimeProductIdentityLock(lang);

  if (lang === "en") {
    return {
      inputText: "Say only: Hello, I am Orkio, the AI platform of Patroai Consultech, in real time.",
      instructions: `${identityLock}\n\nAnswer by audio in English, saying only: Hello, I am Orkio, the AI platform of Patroai Consultech, in real time.`,
    };
  }

  if (lang === "es") {
    return {
      inputText: "Di solamente: Hola, soy Orkio, la plataforma de IA de Patroai Consultech, en tiempo real.",
      instructions: `${identityLock}\n\nResponde en audio en español, diciendo solamente: Hola, soy Orkio, la plataforma de IA de Patroai Consultech, en tiempo real.`,
    };
  }

  return {
    inputText: "Diga apenas: Olá, eu sou o Orkio, a plataforma de IA da Patroai Consultech, em tempo real.",
    instructions: `${identityLock}\n\nResponda em áudio em português, dizendo apenas: Olá, eu sou o Orkio, a plataforma de IA da Patroai Consultech, em tempo real.`,
  };
}

function normalizeWhatsapp(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

function sanitizeOnboardingForm(data) {
  const country = String(data?.country || "").trim().toUpperCase() || "BR";
  const language = String(data?.language || "").trim() || suggestOnboardingLanguage(country);
  return {
    company: String(data?.company || "").trim(),
    role: String(data?.role || data?.profile_role || "").trim(),
    user_type: normalizeOnboardingUserType(data?.user_type) || "other",
    intent: normalizeOnboardingIntent(data?.intent) || "explore",
    country,
    language,
    whatsapp: normalizeWhatsapp(data?.whatsapp || ""),
    notes: String(data?.notes || "").trim(),
  };
}

export default function AppConsole() {

  const SHOW_REALTIME_AUDIT = false;

  // AO68C-HF1_REALTIME_ENTRYPOINT_RESTORED
  // Realtime must be available from the UI so admin/staging can actually test /api/realtime/start.
  // Founder handoff remains disabled until its own validation track.
  const REALTIME_ENTRYPOINT_ENABLED = true;
  const FOUNDER_HANDOFF_ENTRYPOINT_ENABLED = false;
  const DISABLED_FEATURE_NOTICE =
    "Esta funcionalidade está em construção e será liberada futuramente. Por enquanto, o chat por texto está à disposição. Conforme a evolução das conversas e o uso correto da ferramenta, novas funcionalidades e agentes especializados poderão ser liberados.";

  // AO72B-HF1_PUBLIC_2MIN_PER_HOUR_FRONTEND
  // Product rule for the public beta: 2 minutes of Realtime followed by 1 hour of cooldown.
  // Admin/founder-admin keep the existing bypass. The backend must still become the
  // authoritative cross-device source before production; this frontend guard provides
  // the requested staging UX and local enforcement.
  const REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS = 2 * 60;
  const REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS = 60 * 60;
  const REALTIME_PUBLIC_BETA_CLOSING_NOTICE_SECONDS = 30;
  const REALTIME_ANNOUNCEMENT_PHRASE_FALLBACK_MS = 3200;
  const REALTIME_FINAL_MESSAGE_GRACE_MS = 28000;
  const REALTIME_FINAL_MESSAGE_POST_DONE_GRACE_MS = 11000;
  const REALTIME_COOLDOWN_STORAGE_KEY = "orkio_realtime_public_cooldown_until_v1";
  const REALTIME_FRONTEND_HARD_TIMEBOX_ENABLED = true;
  // ORKIO_AO60K_HF5B_FRONTEND_ENDED_AT_SECONDS_TIMEBOX_VERIFY
  // Build marker used only for audit/debug so we can prove the active bundle contains HF5B.
  const ORKIO_AO60K_HF5B_BUILD_MARKER = "AO60K-HF5B_FRONTEND_ENDED_AT_SECONDS_TIMEBOX_VERIFY";
const ORKIO_AO61A_BUILD_MARKER = "AO61A_REALTIME_PREMIUM_UX_COOLDOWN_TRANSCRIPTION_LOCK";
const ORKIO_AO61A_HF3_BUILD_MARKER = "AO61A-HF3_TIMEBOX_COUNTER_AUTOSTOP_ASSISTANT_TRANSCRIPT";
const ORKIO_AO61A_HF4_BUILD_MARKER = "AO61A-HF4_FIXED_COUNTER_LONGEST_ASSISTANT_TRANSCRIPT";
const ORKIO_AO66R_HF4_BUILD_MARKER = "AO66R_REALTIME_ACTIVATION_REPAIR";
const ORKIO_HF6_2_BUILD_MARKER = "HF6.2_NON_ADMIN_PUBLIC_TIMEBOX_RESTORED";
const ORKIO_HF6_3_BUILD_MARKER = "HF6.3_REALTIME_POLITE_CLOSING_GRACE";
const ORKIO_HF6_4_BUILD_MARKER = "HF6.4_REALTIME_ZERO_TIMER_TAIL_GRACE";

  const nav = useNavigate();

  function resolveAuthenticatedTenant(userLike = null, fallbackTenant = "") {
    const candidateUser = userLike || getUser?.() || {};
    const candidates = [
      candidateUser?.org_slug,
      candidateUser?.org,
      candidateUser?.tenant,
      fallbackTenant,
      getTenant?.(),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    const privileged = hasAdminAccess(candidateUser) || isAuthorizedFounderRealtimeUser(candidateUser);
    const nonPublic = candidates.find((value) => value && value.toLowerCase() !== "public");
    if (nonPublic) return nonPublic;
    if (privileged) return "";
    return candidates[0] || "public";
  }

  function applyAuthenticatedSession(nextUser, fallbackTenant = "") {
    const resolvedTenant = resolveAuthenticatedTenant(nextUser, fallbackTenant);
    setUser(nextUser);
    setTenant(resolvedTenant || "");
    try {
      if (resolvedTenant) {
        setSession({ token: getToken(), user: nextUser, tenant: resolvedTenant });
      } else {
        storeUser(nextUser);
        clearTenant();
      }
    } catch {}
    return resolvedTenant;
  }


  async function confirmSessionExpired(reason = "unknown") {
    const t = getToken();
    const org = resolveAuthenticatedTenant(getUser?.(), tenant);

    if (!t) return true;

    try {
      await apiFetch("/api/me", {
        method: "GET",
        token: t,
        org: org || "",
        skipAuthRedirect: true,
      });
      return false;
    } catch (err) {
      if (err?.status === 401) {
        console.warn("session confirmed expired", { reason, code: err?.code });
        return true;
      }
      console.warn("session probe failed without confirmed expiry", {
        reason,
        status: err?.status,
        message: err?.message,
      });
      return false;
    }
  }

  async function logoutIfSessionReallyExpired(reason = "unknown") {
    const expired = await confirmSessionExpired(reason);
    if (expired) {
      clearSession();
      nav("/auth?session_expired=1");
      return true;
    }
    return false;
  }


  const [tenant, setTenant] = useState(() => resolveAuthenticatedTenant(getUser?.(), getTenant()) || "");
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(getUser());
  const canAccessAdmin = hasAdminAccess(user);

  // Summit presence heartbeat (single source of truth).
  // EFATA777 v12: the app must not keep an inline heartbeat loop in parallel with
  // startSessionHeartbeat(). A duplicated loop can keep sending stale tokens and
  // create noisy 401 races while another tab/session is already valid.
  React.useEffect(() => {
    if (!token) return undefined;

    const stopHeartbeat = startSessionHeartbeat({
      intervalMs: 45000,
      onUnauthorized: () => {
        void logoutIfSessionReallyExpired("heartbeat");
      },
    });

    return () => {
      try { stopHeartbeat?.(); } catch {}
    };
  }, [token, tenant]);

  useEffect(() => {
    try {
      console.log("ADMIN_RUNTIME_USER", user);
      console.log("ADMIN_RUNTIME_CAN_ACCESS", canAccessAdmin);
    } catch {}
  }, [user, canAccessAdmin]);

const [onboardingChecked, setOnboardingChecked] = useState(false);
const [bootstrapFailOpen, setBootstrapFailOpen] = useState(false);
const [onboardingOpen, setOnboardingOpen] = useState(false);
const [onboardingBusy, setOnboardingBusy] = useState(false);
const [onboardingStatus, setOnboardingStatus] = useState("");
const [onboardingForm, setOnboardingForm] = useState(() => sanitizeOnboardingForm(user));
  const [health, setHealth] = useState("checking");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 820 : false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [threads, setThreads] = useState([]);
  const [threadId, setThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [agents, setAgents] = useState([]);
  const [threadsLoadState, setThreadsLoadState] = useState("loading"); // loading|retrying|load_failed|empty|ready
  const [threadsLoadError, setThreadsLoadError] = useState("");
  const [messagesLoadState, setMessagesLoadState] = useState("empty"); // loading|retrying|load_failed|empty|ready
  const [messagesLoadError, setMessagesLoadError] = useState("");
  const agentsByNameRef = useRef(new Map());
  const threadsRef = useRef([]);
  const messagesThreadIdRef = useRef("");
  const cleanNewThreadIdRef = useRef("");
  const newConversationQuietUntilRef = useRef(0);
  const createThreadBusyRef = useRef(false);
  const activeThreadIdRef = useRef("");
  const activeThreadEpochRef = useRef(0);
  const messagesAbortRef = useRef(null);
  const messagesLoadRequestRef = useRef(0);
  const requestedThreadIdRef = useRef("");
  const threadSelectionLockUntilRef = useRef(0);
  const pinnedThreadIdRef = useRef("");
  const initialStoredThreadIdRef = useRef("");
  const storageBootstrapConsumedRef = useRef(false);
  const storageBootstrapInitializedRef = useRef(false);
  const THREAD_STORAGE_KEY = "orkio_active_thread_id";

  function applyThreadsList(list) {
    const safeList = Array.isArray(list) ? list : [];
    threadsRef.current = safeList;
    setThreads(safeList);
    return safeList;
  }

  useEffect(() => {
    threadsRef.current = Array.isArray(threads) ? threads : [];
  }, [threads]);

  function readStoredThreadId() {
    if (typeof window === "undefined") return "";
    try {
      return String(readPwaMobileActiveThreadId() || window.localStorage?.getItem(THREAD_STORAGE_KEY) || "").trim();
    } catch {
      return "";
    }
  }

  function persistActiveThreadId(nextId) {
    const safeId = String(nextId || "").trim();
    if (typeof window === "undefined") return;
    try {
      if (safeId) window.localStorage?.setItem(THREAD_STORAGE_KEY, safeId);
      else window.localStorage?.removeItem(THREAD_STORAGE_KEY);
    } catch {}
    try {
      persistPwaMobileActiveThreadId(safeId);
    } catch {}
  }

  function getBootstrapStoredThreadId() {
    if (storageBootstrapConsumedRef.current) return "";
    if (!storageBootstrapInitializedRef.current) {
      initialStoredThreadIdRef.current = readStoredThreadId();
      storageBootstrapInitializedRef.current = true;
    }
    return String(initialStoredThreadIdRef.current || "").trim();
  }

  function consumeStoredThreadBootstrap(nextId = "") {
    storageBootstrapConsumedRef.current = true;
    initialStoredThreadIdRef.current = String(nextId || "").trim();
  }

  function lockThreadSelection(nextId = "", ttlMs = 15000) {
    const safeId = String(nextId || "").trim();
    if (safeId) pinnedThreadIdRef.current = safeId;
    threadSelectionLockUntilRef.current = Date.now() + Math.max(1000, Number(ttlMs || 0));
  }

  const [text, setText] = useState("");
  const textareaRef = useRef(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const smartActionLockRef = useRef(false);
  const [smartActionInteraction, setSmartActionInteraction] = useState({
    messageId: "",
    actionId: "",
    phase: "idle",
  });
  const [runtimeHints, setRuntimeHints] = useState(null);
  const showRuntimeHints = Boolean(user?.role === "admin" && typeof window !== "undefined" && window.localStorage?.getItem("orkio_show_runtime_hints") === "1");
  const showOrionSquad = Boolean(user?.role === "admin" && typeof window !== "undefined" && window.localStorage?.getItem("orkio_show_orion_squad") === "1");
  const isExecutiveExperience = (() => {
    const profileText = [
      user?.role,
      user?.title,
      user?.profile,
      user?.persona,
      user?.job_title,
      user?.account_type,
    ].map((value) => String(value || "").toLowerCase()).join(" ");
    return /\b(ceo|founder|fundador|admin|cliente|client|operator|operador)\b/.test(profileText);
  })();
  const [lastTraceId, setLastTraceId] = useState(null);
  const [agentCapabilities, setAgentCapabilities] = useState(null);
  const [activeRuntimeAgent, setActiveRuntimeAgent] = useState("");
  // PATCH_25_MEETING_STATE_PERSISTENTE:
  // Client mirror of backend RealtimeSession.meta.meeting_state. The backend is
  // still source of truth; this lets the UI echo current room state in batches.
  const [meetingState, setMeetingState] = useState(null);
  const meetingStateRef = useRef(null);
  const [runtimeHandoffLabel, setRuntimeHandoffLabel] = useState("");
  const [orionSquadHealth, setOrionSquadHealth] = useState(null);
  const [orionSquadPreview, setOrionSquadPreview] = useState(null);
  const [walletSummary, setWalletSummary] = useState(null);
  const [walletSummaryLoading, setWalletSummaryLoading] = useState(false);
  const [walletSummaryError, setWalletSummaryError] = useState("");
  const [executionTrace, setExecutionTrace] = useState([]);
  const [patchApprovalModal, setPatchApprovalModal] = useState(null);
  const [patchApprovalPassword, setPatchApprovalPassword] = useState("");
  const [patchApprovalBusy, setPatchApprovalBusy] = useState(false);
  const [patchApprovalError, setPatchApprovalError] = useState("");
  const [executionTraceExpanded, setExecutionTraceExpanded] = useState(false);

  // Destination selector (Team / single / multi)
  const [destMode, setDestMode] = useState(() => {
    if (typeof window === "undefined") return "team";
    try {
      const synced = readPwaMobileDestinationState();
      const stored = String(synced.mode || window.localStorage?.getItem("orkio_last_dest_mode") || "").trim().toLowerCase();
      return ["team", "single", "multi"].includes(stored) ? stored : "team";
    } catch {
      return "team";
    }
  }); // team|single|multi
  const [destSingle, setDestSingle] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const synced = readPwaMobileDestinationState();
      return synced.single || window.localStorage?.getItem("orkio_last_dest_single") || "";
    } catch {
      return "";
    }
  }); // agent id
  const [destMulti, setDestMulti] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const synced = readPwaMobileDestinationState();
      if (Array.isArray(synced.multi) && synced.multi.length) return synced.multi;
      const raw = window.localStorage?.getItem("orkio_last_dest_multi") || "[]";
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((v) => String(v || "").trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  });   // agent ids
  // PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE:
  // Visual/manual button selection has its own sticky source of truth. It must not
  // be derived from backend meeting_state because telemetry/state_update batches
  // can be empty during realtime reconnects.
  const [selectedManualAgentSlug, setSelectedManualAgentSlug] = useState(() => {
    if (typeof window === "undefined") return "team";
    try {
      const synced = readPwaMobileDestinationState();
      const stored = String(
        synced.manual_target_slug ||
        synced.manual_slug ||
        window.localStorage?.getItem("orkio_manual_authority_slug") ||
        ""
      ).trim();
      if (stored) return normalizeManualAuthoritySlug(stored, "team");
      const storedMode = String(synced.mode || window.localStorage?.getItem("orkio_last_dest_mode") || "").trim().toLowerCase();
      if (storedMode === "team") return "team";
      if (storedMode === "single") {
        const storedSingle = String(synced.single || window.localStorage?.getItem("orkio_last_dest_single") || "").trim();
        return normalizeManualAuthoritySlug(storedSingle, "orkio");
      }
      return "team";
    } catch {
      return "team";
    }
  });
  const selectedManualAgentSlugRef = useRef(selectedManualAgentSlug || "team");
  // PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR:
  // Team room state is deliberately separate from the visual quick-button slug.
  // In Team Mode, clicking Orion/Chris/Laura promotes that agent to the next
  // turn without collapsing the room back to single-agent authority.
  const manualTeamConversationActiveRef = useRef(selectedManualAgentSlug === "team");
  const manualTeamConversationFocusSlugRef = useRef(selectedManualAgentSlug === "team" ? "orkio" : "");
  const manualTeamConversationTurnQueueRef = useRef([...PATCH_32_CANONICAL_TEAM_AGENT_SLUGS]);
  const manualTeamConversationTurnIndexRef = useRef(0);
  // PATCH_34_REVB_REALTIME_ROOM_ENGINE_FULL_INTEGRATION:
  // Client-side mirror of backend room_state. Backend remains authoritative; this echo prevents
  // destructive empty/single meeting_state payloads during realtime telemetry batches.
  const manualRealtimeRoomStateRef = useRef(null);

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFileObj, setUploadFileObj] = useState(null);
  const [uploadScope, setUploadScope] = useState("thread"); // thread|agents|institutional
  const [uploadAgentIds, setUploadAgentIds] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffNotice, setHandoffNotice] = useState("");
  const [disabledFeatureNotice, setDisabledFeatureNotice] = useState(null);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [handoffDraft, setHandoffDraft] = useState("");
  const [handoffInterestType, setHandoffInterestType] = useState("general");
  const [uploadProgress, setUploadProgress] = useState(false);

  function notifyDisabledFeature(kind = "feature") {
    const icon = kind === "founder_handoff" ? "🤝" : kind === "realtime" ? "⚡" : "ℹ️";
    const title =
      kind === "founder_handoff"
        ? "Falar com o founder"
        : kind === "realtime"
          ? "Voz em tempo real"
          : "Funcionalidade em construção";
    const message = DISABLED_FEATURE_NOTICE;
    const composedStatus = `${icon} ${title}: ${message}`;

    try {
      setDisabledFeatureNotice({
        kind,
        icon,
        title,
        message,
      });
    } catch {}

    try { setUploadStatus(composedStatus); } catch {}
    try { setHandoffNotice(message); } catch {}

    try {
      window.clearTimeout?.(notifyDisabledFeature._timer);
      notifyDisabledFeature._timer = window.setTimeout(() => {
        try { setUploadStatus(""); } catch {}
        try { setHandoffNotice(""); } catch {}
        try { setDisabledFeatureNotice(null); } catch {}
      }, 6500);
    } catch {
      setTimeout(() => {
        try { setUploadStatus(""); } catch {}
        try { setHandoffNotice(""); } catch {}
        try { setDisabledFeatureNotice(null); } catch {}
      }, 6500);
    }
  }

const fileInputRef = useRef(null);
const executionTraceRef = useRef([]);

const resetExecutionTrace = (steps = []) => {
  const normalized = Array.isArray(steps)
    ? steps.map((step, idx) => {
        const safeStep = sanitizeExecutionTraceStep(step);
        return {
          ...safeStep,
          id: safeStep.id || `trace-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          ts: safeStep.ts || Date.now(),
        };
      })
    : [];

  executionTraceRef.current = normalized;
  setExecutionTrace(normalized);
};

const appendExecutionTrace = (step) => {
  if (!step) return;

  setExecutionTrace((prev) => {
    const safeStep = sanitizeExecutionTraceStep(step);

    const normalized = {
      ...safeStep,
      id: safeStep.id || `trace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: safeStep.ts || Date.now(),
    };

    const last = prev[prev.length - 1];
    if (
      last &&
      last.kind === normalized.kind &&
      last.label === normalized.label &&
      last.detail === normalized.detail &&
      last.agentName === normalized.agentName
    ) {
      return prev;
    }

    const next = [...prev.slice(-11), normalized];
    executionTraceRef.current = next;
    return next;
  });
};

const collapseExecutionTrace = (delayMs = 0) => {
  const run = () => {
    setExecutionTraceExpanded(false);
    try { window.localStorage?.setItem("orkio_execution_trace_open", "0"); } catch {}
  };
  if (delayMs > 0) {
    window.setTimeout(run, delayMs);
  } else {
    run();
  }
};

useEffect(() => {
  if (sending || !executionTrace.length) return undefined;
  const timer = window.setTimeout(() => {
    setExecutionTraceExpanded(false);
    try { window.localStorage?.setItem("orkio_execution_trace_open", "0"); } catch {}
  }, 900);
  return () => window.clearTimeout(timer);
}, [sending, executionTrace.length]);

const describeExecutionStatus = (payload = {}) => ({
  kind: payload?.agent_id ? "agent" : "status",
  label: summarizeExecutionStatus(payload),
  detail: payload?.message && payload?.message !== payload?.status ? String(payload.message) : "",
  agentName: payload?.agent_name || "",
});

const describeExecutionEvent = (payload = {}) => {
  const isHandoff = payload?.step === "agent_handoff";
  const handoffLabel = isHandoff
    ? `${payload?.from_agent_name || payload?.from_agent_id || "Agente"} → ${payload?.to_agent_name || payload?.agent_name || payload?.to_agent_id || "Agente"}`
    : null;
  return {
    kind: payload?.kind || (payload?.scope === "agent" ? "agent" : "system"),
    label: handoffLabel || payload?.label || summarizeExecutionStatus(payload),
    detail: String(payload?.detail || payload?.message || "").trim(),
    agentName: payload?.agent_name || payload?.to_agent_name || "",
  };
};

const describeExecutionError = (payload = {}) => {
  const label = payload?.code === "WALLET_INSUFFICIENT_BALANCE"
    ? "Saldo insuficiente para executar"
    : payload?.agent_name
    ? `${payload.agent_name} sinalizou uma falha`
    : "Execução interrompida";
  const detail = String(payload?.message || payload?.detail || payload?.error || "").trim();
  return {
    kind: "error",
    label,
    detail,
    agentName: payload?.agent_name || "",
  };
};

const describeExecutionDone = (payload = {}) => {
  const routing = payload?.runtime_hints?.routing || {};
  return {
    kind: "done",
    label: routing?.simulation_only ? "Execução simulada concluída" : "Execução concluída",
    detail: buildExecutionDoneDetail(payload),
    agentName: "",
    badges: buildExecutionBadgesFromRouting(routing),
    source: routing?.routing_source || "",
  };
};

useEffect(() => { executionTraceRef.current = executionTrace || []; }, [executionTrace]);

useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem("orkio_execution_trace_open", executionTraceExpanded ? "1" : "0");
  } catch {}
}, [executionTraceExpanded]);

useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    if (destSingle) window.localStorage?.setItem("orkio_last_dest_single", String(destSingle));
    else window.localStorage?.removeItem("orkio_last_dest_single");
  } catch {}
  try {
    persistPwaMobileDestinationState({ single: destSingle || "" });
  } catch {}
}, [destSingle]);

useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem("orkio_last_dest_mode", String(destMode || "team"));
  } catch {}
  try {
    persistPwaMobileDestinationState({ mode: destMode || "team" });
  } catch {}
}, [destMode]);

useEffect(() => {
  if (typeof window === "undefined") return;
  const clean = Array.isArray(destMulti)
    ? Array.from(new Set(destMulti.map((v) => String(v || "").trim()).filter(Boolean)))
    : [];
  try {
    window.localStorage?.setItem("orkio_last_dest_multi", JSON.stringify(clean));
  } catch {}
  try {
    persistPwaMobileDestinationState({ multi: clean });
  } catch {}
}, [destMulti]);

useEffect(() => {
  let cancelled = false;
  async function loadCapabilities() {
    if (!token) {
      if (!cancelled) setAgentCapabilities(null);
      return;
    }
    try {
      const resp = await getAgentCapabilities({ token, org: tenant });
      if (!cancelled) setAgentCapabilities(normalizeCapabilityPayload(resp?.data || resp || null));
    } catch {
      if (!cancelled) setAgentCapabilities(null);
    }
  }
  void loadCapabilities();
  return () => { cancelled = true; };
}, [token, tenant]);

const messagesEndRef = useRef(null);
  const messagesRef = useRef([]); // PATCH0100_20B: keep latest messages for voice-to-voice sequencing

  // Voice-to-text (manual toggle)
  const [speechSupported] = useState(true);
  const speechRef = useRef(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const micEnabledRef = useRef(false);
  const micRetryRef = useRef({ tries: 0, lastTry: 0 });

  // PATCH0100_13: Voice Mode (TTS + auto-send)
  const [voiceMode, setVoiceMode] = useState(SUMMIT_VOICE_MODE === "stt_tts");
  const voiceModeRef = useRef(SUMMIT_VOICE_MODE === "stt_tts");
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsPlayingMessageId, setTtsPlayingMessageId] = useState(null);
  const ttsAudioRef = useRef(null);
  const ttsObjectUrlRef = useRef(null);
  // AO65A-HF3: allow stopping while /api/tts is still generating audio.
  const ttsAbortRef = useRef(null);
  const ttsStopRequestedRef = useRef(false);
  // AO65A-HF4: hard-stop protection against delayed blobs/audio callbacks after user stop.
  const ttsPlaySeqRef = useRef(0);
  const ttsSuppressAutoUntilRef = useRef(0);
  // AO65A-HF5: remember the message/text explicitly stopped by the user.
  // This blocks delayed automatic replays while still allowing a new user click.
  const ttsManualStopUntilRef = useRef(0);
  // AO65A-HF6: once the user stops message TTS, block all automatic classic TTS
  // until the next explicit user click. Timeout shields were not enough because
  // delayed auto paths can restart after the shield expires.
  const ttsManualStopActiveRef = useRef(false);
  const ttsStoppedMessageIdRef = useRef(null);
  const ttsStoppedTextRef = useRef("");
  const [ttsVoice, setTtsVoice] = useState(localStorage.getItem('orkio_tts_voice') || ORKIO_DEFAULT_VOICE_ID);
  const lastSpokenMsgRef = useRef('');
  const lastSpokenMessageIdRef = useRef(null);
  const micRestartTimeoutRef = useRef(null);
  const mediaRecorderStreamRef = useRef(null);
  const mediaRecorderSilenceIntervalRef = useRef(null);
  const mediaRecorderSilenceTimeoutRef = useRef(null);
  // PATCH0100_14: agent info from last chat response (for voice/avatar)
  const [lastAgentInfo, setLastAgentInfo] = useState(null);

  // PATCH0100_28: Terms acceptance modal
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [composerViewportOffset, setComposerViewportOffset] = useState(0);

  
  // Realtime/WebRTC voice mode (ultra low latency)
  const [realtimeMode, setRealtimeMode] = useState(false);
  const realtimeModeRef = useRef(false);
  const rtcPcRef = useRef(null);
  const rtcDcRef = useRef(null);
  const rtcPendingSessionUpdateRef = useRef(null);
  const rtcManualSwitchGateRef = useRef({
    locked: false,
    generation: 0,
    generation_id: "",
    target_agent_slug: "orkio",
    phase: "READY",
    session_update_sent: false,
    started_at_ms: 0,
  });
  const rtcAudioElRef = useRef(null);
  const rtcAudioProcessingRef = useRef(null);
  // ORKIO_AO60H_REALTIME_MOBILE_AUDIO_TRANSCRIPT_LIFECYCLE
  const rtcRemoteStreamRef = useRef(null);
  const rtcAudioWatchdogRef = useRef(null);
  const rtcWakeLockRef = useRef(null);
  // ORKIO_AO60J_REALTIME_FOREGROUND_WAKE_GUARD
  // Best-effort screen wake lock while Realtime is active in web/PWA foreground.
  // This keeps the display from auto-locking on supported Android/iOS/desktop browsers.
  const rtcWakeLockGuardTimerRef = useRef(null);
  const rtcWakeLockWantedRef = useRef(false);
  const rtcLastVisibilityHiddenAtRef = useRef(null);
  const rtcTextBufRef = useRef("");
  const rtcLastMagicRef = useRef("");
  const [rtcReadyToRespond, setRtcReadyToRespond] = useState(false);
  const rtcLastFinalTranscriptRef = useRef("");
  const rtcMagicEnabledRef = useRef(true);
  const rtcVoiceRef = useRef(ORKIO_DEFAULT_VOICE_ID);
  const rtcHostAgentIdRef = useRef(null);
  const rtcHostAgentNameRef = useRef("Orkio");
  const rtcAudioTranscriptBufRef = useRef("");
  const rtcLastAssistantFinalRef = useRef("");
  const rtcAssistantFinalCommittedRef = useRef(false);
  const rtcAssistantFinalMessageIdRef = useRef(null);
  const rtcRealtimeInlineUserKeyRef = useRef("");
  const rtcRealtimeInlineAssistantKeyRef = useRef("");
  const rtcRealtimeDocumentBridgeKeyRef = useRef("");
  const rtcAssistantFinalTextRef = useRef("");
  const rtcAssistantPendingFinalTextRef = useRef("");
  const rtcAssistantPendingFinalSourceRef = useRef("");
  const rtcAssistantPendingFinalTimerRef = useRef(null);
  const rtcTimeboxHardStopTimerRef = useRef(null);
  const rtcTimeboxDeadlineRef = useRef(0);
  const rtcResponseTimeoutRef = useRef(null);
  const rtcAutoResponseFallbackTimerRef = useRef(null);
  const rtcLastTranscriptForAutoResponseRef = useRef("");
  const rtcFallbackActiveRef = useRef(false);
  const rtcResponseInFlightRef = useRef(false);
  // PATCH_PREMIUM_REV_B — Realtime Single Active Session + Response Authority Lock.
  // These refs are frontend-only guards: no migration, no provider change.
  const rtcActiveSessionIdRef = useRef(null);
  const rtcActiveSessionEpochRef = useRef(0);
  const manualAuthorityRef = useRef({
    slug: selectedManualAgentSlug || "team",
    version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
    updatedAt: selectedManualAgentSlug ? Date.now() : 0,
    source: PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE,
  });
  useEffect(() => {
    const stickySlug = normalizeManualAuthoritySlug(selectedManualAgentSlug || "team", "team");
    selectedManualAgentSlugRef.current = stickySlug;
    if (stickySlug && manualAuthorityRef.current?.slug !== stickySlug) {
      manualAuthorityRef.current = {
        ...(manualAuthorityRef.current || {}),
        slug: stickySlug,
        version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        updatedAt: manualAuthorityRef.current?.updatedAt || Date.now(),
        source: manualAuthorityRef.current?.source || PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE,
      };
    }
    try {
      window.localStorage?.setItem("orkio_manual_authority_slug", stickySlug);
      persistPwaMobileDestinationState({
        manual_target_slug: stickySlug,
        manual_slug: stickySlug,
        manual_agent_lock: true,
        manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
        manual_lock_staging_proof_version: getPatch32ManualLockStagingProofVersion(),
        manual_lock_staging_proof_silence_version: PATCH_32_REV_I_MANUAL_LOCK_STAGING_PROOF_SILENCE_VERSION,
        manual_lock_staging_proof_production_guard_version: PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION,
      });
    } catch {}

    try {
      logManualLockStagingProof("manual_button_visual_state_confirmed", {
        expected_manual_slug: stickySlug || null,
        proof_scope: "selectedManualAgentSlug_effect",
      });
    } catch {}
  }, [selectedManualAgentSlug]);

  const rtcResponseAuthorityRef = useRef(null);
  const rtcPatch35RevGResponseCorrelationRef = useRef({});
  const rtcPatch35RevGLastResponseCreateRef = useRef(null);
  const rtcResponseCreateDedupeRef = useRef(new Set());
  const rtcFinalCommitDedupeRef = useRef(new Set());
  const rtcStaleSessionEventCountRef = useRef(0);
  // AO66R: activation repair — prove/trigger Realtime audio after the DataChannel opens.
  const rtcLastResponseCreatedAtRef = useRef(0);
  const rtcActivationProbeTimerRef = useRef(null);
  const rtcActivationProbeSentRef = useRef(false);
  // AO66A-HF2: prevent premature auto-end while Realtime is still stabilizing.
  const rtcSessionStartedAtRef = useRef(0);
  const rtcPendingAutoStopTimerRef = useRef(null);
  const rtcLastStopReasonRef = useRef("");


const rtcIdleFollowupTimerRef = useRef(null);
const rtcIdleFollowupSentRef = useRef(false);
const rtcLastUserActivityAtRef = useRef(0);

  // PATCH0100_27A: Realtime persistence (audit)
  const rtcSessionIdRef = useRef(null);
  const rtcThreadIdRef = useRef(null);
  const rtcEventQueueRef = useRef([]);
  const realtimeBridgeBusyRef = useRef(false);
  const realtimeBridgeLastKeyRef = useRef("");
  const rtcMeetingDirectiveBusyRef = useRef(false);
  const rtcMeetingDirectiveLastKeyRef = useRef("");
  const rtcMeetingDirectiveLastAppliedAtRef = useRef(0);
  const rtcFlushTimerRef = useRef(null);
  const rtcLivePollTimerRef = useRef(null);
  const rtcSeenBackendResponseIdsRef = useRef(new Set());
  const rtcConnectingRef = useRef(false);
  // ORKIO_AO60K_HF5_FRONTEND_MOBILE_REALTIME_RESTART_TRANSCRIPT_FIX
  // Hardens mobile/web restart lifecycle so a second Realtime attempt never inherits
  // stale peer/datachannel/audio/poll/timer/session state from the previous attempt.
  const rtcStartNonceRef = useRef(0);
  const rtcStopInFlightRef = useRef(false);
  const rtcStartupWatchdogTimerRef = useRef(null);
  const rtcLivePollSessionIdRef = useRef(null);
  // ORKIO_AO60I_REALTIME_TIMEBOX_COOLDOWN_COUNTER
  const rtcTimeboxTimerRef = useRef(null);
  // AO72A-HF1: provider activity and timebox lifecycle are independent.
  // rtcConversationStartedRef proves that a real user/assistant event happened.
  // rtcTimeboxStartedRef only tracks the optional countdown lifecycle.
  const rtcConversationStartedRef = useRef(false);
  const rtcTimeboxStartedRef = useRef(false);
  const rtcPendingTimeboxSecondsRef = useRef(null);
  // AO72D-HF1: greet first, start the countdown when "two minutes" is spoken,
  // reach 00:00, then finish one non-interruptible closing message before stopping.
  const rtcTimeboxAnnouncementPendingRef = useRef(false);
  const rtcTimeboxAnnouncementResponseIdRef = useRef(null);
  const rtcTimeboxAnnouncementTranscriptRef = useRef("");
  const rtcTimeboxAnnouncementAudioSeenRef = useRef(false);
  const rtcTimeboxAnnouncementFallbackTimerRef = useRef(null);
  // AO72D-HF1: opening speech is outside the timer; the microphone stays muted
  // until the greeting response finishes, preventing the model from hearing itself.
  const rtcOpeningMicrophoneMutedRef = useRef(false);
  const rtcTimeboxClosingRef = useRef(false);
  const rtcTimeboxClosingNoticeSentRef = useRef(false);
  const rtcTimeboxClosingNoticeDoneRef = useRef(false);
  const rtcTimeboxClosingResponseIdRef = useRef(null);
  const rtcTimeboxFinalStopTimerRef = useRef(null);
  const rtcTimeboxFinalStopScheduledRef = useRef(false);
  const rtcCooldownTimerRef = useRef(null);
  const rtcCooldownUntilRef = useRef(readPersistedRealtimeCooldownUntil());
  // ORKIO_AO60I_HF2_POLICY_REF
  // Keeps web and PWA timer/cooldown aligned with backend-returned timebox policy.
  const rtcTimeboxPolicyRef = useRef({
    maxSeconds: REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS,
    cooldownSeconds: REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS,
    remainingSeconds: null,
  });
  const [rtcTimeboxRemaining, setRtcTimeboxRemaining] = useState(null);
  const [rtcCooldownRemaining, setRtcCooldownRemaining] = useState(() => {
    const until = readPersistedRealtimeCooldownUntil();
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  });
  const [rtcPremiumStatus, setRtcPremiumStatus] = useState(null);
  const [rtcPremiumStatusDetail, setRtcPremiumStatusDetail] = useState("");

  useEffect(() => {
    if (REALTIME_FRONTEND_HARD_TIMEBOX_ENABLED !== true) return undefined;
    if (canAccessAdmin) {
      persistRealtimeCooldownUntil(0);
      rtcCooldownUntilRef.current = 0;
      setRtcCooldownRemaining(0);
      return undefined;
    }
    const until = readPersistedRealtimeCooldownUntil();
    if (until > Date.now()) {
      const remaining = Math.max(1, Math.ceil((until - Date.now()) / 1000));
      startRealtimeCooldown(remaining, "restore_local_public_cooldown");
    }
    return () => {
      try { clearRealtimeCooldownTimer(); } catch {}
    };
  }, [canAccessAdmin]);
  // AO66R-HF4: visual kill switch independent from WebRTC/backend cleanup.
  const [rtcOverlayForceClosed, setRtcOverlayForceClosed] = useState(false);
  // ORKIO_AO60K_HF2_429_COOLDOWN_HARDENING
  // Harden 429/cooldown UX so Realtime never stays visually active after backend blocks /start.
  // ORKIO_AO60K_HF1_RUNTIME_TIMEBOX_SYNC
  // Backend-returned timebox policy is the source of truth. This fixes cases where
  // the local cached user object temporarily looks like admin while the backend
  // correctly treats the session as public beta/non-admin.
  const rtcBackendTimeboxLimitedRef = useRef(false);
  const [rtcBackendTimeboxLimited, setRtcBackendTimeboxLimited] = useState(false);
  // AO01-HF6R16: backend-declared admin bypass is sovereign for frontend timebox/cooldown UI.
  const rtcAdminTimeboxBypassRef = useRef(false);
  const [rtcAdminTimeboxBypass, setRtcAdminTimeboxBypass] = useState(false);
  // PATCH0100_27_2B: UI log + punct status
  const [rtcAuditEvents, setRtcAuditEvents] = useState([]);
  const [rtcPunctStatus, setRtcPunctStatus] = useState(null); // null | 'pending' | 'done' | 'timeout'
  const [lastRealtimeSessionId, setLastRealtimeSessionId] = useState(null);
  const [summitSessionScore, setSummitSessionScore] = useState(null);
  const [summitReviewPending, setSummitReviewPending] = useState(false);
  // AO64D-HF1: Realtime transcript summary state/lifecycle extracted to a focused hook.
  const realtimeSummary = useRealtimeTranscriptSummary({
    logRealtimeStep,
    getSessionId: () => rtcSessionIdRef.current || lastRealtimeSessionId || null,
    getUserTextFallback: () => rtcLastFinalTranscriptRef.current,
    getAssistantTextFallback: () => rtcAssistantFinalTextRef.current,
    // AO68E-HF1:
    // Realtime must be recorded directly in the main chat timeline.
    // The separate transcript modal is suppressed; final user/assistant turns are
    // committed through appendRealtimeInlineChatTurn/commitRealtimeAssistantFinal.
    appendSummaryToChat: null,
    inlineToChat: false,
    modalSuppressed: true,
  });
  const realtimeTranscriptSummary = realtimeSummary.summary;
  const realtimeTranscriptSummaryOpen = realtimeSummary.summaryOpen;
  const setRealtimeTranscriptSummaryOpen = realtimeSummary.setSummaryOpen;
  const realtimeTranscriptTurnsRef = realtimeSummary.turnsRef;
  const summitRuntimeModeRef = useRef((((window.__ORKIO_ENV__?.VITE_ORKIO_RUNTIME_MODE || import.meta.env.VITE_ORKIO_RUNTIME_MODE || "summit")).trim().toLowerCase() === "summit") ? "summit" : "platform");
  const summitLanguageProfileRef = useRef((((window.__ORKIO_ENV__?.VITE_SUMMIT_LANGUAGE_PROFILE || import.meta.env.VITE_SUMMIT_LANGUAGE_PROFILE || "pt-BR")).trim() || "auto"));
  const rtcLanguageProfileRef = useRef("auto");



// V2V-PATCH: trace_id por tentativa + status de fase + MediaRecorder
  const v2vTraceRef = useRef(null);

  // STREAM-STAB: anti-zombie (AbortController + runId)

// PATCH0113: Summit capacity modal (STREAM_LIMIT)
const [capacityOpen, setCapacityOpen] = React.useState(false);
const [capacitySeconds, setCapacitySeconds] = React.useState(30);
const capacityTimerRef = React.useRef(null);
const capacityPendingRef = React.useRef(null); // { msg }

const openCapacityModal = (msg, retryAfter = null) => {
  const parsedRetryAfter = Number.parseInt(String(retryAfter || ""), 10);
  const waitSeconds = Number.isFinite(parsedRetryAfter) && parsedRetryAfter > 0
    ? Math.min(300, parsedRetryAfter)
    : 30;

  setCapacityOpen(true);
  setCapacitySeconds(waitSeconds);
  capacityPendingRef.current = { msg: msg || "" };

  // EFATA777 v10.1: countdown is informational only.
  // Never auto-retry silently after 429; the user must trigger a retry explicitly.
  try { if (capacityTimerRef.current) clearInterval(capacityTimerRef.current); } catch {}
  capacityTimerRef.current = setInterval(() => {
    setCapacitySeconds((s) => {
      const next = Math.max(0, (s || 0) - 1);
      if (next === 0) {
        try { if (capacityTimerRef.current) clearInterval(capacityTimerRef.current); } catch {}
        capacityTimerRef.current = null;
      }
      return next;
    });
  }, 1000);
};

const closeCapacityModal = () => {
  setCapacityOpen(false);
  try { if (capacityTimerRef.current) clearInterval(capacityTimerRef.current); } catch {}
  capacityTimerRef.current = null;
};
  const streamCtlRef = useRef(null);
  const streamRunRef = useRef(0);

  const [v2vPhase, setV2vPhase] = useState(null); // null | 'recording' | 'stt' | 'chat' | 'tts' | 'playing' | 'error'
  const [v2vError, setV2vError] = useState(null);
  const [walletBlockedDetail, setWalletBlockedDetail] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  // BUG-02 FIX: flag para distinguir stop intencional (stopMicMediaRecorder)
  // de stop por VAD — evita processar áudio residual quando V2V é desligado
  const stopIntentionalRef = useRef(false);
  const [mediaRecorderSupported] = useState(!!(
    typeof window !== 'undefined' &&
    window.MediaRecorder &&
    navigator.mediaDevices?.getUserMedia
  ));

  
const BOOTSTRAP_FAILOPEN_MS = 3500;

useEffect(() => {
  if (onboardingChecked) {
    setBootstrapFailOpen(false);
    return undefined;
  }
  const timer = window.setTimeout(() => {
    try {
      console.warn("bootstrap fail-open triggered");
    } catch {}
    setBootstrapFailOpen(true);
    setOnboardingChecked(true);
  }, BOOTSTRAP_FAILOPEN_MS);
  return () => {
    try { window.clearTimeout(timer); } catch {}
  };
}, [onboardingChecked]);

useEffect(() => {
  let alive = true;

  async function bootstrapUser() {
    const t = getToken();
    const u = getUser();
    const org = resolveAuthenticatedTenant(u, getTenant());
    setToken(t);
    setTenant(org || "");
    setUser(u);

    if (!t) {
      nav("/auth");
      return;
    }

    try {
      let meResponse = null;
      try {
        meResponse = await apiFetch("/api/me", { method: "GET", token: t, org: org || "" });
      } catch (firstErr) {
        if (String(org || "").toLowerCase() === "public" || firstErr?.status === 403) {
          meResponse = await apiFetch("/api/me", { method: "GET", token: t, org: "" });
        } else {
          throw firstErr;
        }
      }
      const { data } = meResponse || {};
      if (!alive) return;
      if (data) {
        const mergedUser = {
          ...(u || {}),
          ...data,
          org_slug: data?.org_slug || data?.org || u?.org_slug || u?.org || org || "",
          role: data?.role || u?.role || "user",
          signup_source: data?.signup_source ?? u?.signup_source ?? null,
          signup_code_label: data?.signup_code_label ?? u?.signup_code_label ?? null,
          product_scope: data?.product_scope ?? u?.product_scope ?? null,
          country: data?.country ?? u?.country ?? null,
          language: data?.language ?? u?.language ?? null,
          whatsapp: data?.whatsapp ?? u?.whatsapp ?? null,
          is_admin: hasAdminAccess({
            ...(u || {}),
            ...data,
            role: data?.role || u?.role || "user",
            is_admin: data?.is_admin === true || u?.is_admin === true,
            admin: data?.admin === true || u?.admin === true,
          }),
        };
        mergedUser.admin = mergedUser.is_admin === true;

        applyAuthenticatedSession(mergedUser, mergedUser.org_slug || org);

        const explicitPendingApproval = (
          mergedUser?.pending_approval === true
          || mergedUser?.auth_status === "pending_approval"
          || mergedUser?.status === "pending"
        );

        if (explicitPendingApproval) {
          clearSession();
          nav("/auth?pending_approval=1");
          return;
        }

        if (!mergedUser?.onboarding_completed) {
          setOnboardingForm(sanitizeOnboardingForm(mergedUser));
          // ORKIO_AO59B_MANDATORY_ONBOARDING_GATE
          // Onboarding is now a mandatory pre-chat activation step.
          setOnboardingOpen(true);
        }

        if (!mergedUser?.terms_accepted_at) {
          setShowTermsModal(true);
        }
      }
    } catch (err) {
      console.warn("bootstrapUser failed", err);
      if (err?.status === 401) {
        clearSession();
        nav("/auth?session_expired=1");
        return;
      }
    } finally {
      if (alive) setOnboardingChecked(true);
    }
  }

  bootstrapUser();
  return () => { alive = false; };
}, []);

  useEffect(() => {
    setWalletSummary(null);
    setWalletSummaryLoading(false);
    setWalletSummaryError("");
    return undefined;
  }, [token, tenant]);

  useEffect(() => {
    const onResize = () => {
      try { setIsMobile(window.innerWidth <= 820); } catch {}
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (SUMMIT_VOICE_MODE === "stt_tts") {
      setVoiceMode(true);
      voiceModeRef.current = true;
      if (realtimeModeRef.current) {
        try { void stopRealtime("voice_mode_lock"); } catch {}
        setRealtimeMode(false);
        realtimeModeRef.current = false;
      }
      return;
    }
    setVoiceMode(false);
    voiceModeRef.current = false;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        await apiFetch("/api/health", { token, org: tenant });
        if (!cancelled) setHealth("ok");
      } catch {
        if (!cancelled) setHealth("down");
      }
    }

    if (token) checkHealth();

    return () => {
      cancelled = true;
    };
  }, [token, tenant]);

  useEffect(() => {
    let cancelled = false;

    async function checkOrionSquadHealth() {
      if (!token || !showOrionSquad) {
        if (!cancelled) setOrionSquadHealth(null);
        return;
      }
      try {
        const resp = await getOrionSquadHealth({ token, org: tenant });
        if (!cancelled) setOrionSquadHealth(resp?.data || resp || null);
      } catch {
        if (!cancelled) setOrionSquadHealth({ ok: false });
      }
    }

    void checkOrionSquadHealth();

    return () => {
      cancelled = true;
    };
  }, [token, tenant, showOrionSquad]);

  async function refreshOrionSquadPreview(messageToPreview) {
    const previewMessage = String(messageToPreview || "").trim();
    if (!token || !showOrionSquad || !previewMessage) return;
    try {
      const resp = await getOrionSquadPreview({ token, org: tenant, message: previewMessage });
      setOrionSquadPreview(resp?.data || resp || null);
    } catch {
      // fail-open
    }
  }

  function scrollToBottom() {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {}
  }

  useEffect(() => { scrollToBottom(); }, [messages]);

  const walletBalanceUsd = Number(walletSummary?.wallet?.balance_usd || 0);
  const walletLowBalanceThresholdUsd = Number(
    walletSummary?.wallet?.low_balance_threshold_usd
    ?? walletSummary?.wallet?.auto_recharge_threshold_usd
    ?? 3
  );
  const walletLowBalance = walletBalanceUsd <= walletLowBalanceThresholdUsd;
  const walletActivePlanName = walletSummary?.active_plan?.name || "";
  const walletAutoRechargeEnabled = !!walletSummary?.wallet?.auto_recharge_enabled;
  const walletSummaryUpdatedAt = walletSummary?.wallet?.updated_at || null;

  async function refreshWalletSummary() {
    setWalletSummary(null);
    setWalletSummaryLoading(false);
    setWalletSummaryError("");
    return null;
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (!realtimeModeRef.current) return;
      if (!rtcReadyToRespond) return;
      // Don't hijack typing in inputs/textarea/contenteditable
      const el = document.activeElement;
      const tag = el?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || el?.isContentEditable;
      if (isTyping) return;

      if (e.code === "Space" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        triggerRealtimeResponse("hotkey");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rtcReadyToRespond]);
  useEffect(() => { messagesRef.current = orderChatMessages(messages || []); }, [messages]);

useEffect(() => {
  if (typeof window === "undefined" || !window.visualViewport) return undefined;
  const vv = window.visualViewport;
  const updateViewportOffset = () => {
    try {
      const keyboardOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setComposerViewportOffset(keyboardOffset);
    } catch {
      setComposerViewportOffset(0);
    }
  };
  updateViewportOffset();
  vv.addEventListener("resize", updateViewportOffset);
  vv.addEventListener("scroll", updateViewportOffset);
  window.addEventListener("orientationchange", updateViewportOffset);
  return () => {
    vv.removeEventListener("resize", updateViewportOffset);
    vv.removeEventListener("scroll", updateViewportOffset);
    window.removeEventListener("orientationchange", updateViewportOffset);
  };
}, []);


  function activateThread(nextThreadId, opts = {}) {
    const nextId = String(nextThreadId || "");
    const { clearMessages = true, persist = true, lockMs = 15000 } = opts || {};
    activeThreadEpochRef.current += 1;
    streamRunRef.current += 1;
    try { streamCtlRef.current?.abort(); } catch {}
    activeThreadIdRef.current = nextId;
    requestedThreadIdRef.current = nextId;
    messagesLoadRequestRef.current += 1;
    consumeStoredThreadBootstrap(nextId);
    lockThreadSelection(nextId, lockMs);
    try { messagesAbortRef.current?.abort?.(); } catch {}
    messagesAbortRef.current = null;
    if (persist) {
      persistActiveThreadId(nextId);
    }
    if (clearMessages) {
      clearTmpAssistantDrafts();
      messagesThreadIdRef.current = "";
      setMessagesLoadState(nextId ? "loading" : "empty");
      setMessagesLoadError("");
      setMessages([]);
    }
    setThreadId((prev) => (String(prev || "") === nextId ? prev : nextId));
  }

  useEffect(() => {
    const safeThreadId = String(threadId || "");
    activeThreadIdRef.current = safeThreadId;
    if (safeThreadId) {
      persistActiveThreadId(safeThreadId);
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId) {
      const stored = getBootstrapStoredThreadId();
      if (stored) {
        activeThreadIdRef.current = stored;
        requestedThreadIdRef.current = stored;
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      try { messagesAbortRef.current?.abort?.(); } catch {}
      messagesAbortRef.current = null;
    };
  }, []);

  function isCleanNewConversationTransitionActive(targetThreadId = "") {
    const target = String(targetThreadId || activeThreadIdRef.current || threadId || "").trim();
    if (!target) return false;
    return (
      String(cleanNewThreadIdRef.current || "") === target &&
      Date.now() < Number(newConversationQuietUntilRef.current || 0)
    );
  }

  async function loadThreads(opts = {}) {
    const manualRetry = !!opts?.manualRetry;
    const quietNewThreadRefresh = Boolean(
      opts?.quietNewThread ||
      (opts?.preserveThreadId && isCleanNewConversationTransitionActive(opts.preserveThreadId))
    );
    if (!quietNewThreadRefresh) {
      setThreadsLoadState(manualRetry ? "retrying" : (threadsRef.current.length ? "retrying" : "loading"));
    }
    setThreadsLoadError("");
    try {
      const currentActive = String(activeThreadIdRef.current || threadId || "").trim();
      const explicitPreserveThreadId = String(
        opts?.preserveThreadId
        || currentActive
        || ""
      ).trim();
      const bootstrapThreadId = explicitPreserveThreadId ? "" : getBootstrapStoredThreadId();
      const preserveThreadId = String(explicitPreserveThreadId || bootstrapThreadId || "").trim();

      let data = [];
      let lastErr = null;
      for (let attempt = 1; attempt <= THREAD_RESTORE_RETRY_ATTEMPTS; attempt += 1) {
        try {
          if (attempt > 1 && !quietNewThreadRefresh) setThreadsLoadState("retrying");
          const response = await apiFetch("/api/threads", { token, org: tenant });
          data = response?.data;
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          if (err?.status === 401 || !isTemporaryLoadError(err) || attempt >= THREAD_RESTORE_RETRY_ATTEMPTS) {
            throw err;
          }
          await sleep(THREAD_RESTORE_RETRY_DELAY_MS * attempt);
        }
      }
      if (lastErr) throw lastErr;

      const list = Array.isArray(data) ? data : [];

      // EFATA777_V3: do not erase the visible conversation/sidebar on a transient
      // empty thread response. Preserve the local list and active thread while the
      // backend/auth/org context settles.
      if (!list.length && threadsRef.current.length) {
        setThreadsLoadState("ready");
        return threadsRef.current;
      }

      applyThreadsList(list);
      setThreadsLoadState(list.length ? "ready" : "empty");

      let effectivePreserveThreadId = preserveThreadId;
      try {
        const mobilePreferredThreadId = selectPreferredThreadIdForPwaMobile({
          threads: list,
          currentThreadId: currentActive,
          storedThreadId: preserveThreadId,
          isMobile,
          forceNewestOnMobile: false,
        });
        if (mobilePreferredThreadId) effectivePreserveThreadId = mobilePreferredThreadId;
      } catch {}

      const hasPreserved = effectivePreserveThreadId && list.some((t) => String(t?.id || "") === effectivePreserveThreadId);
      const isLocked = threadSelectionLockUntilRef.current > Date.now();

      if (hasPreserved) {
        consumeStoredThreadBootstrap(effectivePreserveThreadId);
        if (String(activeThreadIdRef.current || "") !== effectivePreserveThreadId || String(threadId || "") !== effectivePreserveThreadId) {
          activateThread(effectivePreserveThreadId, { clearMessages: !opts?.keepMessages, persist: true, lockMs: isLocked ? Math.max(threadSelectionLockUntilRef.current - Date.now(), 1000) : 8000 });
        } else {
          persistActiveThreadId(effectivePreserveThreadId);
        }
        return list;
      }

      if (bootstrapThreadId) {
        consumeStoredThreadBootstrap("");
      }

      if (isLocked && preserveThreadId) {
        return list;
      }

      if (!currentActive && list?.[0]?.id) {
        activateThread(list[0].id, { clearMessages: true, persist: true, lockMs: 5000 });
        return list;
      }

      if (currentActive && !list.some((t) => String(t?.id || "") === currentActive)) {
        const fallbackId = String(list?.[0]?.id || "");
        if (fallbackId) {
          activateThread(fallbackId, { clearMessages: true, persist: true, lockMs: 5000 });
        } else {
          activateThread("", { clearMessages: true, persist: true, lockMs: 2000 });
        }
      }

      return list;
    } catch (e) {
      console.warn("loadThreads non-fatal error:", e);
      if (e?.status === 401) {
        await logoutIfSessionReallyExpired("loadThreads");
      }
      if (quietNewThreadRefresh && e?.status !== 401) {
        // POLISH-DIR-01:
        // Criar uma conversa nova nao deve exibir painel de recuperacao/erro.
        // Mantemos a UI limpa e deixamos o proximo refresh regular reconciliar a lista.
        return threadsRef.current;
      }
      setThreadsLoadState("load_failed");
      setThreadsLoadError(restoreErrorMessage(e, "Falha ao carregar conversas."));
      return threadsRef.current;
    }
  }

  async function loadMessages(tid, opts = {}) {
    const targetId = String(tid || "");
    if (!targetId) {
      setMessagesLoadState("empty");
      setMessagesLoadError("");
      return [];
    }
    const isCleanNewThreadLoad = String(cleanNewThreadIdRef.current || "") === targetId && !opts?.finalizeTurn;
    if (isCleanNewThreadLoad && !opts?.forceServerForCleanThread) {
      // POLISH-DIR-01:
      // Uma thread recem-criada e limpa nao precisa buscar /api/messages imediatamente.
      // Isso evita o flash executivo ruim de "Carregando conversas" / "Tentando restaurar".
      messagesThreadIdRef.current = targetId;
      setMessages([]);
      setMessagesLoadState("empty");
      setMessagesLoadError("");
      return [];
    }
    setMessagesLoadState(opts?.manualRetry ? "retrying" : "loading");
    setMessagesLoadError("");
    const force = !!opts?.force;
    const expectedEpoch = Number.isFinite(Number(opts?.expectedEpoch))
      ? Number(opts.expectedEpoch)
      : activeThreadEpochRef.current;

    const currentActive = String(activeThreadIdRef.current || "");
    if (currentActive && targetId !== currentActive && !opts?.allowInactive) {
      return [];
    }

    const requestSeq = ++messagesLoadRequestRef.current;
    requestedThreadIdRef.current = targetId;

    let controller = null;
    try {
      if (!opts?.finalizeTurn && !opts?.preserveExistingRequest) {
        try { messagesAbortRef.current?.abort?.(); } catch {}
      }
      controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
      messagesAbortRef.current = controller;

      const fetchOpts = { token, org: tenant };
      if (controller?.signal) fetchOpts.signal = controller.signal;

      let data = [];
      let lastErr = null;
      for (let attempt = 1; attempt <= THREAD_RESTORE_RETRY_ATTEMPTS; attempt += 1) {
        try {
          if (attempt > 1) setMessagesLoadState("retrying");
          const response = await apiFetch(
            `/api/messages?thread_id=${encodeURIComponent(targetId)}&include_welcome=0`,
            fetchOpts
          );
          data = response?.data;
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          if (err?.name === "AbortError" || err?.status === 401 || !isTemporaryLoadError(err) || attempt >= THREAD_RESTORE_RETRY_ATTEMPTS) {
            throw err;
          }
          await sleep(THREAD_RESTORE_RETRY_DELAY_MS * attempt);
        }
      }
      if (lastErr) throw lastErr;

      const normalizedFromServer = orderChatMessages(
        Array.isArray(data)
          ? data.map((item) => normalizeVisibleAssistantMessage(normalizeMessageSpeaker(item)))
          : []
      );
      const normalized = mergeRealtimeInlineCachedTurns(normalizedFromServer, targetId);
      const sameRequest = requestSeq === messagesLoadRequestRef.current;
      const sameRequestedThread = requestedThreadIdRef.current === targetId;
      const sameActiveThread =
        String(activeThreadIdRef.current || "") === targetId;
      const sameEpoch = expectedEpoch === activeThreadEpochRef.current;
      const wasAborted = !!controller?.signal?.aborted;
      const finalizeTurn = !!opts?.finalizeTurn;
      const canApply =
        sameActiveThread &&
        !wasAborted &&
        (
          finalizeTurn ||
          (
            sameRequestedThread &&
            sameEpoch &&
            (force ? sameActiveThread : sameRequest)
          )
        );


      if (canApply) {
        messagesThreadIdRef.current = targetId;
        setMessages(normalized);
        setMessagesLoadState(normalized.length ? "ready" : "empty");
        if (String(cleanNewThreadIdRef.current || "") === targetId) {
          cleanNewThreadIdRef.current = "";
        }
      }
      return normalized;
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.warn("loadMessages non-fatal error:", e);
        if (e?.status === 401) {
          await logoutIfSessionReallyExpired("loadMessages");
        }
        setMessagesLoadState("load_failed");
        setMessagesLoadError(restoreErrorMessage(e, "Falha ao carregar mensagens."));
      }
      return messagesThreadIdRef.current === targetId ? messages : [];
    } finally {
      if (messagesAbortRef.current === controller) {
        messagesAbortRef.current = null;
      }
    }
  }

  async function finalizeChatTurn({
    threadId: turnThreadId,
    draftAssistantId,
    finalTextCandidate = "",
    finalAgentName = "Orkio",
    finalAgentId = null,
    finalVoiceId = null,
    finalAvatarUrl = null,
    turnStartedAt = 0,
  } = {}) {
    const tid = String(turnThreadId || "").trim();
    const finalText = sanitizePublicBetaAssistantText(String(finalTextCandidate || "").trim());
    const safeFinalText =
      finalText ||
      "Resposta concluída no backend. Atualizando histórico...";

    const restoreLocalFinalDraft = (reason = "restore_local_final_draft") => {
      if (!finalText && !safeFinalText) return;

      setMessages((prev) => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const draftId = String(draftAssistantId || "");
        let matched = false;

        const next = list.map((m) => {
          if (String(m?.id || "") !== draftId) return m;
          matched = true;
          return {
            ...m,
            content: safeFinalText,
            agent_name: resolveAssistantDisplayName(
              { ...(m || {}), agent_name: m?.agent_name || finalAgentName || "Agent", content: safeFinalText },
              finalAgentName || "Agent"
            ),
            agent_id: m.agent_id || finalAgentId || null,
            voice_id: m.voice_id || finalVoiceId || null,
            avatar_url: m.avatar_url || finalAvatarUrl || null,
            finalized_locally: true,
            stream_reconcile_pending: true,
          };
        });

        if (matched) {
          return next;
        }

        const alreadyVisible = next.some((m) =>
          m?.role === "assistant" &&
          String(m?.content || "").trim() === String(safeFinalText || "").trim()
        );

        if (alreadyVisible) return next;


        return [
          ...next,
          {
            id: draftId || `stream-final-${Date.now()}`,
            role: "assistant",
            content: safeFinalText,
            agent_name: resolveAssistantDisplayName(
              { agent_name: finalAgentName || "Agent", content: safeFinalText },
              finalAgentName || "Agent"
            ),
            agent_id: finalAgentId || null,
            voice_id: finalVoiceId || null,
            avatar_url: finalAvatarUrl || null,
            finalized_locally: true,
            stream_reconcile_pending: true,
            created_at: Math.floor(Date.now() / 1000),
          },
        ];
      });
    };

    if (!tid) {
      setMessages((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        let replaced = false;
        const next = list.map((m) => {
          if (String(m?.id || "") !== String(draftAssistantId || "")) return m;
          replaced = true;
          return {
            ...m,
            content: safeFinalText,
            agent_name: resolveAssistantDisplayName(
              { ...(m || {}), agent_name: m?.agent_name || finalAgentName || "Agent", content: safeFinalText },
              finalAgentName || "Agent"
            ),
            agent_id: m.agent_id || finalAgentId || null,
            voice_id: m.voice_id || finalVoiceId || null,
            avatar_url: m.avatar_url || finalAvatarUrl || null,
            finalized_locally: true,
          };
        });

        if (replaced) return next;

        const alreadyVisible = next.some((m) =>
          m?.role === "assistant" &&
          String(m?.content || "").trim() === safeFinalText
        );
        if (alreadyVisible) return next;

        return [
          ...next,
          {
            id: `stream-final-${Date.now()}`,
            role: "assistant",
            content: safeFinalText,
            agent_name: resolveAssistantDisplayName(
              { agent_name: finalAgentName || "Agent", content: safeFinalText },
              finalAgentName || "Agent"
            ),
            agent_id: finalAgentId || null,
            voice_id: finalVoiceId || null,
            avatar_url: finalAvatarUrl || null,
            finalized_locally: true,
            created_at: Math.floor(Date.now() / 1000),
          },
        ];
      });
      return [];
    }

    let fresh = [];
    const startedAt = Number(turnStartedAt || 0);

    // AO33_RECONCILE_FIX:
    // Keep the final streamed answer visible while /api/messages catches up.
    // Previously finalizeTurn called loadMessages() first; if the backend list did
    // not yet include the just-persisted assistant, setMessages(normalized) could
    // briefly erase the local tmp-ass draft from the UI.
    if (finalText) {
      restoreLocalFinalDraft("before_reconcile_load");
    }

    for (let attempt = 0; attempt < CHAT_TURN_RECONCILE_ATTEMPTS; attempt += 1) {
      fresh = await loadMessages(tid, {
        force: true,
        allowInactive: true,
        finalizeTurn: true,
        preserveExistingRequest: true,
        expectedEpoch: activeThreadEpochRef.current,
      });

      const hasFreshAssistant = hasPersistedAssistantForTurn(fresh, startedAt);


      if (hasFreshAssistant) {
        return fresh;
      }

      if (finalText) {
        restoreLocalFinalDraft(`after_reconcile_miss_${attempt + 1}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 450 + attempt * 450));
    }

    if (finalText) {
      setMessages((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const cleaned = list.filter((m) => String(m?.id || "") !== String(draftAssistantId || ""));

        const alreadyVisible = cleaned.some((m) =>
          m?.role === "assistant" &&
          String(m?.content || "").trim() === finalText
        );

        if (alreadyVisible) return cleaned;

        return [
          ...cleaned,
          {
            id: `stream-final-${Date.now()}`,
            role: "assistant",
            content: finalText,
            agent_name: resolveAssistantDisplayName({ agent_name: finalAgentName || "Agent", content: finalText }, finalAgentName || "Agent"),
            agent_id: finalAgentId || null,
            voice_id: finalVoiceId || null,
            avatar_url: finalAvatarUrl || null,
            created_at: Math.floor(Date.now() / 1000),
          },
        ];
      });
    } else {
      setMessages((prev) =>
        (Array.isArray(prev) ? prev : []).map((m) =>
          String(m?.id || "") === String(draftAssistantId || "")
            ? {
                ...m,
                content: safeFinalText,
                agent_name: resolveAssistantDisplayName({ ...(m || {}), agent_name: m?.agent_name || finalAgentName || "Agent", content: safeFinalText }, finalAgentName || "Agent"),
                agent_id: m.agent_id || finalAgentId || null,
                voice_id: m.voice_id || finalVoiceId || null,
                avatar_url: m.avatar_url || finalAvatarUrl || null,
                finalized_locally: true,
              }
            : m
        )
      );
    }

    return fresh;
  }

  function scheduleFinalTurnReconcile({ threadId: reconcileThreadId, turnStartedAt = 0, delayMs = 1200 } = {}) {
    const tid = String(reconcileThreadId || "").trim();
    if (!tid) return;
    window.setTimeout(() => {
      try {
        if (String(activeThreadIdRef.current || "") !== tid) return;
        void loadMessages(tid, {
          force: true,
          allowInactive: true,
          finalizeTurn: true,
          preserveExistingRequest: true,
          expectedEpoch: activeThreadEpochRef.current,
        }).then((fresh) => {
          if (hasPersistedAssistantForTurn(fresh, turnStartedAt)) {
            if (String(activeThreadIdRef.current || "") === tid) {
              setMessages(() => {
                const persisted = Array.isArray(fresh) ? fresh : [];
                if (!persisted.length) return persisted;
                return persisted.filter((m) => !String(m?.id || "").startsWith("tmp-ass-"));
              });
            }
            appendExecutionTrace({
              kind: "done",
              label: "Histórico reconciliado",
              detail: "A resposta persistida foi sincronizada no App Console sem exigir refresh manual.",
            });
          }
        });
      } catch {}
    }, Math.max(300, Number(delayMs || 1200)));
  }


  async function loadAgents() {
    try {
      const { data } = await apiFetch("/api/agents", { token, org: tenant });
      const list = Array.isArray(data) ? data : [];

      // EFATA777_V3: keep the previous visible roster if a transient fetch returns
      // empty. The selector must not collapse or lose Orion during reloads.
      if (list.length) {
        setAgents(list);
      } else if (!(agents || []).length) {
        setAgents([]);
      }

      try {
        const m = new Map();
        (list.length ? list : (agents || [])).forEach(a => { if (a?.name) m.set(String(a.name).trim(), a.id); });
        agentsByNameRef.current = m;
      } catch {}

      // Preserve valid destination state, but do not let mobile PWA keep stale agent ids.
      if (Array.isArray(list) && list.length) {
        const normalizedDestination = normalizeDestinationForAvailableAgents({
          agents: list,
          mode: destMode,
          single: destSingle,
          multi: destMulti,
          isMobile,
        });

        setDestSingle((prev) => {
          const prevId = String(prev || "").trim();
          const prevStillExists = prevId && Boolean(findAgentByRuntimeIdentity(prevId));
          if (prevStillExists) return prev;
          const next = normalizedDestination.single || "";
          return String(prev || "") === next ? prev : next;
        });

        setDestMulti((prev) => {
          const prevClean = Array.isArray(prev) ? prev.map((v) => String(v || "").trim()).filter(Boolean) : [];
          const validPrev = prevClean.map((id) => findAgentByRuntimeIdentity(id)?.id || "").filter(Boolean);
          if (validPrev.length === prevClean.length && prevClean.length) return prev;
          const next = Array.isArray(normalizedDestination.multi) ? normalizedDestination.multi : [];
          if (JSON.stringify(validPrev) === JSON.stringify(next)) return validPrev;
          return next;
        });

        setDestMode((prev) => {
          const current = String(prev || "team").trim().toLowerCase();
          if (["team", "single", "multi"].includes(current)) return current;
          const next = normalizedDestination.mode || "team";
          return String(prev || "") === next ? prev : next;
        });

        try {
          persistPwaMobileDestinationState({
            mode: normalizedDestination.mode || destMode || "team",
            single: normalizedDestination.single || destSingle || "",
            multi: Array.isArray(normalizedDestination.multi) ? normalizedDestination.multi : [],
          });
        } catch {}
      }
    } catch (e) {
      console.error("loadAgents error:", e);
    }
  }

  useEffect(() => {
    if (!token || !onboardingChecked || onboardingOpen) return;
    loadThreads();
    loadAgents();
  }, [token, tenant, onboardingChecked, onboardingOpen]);

  useEffect(() => {
    if (!token || !onboardingChecked || onboardingOpen) return undefined;
    return installPwaMobileResyncListeners(() => Promise.allSettled([
      loadThreads({
        preserveThreadId: readStoredThreadId(),
        keepMessages: true,
      }),
      loadAgents(),
    ]), { debounceMs: 500 });
  }, [token, tenant, onboardingChecked, onboardingOpen, isMobile]);

  useEffect(() => {
    const currentThreadId = String(threadId || "");
    if (!currentThreadId) {
      messagesThreadIdRef.current = "";
      setMessagesLoadState(threadsLoadState === "load_failed" ? "load_failed" : "empty");
      setMessages([]);
      return;
    }
    const epochAtEffect = activeThreadEpochRef.current;
    clearTmpAssistantDrafts();
    if (messagesThreadIdRef.current !== currentThreadId) {
      setMessages([]);
    }
    void loadMessages(currentThreadId, { force: true, expectedEpoch: epochAtEffect });
  }, [threadId]);

  function retryConversationRestore() {
    const currentThreadId = String(activeThreadIdRef.current || threadId || "").trim();
    if (currentThreadId) {
      void loadMessages(currentThreadId, {
        force: true,
        manualRetry: true,
        expectedEpoch: activeThreadEpochRef.current,
      });
      return;
    }
    void loadThreads({
      manualRetry: true,
      preserveThreadId: readStoredThreadId(),
    });
  }






  async function createThread() {
    if (createThreadBusyRef.current) return;
    createThreadBusyRef.current = true;
    try {
      const { data } = await apiFetch("/api/threads", {
        method: "POST",
        token,
        org: tenant,
        body: { title: "Nova conversa" },
      });
      if (data?.id) {
        const newId = String(data.id || "");
        const quietUntil = Date.now() + 30000;
        cleanNewThreadIdRef.current = newId;
        newConversationQuietUntilRef.current = quietUntil;
        consumeStoredThreadBootstrap(newId);
        clearTmpAssistantDrafts();
        messagesThreadIdRef.current = newId;
        requestedThreadIdRef.current = newId;
        setMessages([]);
        setMessagesLoadState("empty");
        setMessagesLoadError("");
        setThreadsLoadState("ready");
        setThreadsLoadError("");
        activateThread(newId, { clearMessages: true, persist: true, lockMs: 30000 });
        setThreads((prev) => {
          const list = Array.isArray(prev) ? prev.filter((t) => String(t?.id || "") !== newId) : [];
          const next = [{ ...(data || {}), id: newId }, ...list];
          threadsRef.current = next;
          return next;
        });

        // POLISH-DIR-01:
        // Reconciliacao silenciosa da lista. Nao bloquear a criacao nem exibir painel
        // de "Carregando conversas" quando a intencao do usuario foi iniciar do zero.
        void loadThreads({ preserveThreadId: newId, keepMessages: true, quietNewThread: true });
      }
    } catch (e) {
      alert(e?.message || "Falha ao criar conversa");
    } finally {
      createThreadBusyRef.current = false;
    }
  }

  async function deleteThread(threadId) {
    if (!threadId) return;
    if (!confirm('Deletar esta conversa?')) return;
    try {
      await apiFetch(`/api/threads/${encodeURIComponent(threadId)}`, {
        method: "DELETE",
        token,
        org: tenant,
      });
      // Reload threads and pick a safe next one
      const { data } = await apiFetch("/api/threads", { token, org: tenant });
      const list = data || [];
      setThreads(list);
      const nextId = list?.[0]?.id || "";
      if (nextId) {
        activateThread(nextId, { clearMessages: true, persist: true, lockMs: 10000 });
        await loadMessages(nextId, { force: true, expectedEpoch: activeThreadEpochRef.current });
      } else {
        consumeStoredThreadBootstrap("");
        activateThread("", { clearMessages: true, persist: true, lockMs: 3000 });
      }
    } catch (e) {
      console.error("deleteThread error:", e);
      alert(e?.message || "Falha ao deletar conversa");
    }
  }

  async function renameThread(tid) {
    const t = threads.find((x) => x.id === tid);
    const current = t?.title || "Nova conversa";
    const next = prompt("Renomear conversa:", current);
    if (!next) return;
    try {
      await apiFetch(`/api/threads/${encodeURIComponent(tid)}`, {
        method: "PATCH",
        token,
        org: tenant,
        body: { title: next },
      });
      await loadThreads({ preserveThreadId: String(activeThreadIdRef.current || threadId || "") });
    } catch (e) {
      alert(e?.message || "Falha ao renomear");
    }
  }

  async function doLogout() {
    try {
      await logout({ org: tenant, token });
    } finally {
      clearSession();
      nav("/auth");
    }
  }

function sanitizePublicAgentText(value = "") {
  return String(value || "")
    .replace(/\b(gpt[-_\s]?\d+(?:\.\d+)?|gpt|openai|claude|anthropic|gemini|llama|mistral|deepseek|reasoning|premium_reasoning|premium_reasoning_cto|model|llm)\b/gi, "")
    .replace(/\s*[·|/,-]\s*$/g, "")
    .replace(/^[\s·|/,-]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getPublicAgentRole(agent = {}) {
  const raw =
    agent.public_role ||
    agent.publicRole ||
    agent.role_label ||
    agent.roleLabel ||
    agent.function ||
    agent.title ||
    agent.role ||
    "";

  const cleaned = sanitizePublicAgentText(raw);

  if (!cleaned || /^agente$/i.test(cleaned)) {
    const id = String(agent.id || agent.name || "").toLowerCase();
    if (id.includes("orion")) return "Auditor técnico";
    if (id.includes("chris")) return "Estratégia e negócios";
    if (id.includes("orkio")) return "Assistente principal";
    if (id.includes("team")) return "Equipe multiagente";
    return "Agente especialista";
  }

  return cleaned;
}

function formatPublicAgentLabel(agent = {}) {
  const name = sanitizePublicAgentText(agent.name || agent.label || agent.id || "Agente") || "Agente";
  const role = getPublicAgentRole(agent);
  if (!role || role.toLowerCase() === name.toLowerCase()) return name;
  return `${name} · ${role}`;
}

function formatAgentOptionLabel(agent) {
  return formatPublicAgentLabel(agent);
}


  function extractMentionNamesFromText(raw) {
    try {
      const text = String(raw || "");
      const matches = text.matchAll(/@([A-Za-z0-9_\-/]+(?:\s+[A-Za-z0-9_\-/]+){0,2})(?=(?:\s*[,.:;!?])|(?:\s+@)|$)/gi);
      const out = [];
      const seen = new Set();
      for (const match of matches) {
        const name = String(match?.[1] || "").trim();
        const key = name.toLowerCase();
        if (!name || seen.has(key)) continue;
        seen.add(key);
        out.push(name);
      }
      return out;
    } catch {
      return [];
    }
  }

  function buildMessagePrefix(rawMessage = "") {
    const userMentions = extractMentionNamesFromText(rawMessage);
    // EFATA777_DESTINATION_CONTRACT_V1:
    // If the user typed an explicit mention, do not add a synthetic @Team/@Agent
    // prefix. The canonical payload below is now the source of truth.
    if (userMentions.length) return "";
    if (destMode === "team") return "";
    if (destMode === "single") {
      const ag = agents.find((a) => String(a.id) === String(destSingle));
      return ag ? `@${ag.name} ` : "";
    }
    if (destMode === "multi") {
      const names = agents
        .filter((a) => destMulti.includes(String(a.id)))
        .map((a) => a.name)
        .filter(Boolean);
      if (!names.length) return "";
      return names.map((n) => `@${n}`).join(" ") + " ";
    }
    return "";
  }

  function resolveManualTeamPanelSlugs() {
    // PATCH_32_REV_D:
    // Team must never collapse to whichever runtime agents happened to load first.
    // Slugs are canonical and deterministic even if /api/agents is temporarily stale.
    return Array.from(new Set(
      PATCH_32_CANONICAL_TEAM_AGENT_SLUGS
        .map((slug) => canonicalAgentSlug(slug))
        .filter((slug) => ["orkio", "orion", "chris", "laura"].includes(slug))
    ));
  }

  function resolveManualTeamPanelNames(slugs = resolveManualTeamPanelSlugs()) {
    return (Array.isArray(slugs) ? slugs : [])
      .map((slug) => {
        const agent = findAgentByCanonicalSlug(slug) || findAgentByRuntimeIdentity(slug) || null;
        return canonicalizeSpeakerLabel(agent?.name || registryCanonicalAgentDisplayNameFromSlug(slug) || slug);
      })
      .filter(Boolean);
  }

  function resolveManualTeamAgents() {
    const ordered = resolveManualTeamPanelSlugs()
      .map((slug) => findAgentByCanonicalSlug(slug) || findAgentByRuntimeIdentity(slug))
      .filter(Boolean);

    const byId = new Map();
    ordered.forEach((agent) => {
      const id = String(agent?.id || "").trim();
      if (id && !byId.has(id)) byId.set(id, agent);
    });

    return Array.from(byId.values());
  }

  function normalizePatch33TeamQueue(rawQueue = [], focusSlug = "") {
    const rawSlugs = Array.isArray(rawQueue)
      ? rawQueue.map((slug) => canonicalAgentSlug(slug || "")).filter(Boolean)
      : [];
    const allowedSlugs = new Set(["orkio", "orion", "chris", "laura"]);
    const presentSlugs = new Set(rawSlugs.filter((slug) => allowedSlugs.has(slug)));
    const stableQueue = PATCH_32_CANONICAL_TEAM_AGENT_SLUGS
      .map((slug) => canonicalAgentSlug(slug || ""))
      .filter((slug) => allowedSlugs.has(slug))
      .filter((slug) => presentSlugs.size ? presentSlugs.has(slug) : true);
    const fallbackQueue = stableQueue.length ? stableQueue : ["orkio", "orion", "chris", "laura"];
    const normalizedFocus = normalizeManualAuthoritySlug(focusSlug || "", "");
    try {
      if (normalizedFocus && normalizedFocus !== "team" && fallbackQueue.includes(normalizedFocus)) {
        logRealtimeStep("patch35_revf:team_queue_focus_preserved_without_reorder", {
          focus_slug: normalizedFocus,
          stable_turn_queue: fallbackQueue,
          previous_queue: rawSlugs,
          version: PATCH_35_REV_F_TEAM_QUEUE_CONTRACT_AUDIT_VERSION,
        });
      }
    } catch {}
    return fallbackQueue;
  }

  function isManualTeamConversationActive() {
    try {
      const authority = manualAuthorityRef.current || {};
      if (authority?.teamConversationActive === true) return true;
      if (authority?.manual_team_conversation_active === true) return true;
      if (String(authority?.response_control || "").trim() === PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL) return true;
      if (String(authority?.team_conversation_orchestrator_version || "").trim() === PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION) return true;
    } catch {}
    try {
      if (manualTeamConversationActiveRef.current === true) return true;
    } catch {}
    return false;
  }

  function getManualTeamConversationFocusSlug() {
    const authority = manualAuthorityRef.current || {};
    const rawFocus =
      authority?.teamConversationFocusSlug ||
      authority?.manual_team_focus_slug ||
      manualTeamConversationFocusSlugRef.current ||
      "";
    const focus = normalizeManualAuthoritySlug(rawFocus, "");
    if (focus && focus !== "team") return focus;
    return "orkio";
  }

  function getManualTeamConversationTurnQueue(focusSlug = getManualTeamConversationFocusSlug()) {
    const authority = manualAuthorityRef.current || {};
    const rawQueue =
      authority?.teamConversationTurnQueue ||
      authority?.manual_team_turn_queue ||
      manualTeamConversationTurnQueueRef.current ||
      [];
    return normalizePatch33TeamQueue(rawQueue, focusSlug);
  }

  function setManualTeamConversationRoomState({
    focusSlug = "orkio",
    source = PATCH_33_TEAM_CONVERSATION_SOURCE,
    selectedVisualSlug = "",
    activate = true,
  } = {}) {
    const focus = normalizeManualAuthoritySlug(focusSlug || "orkio", "orkio");
    const visual = normalizeManualAuthoritySlug(selectedVisualSlug || focus || "team", "team");
    const queue = normalizePatch33TeamQueue(resolveManualTeamPanelSlugs(), focus);
    const now = Date.now();

    manualTeamConversationActiveRef.current = Boolean(activate);
    manualTeamConversationFocusSlugRef.current = focus;
    manualTeamConversationTurnQueueRef.current = queue;
    manualTeamConversationTurnIndexRef.current = Number(manualTeamConversationTurnIndexRef.current || 0) + 1;

    manualAuthorityRef.current = {
      ...(manualAuthorityRef.current || {}),
      slug: "team",
      version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
      sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
      lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
      updatedAt: now,
      source: source || PATCH_33_TEAM_CONVERSATION_SOURCE,
      lockKind: "manual_team_conversation_room_authority",
      teamConversationActive: Boolean(activate),
      manual_team_conversation_active: Boolean(activate),
      teamConversationFocusSlug: focus,
      manual_team_focus_slug: focus,
      teamConversationTurnQueue: queue,
      manual_team_turn_queue: queue,
      manual_team_turn_index: manualTeamConversationTurnIndexRef.current,
      response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
      team_conversation_mode: PATCH_33_TEAM_CONVERSATION_MODE,
      team_conversation_orchestrator_version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      team_conversation_staging_verification_version: PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION,
    };

    selectedManualAgentSlugRef.current = visual;
    try { setSelectedManualAgentSlug(visual); } catch {}
    try {
      setDestMode("team");
      setDestSingle("");
      setDestMulti([]);
      setActiveRuntimeAgent(focus === "team" ? "Team" : (registryCanonicalAgentDisplayNameFromSlug(focus) || canonicalizeSpeakerLabel(focus)));
      persistDestinationState({
        mode: "team",
        single: "",
        multi: [],
        manual_target_slug: "team",
        manual_slug: visual,
        manual_agent_lock: true,
        manual_team_conversation_active: Boolean(activate),
        manual_team_focus_slug: focus,
        manual_team_turn_queue: queue,
        manual_team_turn_index: manualTeamConversationTurnIndexRef.current,
        team_conversation_mode: PATCH_33_TEAM_CONVERSATION_MODE,
        team_conversation_orchestrator_version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      team_conversation_staging_verification_version: PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION,
      });
    } catch {}

    try {
      window.localStorage?.setItem("orkio_manual_authority_slug", visual);
      window.localStorage?.setItem("orkio_manual_authority_lock", "true");
      window.localStorage?.setItem("orkio_manual_team_conversation_active", activate ? "true" : "false");
      window.localStorage?.setItem("orkio_manual_team_focus_slug", focus);
      window.localStorage?.setItem("orkio_manual_team_turn_queue", JSON.stringify(queue));
    } catch {}

    try {
      logRealtimeStep("patch33_team:room_state_updated", {
        source,
        focus_slug: focus,
        selected_visual_slug: visual,
        turn_queue: queue,
        turn_index: manualTeamConversationTurnIndexRef.current,
        response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
        version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      });
      queueRealtimeTelemetry("patch33_team_conversation_room_state_updated", {
        source,
        focus_slug: focus,
        selected_visual_slug: visual,
        target_agent_slug: focus,
        target_agent_slugs: queue,
        manual_target_slug: "team",
        manual_agent_lock: true,
        manual_team_conversation_active: Boolean(activate),
        manual_team_focus_slug: focus,
        manual_team_turn_queue: queue,
        manual_team_turn_index: manualTeamConversationTurnIndexRef.current,
        multi_agent_turn: true,
        response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
        team_conversation_mode: PATCH_33_TEAM_CONVERSATION_MODE,
        team_conversation_orchestrator_version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      team_conversation_staging_verification_version: PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION,
      });
      const patch33RevAStagingVerification = buildPatch33RevATeamStagingVerificationPayload({
        source,
        focusSlug: focus,
        turnQueue: queue,
      });
      logRealtimeStep("patch33_reva:team_staging_verification_required", patch33RevAStagingVerification);
      queueRealtimeTelemetry("patch33_reva_team_staging_verification_required", patch33RevAStagingVerification);
    } catch {}

    return { focus, visual, queue };
  }

  function deactivateManualTeamConversationRoomState() {
    manualTeamConversationActiveRef.current = false;
    manualTeamConversationFocusSlugRef.current = "";
    manualTeamConversationTurnQueueRef.current = [...PATCH_32_CANONICAL_TEAM_AGENT_SLUGS];
    try {
      window.localStorage?.removeItem("orkio_manual_team_conversation_active");
      window.localStorage?.removeItem("orkio_manual_team_focus_slug");
      window.localStorage?.removeItem("orkio_manual_team_turn_queue");
    } catch {}
  }

  function isPatch34TeamRoomActive() {
    const manualSlug = canonicalAgentSlug(selectedManualAgentSlugRef.current || getManualAuthoritySlug() || "");
    const roomState = manualRealtimeRoomStateRef.current && typeof manualRealtimeRoomStateRef.current === "object"
      ? manualRealtimeRoomStateRef.current
      : null;
    return Boolean(
      manualTeamConversationActiveRef.current ||
      manualSlug === "team" ||
      String(destMode || "").trim().toLowerCase() === "team" ||
      String(roomState?.room_mode || roomState?.mode || "").trim().toLowerCase() === PATCH_34_REVB_ROOM_MODE ||
      String(roomState?.response_control || "").trim() === PATCH_34_REVB_ROOM_RESPONSE_CONTROL
    );
  }

  function buildPatch34RoomState({
    sessionId = "",
    threadId: roomThreadId = "",
    activeSlug = "orkio",
    source = "client_room_state",
    phase = "READY",
    persisted = true,
  } = {}) {
    const safeActiveSlug = canonicalAgentSlug(activeSlug || "orkio") || "orkio";
    const safeParticipants = Array.from(new Set(
      (manualTeamConversationTurnQueueRef.current?.length ? manualTeamConversationTurnQueueRef.current : PATCH_32_CANONICAL_TEAM_AGENT_SLUGS)
        .map((slug) => canonicalAgentSlug(slug))
        .filter(Boolean)
    ));
    const participants = safeParticipants.length ? safeParticipants : [...PATCH_32_CANONICAL_TEAM_AGENT_SLUGS];
    const nowIso = new Date().toISOString();
    return {
      org: tenant || "public",
      session_id: String(sessionId || rtcActiveSessionIdRef.current || rtcSessionIdRef.current || "").trim(),
      thread_id: String(roomThreadId || rtcThreadIdRef.current || activeThreadIdRef.current || threadId || "").trim(),
      room_mode: PATCH_34_REVB_ROOM_MODE,
      mode: PATCH_34_REVB_ROOM_MODE,
      participants,
      active_speaker_slug: safeActiveSlug,
      active_persona_slug: safeActiveSlug,
      active_speaker_name: registryCanonicalAgentDisplayNameFromSlug(safeActiveSlug) || canonicalizeSpeakerLabel(safeActiveSlug),
      pending_speaker_slug: "",
      target_agent_slug: safeActiveSlug,
      target_agent_slugs: participants,
      multi_agent_turn: true,
      response_control: PATCH_34_REVB_ROOM_RESPONSE_CONTROL,
      phase,
      state: phase,
      turn_index: Number(meetingStateRef.current?.turn_index || 0),
      transition_reason: source,
      has_snapshot: true,
      persisted: true,
      room_state_persisted: true,
      storage_persisted: Boolean(persisted),
      realtime_session_active: Boolean(realtimeModeRef.current),
      version: PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION,
      updated_at: nowIso,
    };
  }

  function updatePatch34RoomState({
    sessionId = "",
    activeSlug = "orkio",
    source = "client_room_state_update",
    phase = "READY",
    persisted = false,
    telemetry = true,
  } = {}) {
    const nextState = buildPatch34RoomState({ sessionId, activeSlug, source, phase, persisted });
    manualRealtimeRoomStateRef.current = nextState;
    meetingStateRef.current = {
      ...(meetingStateRef.current || {}),
      ...nextState,
    };
    try {
      window.localStorage?.setItem("orkio_realtime_room_state", JSON.stringify(nextState));
    } catch {}
    if (telemetry) {
      try {
        logRealtimeStep("patch34_revb:room_state_updated", {
          source,
          session_id: nextState.session_id || null,
          room_mode: nextState.room_mode,
          active_speaker_slug: nextState.active_speaker_slug,
          target_agent_slugs: nextState.target_agent_slugs,
          response_control: nextState.response_control,
          has_snapshot: true,
          room_state_persisted: Boolean(persisted),
          version: PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION,
        });
        queueRealtimeTelemetry("patch34_revb_room_state_updated", {
          source,
          session_id: nextState.session_id || null,
          room_mode: nextState.room_mode,
          active_speaker_slug: nextState.active_speaker_slug,
          target_agent_slugs: nextState.target_agent_slugs,
          multi_agent_turn: true,
          response_control: PATCH_34_REVB_ROOM_RESPONSE_CONTROL,
          has_snapshot: true,
          room_state_persisted: Boolean(persisted),
          realtime_room_engine_version: PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION,
        });
      } catch {}
    }
    return nextState;
  }

  function getPatch34RoomStateEcho(sessionId = "") {
    if (!isPatch34TeamRoomActive()) return null;
    const current = manualRealtimeRoomStateRef.current && typeof manualRealtimeRoomStateRef.current === "object"
      ? manualRealtimeRoomStateRef.current
      : null;
    const activeSlug = canonicalAgentSlug(
      manualTeamConversationFocusSlugRef.current ||
      current?.active_speaker_slug ||
      getManualAuthoritySlug() ||
      selectedManualAgentSlugRef.current ||
      "orkio"
    ) || "orkio";
    const shouldRefresh = !current || String(current.session_id || "") !== String(sessionId || rtcSessionIdRef.current || "");
    if (shouldRefresh) {
      return updatePatch34RoomState({
        sessionId,
        activeSlug,
        source: "events_batch_room_state_echo",
        phase: "READY",
        persisted: true,
        telemetry: false,
      });
    }
    return {
      ...current,
      session_id: String(sessionId || current.session_id || rtcSessionIdRef.current || "").trim(),
      thread_id: String(current.thread_id || rtcThreadIdRef.current || activeThreadIdRef.current || threadId || "").trim(),
      has_snapshot: true,
      room_mode: PATCH_34_REVB_ROOM_MODE,
      mode: PATCH_34_REVB_ROOM_MODE,
      multi_agent_turn: true,
      response_control: PATCH_34_REVB_ROOM_RESPONSE_CONTROL,
      version: PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION,
    };
  }


  function buildPatch33RevATeamStagingVerificationPayload({
    source = PATCH_33_TEAM_CONVERSATION_SOURCE,
    focusSlug = "orkio",
    turnQueue = [],
  } = {}) {
    const canonicalTargetSlugs = [...PATCH_32_CANONICAL_TEAM_AGENT_SLUGS];
    const focus = normalizeManualAuthoritySlug(focusSlug || "orkio", "orkio");
    const queue = normalizePatch33TeamQueue(Array.isArray(turnQueue) && turnQueue.length ? turnQueue : canonicalTargetSlugs, focus);
    return {
      source,
      version: PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION,
      manual_target_slug: "team",
      manual_team_conversation_active: true,
      multi_agent_turn: true,
      response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
      target_agent_slugs: canonicalTargetSlugs,
      manual_team_focus_slug: focus,
      manual_team_turn_queue: queue,
      team_conversation_mode: PATCH_33_TEAM_CONVERSATION_MODE,
      team_conversation_orchestrator_version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      team_conversation_staging_verification_version: PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION,
      staging_verification_required: true,
    };
  }

  function buildPatch33TeamConversationInstruction(rawInput = "", focusSlug = "orkio", contract = {}) {
    const queue = getManualTeamConversationTurnQueue(focusSlug);
    const names = resolveManualTeamPanelNames(queue);
    const focusName = registryCanonicalAgentDisplayNameFromSlug(focusSlug) || canonicalizeSpeakerLabel(focusSlug) || "Orkio";
    const orderedNames = names.length ? names.join(" → ") : "Orkio → Orion → Chris → Laura";
    return [
      `PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR: modo Team ativo em tempo real.`,
      `A sala deve operar como conversa multiagente determinística, não como single speaker.`,
      `Fila de fala obrigatória deste turno: ${orderedNames}.`,
      `Agente promovido para o próximo turno: ${focusName} (${focusSlug}).`,
      `Formato obrigatório: responda em blocos muito curtos identificados por nome: Orkio, Orion, Chris e Laura.`,
      `Quando o usuário selecionar um agente individual durante Team, inclua esse agente como próximo bloco/turno sem derrubar a sala Team.`,
      `Não responda apenas como Orkio e não trate Team como especialista único.`,
      `Se não houver informação suficiente para algum agente, esse agente registra hipótese/risco breve em vez de ficar ausente.`,
      `Se a fala do usuário for apenas teste/checagem, faça apresentações breves: "Nome: estou aqui."`,
      rawInput ? `Mensagem do usuário para a sala: ${String(rawInput || "").slice(0, 1200)}` : "",
    ].filter(Boolean).join("\n");
  }

  function buildPatch33TeamConversationIdentityLock(focusSlug = "orkio", voiceResolution = {}) {
    const queue = getManualTeamConversationTurnQueue(focusSlug);
    const names = resolveManualTeamPanelNames(queue);
    const focusName = registryCanonicalAgentDisplayNameFromSlug(focusSlug) || canonicalizeSpeakerLabel(focusSlug) || "Orkio";
    const voiceId = voiceResolution?.voice || voiceResolution?.voice_profile?.voice_id || "";
    return [
      "PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR — contrato final de sala Team.",
      `Modo ativo: ${PATCH_33_TEAM_CONVERSATION_MODE}.`,
      `Speaker de áudio/moderação deste response.create: ${focusName} (${focusSlug}).`,
      voiceId ? `Provider voice solicitado para o turno promovido/moderador: ${voiceId}.` : "",
      `Participantes obrigatórios em painel: ${names.join(" → ") || "Orkio → Orion → Chris → Laura"}.`,
      "A resposta deve materializar a sala Team em blocos identificados, sem afirmar que houve deploy, commit, PR, auditoria executada ou chamada externa sem evidência.",
      "Não finalize dizendo que outro agente ainda vai falar; entregue os blocos da sala na própria resposta.",
    ].filter(Boolean).join("\n");
  }

  function buildManualTeamPanelInstruction(contract = {}) {
    const manualTarget = normalizeManualAuthoritySlug(
      contract?.manual_target_slug || contract?.target_agent_slug || getManualAuthoritySlug(),
      ""
    );
    const responseControl = String(contract?.response_control || "").trim();
    const isManualTeam = (
      manualTarget === "team" ||
      contract?.manual_team_conversation_active === true ||
      contract?.manual_team_panel_required === true ||
      responseControl === "manual_team_panel" ||
      responseControl === PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL
    );
    if (!isManualTeam) return "";

    const panelSlugs = Array.isArray(contract?.manual_team_panel_order) && contract.manual_team_panel_order.length
      ? contract.manual_team_panel_order
      : resolveManualTeamPanelSlugs();
    const panelNames = resolveManualTeamPanelNames(panelSlugs);
    const orderedNames = panelNames.length ? panelNames.join(" → ") : "Orkio → Orion → Chris → Laura";

    return [
      `PATCH_32_REV_D_TEAM_PANEL_PRESTAGING: botão Team ativo; trate esta resposta como painel executivo determinístico.`,
      `PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR: sala Team deve permanecer em modo multiagente, não single speaker.`,
      `Ordem obrigatória do painel: ${orderedNames}.`,
      `Cada agente deve responder em bloco próprio, curto e identificado pelo nome: Orkio, Orion, Chris e Laura.`,
      `Não escolha apenas um especialista. Não trate Team como especialista único. Não aplique handoff automático por nome dentro desta mensagem.`,
      `Se algum agente não tiver informação suficiente, ele deve registrar hipótese/risco de forma breve em vez de ficar ausente.`,
    ].join("\n");
  }

  function normalizeManualAuthoritySlug(rawSlug = "", fallback = "orkio") {
    const slug = canonicalAgentSlug(rawSlug || "") || "";
    if (["orkio", "orion", "chris", "laura", "team"].includes(slug)) return slug;
    return fallback;
  }

  function setManualAuthoritySlug(rawSlug = "orkio", source = PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE, options = {}) {
    const slug = normalizeManualAuthoritySlug(rawSlug, "orkio");
    const preserveTeamConversation = Boolean(options?.preserveTeamConversation);
    if (slug !== "team" && !preserveTeamConversation) {
      deactivateManualTeamConversationRoomState();
    }
    const now = Date.now();
    const next = {
      slug,
      version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
      sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
      lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
      updatedAt: now,
      source: source || PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE,
      lockKind: preserveTeamConversation ? "manual_team_conversation_room_authority" : "manual_button_visual_authority",
      ...(preserveTeamConversation ? {
        teamConversationActive: true,
        manual_team_conversation_active: true,
        teamConversationFocusSlug: normalizeManualAuthoritySlug(options?.focusSlug || slug || "orkio", "orkio"),
        manual_team_focus_slug: normalizeManualAuthoritySlug(options?.focusSlug || slug || "orkio", "orkio"),
        teamConversationTurnQueue: normalizePatch33TeamQueue(options?.turnQueue || resolveManualTeamPanelSlugs(), options?.focusSlug || slug || "orkio"),
        manual_team_turn_queue: normalizePatch33TeamQueue(options?.turnQueue || resolveManualTeamPanelSlugs(), options?.focusSlug || slug || "orkio"),
        manual_team_turn_index: manualTeamConversationTurnIndexRef.current || 0,
        response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
        team_conversation_mode: PATCH_33_TEAM_CONVERSATION_MODE,
        team_conversation_orchestrator_version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      team_conversation_staging_verification_version: PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION,
      } : {}),
    };

    // PATCH_32_REV_F:
    // The quick button is now the visual/manual source of truth. Updating only a
    // ref was not enough: older UI branches still rendered from destMode/destSingle
    // and could return to Overview/Orkio after authority telemetry or blank
    // meeting_state updates.
    manualAuthorityRef.current = next;
    selectedManualAgentSlugRef.current = slug;
    try { setSelectedManualAgentSlug(slug); } catch {}

    try {
      if (slug === "team") {
        try { setManualTeamConversationRoomState({ focusSlug: "orkio", selectedVisualSlug: "team", source, activate: true }); } catch {}
        setDestMode("team");
        setDestSingle("");
        setDestMulti([]);
        setActiveRuntimeAgent("Team");
        persistDestinationState({
          mode: "team",
          single: "",
          multi: [],
          manual_target_slug: "team",
          manual_slug: "team",
          manual_agent_lock: true,
          manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
        });
      } else {
        const targetAgent =
          findAgentByCanonicalSlug(slug) ||
          findAgentByRuntimeIdentity(slug) ||
          null;
        const targetId = String(targetAgent?.id || slug || "").trim();
        const targetName = canonicalizeSpeakerLabel(
          targetAgent?.name ||
          registryCanonicalAgentDisplayNameFromSlug(slug) ||
          slug
        );
        setDestMode("single");
        setDestSingle(targetId);
        setDestMulti([]);
        setActiveRuntimeAgent(targetName);
        persistDestinationState({
          mode: "single",
          single: targetId,
          multi: [],
          manual_target_slug: slug,
          manual_slug: slug,
          manual_agent_lock: true,
          manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
        });
      }
    } catch {}

    try {
      window.localStorage?.setItem("orkio_manual_authority_slug", slug);
      window.localStorage?.setItem("orkio_manual_authority_lock", "true");
      window.localStorage?.setItem("orkio_manual_authority_updated_at", String(now));
      persistPwaMobileDestinationState({
        manual_target_slug: slug,
        manual_slug: slug,
        manual_agent_lock: true,
        manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
      });
    } catch {}

    try {
      logRealtimeStep("patch32_revf:manual_button_lock_persisted", {
        manual_target_slug: slug,
        active_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
        manual_agent_lock: true,
        manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        manual_sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
        manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
        manual_lock_contract_propagation_version: PATCH_32_REV_G_MANUAL_LOCK_CONTRACT_PROPAGATION_VERSION,
        manual_authority_source: next.source,
        manual_authority_updated_at: next.updatedAt,
      });
      queueRealtimeTelemetry("patch32_revf_manual_button_lock_persisted", {
        manual_target_slug: slug,
        selected_agent_slug: slug,
        active_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
        manual_agent_lock: true,
        manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        manual_sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
        manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
        manual_lock_contract_propagation_version: PATCH_32_REV_G_MANUAL_LOCK_CONTRACT_PROPAGATION_VERSION,
        manual_lock_staging_proof_version: getPatch32ManualLockStagingProofVersion(),
        manual_lock_staging_proof_production_guard_version: PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION,
        manual_authority_source: next.source,
        manual_authority_updated_at: next.updatedAt,
      });
    } catch {}

    try {
      logManualLockStagingProof("manual_button_selected", {
        expected_manual_slug: slug,
        manual_authority_source: next.source,
        manual_authority_updated_at: next.updatedAt,
        proof_scope: "quick_agent_button_click",
      });
    } catch {}
    return next;
  }

  function getManualAuthoritySlug() {
    // PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR:
    // Visual selection can be Orion/Chris/Laura while the manual authority remains
    // Team. This is what allows adding a participant to the room without falling
    // back to manual_agent_authority_single.
    if (isManualTeamConversationActive()) return "team";
    const sticky = normalizeManualAuthoritySlug(selectedManualAgentSlugRef.current || selectedManualAgentSlug || "", "");
    if (sticky) return sticky;
    const current = manualAuthorityRef.current || {};
    const direct = normalizeManualAuthoritySlug(current.slug || "", "");
    if (direct) return direct;
    const mode = String(destMode || "").trim().toLowerCase();
    if (mode === "team") return "team";
    if (mode === "single") {
      const selectedAgent = findAgentByRuntimeIdentity(destSingle) || findAgentByCanonicalSlug(destSingle) || null;
      return normalizeManualAuthoritySlug(selectedAgent?.slug || selectedAgent?.key || selectedAgent?.name || destSingle || direct || "orkio", "orkio");
    }
    return direct || "orkio";
  }

  function buildManualAuthorityPayload(eventSessionId = null) {
    const authority = manualAuthorityRef.current || {};
    const manualTargetSlug = getManualAuthoritySlug();
    const activeSessionId = String(rtcActiveSessionIdRef.current || rtcSessionIdRef.current || "").trim();
    const payload = {
      manual_agent_lock: Boolean(manualTargetSlug),
      manual_target_slug: manualTargetSlug || undefined,
      manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
      manual_sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
      manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
      manual_lock_staging_proof_version: getPatch32ManualLockStagingProofVersion(),
      manual_lock_staging_proof_production_guard_version: PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION,
      manual_authority_source: authority.source || PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE,
      manual_authority_updated_at: authority.updatedAt || 0,
      session_id: activeSessionId || eventSessionId || undefined,
      ...(isManualTeamConversationActive() ? {
        manual_team_conversation_active: true,
        manual_team_focus_slug: getManualTeamConversationFocusSlug(),
        manual_team_turn_queue: getManualTeamConversationTurnQueue(),
        manual_team_turn_index: manualTeamConversationTurnIndexRef.current || 0,
        team_conversation_mode: PATCH_33_TEAM_CONVERSATION_MODE,
        team_conversation_orchestrator_version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      team_conversation_staging_verification_version: PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION,
        response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
        multi_agent_turn: true,
      } : {}),
    };
    try {
      logRealtimeStep("patch32_revc:manual_authority_payload_built", {
        ...payload,
        active_session_id: activeSessionId || null,
        event_session_id: eventSessionId || null,
      });
    } catch {}
    return payload;
  }

  function logManualLockStagingProof(eventName = "manual_lock_staging_proof", payload = {}) {
    try {
      if (!isPatch32ManualLockStagingProofEnabled()) return;
      const manualSlug = normalizeManualAuthoritySlug(
        payload?.expected_manual_slug ||
        getManualAuthoritySlug() ||
        selectedManualAgentSlugRef.current ||
        selectedManualAgentSlug ||
        "",
        ""
      );
      const state = meetingStateRef.current && typeof meetingStateRef.current === "object"
        ? meetingStateRef.current
        : {};
      const stateSlug = canonicalAgentSlug(
        state?.active_speaker_slug ||
        state?.active_persona_slug ||
        state?.target_agent_slug ||
        state?.visible_agent ||
        ""
      );
      const participants = Array.isArray(state?.participants) ? state.participants : [];
      const proofPayload = {
        ...(payload && typeof payload === "object" ? payload : {}),
        patch: "PATCH_32_REV_H_MANUAL_LOCK_STAGING_PROOF",
        patch_silence: "PATCH_32_REV_I_MANUAL_LOCK_STAGING_PROOF_SILENCE",
        manual_lock_staging_proof_enabled: true,
        manual_lock_staging_proof_version: getPatch32ManualLockStagingProofVersion(),
        manual_lock_staging_proof_silence_version: PATCH_32_REV_I_MANUAL_LOCK_STAGING_PROOF_SILENCE_VERSION,
        manual_lock_staging_proof_production_guard_version: PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION,
        manual_sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
        manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
        manual_lock_contract_propagation_version: PATCH_32_REV_G_MANUAL_LOCK_CONTRACT_PROPAGATION_VERSION,
        expected_manual_slug: manualSlug || null,
        selected_manual_agent_slug: selectedManualAgentSlugRef.current || selectedManualAgentSlug || null,
        manual_authority_slug: manualAuthorityRef.current?.slug || null,
        manual_agent_lock: isManualAgentAuthorityLocked(),
        visual_button_fixed: Boolean(manualSlug && normalizeManualAuthoritySlug(selectedManualAgentSlugRef.current || selectedManualAgentSlug || "", "") === manualSlug),
        dest_mode: destMode || null,
        dest_single: destSingle || null,
        active_runtime_agent: activeRuntimeAgent || null,
        meeting_state_active_slug: stateSlug || null,
        meeting_state_participants_count: participants.length,
        active_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
      };
      logRealtimeStep(`patch32_revh:${eventName}`, proofPayload);
      queueRealtimeTelemetry(`patch32_revh_${eventName}`, proofPayload);
      try {
        console.info("[PATCH_32_REV_H_MANUAL_LOCK_STAGING_PROOF]", eventName, proofPayload);
      } catch {}
    } catch {}
  }

  function buildManualAgentAuthorityContract(rawMessage = "", hostAgentId = null, options = {}) {
    if (publicBetaOrkioOnly) return null;

    const manualSourceSlug = getManualAuthoritySlug();
    const mode = manualSourceSlug === "team"
      ? "team"
      : (manualSourceSlug ? "single" : (["team", "single", "multi"].includes(String(destMode || "").toLowerCase())
          ? String(destMode || "team").toLowerCase()
          : "team"));

    const mentionedNames = extractMentionNamesFromText(rawMessage);
    const realtime = Boolean(options?.realtime);
    const manualPayload = buildManualAuthorityPayload(options?.sessionId || null);

    if (isManualTeamConversationActive()) {
      const focusSlug = getManualTeamConversationFocusSlug();
      const turnQueue = getManualTeamConversationTurnQueue(focusSlug);
      const teamAgents = resolveManualTeamAgents();
      const focusAgent =
        findAgentByCanonicalSlug(focusSlug) ||
        findAgentByRuntimeIdentity(focusSlug) ||
        findAgentByCanonicalSlug("orkio") ||
        null;
      const focusName = canonicalizeSpeakerLabel(
        focusAgent?.name ||
        registryCanonicalAgentDisplayNameFromSlug(focusSlug) ||
        focusSlug
      );
      const teamNames = resolveManualTeamPanelNames(turnQueue);
      return {
        dest_mode: "team",
        agent_id: focusAgent?.id || hostAgentId || null,
        agent_ids: teamAgents.map((agent) => String(agent.id || "")).filter(Boolean),
        target_agent_slug: focusSlug,
        target_agent_slugs: turnQueue,
        visible_agent: "Team",
        requested_agent_names: Array.from(new Set([...(teamNames || []), ...(Array.isArray(mentionedNames) ? mentionedNames : [])].filter(Boolean))),
        multi_agent_turn: true,
        response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
        manual_team_conversation_active: true,
        manual_team_focus_slug: focusSlug,
        manual_team_turn_queue: turnQueue,
        manual_team_turn_index: manualTeamConversationTurnIndexRef.current || 0,
        team_conversation_mode: PATCH_33_TEAM_CONVERSATION_MODE,
        team_conversation_orchestrator_version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      team_conversation_staging_verification_version: PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION,
        manual_team_panel_required: true,
        manual_team_panel_order: turnQueue,
        team_panel_version: PATCH_32_REV_D_TEAM_PANEL_VERSION,
        team_panel_mode: PATCH_32_REV_D_TEAM_PANEL_MODE,
        team_panel_voice_moderator_slug: focusSlug || PATCH_32_REV_D_TEAM_PANEL_VOICE_MODERATOR_SLUG,
        ...manualPayload,
        manual_target_slug: "team",
        manual_agent_lock: true,
        manual_agent_source: PATCH_33_TEAM_CONVERSATION_SOURCE,
        manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        auto_handoff_enabled: false,
        auto_handoff_ignored: true,
        realtime_voice_agent_slug: focusSlug || "orkio",
      };
    }

    if (mode === "single") {
      const singleAgent =
        findAgentByCanonicalSlug(manualSourceSlug) ||
        findAgentByRuntimeIdentity(manualSourceSlug) ||
        findAgentByRuntimeIdentity(destSingle) ||
        findAgentByCanonicalSlug(destSingle) ||
        null;
      const selectedSlug = normalizeManualAuthoritySlug(manualSourceSlug || singleAgent?.slug || singleAgent?.key || singleAgent?.name || destSingle || "orkio", "orkio");
      const selectedName = canonicalizeSpeakerLabel(singleAgent?.name || registryCanonicalAgentDisplayNameFromSlug(selectedSlug) || selectedSlug);
      return {
        dest_mode: "single",
        agent_id: singleAgent?.id || hostAgentId || destSingle || null,
        agent_ids: singleAgent?.id ? [String(singleAgent.id)] : [],
        target_agent_slug: selectedSlug,
        target_agent_slugs: [selectedSlug],
        visible_agent: selectedName,
        requested_agent_names: Array.from(new Set([selectedName, ...(Array.isArray(mentionedNames) ? mentionedNames : [])].filter(Boolean))),
        multi_agent_turn: false,
        response_control: PATCH_32_SINGLE_AGENT_CONTROL,
        ...manualPayload,
        manual_agent_lock: true,
        manual_agent_source: PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE,
        manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        auto_handoff_enabled: false,
        auto_handoff_ignored: true,
        realtime_voice_agent_slug: selectedSlug,
      };
    }

    if (mode === "multi") {
      const selectedAgents = (Array.isArray(destMulti) ? destMulti : [])
        .map((id) => findAgentByRuntimeIdentity(id) || findAgentByCanonicalSlug(id))
        .filter(Boolean);
      if (selectedAgents.length) {
        const selectedSlugs = selectedAgents
          .map((agent) => canonicalAgentSlug(agent?.slug || agent?.key || agent?.name || agent?.id || ""))
          .filter(Boolean);
        const selectedNames = selectedAgents
          .map((agent, idx) => canonicalizeSpeakerLabel(agent?.name || registryCanonicalAgentDisplayNameFromSlug(selectedSlugs[idx]) || selectedSlugs[idx]))
          .filter(Boolean);
        return {
          dest_mode: "multi",
          agent_id: selectedAgents[0]?.id || hostAgentId || null,
          agent_ids: selectedAgents.map((agent) => String(agent.id || "")).filter(Boolean),
          target_agent_slug: selectedSlugs[0] || "orkio",
          target_agent_slugs: selectedSlugs,
          visible_agent: selectedNames.join(" + ") || "Multi",
          requested_agent_names: Array.from(new Set([...selectedNames, ...(Array.isArray(mentionedNames) ? mentionedNames : [])].filter(Boolean))),
          multi_agent_turn: selectedSlugs.length > 1,
          response_control: selectedSlugs.length > 1 ? PATCH_32_TEAM_SEQUENCE_CONTROL : PATCH_32_SINGLE_AGENT_CONTROL,
          ...manualPayload,
          manual_agent_lock: true,
          manual_agent_source: PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE,
          manual_authority_version: PATCH_32_MANUAL_AGENT_AUTHORITY_VERSION,
          manual_sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
          auto_handoff_enabled: false,
          auto_handoff_ignored: true,
          realtime_voice_agent_slug: selectedSlugs[0] || "orkio",
        };
      }
    }

    // PATCH 32:
    // Team button means manual Team authority. It no longer depends on natural
    // language direct-addressing. Text mode asks every visible team agent to
    // answer in a sequenced panel; Realtime keeps Orkio as the audio moderator
    // until multi-voice sequencing is hardened.
    const teamAgents = resolveManualTeamAgents();
    const safeTeamSlugs = resolveManualTeamPanelSlugs();
    const teamNames = resolveManualTeamPanelNames(safeTeamSlugs);
    const orkioAgent =
      teamAgents.find((agent) => canonicalAgentSlug(agent?.slug || agent?.key || agent?.name || agent?.id || "") === "orkio") ||
      findAgentByCanonicalSlug("orkio") ||
      findAgentByRuntimeIdentity("orkio") ||
      null;

    return {
      dest_mode: "team",
      agent_id: orkioAgent?.id || hostAgentId || null,
      agent_ids: teamAgents.map((agent) => String(agent.id || "")).filter(Boolean),
      target_agent_slug: "team",
      target_agent_slugs: safeTeamSlugs,
      visible_agent: "Team",
      requested_agent_names: Array.from(new Set([...(teamNames || []), ...(Array.isArray(mentionedNames) ? mentionedNames : [])].filter(Boolean))),
      multi_agent_turn: safeTeamSlugs.length > 1,
      response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
      manual_team_conversation_active: true,
      manual_team_focus_slug: "orkio",
      manual_team_turn_queue: safeTeamSlugs,
      manual_team_turn_index: manualTeamConversationTurnIndexRef.current || 0,
      team_conversation_mode: PATCH_33_TEAM_CONVERSATION_MODE,
      team_conversation_orchestrator_version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      team_conversation_staging_verification_version: PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION,
      manual_team_panel_required: true,
      manual_team_panel_order: safeTeamSlugs,
      team_panel_version: PATCH_32_REV_D_TEAM_PANEL_VERSION,
      team_panel_mode: PATCH_32_REV_D_TEAM_PANEL_MODE,
      team_panel_voice_moderator_slug: PATCH_32_REV_D_TEAM_PANEL_VOICE_MODERATOR_SLUG,
      ...manualPayload,
      manual_agent_lock: true,
      manual_agent_source: PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE,
      manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
      auto_handoff_enabled: false,
      auto_handoff_ignored: true,
      realtime_voice_agent_slug: "orkio",
    };
  }

  function isManualAgentAuthorityLocked() {
    if (publicBetaOrkioOnly) return false;
    const sticky = normalizeManualAuthoritySlug(selectedManualAgentSlugRef.current || selectedManualAgentSlug || "", "");
    if (sticky) return true;
    const mode = String(destMode || "team").trim().toLowerCase();
    return ["team", "single", "multi"].includes(mode);
  }

  function getManualRealtimeTargetSlug() {
    if (isManualTeamConversationActive()) return getManualTeamConversationFocusSlug() || "orkio";
    return getManualAuthoritySlug() || "orkio";
  }

  function buildManualRealtimeSessionUpdate({
    targetAgent = null,
    targetSlug = "orkio",
    targetName = "Orkio",
    voiceResolution = null,
    teamMode = false,
  } = {}) {
    const safeSlug = canonicalAgentSlug(targetSlug || "orkio") || "orkio";
    const teamConversationActive = Boolean(teamMode || isManualTeamConversationActive());
    const teamFocusSlug = teamConversationActive ? (getManualTeamConversationFocusSlug() || safeSlug || "orkio") : "";
    const teamTurnQueue = teamConversationActive ? getManualTeamConversationTurnQueue(teamFocusSlug) : [];
    const manualTargetSlug = teamConversationActive ? "team" : (getManualAuthoritySlug() || safeSlug);
    const safeName = canonicalizeSpeakerLabel(targetName || registryCanonicalAgentDisplayNameFromSlug(safeSlug) || safeSlug);
    const providerVoice = coerceVoiceId(
      voiceResolution?.voice ||
      rtcVoiceRef.current ||
      ORKIO_CANONICAL_VOICE_ID ||
      ORKIO_DEFAULT_VOICE_ID
    );

    const canonicalPersonaInstructions = registryBuildCanonicalRealtimeAgentInstructions(safeSlug, {
      fallbackSlug: "orkio",
      includeKnownAgents: true,
    });

    const authorityLine = teamConversationActive
      ? `PATCH_34_REVB_REALTIME_ROOM_ENGINE: o modo Team está ativo como sala persistente. Troque apenas o speaker para ${teamFocusSlug || safeSlug}; não colapse a sala para single. Fila=${resolveManualTeamPanelNames(teamTurnQueue).join(" → ")}.`
      : `PATCH_32_PREDEPLOY_MANUAL_AGENT_AUTHORITY: o botão selecionado pelo usuário é a autoridade. Responda somente como ${safeName}. Ignore menções a outros agentes até o usuário trocar o botão no topo.`;

    // PATCH_33_REV_C:
    // This function now returns a provider-native session.update payload only.
    // Orkio manual/team state stays in telemetry, meeting_state and events:batch.
    // Do not add manual_* or team_* fields here; provider rejects them.
    return {
      type: "realtime",
      instructions: [
        canonicalPersonaInstructions,
        buildRealtimeAgentInstructions(targetAgent || { slug: safeSlug, name: safeName }),
        authorityLine,
        `PATCH_33_REV_C_LIVE_AGENT_SWITCH_RUNTIME_FIX: aplique este update como troca viva de agente/persona sem reiniciar a sessão realtime.`,
        `Agente ativo manual: ${safeName} (${safeSlug}).`,
        `Voz canônica solicitada nesta sessão: ${providerVoice}.`,
      ].filter(Boolean).join("\n\n"),
      audio: {
        output: {
          voice: providerVoice,
        },
      },
    };
  }

  function flushPendingRealtimeSessionUpdate(source = "provider_idle") {
    const pending = rtcPendingSessionUpdateRef.current;
    if (!pending) return false;
    if (rtcResponseInFlightRef.current) return false;

    const dc = rtcDcRef.current;
    if (!dc || dc.readyState !== "open") return false;

    rtcPendingSessionUpdateRef.current = null;
    const sent = sendRealtimeClientEvent(dc, pending.payload, pending.reason);
    if (sent && pending.meta?.switch_generation_id) {
      rtcManualSwitchGateRef.current = {
        ...(rtcManualSwitchGateRef.current || {}),
        locked: true,
        phase: "SESSION_UPDATE_SENT",
        session_update_sent: true,
      };
    }
    try {
      logRealtimeStep("patch35:pending_session_update_flushed", {
        source,
        reason: pending.reason,
        target_agent_slug: pending.meta?.target_agent_slug || null,
        room_mode: pending.meta?.room_mode || null,
        provider_session_payload_clean: true,
      });
      queueRealtimeTelemetry("patch35_pending_session_update_flushed", {
        source,
        reason: pending.reason,
        target_agent_slug: pending.meta?.target_agent_slug || null,
        room_mode: pending.meta?.room_mode || null,
        sent: Boolean(sent),
      });
    } catch {}
    return Boolean(sent);
  }

  function sendRealtimeSessionUpdateWhenIdle(payload, reason = "session_update", meta = {}, options = {}) {
    const dc = rtcDcRef.current;
    if (!dc || dc.readyState !== "open") return false;
    const force = options?.force === true;
    const manualSwitch = options?.manualSwitch === true;
    let switchMeta = meta;

    if (manualSwitch) {
      const generation = Number(rtcManualSwitchGateRef.current?.generation || 0) + 1;
      const generationId = `rt_switch_${generation}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      switchMeta = {
        ...(meta || {}),
        switch_generation: generation,
        switch_generation_id: generationId,
      };
      rtcManualSwitchGateRef.current = {
        locked: true,
        generation,
        generation_id: generationId,
        target_agent_slug: canonicalAgentSlug(meta?.target_agent_slug || "orkio") || "orkio",
        phase: rtcResponseInFlightRef.current ? "CANCEL_PENDING" : "SESSION_UPDATE_PENDING",
        session_update_sent: false,
        started_at_ms: Date.now(),
      };
      try {
        logRealtimeStep("patch39:manual_switch_gate_locked", {
          marker: PATCH_39_REALTIME_MANUAL_SWITCH_HARD_GATE_VERSION,
          generation,
          switch_generation_id: generationId,
          target_agent_slug: rtcManualSwitchGateRef.current.target_agent_slug,
          phase: rtcManualSwitchGateRef.current.phase,
        });
      } catch {}
    }

    if (rtcResponseInFlightRef.current && !force) {
      rtcPendingSessionUpdateRef.current = { payload, reason, meta: switchMeta };
      let responseCancelSent = false;
      let inputClearSent = false;
      try {
        responseCancelSent = Boolean(sendRealtimeClientEvent(dc, { type: "response.cancel" }, `${reason}:cancel_before_deferred_session_update`));
      } catch {}
      try {
        inputClearSent = Boolean(sendRealtimeClientEvent(dc, { type: "input_audio_buffer.clear" }, `${reason}:clear_input_before_deferred_session_update`));
      } catch {}
      try {
        logRealtimeStep("patch35:session_update_deferred_until_idle", {
          reason,
          target_agent_slug: meta?.target_agent_slug || null,
          room_mode: meta?.room_mode || null,
          response_in_flight: true,
          waiting_for: "response.done_or_provider_error",
          response_cancel_sent: responseCancelSent,
          input_audio_clear_sent: inputClearSent,
        });
        queueRealtimeTelemetry("patch35_session_update_deferred_until_idle", {
          reason,
          target_agent_slug: meta?.target_agent_slug || null,
          room_mode: meta?.room_mode || null,
          response_cancel_sent: responseCancelSent,
          input_audio_clear_sent: inputClearSent,
        });
      } catch {}
      return false;
    }

    if (rtcResponseInFlightRef.current && force) {
      rtcPendingSessionUpdateRef.current = { payload, reason, meta: switchMeta };
      let responseCancelSent = false;
      let inputClearSent = false;
      try {
        responseCancelSent = Boolean(sendRealtimeClientEvent(dc, { type: "response.cancel" }, `${reason}:force_cancel_before_switch`));
      } catch {}
      try {
        inputClearSent = Boolean(sendRealtimeClientEvent(dc, { type: "input_audio_buffer.clear" }, `${reason}:force_clear_before_switch`));
      } catch {}
      try {
        logRealtimeStep("patch35_reva:force_manual_switch_before_session_update", {
          marker: PATCH_35_REV_D_REALTIME_FORCE_MANUAL_SWITCH_VERSION,
          reason,
          previous_speaker_slug: meta?.previous_speaker_slug || null,
          next_speaker_slug: meta?.target_agent_slug || null,
          target_agent_slug: meta?.target_agent_slug || null,
          room_mode: meta?.room_mode || null,
          manual_team_conversation_active: Boolean(meta?.manual_team_conversation_active),
          response_cancel_sent: responseCancelSent,
          input_audio_clear_sent: inputClearSent,
          switch_waiting_for_provider_terminal_event: true,
          loop_guard_version: PATCH_38_REALTIME_TEAM_ECHO_LOOP_GUARD_VERSION,
        });
        queueRealtimeTelemetry("patch35_reva_force_manual_switch_before_session_update", {
          marker: PATCH_35_REV_D_REALTIME_FORCE_MANUAL_SWITCH_VERSION,
          reason,
          previous_speaker_slug: meta?.previous_speaker_slug || null,
          next_speaker_slug: meta?.target_agent_slug || null,
          target_agent_slug: meta?.target_agent_slug || null,
          room_mode: meta?.room_mode || null,
          manual_team_conversation_active: Boolean(meta?.manual_team_conversation_active),
          response_cancel_sent: responseCancelSent,
          input_audio_clear_sent: inputClearSent,
          switch_waiting_for_provider_terminal_event: true,
          loop_guard_version: PATCH_38_REALTIME_TEAM_ECHO_LOOP_GUARD_VERSION,
        });
      } catch {}
      // PATCH38: response.cancel is asynchronous. Keep the response marked as
      // active and flush session.update only after response.done/cancelled.
      // Sending a voice update immediately can be rejected while audio exists.
      return false;
    }

    const sent = sendRealtimeClientEvent(dc, payload, reason);
    if (sent && manualSwitch) {
      rtcManualSwitchGateRef.current = {
        ...(rtcManualSwitchGateRef.current || {}),
        locked: true,
        phase: "SESSION_UPDATE_SENT",
        session_update_sent: true,
      };
    }
    try {
      if (force) {
        logRealtimeStep("patch35_reva:force_manual_switch_session_update_sent", {
          marker: PATCH_35_REV_D_REALTIME_FORCE_MANUAL_SWITCH_VERSION,
          reason,
          previous_speaker_slug: meta?.previous_speaker_slug || null,
          next_speaker_slug: meta?.target_agent_slug || null,
          target_agent_slug: meta?.target_agent_slug || null,
          session_update_sent: Boolean(sent),
          manual_team_conversation_active: Boolean(meta?.manual_team_conversation_active),
          room_mode: meta?.room_mode || null,
        });
        queueRealtimeTelemetry("patch35_reva_force_manual_switch_session_update_sent", {
          marker: PATCH_35_REV_D_REALTIME_FORCE_MANUAL_SWITCH_VERSION,
          reason,
          previous_speaker_slug: meta?.previous_speaker_slug || null,
          next_speaker_slug: meta?.target_agent_slug || null,
          target_agent_slug: meta?.target_agent_slug || null,
          session_update_sent: Boolean(sent),
          manual_team_conversation_active: Boolean(meta?.manual_team_conversation_active),
          room_mode: meta?.room_mode || null,
        });
      }
    } catch {}
    return sent;
  }

  function applyPatch33RevCLiveAgentSwitch({
    targetAgent = null,
    targetSlug = "orkio",
    targetName = "Orkio",
    voiceResolution = null,
    teamMode = false,
    source = "live_agent_switch",
  } = {}) {
    const safeSlug = canonicalAgentSlug(targetSlug || targetAgent?.slug || targetAgent?.key || targetAgent?.name || targetAgent?.id || "orkio") || "orkio";
    const safeName = canonicalizeSpeakerLabel(targetName || targetAgent?.name || registryCanonicalAgentDisplayNameFromSlug(safeSlug) || safeSlug);
    const dc = rtcDcRef.current;
    const readyState = String(dc?.readyState || "").trim() || null;
    const providerVoice = coerceVoiceId(
      voiceResolution?.voice ||
      rtcVoiceRef.current ||
      ORKIO_CANONICAL_VOICE_ID ||
      ORKIO_DEFAULT_VOICE_ID
    );
    const previousSpeakerSlug = canonicalAgentSlug(
      manualRealtimeRoomStateRef.current?.active_speaker_slug ||
      meetingStateRef.current?.active_speaker_slug ||
      rtcHostAgentNameRef.current ||
      activeRuntimeAgent ||
      selectedManualAgentSlugRef.current ||
      ""
    ) || "";

    const auditBase = {
      source,
      selected_agent_slug: safeSlug,
      target_agent_slug: safeSlug,
      previous_speaker_slug: previousSpeakerSlug || null,
      next_speaker_slug: safeSlug,
      target_agent_name: safeName,
      provider_voice: providerVoice || null,
      voice_source: voiceResolution?.voice_source || null,
      team_mode: Boolean(teamMode),
      manual_target_slug: teamMode ? "team" : safeSlug,
      manual_team_conversation_active: Boolean(teamMode),
      response_control: teamMode ? PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL : PATCH_32_SINGLE_AGENT_CONTROL,
      active_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
      data_channel_ready_state: readyState,
      version: PATCH_33_REV_C_LIVE_AGENT_SWITCH_RUNTIME_FIX_VERSION,
      sanitizer_version: PATCH_33_REV_B_REALTIME_PROVIDER_PAYLOAD_SANITIZER_VERSION,
      force_manual_switch_version: PATCH_35_REV_D_REALTIME_FORCE_MANUAL_SWITCH_VERSION,
    };

    try {
      if (!dc || dc.readyState !== "open") {
        const meta = {
          ...auditBase,
          agent_switch_applied: false,
          blocked_reason: "data_channel_not_open",
        };
        logRealtimeStep("patch33_revc:live_agent_switch_not_applied", meta);
        queueRealtimeTelemetry("patch33_revc_live_agent_switch_not_applied", meta);
        return false;
      }

      if (teamMode || isPatch34TeamRoomActive()) {
        updatePatch34RoomState({
          sessionId: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || "",
          activeSlug: safeSlug,
          source: "patch34_revb_provider_switching",
          phase: "SWITCHING",
          persisted: true,
        });
        try {
          logRealtimeStep("patch34_revb:provider_switching", {
            selected_agent_slug: safeSlug,
            room_mode: PATCH_34_REVB_ROOM_MODE,
            voice_update_waited_for_idle: Boolean(!rtcResponseInFlightRef.current),
            realtime_room_engine_version: PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION,
          });
        } catch {}
      }

      const sessionPatch = buildManualRealtimeSessionUpdate({
        targetAgent,
        targetSlug: safeSlug,
        targetName: safeName,
        voiceResolution: { ...(voiceResolution || {}), voice: providerVoice },
        teamMode,
      });

      const sent = sendRealtimeSessionUpdateWhenIdle({
        type: "session.update",
        session: sessionPatch,
      }, "patch33_revc_live_agent_switch_session_update", {
        previous_speaker_slug: previousSpeakerSlug || null,
        target_agent_slug: safeSlug,
        room_mode: teamMode || isPatch34TeamRoomActive() ? PATCH_34_REVB_ROOM_MODE : "",
        manual_team_conversation_active: Boolean(teamMode || isPatch34TeamRoomActive()),
      }, { force: true, manualSwitch: true });

      const applied = Boolean(sent);
      const patch34AppliedRoomState = (teamMode || isPatch34TeamRoomActive())
        ? updatePatch34RoomState({
            sessionId: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || "",
            activeSlug: safeSlug,
            source: "patch34_revb_provider_switch_applied",
            phase: applied ? "READY" : "SWITCH_PENDING",
            persisted: true,
            telemetry: false,
          })
        : null;
      const meta = {
        ...auditBase,
        agent_switch_applied: applied,
        provider_session_payload_clean: true,
        provider_session_payload_kind: "provider_session_payload",
        orkio_orchestration_context_preserved: true,
        team_runtime_state_preserved: Boolean(teamMode || patch34AppliedRoomState),
        room_mode: patch34AppliedRoomState ? PATCH_34_REVB_ROOM_MODE : null,
        room_state_persisted: patch34AppliedRoomState ? true : false,
        has_snapshot: patch34AppliedRoomState ? true : false,
        realtime_room_engine_version: patch34AppliedRoomState ? PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION : null,
      };

      if (patch34AppliedRoomState) {
        try {
          logRealtimeStep(applied ? "patch34_revb:provider_switch_applied" : "patch34_revb:provider_switch_not_applied", meta);
          queueRealtimeTelemetry(applied ? "patch34_revb_provider_switch_applied" : "patch34_revb_provider_switch_not_applied", meta);
        } catch {}
      }

      logRealtimeStep(applied ? "patch33_revc:live_agent_switch_applied" : "patch33_revc:live_agent_switch_not_applied", meta);
      queueRealtimeTelemetry(applied ? "patch33_revc_live_agent_switch_applied" : "patch33_revc_live_agent_switch_not_applied", meta);
      try { console.info("[PATCH_33_REV_C_LIVE_AGENT_SWITCH_RUNTIME_FIX]", meta); } catch {}
      return applied;
    } catch (err) {
      const meta = {
        ...auditBase,
        agent_switch_applied: false,
        blocked_reason: "exception",
        message: err?.message || null,
      };
      try { logRealtimeStep("patch33_revc:live_agent_switch_failed", meta); } catch {}
      try { queueRealtimeTelemetry("patch33_revc_live_agent_switch_failed", meta); } catch {}
      return false;
    }
  }

  function buildDestinationContract(rawMessage = "", hostAgentId = null) {
    const manualContract = buildManualAgentAuthorityContract(rawMessage, hostAgentId, { realtime: false });
    if (manualContract) return manualContract;

    const mode = ["team", "single", "multi"].includes(String(destMode || "").toLowerCase())
      ? String(destMode || "team").toLowerCase()
      : "team";
    const singleAgent = agents.find((a) => String(a.id) === String(destSingle)) || null;
    const multiIds = Array.isArray(destMulti)
      ? Array.from(new Set(destMulti.map((id) => String(id || "").trim()).filter(Boolean)))
      : [];
    const mentionedNames = extractMentionNamesFromText(rawMessage);

    // PATCH_27_MULTI_AGENT_RESPONSE_CONTROL:
    // In Team Mode, the router can return a single speaker, a sequenced group
    // ("Orion e Chris, ..."), or a team panel ("Equipe, ..."). The UI remains
    // Team; target_agent_slug/target_agent_slugs define who receives the turn(s).
    // PATCH_32: this automatic route is reached only when manual authority is not available.
    const turnRoute = !publicBetaOrkioOnly && mode === "team" ? resolveAgentTurnRouteFromMessage(rawMessage) : null;
    const routeSlugs = Array.from(new Set(
      (Array.isArray(turnRoute?.target_agent_slugs) && turnRoute.target_agent_slugs.length
        ? turnRoute.target_agent_slugs
        : [turnRoute?.target_agent_slug || turnRoute?.slug]
      )
        .map((slug) => canonicalAgentSlug(slug || ""))
        .filter(Boolean)
    ));

    const routeAgents = routeSlugs
      .map((slug) => (slug && slug !== "team" ? (findAgentByCanonicalSlug(slug) || findAgentByRuntimeIdentity(slug) || null) : null))
      .filter(Boolean);

    const primarySlug = routeSlugs[0] || "";
    const primaryAgent = routeAgents[0] || null;
    const routeNames = routeSlugs
      .map((slug) => {
        const agent = routeAgents.find((a) => canonicalAgentSlug(a?.slug || a?.key || a?.name || a?.id) === slug);
        return canonicalizeSpeakerLabel(agent?.name || registryCanonicalAgentDisplayNameFromSlug(slug) || slug);
      })
      .filter(Boolean);

    const visibleRouteName = (
      routeNames.length > 1
        ? routeNames.join(" + ")
        : (routeNames[0] || canonicalizeSpeakerLabel(primarySlug))
    );

    const requestedNames = Array.from(new Set([
      ...routeNames,
      ...(Array.isArray(mentionedNames) ? mentionedNames : []),
    ].map((name) => String(name || "").trim()).filter(Boolean)));

    if (primarySlug) {
      return {
        dest_mode: "team",
        agent_id: primaryAgent?.id || null,
        agent_ids: routeAgents.map((agent) => String(agent.id)).filter(Boolean),
        target_agent_slug: primarySlug,
        target_agent_slugs: routeSlugs,
        visible_agent: visibleRouteName,
        requested_agent_names: requestedNames,
        multi_agent_turn: Boolean(turnRoute?.multi_agent_turn || routeSlugs.length > 1),
        response_control: turnRoute?.response_control || (routeSlugs.length > 1 ? "sequenced_team_turns" : "single_turn"),
      };
    }

    return {
      dest_mode: mode,
      agent_id: hostAgentId || null,
      agent_ids: mode === "multi" ? multiIds : [],
      target_agent_slug: mode === "single" ? String(destSingle || "") : null,
      target_agent_slugs: [],
      visible_agent: mode === "single" ? String(singleAgent?.name || "") : "",
      requested_agent_names: mentionedNames,
      multi_agent_turn: false,
      response_control: mode === "multi" ? "manual_multi" : "single_turn",
    };
  }


  function normalizeAgentLookupValue(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^@+/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s\-/]+/g, "_")
      .replace(/[^a-z0-9_]+/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function canonicalAgentSlug(value = "") {
    // PATCH_23_AGENT_REGISTRY_CANONICO:
    // All canonical agent routing now delegates to src/lib/agentRegistry.js.
    // Keep this local wrapper for backward compatibility with existing
    // AppConsole call sites.
    return registryCanonicalAgentSlug(value, { allowUnknown: true });
  }

  function canonicalAgentDisplayNameFromSlug(slug = "") {
    return registryCanonicalAgentDisplayNameFromSlug(slug) || canonicalizeSpeakerLabel(slug || "");
  }

  function resolveDirectAgentAddressFromMessage(rawMessage = "") {
    // PATCH_23_AGENT_REGISTRY_CANONICO:
    // Direct addressing uses the same aliases as backend/realtime.
    return registryResolveDirectAgentAddressFromMessage(rawMessage, { includeInternal: !publicBetaOrkioOnly });
  }

  function resolveAgentTurnRouteFromMessage(rawMessage = "") {
    // PATCH_27_MULTI_AGENT_RESPONSE_CONTROL:
    // Returns direct single-agent routes plus sequenced multi-agent/team panel routes.
    return registryResolveAgentTurnRouteFromMessage(rawMessage, { includeInternal: !publicBetaOrkioOnly });
  }

  function findAgentByRuntimeIdentity(value = "") {
    const registryMatch = registryFindAgentByCanonicalSlug(agents || [], value);
    if (registryMatch) return registryMatch;

    const wantedRaw = normalizeAgentLookupValue(value);
    const wantedSlug = canonicalAgentSlug(value);
    if (!wantedRaw && !wantedSlug) return null;

    return (agents || []).find((a) => {
      const candidates = [
        a?.id,
        a?.name,
        a?.slug,
        a?.key,
        a?.code,
        a?.agent_id,
        a?.agent_slug,
      ].map((v) => normalizeAgentLookupValue(v)).filter(Boolean);

      const canonicalCandidates = candidates.map((v) => canonicalAgentSlug(v)).filter(Boolean);
      return candidates.includes(wantedRaw) || canonicalCandidates.includes(wantedSlug);
    }) || null;
  }

  function resolveHostAgentId(modeOverride = null) {
    // ORKIO_AO60F_REALTIME_ORKIO_ONLY_IDENTITY_GUARD
    const namedOrkio =
      findAgentByRuntimeIdentity("orkio") ||
      agents.find((a) => (a?.name || "").toLowerCase() === "orkio") ||
      agents.find((a) => (a?.slug || "").toLowerCase() === "orkio") ||
      agents.find((a) => (a?.key || "").toLowerCase() === "orkio") ||
      null;
    const fallbackAgent = namedOrkio || agents.find((a) => a?.is_default) || agents[0] || null;
    if (publicBetaOrkioOnly) {
      return namedOrkio?.id || null;
    }

    const mode = String(modeOverride || destMode || "team").trim().toLowerCase();

    if (mode === "single") {
      const selected = findAgentByRuntimeIdentity(destSingle);
      return selected?.id || destSingle || fallbackAgent?.id || null;
    }

    if (mode === "multi") {
      const selected = (destMulti || [])
        .map((id) => findAgentByRuntimeIdentity(id))
        .filter(Boolean);
      if (selected.length === 1) {
        return selected[0]?.id || fallbackAgent?.id || null;
      }
      return fallbackAgent?.id || null;
    }

    return fallbackAgent?.id || null;
  }

  function resolveRealtimeAgentId(modeOverride = null) {
    // Realtime must honor the selected visible agent. The text chat may default
    // to Team, but voice cannot ignore a user-selected specialist.
    if (publicBetaOrkioOnly) return resolveHostAgentId(modeOverride);

    const mode = String(modeOverride || destMode || "team").trim().toLowerCase();

    if (mode === "single") {
      const selected = findAgentByRuntimeIdentity(destSingle);
      if (selected?.id) return selected.id;
    }

    if (mode === "multi") {
      const selected = (destMulti || [])
        .map((id) => findAgentByRuntimeIdentity(id))
        .filter(Boolean);
      if (selected.length === 1 && selected[0]?.id) return selected[0].id;
    }

    // Defensive fallback: if a single agent was selected/stored but destMode drifted
    // back to Team after PWA refresh, keep the selected specialist for Realtime.
    const singleFallback = findAgentByRuntimeIdentity(destSingle);
    if (singleFallback?.id && canonicalAgentSlug(singleFallback?.name || singleFallback?.slug || singleFallback?.id) !== "team") {
      return singleFallback.id;
    }

    const multiFallback = (destMulti || [])
      .map((id) => findAgentByRuntimeIdentity(id))
      .filter(Boolean);
    if (multiFallback.length === 1 && multiFallback[0]?.id) return multiFallback[0].id;

    // Admin safety: if Orion was the last selected single agent in local/PWA state,
    // keep him as the Realtime host even if the visual mode briefly says Team.
    try {
      const storedSingle = String(readPwaMobileDestinationState()?.single || window.localStorage?.getItem("orkio_last_dest_single") || "").trim();
      const storedAgent = findAgentByRuntimeIdentity(storedSingle);
      if (storedAgent?.id && canonicalAgentSlug(storedAgent?.name || storedAgent?.slug || storedAgent?.id) === "orion") {
        return storedAgent.id;
      }
    } catch {}

    return resolveHostAgentId(modeOverride);
  }

  function buildRealtimeAgentInstructions(agentObj = null) {
    const lookup = agentObj?.slug || agentObj?.key || agentObj?.name || agentObj?.id || "orkio";
    const base = registryBuildCanonicalRealtimeAgentInstructions(lookup, {
      fallbackSlug: "orkio",
      includeKnownAgents: true,
    });
    const preference = buildProfileAddressPreferenceInstruction(user, typeof window !== "undefined" ? window.localStorage : null);
    return [base, preference].filter(Boolean).join("\n\n");
  }


  // EFATA777_V3 — realtime/selector guardrails.
  function findAgentByCanonicalSlug(slug = "") {
    const wanted = canonicalAgentSlug(slug);
    if (!wanted) return null;
    return (agents || []).find((agent) => {
      const candidates = [
        agent?.id,
        agent?.name,
        agent?.slug,
        agent?.key,
        agent?.code,
        agent?.agent_id,
        agent?.agent_slug,
      ].map((value) => canonicalAgentSlug(value)).filter(Boolean);
      return candidates.includes(wanted);
    }) || null;
  }

  function persistDestinationState(next = {}) {
    if (typeof window === "undefined") return;
    try {
      if (next.mode) window.localStorage?.setItem("orkio_last_dest_mode", String(next.mode));
      if ("single" in next) {
        if (next.single) window.localStorage?.setItem("orkio_last_dest_single", String(next.single));
        else window.localStorage?.removeItem("orkio_last_dest_single");
      }
      if ("multi" in next) {
        const clean = Array.isArray(next.multi) ? next.multi.map((v) => String(v || "").trim()).filter(Boolean) : [];
        window.localStorage?.setItem("orkio_last_dest_multi", JSON.stringify(clean));
      }
      if ("manual_target_slug" in next || "manual_slug" in next) {
        const manualSlug = normalizeManualAuthoritySlug(next.manual_target_slug || next.manual_slug || "", "");
        if (manualSlug) window.localStorage?.setItem("orkio_manual_authority_slug", manualSlug);
      }
    } catch {}
    try { persistPwaMobileDestinationState(next); } catch {}
  }

  function selectSingleAgentForRuntime(agentIdOrSlug = "", source = "ui") {
    const agent =
      findAgentByRuntimeIdentity(agentIdOrSlug) ||
      findAgentByCanonicalSlug(agentIdOrSlug) ||
      null;
    const nextId = String(agent?.id || agentIdOrSlug || "").trim();
    if (!nextId) return false;

    const nextSlug = canonicalAgentSlug(agent?.slug || agent?.key || agent?.name || agent?.id || agentIdOrSlug || nextId) || "orkio";
    const nextName = canonicalizeSpeakerLabel(agent?.name || registryCanonicalAgentDisplayNameFromSlug(nextSlug) || nextSlug);

    setManualAuthoritySlug(nextSlug, source || PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE);
    setDestMode("single");
    setDestSingle(nextId);
    setDestMulti([]);
    setActiveRuntimeAgent(nextName);
    setRuntimeHandoffLabel(`Controle manual: ${nextName}.`);
    persistDestinationState({ mode: "single", single: nextId, multi: [], manual_target_slug: nextSlug, manual_slug: nextSlug });

    try {
      logRealtimeStep("destination:single_agent_selected", {
        source,
        agent_id: nextId,
        agent_name: agent?.name || nextName || null,
        manual_target_slug: nextSlug,
        manual_sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
      });
    } catch {}

    return true;
  }

  function selectRealtimeTeamSpeakerForRuntime(agentIdOrSlug = "", source = "runtime_turn") {
    const agent =
      findAgentByRuntimeIdentity(agentIdOrSlug) ||
      findAgentByCanonicalSlug(agentIdOrSlug) ||
      null;
    const nextId = String(agent?.id || agentIdOrSlug || "").trim();
    if (!nextId) return false;

    // PATCH_22_DIRECT_AGENT_ADDRESSING:
    // Keep the console as a Team room, while the addressed agent becomes the
    // active speaker for this realtime turn. This prevents Orkio from acting as
    // a visible intermediary and avoids collapsing the UI into Single mode.
    setDestMode("team");
    setDestSingle("");
    setDestMulti([]);
    persistDestinationState({ mode: "team", single: "", multi: [] });

    try {
      const voiceResolution = resolveAgentVoiceResolution(agent || { name: agentIdOrSlug });
      const resolvedVoice = voiceResolution.voice;
      if (resolvedVoice) {
        rtcVoiceRef.current = resolvedVoice;
      }
      logRealtimeStep("destination:team_speaker_selected", {
        source,
        agent_id: nextId,
        agent_name: agent?.name || null,
        dest_mode: "team",
        voice_id: resolvedVoice || null,
        voice_source: voiceResolution.voice_source,
        voice_authority: "PATCH_31_REV_A_CANONICAL_VOICE_PRECEDENCE",
      });
    } catch {}

    return true;
  }

  function promoteManualTeamParticipantToRealtime(agentIdOrSlug = "", source = "quick_team_participant_button") {
    const targetAgent =
      findAgentByRuntimeIdentity(agentIdOrSlug) ||
      findAgentByCanonicalSlug(agentIdOrSlug) ||
      findAgentByCanonicalSlug("orkio") ||
      null;

    if (!targetAgent?.id) {
      try {
        logRealtimeStep("patch33_team:participant_missing", {
          source,
          requested: agentIdOrSlug || null,
          version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
        });
      } catch {}
      return false;
    }

    const targetSlug = canonicalAgentSlug(targetAgent?.slug || targetAgent?.key || targetAgent?.name || targetAgent?.id || "orkio") || "orkio";
    const targetName = canonicalizeSpeakerLabel(targetAgent?.name || registryCanonicalAgentDisplayNameFromSlug(targetSlug) || targetSlug);
    const roomState = setManualTeamConversationRoomState({
      focusSlug: targetSlug,
      selectedVisualSlug: targetSlug,
      source,
      activate: true,
    });

    try {
      rtcHostAgentIdRef.current = targetAgent.id;
      rtcHostAgentNameRef.current = targetName;
      const voiceResolution = resolveAgentVoiceResolution(targetAgent);
      if (voiceResolution?.voice) rtcVoiceRef.current = voiceResolution.voice;

      applyPatch33RevCLiveAgentSwitch({
        targetAgent,
        targetSlug,
        targetName,
        voiceResolution,
        teamMode: true,
        source: "patch33_team_participant_session_update",
      });

      setActiveRuntimeAgent(targetName);
      setRuntimeHandoffLabel(`Team: ${targetName} incluído no próximo turno.`);
      queueRealtimeTelemetry("patch33_team_participant_promoted", {
        source,
        selected_agent_slug: targetSlug,
        selected_agent_id: targetAgent.id,
        selected_agent_name: targetName,
        target_agent_slug: targetSlug,
        target_agent_slugs: roomState.queue,
        manual_target_slug: "team",
        manual_agent_lock: true,
        manual_team_conversation_active: true,
        manual_team_focus_slug: targetSlug,
        manual_team_turn_queue: roomState.queue,
        manual_team_turn_index: manualTeamConversationTurnIndexRef.current || 0,
        multi_agent_turn: true,
        response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
        team_conversation_mode: PATCH_33_TEAM_CONVERSATION_MODE,
        team_conversation_orchestrator_version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      team_conversation_staging_verification_version: PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION,
        live_agent_switch_runtime_fix_version: PATCH_33_REV_C_LIVE_AGENT_SWITCH_RUNTIME_FIX_VERSION,
        agent_switch_applied: Boolean(rtcDcRef.current?.readyState === "open"),
        provider_voice: voiceResolution?.voice || null,
        voice_source: voiceResolution?.voice_source || null,
      });
      logRealtimeStep("patch33_team:participant_promoted", {
        source,
        selected_agent_slug: targetSlug,
        selected_agent_name: targetName,
        turn_queue: roomState.queue,
        response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
        version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      });
      return true;
    } catch (err) {
      try {
        logRealtimeStep("patch33_team:participant_promote_failed", {
          source,
          requested: agentIdOrSlug || null,
          message: err?.message || null,
          version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
        });
      } catch {}
      return false;
    }
  }

  function applyManualAgentSelectionToRealtime(agentIdOrSlug = "", source = "manual_agent_button") {
    if (!realtimeModeRef.current) return false;

    const targetAgent =
      findAgentByRuntimeIdentity(agentIdOrSlug) ||
      findAgentByCanonicalSlug(agentIdOrSlug) ||
      findAgentByCanonicalSlug("orkio") ||
      null;

    if (!targetAgent?.id) {
      try {
        logRealtimeStep("patch32_manual:realtime_selection_missing_agent", {
          source,
          requested: agentIdOrSlug || null,
          version: PATCH_32_MANUAL_AGENT_AUTHORITY_VERSION,
        });
      } catch {}
      return false;
    }

    const targetSlug = canonicalAgentSlug(targetAgent?.slug || targetAgent?.key || targetAgent?.name || targetAgent?.id || "orkio") || "orkio";
    setManualAuthoritySlug(targetSlug, source || PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE);
    const targetName = canonicalizeSpeakerLabel(targetAgent?.name || registryCanonicalAgentDisplayNameFromSlug(targetSlug) || targetSlug);

    try {
      rtcHostAgentIdRef.current = targetAgent.id;
      rtcHostAgentNameRef.current = targetName || targetAgent.name || targetSlug;
      const voiceResolution = resolveAgentVoiceResolution(targetAgent);
      if (voiceResolution?.voice) {
        rtcVoiceRef.current = voiceResolution.voice;
      }

      applyPatch33RevCLiveAgentSwitch({
        targetAgent,
        targetSlug,
        targetName,
        voiceResolution,
        teamMode: false,
        source: "patch32_predeploy_manual_agent_session_voice_sync",
      });

      setActiveRuntimeAgent(targetName);
      setRuntimeHandoffLabel(`Controle manual: ${targetName}.`);
      queueRealtimeTelemetry("manual_agent_authority_selected", {
        source,
        selected_agent_slug: targetSlug,
        selected_agent_id: targetAgent.id,
        selected_agent_name: targetName,
        provider_voice: voiceResolution?.voice || null,
        voice_source: voiceResolution?.voice_source || null,
        session_voice_sync_version: PATCH_32_PREDEPLOY_PREMIUM_VERSION,
        manual_agent_lock: true,
        manual_target_slug: targetSlug,
        manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        live_agent_switch_runtime_fix_version: PATCH_33_REV_C_LIVE_AGENT_SWITCH_RUNTIME_FIX_VERSION,
        agent_switch_applied: Boolean(rtcDcRef.current?.readyState === "open"),
      });
      logRealtimeStep("patch32_revc:manual_authority_selected", {
        source,
        manual_target_slug: targetSlug,
        active_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
        event_session_id: rtcSessionIdRef.current || null,
        selected_agent_slug: targetSlug,
        selected_agent_id: targetAgent.id,
        selected_agent_name: targetName,
        provider_voice: voiceResolution?.voice || null,
        voice_source: voiceResolution?.voice_source || null,
        session_voice_sync_version: PATCH_32_PREDEPLOY_PREMIUM_VERSION,
        manual_agent_lock: true,
        manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
      });
      return true;
    } catch (err) {
      try {
        logRealtimeStep("patch32_manual:realtime_selection_failed", {
          source,
          requested: agentIdOrSlug || null,
          message: err?.message || null,
          version: PATCH_32_MANUAL_AGENT_AUTHORITY_VERSION,
        });
      } catch {}
      return false;
    }
  }

  function applyManualTeamSelectionToRealtime(source = "manual_team_button") {
    setManualTeamConversationRoomState({ focusSlug: "orkio", selectedVisualSlug: "team", source: source || PATCH_33_TEAM_CONVERSATION_SOURCE, activate: true });
    setManualAuthoritySlug("team", source || PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE, { preserveTeamConversation: true, focusSlug: "orkio", turnQueue: resolveManualTeamPanelSlugs() });
    setActiveRuntimeAgent("Team");
    setRuntimeHandoffLabel("Controle manual: Team.");
    if (!realtimeModeRef.current) return false;
    const orkioAgent = findAgentByCanonicalSlug("orkio") || findAgentByRuntimeIdentity("orkio") || null;
    if (!orkioAgent?.id) return false;

    try {
      rtcHostAgentIdRef.current = orkioAgent.id;
      rtcHostAgentNameRef.current = "Orkio";
      const voiceResolution = resolveAgentVoiceResolution(orkioAgent);
      if (voiceResolution?.voice) rtcVoiceRef.current = voiceResolution.voice;

      applyPatch33RevCLiveAgentSwitch({
        targetAgent: orkioAgent,
        targetSlug: "orkio",
        targetName: "Orkio",
        voiceResolution,
        teamMode: true,
        source: "patch32_predeploy_manual_team_session_voice_sync",
      });

      setActiveRuntimeAgent("Team");
      setRuntimeHandoffLabel("Controle manual: Team.");
      queueRealtimeTelemetry("manual_agent_authority_selected", {
        source,
        selected_agent_slug: "team",
        realtime_voice_agent_slug: "orkio",
        provider_voice: voiceResolution?.voice || null,
        voice_source: voiceResolution?.voice_source || null,
        session_voice_sync_version: PATCH_32_PREDEPLOY_PREMIUM_VERSION,
        manual_agent_lock: true,
        manual_target_slug: "team",
        manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        manual_team_panel_required: true,
        manual_team_panel_order: resolveManualTeamPanelSlugs(),
        team_panel_version: PATCH_32_REV_D_TEAM_PANEL_VERSION,
        manual_team_conversation_active: true,
        manual_team_focus_slug: "orkio",
        manual_team_turn_queue: getManualTeamConversationTurnQueue("orkio"),
        manual_team_turn_index: manualTeamConversationTurnIndexRef.current || 0,
        multi_agent_turn: true,
        response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
        team_conversation_mode: PATCH_33_TEAM_CONVERSATION_MODE,
        team_conversation_orchestrator_version: PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION,
      team_conversation_staging_verification_version: PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION,
      });
      return true;
    } catch {
      return false;
    }
  }

  function isRealtimeOrionHandoffIntent(rawText = "") {
    const normalized = normalizeAgentLookupValue(rawText);
    if (!normalized) return false;
    return (
      normalized.includes("orion") ||
      normalized.includes("oria") ||
      normalized.includes("orlan") ||
      normalized.includes("auria") ||
      normalized.includes("aurya") ||
      normalized.includes("arian") ||
      normalized.includes("aryan") ||
      normalized.includes("warren") ||
      normalized.includes("cto")
    );
  }

  function resolveRealtimeHandoffTargetFromTranscript(rawText = "") {
    if (!canAccessAdmin) return null;
    const textValue = String(rawText || "");
    if (!textValue.trim()) return null;

    const normalized = textValue
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const compact = normalizeAgentLookupValue(textValue);

    const hasActionVerb = /\b(chame|chamar|inclua|incluir|traga|trazer|aciona|acionar|passa|passar|assuma|assumir|conversa|diagnostic|escuta|online|ouvindo|falar|fala|quero falar|volta|retorna|retornar|troca|trocar)\b/iu.test(normalized);

    const directAddress = (pattern) => (
      new RegExp(`(^|\\b)(oi|ol[aá]|hey|e ai|fala|escuta)?\\s*${pattern}\\b`, "iu").test(normalized) ||
      new RegExp(`\\b${pattern}\\s*(,|!|\\?|\\s+(ta|est[aá]|pode|por favor|me|nos|vem|entra|assume|assuma|online|ouvindo|escuta))`, "iu").test(normalized)
    );

    const wantsChrisName = (
      /\b(chris|cris|criz|crys|crista|cristo|cruz|c\s*[- ]?\s*h\s*[- ]?\s*r\s*[- ]?\s*i\s*[- ]?\s*s|cfo|financeir|valuation|capta[cç][aã]o)\b/iu.test(normalized) ||
      compact.includes("chris") ||
      compact.includes("c_h_r_i_s")
    );

    const wantsOrionName = (
      /\b(orion|oria|orlan|auria|aurya|arian|aryan|warren|cto|t[eé]cnico|diagn[oó]stico)\b/iu.test(normalized) ||
      isRealtimeOrionHandoffIntent(textValue)
    );

    const wantsLauraName = (
      /\b(laura|comunicacao|comunica[cç][aã]o|narrativa|storytelling|pitch|investidor(?:es)?)\b/iu.test(normalized) ||
      compact.includes("laura")
    );

    const wantsOrkioName = (
      /\b(orkio|orquio|archio|workio|workq|copiloto)\b/iu.test(normalized) ||
      compact.includes("orkio") ||
      compact.includes("orquio") ||
      compact.includes("archio")
    );

    const wantsTeamName = /\b(team|time|equipe|todos|sala|war room|reuni[aã]o)\b/iu.test(normalized);

    if (wantsChrisName && (hasActionVerb || directAddress("(chris|cris|criz|crys|crista|cristo|cruz|c\\s*[- ]?\\s*h\\s*[- ]?\\s*r\\s*[- ]?\\s*i\\s*[- ]?\\s*s)"))) return "chris";
    if (wantsOrionName && (hasActionVerb || directAddress("(orion|oria|orlan|auria|aurya|arian|aryan|warren|cto)"))) return "orion";
    if (wantsLauraName && (hasActionVerb || directAddress("(laura)"))) return "laura";
    if (wantsOrkioName && (hasActionVerb || directAddress("(orkio|orquio|archio|workio|workq)"))) return "orkio";
    if (wantsTeamName && (hasActionVerb || directAddress("(team|time|equipe)"))) return "team";

    return null;
  }

  function maybeApplyRealtimeAgentHandoffFromTranscript(rawText = "", source = "transcript") {
    if (isManualAgentAuthorityLocked()) {
      try {
        logRealtimeStep("patch32_revc:manual_authority_auto_handoff_ignored", {
          source,
          active_dest_mode: destMode,
          manual_target_slug: getManualAuthoritySlug(),
          selected_agent_slug: getManualAuthoritySlug(),
          transcript: String(rawText || "").slice(0, 180),
          manual_agent_lock: true,
          active_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
          manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
          version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        });
        queueRealtimeTelemetry("patch32_revc_manual_authority_auto_handoff_ignored", {
          source,
          active_dest_mode: destMode,
          manual_target_slug: getManualAuthoritySlug(),
          selected_agent_slug: getManualAuthoritySlug(),
          manual_agent_lock: true,
          active_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
          manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        });
      } catch {}
      return false;
    }

    const targetSlug = resolveRealtimeHandoffTargetFromTranscript(rawText);
    if (!targetSlug) return false;

    const targetAgent = findAgentByCanonicalSlug(targetSlug) || findAgentByRuntimeIdentity(targetSlug);
    if (!targetAgent?.id) {
      try {
        logRealtimeStep("realtime:agent_handoff_skipped_missing_agent", {
          source,
          targetSlug,
          transcript: String(rawText || "").slice(0, 180),
        });
      } catch {}
      return false;
    }

    const targetName = canonicalizeSpeakerLabel(targetAgent.name || targetSlug);
    rtcHostAgentIdRef.current = targetAgent.id;
    rtcHostAgentNameRef.current = String(targetName || targetAgent.name || targetSlug).trim() || targetName || targetSlug;
    selectRealtimeTeamSpeakerForRuntime(targetAgent.id, `realtime_${source}`);

    const dc = rtcDcRef.current;
    if (dc?.readyState === "open") {
      try {
        sendRealtimeSessionUpdateWhenIdle({
          type: "session.update",
          session: {
            type: "realtime",
            instructions: buildRealtimeAgentInstructions(targetAgent),
          },
        }, `${targetSlug}_handoff_session_update`, {
          target_agent_slug: targetSlug,
          room_mode: isPatch34TeamRoomActive() ? PATCH_34_REVB_ROOM_MODE : "",
        });

        // EFATA777 V8:
        // Do not fire response.create inside the handoff helper.
        // The transcript handler will call triggerRealtimeResponse exactly once
        // after guard checks. This prevents duplicate answers and the old agent
        // speaking before the updated speaker instructions are applied.
        try {
          queueRealtimeTelemetry("agent_handoff_session_updated", {
            target_slug: targetSlug,
            agent_id: targetAgent.id,
            agent_name: rtcHostAgentNameRef.current,
            source,
          });
        } catch {}
      } catch (err) {
        logRealtimeStep("realtime:agent_handoff_session_update_failed", {
          source,
          targetSlug,
          message: err?.message || null,
        });
      }
    }

    try {
      setActiveRuntimeAgent(rtcHostAgentNameRef.current);
      setRuntimeHandoffLabel(`Realtime direcionado para ${rtcHostAgentNameRef.current}.`);
      setUploadStatus(`🛰️ ${rtcHostAgentNameRef.current} selecionado para assumir o Realtime.`);
      setTimeout(() => setUploadStatus(""), 2200);
    } catch {}

    try {
      logRealtimeStep("realtime:agent_handoff_applied", {
        source,
        target_slug: targetSlug,
        agent_id: targetAgent.id,
        agent_name: rtcHostAgentNameRef.current,
      });
    } catch {}

    return true;
  }

  function resolveRealtimeThreadId() {
    const messageThreadId = String(messagesThreadIdRef.current || "").trim();
    const activeId = String(activeThreadIdRef.current || "").trim();
    const stateId = String(threadId || "").trim();
    const requestedId = String(requestedThreadIdRef.current || "").trim();
    const storedId = String(readStoredThreadId() || "").trim();
    const knownThreadIds = new Set((threadsRef.current || []).map((t) => String(t?.id || "").trim()).filter(Boolean));
    const hasVisibleMessages = Array.isArray(messagesRef.current) && messagesRef.current.length > 0;

    // If the visible message panel already belongs to a loaded thread, it is the safest
    // source for Realtime. This prevents Realtime from creating/promoting to a fresh
    // thread while the user is looking at another conversation.
    if (hasVisibleMessages && messageThreadId) return messageThreadId;

    for (const candidate of [activeId, stateId, requestedId, storedId]) {
      if (!candidate) continue;
      if (!knownThreadIds.size || knownThreadIds.has(candidate)) return candidate;
    }

    return activeId || stateId || requestedId || storedId || "";
  }

  function appendToPlaceholder(delta) {
    if (!delta) return;

    setMessages((prev) => {
      const messages = Array.isArray(prev) ? [...prev] : [];

      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];

        if (
          m?.role === "assistant" &&
          String(m?.id || "").startsWith("tmp-ass-")
        ) {
          const oldContent =
            m.content === "⌛ Preparando resposta..."
              ? ""
              : (m.content || "");

          messages[i] = {
            ...m,
            content: oldContent + delta,
          };

          return messages;
        }
      }

      messages.push({
        id: `tmp-ass-${Date.now()}`,
        role: "assistant",
        content: delta,
        agent_name: rtcHostAgentNameRef.current || "Orkio",
        created_at: Math.floor(Date.now() / 1000),
      });

      return messages;
    });
  }

  function clearTmpAssistantDrafts() {
    setMessages((prev) => (Array.isArray(prev)
      ? prev.filter((m) => !String(m?.id || "").startsWith("tmp-ass-"))
      : []));
  }

  function normalizeMessageCreatedAtSeconds(message = {}) {
    const candidates = [
      message?.created_at,
      message?.createdAt,
      message?.created_at_ts,
      message?.createdAtTs,
      message?.timestamp,
      message?.ts,
    ];

    for (const raw of candidates) {
      if (raw === null || raw === undefined || raw === "") continue;

      if (typeof raw === "number" || /^\d+(\.\d+)?$/.test(String(raw).trim())) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) continue;
        // Backend and local optimistic messages may disagree between seconds and ms.
        // Normalize both to seconds before comparing with turnStartedAt.
        if (n > 100000000000) return Math.floor(n / 1000);
        if (n > 10000000000) return Math.floor(n / 1000);
        return Math.floor(n);
      }

      const parsed = Date.parse(String(raw));
      if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed / 1000);
    }

    return 0;
  }

  function hasPersistedAssistantForTurn(freshMessages, turnStartedAt) {
    const list = Array.isArray(freshMessages) ? freshMessages : [];
    const startedAt = normalizeMessageCreatedAtSeconds({ created_at: turnStartedAt });
    const threshold = Math.max(0, Number(startedAt || 0) - 2);

    return list.some((m) => {
      if (m?.role !== "assistant") return false;
      if (String(m?.id || "").startsWith("tmp-ass-")) return false;

      const createdAt = normalizeMessageCreatedAtSeconds(m);
      if (!createdAt) return false;

      return createdAt >= threshold;
    });
  }

  function resolveDoneFinalText(payload = {}, draftText = "") {
    const finalText = String(
      extractAssistantVisibleTextFromPayload(payload) ||
      draftText ||
      ""
    ).trim();

    if (finalText) return sanitizePublicBetaAssistantText(finalText);
    if (payload?.assistant_persisted) {
      return "Resposta concluída no backend. Sincronizando histórico...";
    }
    return "";
  }

  
  function fillPremiumPrompt(promptText) {
    const next = String(promptText || "").trim();
    if (!next) return;
    setText(next);
    try { window.requestAnimationFrame(() => textareaRef.current?.focus?.()); } catch {}
  }

  function handlePremiumPrimaryAction() { void sendMessage("Orkio, me ajuda a montar um plano de testes para liberar a plataforma para 5 usuários beta?"); }

  function handlePremiumSecondaryAction() {
    if (publicBetaOrkioOnly) {
      fillPremiumPrompt("Orkio, mapeie a oportunidade de maior impacto e menor risco para esta fase do meu negócio.");
      return;
    }
    fillPremiumPrompt("@Team mapeiem a oportunidade de maior impacto e menor risco para esta fase da plataforma.");
    try { setUploadStatus("Revise o pedido antes de acionar o Team. O modo multiagente está em estabilização."); setTimeout(() => setUploadStatus(""), 4200); } catch {}
  }

  function handlePremiumTertiaryAction() { fillPremiumPrompt("Orkio, organize um plano prático para eu testar a plataforma hoje com foco em impacto real e baixo risco."); }

  // AO69C-HF1: Smart Actions Interaction Governance.
  // Only one action can be consumed at a time. Conversational actions use the
  // audited sendMessage rail; "test another use case" only focuses the composer.
  async function handleSmartNextAction(action, context = {}) {
    const actionId = String(action?.id || "").trim();
    const behavior = String(action?.behavior || "send-prompt").trim();
    const messageId = String(context?.messageId || "").trim();
    const prompt = String(action?.prompt || "").trim();

    if (!actionId || !messageId || sendingRef.current || smartActionLockRef.current) return;

    smartActionLockRef.current = true;

    if (behavior === "focus-composer") {
      setSmartActionInteraction({
        messageId,
        actionId,
        phase: "consumed",
      });
      try {
        window.requestAnimationFrame(() => textareaRef.current?.focus?.());
      } catch {
        textareaRef.current?.focus?.();
      } finally {
        smartActionLockRef.current = false;
      }
      return;
    }

    if (!prompt) {
      smartActionLockRef.current = false;
      return;
    }

    setSmartActionInteraction({
      messageId,
      actionId,
      phase: "sending",
    });

    try {
      const delivered = await sendMessage(prompt, { smartAction: true });
      setSmartActionInteraction(
        delivered
          ? { messageId, actionId, phase: "consumed" }
          : { messageId: "", actionId: "", phase: "idle" }
      );
    } catch {
      setSmartActionInteraction({ messageId: "", actionId: "", phase: "idle" });
    } finally {
      smartActionLockRef.current = false;
    }
  }

function openPatchApprovalModal(message) {
    const meta = extractPatchGovernanceMeta(message?.content || "");
    if (!meta?.can_approve) return;
    setPatchApprovalError("");
    setPatchApprovalPassword("");
    setPatchApprovalModal({
      message_id: message?.id || null,
      thread_id: message?.thread_id || activeThreadIdRef.current || threadId || "",
      audit_receipt_id: meta.audit_receipt_id,
    });
  }

  async function submitPatchApproval() {
    const modal = patchApprovalModal || {};
    const approvalThreadId = String(modal.thread_id || activeThreadIdRef.current || threadId || "").trim();
    const password = String(patchApprovalPassword || "");
    if (!approvalThreadId) {
      setPatchApprovalError("Thread não encontrada para aprovação.");
      return;
    }
    if (!password) {
      setPatchApprovalError("Digite sua senha para confirmar.");
      return;
    }
    setPatchApprovalBusy(true);
    setPatchApprovalError("");
    try {
      const { data } = await apiFetch("/api/governance/approve-patch", {
        method: "POST",
        token,
        org: tenant,
        body: {
          thread_id: approvalThreadId,
          audit_receipt_id: modal.audit_receipt_id || undefined,
          password,
          auto_execute: false,
        },
      });
      const responseText = String(data?.message || "PATCH APPROVAL RESPONSE\n\n- status: approval_registered").trim();
      setMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: `patch-approval-${Date.now()}`,
          role: "assistant",
          content: responseText,
          agent_name: canSeeInternalOrionSpeaker() ? "Orion" : "Orkio",
          agent_id: canSeeInternalOrionSpeaker() ? "orion" : "orkio",
          created_at: Math.floor(Date.now() / 1000),
        },
      ]);
      setPatchApprovalModal(null);
      setPatchApprovalPassword("");
      try { await loadMessages(approvalThreadId, { force: true, allowInactive: true, finalizeTurn: true }); } catch {}
    } catch (err) {
      setPatchApprovalError(err?.message || "Falha ao aprovar patch.");
    } finally {
      setPatchApprovalBusy(false);
    }
  }

  async function executeApprovedPatchFromMessage(message) {
    const approvalMeta = extractPatchApprovalMeta(message?.content || "");
    const approvalThreadId = String(message?.thread_id || activeThreadIdRef.current || threadId || "").trim();
    if (!approvalMeta?.can_execute || !approvalThreadId) return;
    try {
      setUploadStatus("⌛ Executando fluxo governado aprovado...");
      const { data } = await apiFetch("/api/governance/execute-approved-patch", {
        method: "POST",
        token,
        org: tenant,
        body: {
          thread_id: approvalThreadId,
          audit_receipt_id: approvalMeta.audit_receipt_id || undefined,
          dry_run: false,
        },
      });
      const responseText = String(data?.message || "GOVERNED PATCH EXECUTION RESPONSE\n\n- status: execution_request_finished").trim();
      setMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: `patch-exec-${Date.now()}`,
          role: "assistant",
          content: responseText,
          agent_name: canSeeInternalOrionSpeaker() ? "Orion" : "Orkio",
          agent_id: canSeeInternalOrionSpeaker() ? "orion" : "orkio",
          created_at: Math.floor(Date.now() / 1000),
        },
      ]);
      try { await loadMessages(approvalThreadId, { force: true, allowInactive: true, finalizeTurn: true }); } catch {}
    } catch (err) {
      const responseText = `GOVERNED PATCH EXECUTION RESPONSE\n\n- status: execution_request_failed\n- detail: ${String(err?.message || "falha desconhecida")}`;
      setMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: `patch-exec-error-${Date.now()}`,
          role: "assistant",
          content: responseText,
          agent_name: canSeeInternalOrionSpeaker() ? "Orion" : "Orkio",
          agent_id: canSeeInternalOrionSpeaker() ? "orion" : "orkio",
          created_at: Math.floor(Date.now() / 1000),
        },
      ]);
    } finally {
      setUploadStatus("");
      setSending(false);
      sendingRef.current = false;
    }
  }


async function sendMessage(presetMsg = null, opts = {}) {
    const isRetry = !!opts?.isRetry;
    clearRealtimeIdleFollowup();
    const rawMsg = ((presetMsg ?? text) || "").trim();
    const isolatePromptContextForThisSend = shouldIsolatePromptContextForSend(opts);
    const msg = isolatePromptContextForThisSend
      ? stripInternalRuntimeEnvelope(rawMsg)
      : rawMsg;
    if (!msg || sendingRef.current) return false;
    if (
      threadId &&
      String(cleanNewThreadIdRef.current || "") === String(threadId || "")
    ) {
      cleanNewThreadIdRef.current = "";
      newConversationQuietUntilRef.current = 0;
    }

    const pendingApprovedExecution = findPendingApprovedPatchExecution(messagesRef.current || messages);
    if (pendingApprovedExecution) {
      const guidance = buildPendingExecutionGuidance();
      setText("");
      setUploadStatus("⚠️ Execução aprovada pendente — use o botão governado.");
      setMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: `patch-execution-pending-${Date.now()}`,
          role: "assistant",
          content: guidance,
          agent_name: canSeeInternalOrionSpeaker() ? "Orion" : "Orkio",
          agent_id: canSeeInternalOrionSpeaker() ? "orion" : "orkio",
          created_at: Math.floor(Date.now() / 1000),
        },
      ]);
      try {
        const target = pendingApprovedExecution?.message;
        if (target) setTimeout(() => {
          try {
            document.querySelector('[data-patch-execute-button="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
          } catch {}
        }, 80);
      } catch {}
      return false;
    }

    const turnStartedAt = Math.floor(Date.now() / 1000);
    sendingRef.current = true;
    setSending(true);

    // STREAM-STAB: start new run and abort any previous stream
    streamRunRef.current += 1;
    const myRun = streamRunRef.current;
    try { streamCtlRef.current?.abort(); } catch {}
    const ctl = new AbortController();
    streamCtlRef.current = ctl;
    const isStale = () => (myRun !== streamRunRef.current || ctl.signal.aborted);

    // UX: show progress while waiting
    try { setUploadStatus('⌛ Gerando resposta...'); } catch {}

    // AO20K-HF4G_FRONTEND_STREAM_TERMINAL_GUARD
    // Estes ids precisam existir também nos catches/finally. Antes ficavam
    // declarados dentro do try, mas alguns caminhos de erro usam draftAssistantId
    // fora daquele bloco.
    let optimisticUserId = "";
    let draftAssistantId = "";
    let traceId = "";
    let clientMessageId = "";

    try {
      const agentIdToSend = resolveHostAgentId(); // host agent depends on current routing mode
      if (publicBetaOrkioOnly) {
        logRealtimeStep("start:orkio_only_agent_guard", { agent_id: agentIdToSend || null });
      }
      const pref = buildMessagePrefix(msg);
      const profileAddressPreference = buildProfileAddressPreferenceInstruction(user, typeof window !== "undefined" ? window.localStorage : null);
      const destinationContract = buildDestinationContract(msg, agentIdToSend);
      const teamPanelInstruction = buildManualTeamPanelInstruction(destinationContract);
      const isolatePromptContext = isolatePromptContextForThisSend;
      const finalMsg = isolatePromptContext
        ? msg
        : [
            profileAddressPreference ? `${profileAddressPreference}\n\nMENSAGEM_DO_USUARIO:` : "",
            teamPanelInstruction,
            pref + msg,
          ].filter(Boolean).join("\n\n");
      const internalRuntimeContext = isolatePromptContext
        ? {
            version: PATCH_37_REV_B_CONTEXT_ISOLATION_ALL_SENDS_VERSION,
            profile_address_preference: profileAddressPreference || "",
            team_panel_instruction: teamPanelInstruction || "",
            synthetic_prefix: pref || "",
            source: opts?.source || "",
          }
        : null;
      try {
        if (isolatePromptContext) {
          logRealtimeStep("patch37:send_message_context_isolated", {
            version: PATCH_37_PROMPT_CONTEXT_ISOLATION_REALTIME_VERSION,
            rev_b_version: PATCH_37_REV_B_CONTEXT_ISOLATION_ALL_SENDS_VERSION,
            manual_or_team_active: isolatePromptContextForThisSend,
            source: opts?.source || "",
            raw_length: rawMsg.length,
            visible_length: msg.length,
            final_length: finalMsg.length,
            has_internal_runtime_context: Boolean(internalRuntimeContext),
          });
        }
      } catch {}
      const effectiveThreadIdForSend = String(activeThreadIdRef.current || threadId || "").trim();

      // AO80B — after a browser refresh, React state and the ref can briefly
      // disagree. Send with the restored active thread id and, if messages are
      // still loading, give restoration one bounded chance before dispatch.
      if (
        effectiveThreadIdForSend &&
        messagesThreadIdRef.current !== effectiveThreadIdForSend &&
        (messagesLoadState === "loading" || messagesLoadState === "retrying")
      ) {
        try {
          await loadMessages(effectiveThreadIdForSend, {
            force: true,
            expectedEpoch: activeThreadEpochRef.current,
          });
        } catch {}
      }

      void refreshOrionSquadPreview(finalMsg);

      const describeDirectRailError = (err) => {
        if (err?.code === "CHAT_DIRECT_TIMEOUT") return "O fallback direto excedeu o tempo limite e foi abortado.";
        if (err?.code === "NETWORK_FETCH_FAILED") return "Falha de rede ao executar a resposta direta.";
        if (err?.code === "FETCH_ABORTED") return "A resposta direta foi abortada antes da conclusão.";
        return err?.message || "Não foi possível concluir a resposta direta.";
      };

      const failStreamWithoutDirectFallback = (reason = "CHAT_STREAM_FAILED_NO_DIRECT_FALLBACK") => {
        const err = new Error(reason);
        err.code = reason;
        appendExecutionTrace({
          kind: "error",
          label: "Stream não estabilizou",
          detail: "O trilho direto /api/chat está desativado neste deploy porque fica pendente em provisional headers. A UI liberou o input sem travar.",
        });
        setMessages((prev) => (Array.isArray(prev) ? prev : []).map((m) => (
          m.id === draftAssistantId
            ? {
                ...m,
                content: "Peço perdão. Não consegui concluir a resposta pelo stream nesta tentativa. A tentativa foi encerrada com segurança; tente novamente.",
                agent_name: assistantAgentName,
              }
            : m
        )));
        throw err;
      };

      const runDirectChat = async () => {
        const directCtl = new AbortController();
        streamCtlRef.current = directCtl;

        let timeoutId = null;
        try {
          timeoutId = window.setTimeout(() => {
            try {
              directCtl.abort();
            } catch {}
          }, Math.min(CHAT_STREAM_TIMEOUT_MS, 20000));

          return await chat({
            token,
            org: tenant,
            thread_id: effectiveThreadIdForSend || threadId,
            message: finalMsg,
            agent_id: destinationContract.agent_id,
            trace_id: traceId,
            client_message_id: clientMessageId,
            agent_ids: destinationContract.agent_ids,
            dest_mode: destinationContract.dest_mode,
            visible_agent: destinationContract.visible_agent,
            target_agent_slug: destinationContract.target_agent_slug,
            manual_target_slug: destinationContract.manual_target_slug || destinationContract.target_agent_slug || null,
            target_agent_slugs: destinationContract.target_agent_slugs,
            requested_agent_names: destinationContract.requested_agent_names,
            manual_agent_lock: Boolean(destinationContract.manual_agent_lock),
            manual_agent_source: destinationContract.manual_agent_source || "",
            manual_authority_version: destinationContract.manual_authority_version || "",
            manual_sticky_state_version: destinationContract.manual_sticky_state_version || PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
            manual_lock_persistence_version: destinationContract.manual_lock_persistence_version || PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
            manual_lock_staging_proof_version: getPatch32ManualLockStagingProofVersion(),
            manual_lock_staging_proof_production_guard_version: PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION,
            auto_handoff_enabled: destinationContract.auto_handoff_enabled !== false,
            response_control: destinationContract.response_control,
            multi_agent_turn: destinationContract.multi_agent_turn,
            manual_team_panel_required: Boolean(destinationContract.manual_team_panel_required),
            manual_team_panel_order: destinationContract.manual_team_panel_order || null,
            team_panel_version: destinationContract.team_panel_version || "",
            signal: directCtl.signal,
          });
        } catch (err) {
          if (directCtl.signal.aborted) {
            const wrapped = err instanceof Error ? err : new Error(String(err || "CHAT_DIRECT_TIMEOUT"));
            wrapped.code = "CHAT_DIRECT_TIMEOUT";
            wrapped.wasAborted = true;
            throw wrapped;
          }
          throw err;
        } finally {
          if (timeoutId) window.clearTimeout(timeoutId);
        }
      };


      optimisticUserId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      draftAssistantId = `tmp-ass-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimisticBaseTime = Date.now();

      const initialDraftAgentName = resolveAssistantDisplayName(
        {
          agent_name: destinationContract.visible_agent || activeRuntimeAgent || (destMode === "team" ? "Team" : ""),
          content: finalMsg,
        },
        destinationContract.manual_target_slug === "team" ? "Team" : (destMode === "team" ? "Orkio" : "Agent")
      );

      // optimistic message
      if (!isRetry) {
        setMessages((prev) => [
          ...prev,
          {
            id: optimisticUserId,
            role: "user",
            content: msg,
            user_name: user?.name || user?.email,
            created_at: optimisticBaseTime,
            client_created_at: optimisticBaseTime,
            client_order: optimisticBaseTime,
          },
          {
            id: draftAssistantId,
            role: "assistant",
            content: "⌛ Preparando resposta...",
            agent_name: initialDraftAgentName,
            created_at: optimisticBaseTime + 1,
            client_created_at: optimisticBaseTime + 1,
            client_order: optimisticBaseTime + 1,
          },
        ]);
        setText("");
      }

      // V2V-PATCH: gerar trace_id por tentativa de V2V (correlaciona logs backend)
      traceId = `v2v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      clientMessageId = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : (`cm-${Date.now()}-${Math.random().toString(36).slice(2,10)}`);
      v2vTraceRef.current = traceId;
      setV2vPhase('chat');
      setV2vError(null);
      setWalletBlockedDetail(null);
      if (!isExecutiveExperience) {
        setExecutionTraceExpanded(true);
        try { window.localStorage?.setItem("orkio_execution_trace_open", "1"); } catch {}
      } else {
        collapseExecutionTrace();
      }
      setActiveRuntimeAgent(initialDraftAgentName || "Orkio");
      setRuntimeHandoffLabel("");
      resetExecutionTrace([
        {
          kind: "system",
          label: "Solicitação recebida",
          detail: publicBetaOrkioOnly
            ? "Orkio preparado para o beta público, com continuidade e tom polido."
            : destinationContract.manual_target_slug === "team"
            ? "Modo Team manual acionado com painel determinístico."
            : destMode === "team"
            ? "Modo Team acionado."
            : destMode === "multi"
            ? "Execução multiagente preparada."
            : agentIdToSend
            ? "Agente definido para esta execução."
            : "Roteamento automático preparado.",
        },
        {
          kind: "status",
          label: "Enviando para o runtime dOrkio",
          detail: ORKIO_CHAT_STREAM_PRIMARY
            ? "Aguardando resposta do stream principal."
            : "Aguardando resposta do trilho direto com timeout controlado.",
        },
      ]);

      // v4: SSE becomes the primary chat rail, with JSON fallback preserved.
      let resp = null;
      let newThreadId = effectiveThreadIdForSend || threadId;
      let streamDonePayload = null;
      let streamMeta = null;

      if (ORKIO_CHAT_STREAM_PRIMARY) {
        try {
          appendExecutionTrace({
            kind: "system",
            label: "Stream principal acionado",
            detail: "Enviando via /api/chat/stream.",
          });

          try {
            console.info("ORKIO_CHAT_STREAM_DISPATCH", { traceId, threadId: effectiveThreadIdForSend || threadId, destMode: destinationContract.dest_mode });
          } catch {}

          const streamResp = await withTimeout(chatStream({
            token,
            org: tenant,
            thread_id: effectiveThreadIdForSend || threadId,
            message: finalMsg,
            agent_id: destinationContract.agent_id,
            trace_id: traceId,
            client_message_id: clientMessageId,
            agent_ids: destinationContract.agent_ids,
            dest_mode: destinationContract.dest_mode,
            visible_agent: destinationContract.visible_agent,
            target_agent_slug: destinationContract.target_agent_slug,
            manual_target_slug: destinationContract.manual_target_slug || destinationContract.target_agent_slug || null,
            target_agent_slugs: destinationContract.target_agent_slugs,
            requested_agent_names: destinationContract.requested_agent_names,
            multi_agent_turn: destinationContract.multi_agent_turn,
            response_control: destinationContract.response_control,
            manual_team_panel_required: Boolean(destinationContract.manual_team_panel_required),
            manual_team_panel_order: destinationContract.manual_team_panel_order || null,
            team_panel_version: destinationContract.team_panel_version || "",
            manual_agent_lock: Boolean(destinationContract.manual_agent_lock),
            manual_agent_source: destinationContract.manual_agent_source || "",
            manual_authority_version: destinationContract.manual_authority_version || "",
            manual_sticky_state_version: destinationContract.manual_sticky_state_version || PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
            manual_lock_persistence_version: destinationContract.manual_lock_persistence_version || PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
            manual_lock_staging_proof_version: getPatch32ManualLockStagingProofVersion(),
            manual_lock_staging_proof_production_guard_version: PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION,
            auto_handoff_enabled: destinationContract.auto_handoff_enabled !== false,
            signal: ctl.signal,
          }), CHAT_STREAM_CONNECT_TIMEOUT_MS, "CHAT_STREAM_CONNECT_TIMEOUT");
          streamMeta = await withTimeout(consumeChatStream(streamResp, {
            signal: ctl.signal,
            isStale,
            onStatus: (payload) => {
              if (isStale()) return;
              if (payload?.status) setUploadStatus(`⌛ ${payload.status}`);
              if (payload?.agent_name || payload?.final_speaker || payload?.visible_agent) setActiveRuntimeAgent(resolveAssistantDisplayName(payload, activeRuntimeAgent || "Agent"));
              appendExecutionTrace(describeExecutionStatus(payload));
            },
            onError: (payload) => {
              if (isStale()) return;
              appendExecutionTrace(describeExecutionError(payload));
              if (payload?.code === "WALLET_INSUFFICIENT_BALANCE") {
                setWalletBlockedDetail(payload);
                setV2vError(buildWalletBlockedMessage(payload));
                return;
              }
              if (payload?.agent_id && payload?.code !== "SERVER_BUSY") return;
              if (payload?.message) setV2vError(String(payload.message));
            },
            onExecution: (payload) => {
              if (isStale()) return;
              if (payload?.step === "agent_handoff") {
                const handoff = `${payload?.from_agent_name || payload?.from_agent_id || "Agente"} → ${payload?.to_agent_name || payload?.agent_name || payload?.to_agent_id || "Agente"}`;
                setRuntimeHandoffLabel(handoff);
                setActiveRuntimeAgent(payload?.to_agent_name || payload?.agent_name || "");
              } else if (payload?.agent_name) {
                setActiveRuntimeAgent(payload.agent_name);
              }
              appendExecutionTrace(describeExecutionEvent(payload));
            },
            onChunk: (payload, draftText) => {
              const staleNow = isStale();
              if (staleNow) {
                return;
              }
              setMessages((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                let matched = false;
                const next = list.map((m) => {
                  if (m.id !== draftAssistantId) return m;
                  matched = true;
                  const nextContent = sanitizePublicBetaAssistantText(draftText || "⌛ Preparando resposta...");
                  return {
                    ...m,
                    content: nextContent,
                    agent_name: resolveAssistantDisplayName(
                      { ...(m || {}), ...(payload || {}), content: draftText || payload?.content || m?.content || "" },
                      m?.agent_name || "Agent"
                    ),
                    agent_id: payload?.agent_id || m.agent_id || null,
                    voice_id: payload?.voice_id || m.voice_id || null,
                    avatar_url: payload?.avatar_url || m.avatar_url || null,
                  };
                });
                return next;
              });
            },
            onAgentDone: (payload) => {
              const staleNow = isStale();
              if (staleNow) {
                return;
              }
              if (payload?.agent_name || payload?.final_speaker || payload?.visible_agent) setActiveRuntimeAgent(resolveAssistantDisplayName(payload, activeRuntimeAgent || "Orkio"));
              const agentDoneVisibleText = sanitizePublicBetaAssistantText(
                String(extractAssistantVisibleTextFromPayload(payload) || draftText || "").trim()
              );
              appendExecutionTrace({
                kind: "agent",
                label: `${resolveAssistantDisplayName(payload, payload?.agent_id || "Orkio")} concluiu uma etapa`,
                detail: agentDoneVisibleText || sanitizePublicBetaAssistantText(payload?.message || payload?.status || "Resposta parcial pronta."),
                agentName: resolveAssistantDisplayName(payload, "Orkio"),
              });
              setMessages((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                let matched = false;
                const next = list.map((m) => {
                  if (m.id !== draftAssistantId) return m;
                  matched = true;
                  return {
                    ...m,
                    content: sanitizePublicBetaAssistantText(
                      agentDoneVisibleText ||
                      (m.content || "").replace(/^⌛\s*/, "") ||
                      "Resposta concluída."
                    ),
                    agent_name: resolveAssistantDisplayName(
                      { ...(m || {}), ...(payload || {}), content: agentDoneVisibleText || m?.content || payload?.content || "" },
                      m?.agent_name || "Agent"
                    ),
                    agent_id: payload?.agent_id || m.agent_id || null,
                    voice_id: payload?.voice_id || m.voice_id || null,
                    avatar_url: payload?.avatar_url || m.avatar_url || null,
                  };
                });
                return next;
              });
            },
            onKeepalive: () => {},
            onDone: (payload) => {
              const staleNow = isStale();
              if (staleNow) {
                return;
              }
              streamDonePayload = payload || null;
              appendExecutionTrace(describeExecutionDone(payload));
              if (payload?.thread_id) newThreadId = payload.thread_id;
              if (payload?.runtime_hints) {
                setRuntimeHints(payload.runtime_hints);
                if (payload.runtime_hints?.capabilities) {
                  setAgentCapabilities(normalizeCapabilityPayload(payload.runtime_hints.capabilities));
                }
              }
              if (payload?.trace_id) setLastTraceId(payload.trace_id);
              if (payload?.agent_name || payload?.final_speaker || payload?.visible_agent) {
                setActiveRuntimeAgent(resolveAssistantDisplayName(payload, activeRuntimeAgent || "Agent"));
              }

              const doneFinalText = resolveDoneFinalText(payload, "");
              if (doneFinalText || payload?.assistant_persisted || payload?.done) {
                setMessages((prev) => {
                  const list = Array.isArray(prev) ? prev : [];
                  let matched = false;
                  const next = list.map((m) => {
                    if (m.id !== draftAssistantId) return m;
                    matched = true;
                    return {
                      ...m,
                      content: sanitizePublicBetaAssistantText(doneFinalText || String(m?.content || "").replace(/^⌛\s*/, "") || "Resposta concluída."),
                      agent_name: resolveAssistantDisplayName(
                        { ...(m || {}), ...(payload || {}), content: doneFinalText || m?.content || "" },
                        m?.agent_name || "Agent"
                      ),
                      agent_id: payload?.agent_id || m.agent_id || null,
                      voice_id: payload?.voice_id || m.voice_id || null,
                      avatar_url: payload?.avatar_url || m.avatar_url || null,
                      assistant_message_id: payload?.assistant_message_id || m?.assistant_message_id || null,
                    };
                  });
                  return next;
                });
              }

              try { setUploadStatus(""); } catch {}
              setSending(false);
              sendingRef.current = false;
              setV2vPhase(null);
              setV2vError(null);
              setRuntimeHandoffLabel("");
              collapseExecutionTrace();
            },
          }), CHAT_STREAM_TIMEOUT_MS, "CHAT_STREAM_TIMEOUT");
          if (isStale()) return false;
          resp = {
            data: {
              thread_id: streamMeta?.thread_id || newThreadId,
              used_stream: true,
              runtime_hints: streamMeta?.runtime_hints || null,
              trace_id: streamMeta?.trace_id || traceId,
              execution_cursor: streamMeta?.execution_cursor || null,
              execution_lifecycle: streamMeta?.execution_lifecycle || null,
              routing_source: streamMeta?.routing_source || null,
              route_applied: !!streamMeta?.route_applied,
            }
          };
          if (streamMeta?.thread_id) newThreadId = streamMeta.thread_id;
        } catch (streamErr) {
          if (
            streamErr?.code === "CHAT_STREAM_ENDED_WITHOUT_DONE" ||
            streamErr?.code === "CHAT_STREAM_NO_USEFUL_CHUNK_TIMEOUT" ||
            streamErr?.code === "CHAT_STREAM_NO_ACTIVITY_TIMEOUT"
          ) {
            appendExecutionTrace({
              kind: "warning",
              label: "Stream encerrado com segurança",
              detail: streamErr?.code || "frontend_stream_terminal_guard",
            });
            setMessages((prev) =>
              (Array.isArray(prev) ? prev : []).map((m) =>
                m.id === draftAssistantId
                  ? {
                      ...m,
                      content: sanitizePublicBetaAssistantText(
                        streamErr?.draftText ||
                        "Peço perdão. Não consegui concluir a resposta pelo stream nesta tentativa. A tentativa foi encerrada com segurança; tente novamente."
                      ),
                      agent_name: m.agent_name || "Orkio",
                    }
                  : m
              )
            );
            streamDonePayload = {
              thread_id: streamErr?.thread_id || newThreadId || threadId,
              trace_id: streamErr?.trace_id || traceId,
              stream_failed: true,
              frontend_stream_guard: true,
              reason: streamErr?.code || "frontend_stream_terminal_guard",
            };
            streamMeta = {
              thread_id: streamDonePayload.thread_id,
              trace_id: streamDonePayload.trace_id,
              used_stream: true,
              done_payload: streamDonePayload,
              draft_text: streamErr?.draftText || "",
            };
            try { setUploadStatus(""); } catch {}
            setSending(false);
            sendingRef.current = false;
            setV2vPhase(null);
            setV2vError(null);
            setRuntimeHandoffLabel("");
            collapseExecutionTrace();
            return false;
          }

          if (streamErr instanceof StreamSemanticError) {
            appendExecutionTrace({
              kind: "warning",
              label: "Stream retornou erro semântico",
              detail: streamErr?.payload?.message || streamErr?.message || "Acionando recuperação pelo trilho direto.",
            });
          }

          if (isAbortLikeError(streamErr)) {
            try { ctl.abort(); } catch {}
            appendExecutionTrace({
              kind: "system",
              label: streamErr?.code === "CHAT_STREAM_TIMEOUT" || streamErr?.code === "STREAM_TIMEOUT"
                ? "Stream demorou demais"
                : "Stream interrompido",
              detail: "Tentando reconciliar a resposta persistida antes de acionar a resposta direta.",
            });

            const reconcileThreadId = String(newThreadId || effectiveThreadIdForSend || threadId || "").trim();
            let reconciledMessages = [];
            if (reconcileThreadId) {
              try {
                reconciledMessages = await loadMessages(reconcileThreadId, {
                  force: true,
                  allowInactive: true,
                  finalizeTurn: true,
                  preserveExistingRequest: true,
                  expectedEpoch: activeThreadEpochRef.current,
                });
              } catch {}
            }

            if (hasPersistedAssistantForTurn(reconciledMessages, turnStartedAt)) {
              appendExecutionTrace({
                kind: "done",
                label: "Histórico reconciliado",
                detail: "A resposta persistida foi localizada após a degradação do stream.",
              });
              try { setUploadStatus(""); } catch {}
              setSending(false);
              sendingRef.current = false;
              setV2vPhase(null);
              setV2vError(null);
              setRuntimeHandoffLabel("");
              collapseExecutionTrace();
              resp = {
                data: {
                  thread_id: reconcileThreadId || newThreadId || threadId,
                  used_stream: true,
                  degraded_stream: true,
                  reconciled_after_stream_abort: true,
                  trace_id: traceId,
                },
              };
            } else {
              if (!ORKIO_CHAT_DIRECT_FALLBACK_ENABLED) {
                failStreamWithoutDirectFallback("CHAT_STREAM_FAILED_NO_DIRECT_FALLBACK");
              }
              appendExecutionTrace({
                kind: "system",
                label: "Alternando para resposta direta",
                detail: "O histórico ainda não tinha resposta persistida. Orkio vai tentar /api/chat com timeout controlado.",
              });
              try {
                resp = await runDirectChat();
              } catch (fallbackErr) {
                appendExecutionTrace({
                  kind: "error",
                  label: "Fallback direto falhou",
                  detail: describeDirectRailError(fallbackErr),
                });
                throw fallbackErr;
              }
            }
          } else if (streamErr?.status === 422 || streamErr?.code === "CHAT_STREAM_VALIDATION_ERROR") {
            appendExecutionTrace({
              kind: "warning",
              label: "Contrato do stream recusado",
              detail: "O upload foi preservado, mas /api/chat/stream recusou a chamada com 422. Revise a mensagem e tente enviar uma pergunta textual.",
            });
            setMessages((prev) =>
              (Array.isArray(prev) ? prev : []).map((m) =>
                m.id === draftAssistantId
                  ? {
                      ...m,
                      content: "Arquivo anexado. Não consegui acionar a análise porque o contrato do stream recusou a chamada. Escreva uma pergunta objetiva sobre o arquivo anexado e tente novamente.",
                      agent_name: m.agent_name || initialDraftAgentName || "Orkio",
                    }
                  : m
              )
            );
            setUploadStatus("");
            setSending(false);
            sendingRef.current = false;
            setV2vPhase(null);
            setV2vError("O upload foi concluído; a análise por chat falhou por validação 422 no stream.");
            collapseExecutionTrace();
            return false;
          } else if (streamErr?.status === 429 || streamErr?.code === "RATE_LIMITED" || streamErr?.isRateLimited) {
            appendExecutionTrace({
              kind: "warning",
              label: "Capacidade temporariamente atingida",
              detail: "O stream retornou 429. Orkio não acionou fallback duplicado; tente novamente em alguns instantes.",
            });
            setMessages((prev) =>
              (Array.isArray(prev) ? prev : []).map((m) =>
                m.id === draftAssistantId
                  ? {
                      ...m,
                      content: "Capacidade temporariamente atingida. Tente novamente em instantes.",
                      agent_name: m.agent_name || initialDraftAgentName || "Orkio",
                    }
                  : m
              )
            );
            setV2vPhase(null);
            setV2vError(null);
            closeCapacityModal();
            openCapacityModal(msg, streamErr?.retryAfter || null);
            return false;
          } else if (
            streamErr?.status === 401 ||
            streamErr?.status === 403 ||
            streamErr?.isAuthError ||
            streamErr?.code === "CHAT_STREAM_UNAUTHORIZED" ||
            streamErr?.code === "AUTH_SESSION_EXPIRED" ||
            streamErr?.code === "AUTH_FORBIDDEN"
          ) {
            appendExecutionTrace({
              kind: "warning",
              label: streamErr?.status === 403 ? "Acesso negado neste fluxo" : "Sessão expirada ou inconsistente",
              detail: streamErr?.status === 403
                ? "Orkio não acionou fallback duplicado após 403."
                : "Orkio não acionou fallback duplicado após 401. Validando a sessão atual.",
            });
            setMessages((prev) =>
              (Array.isArray(prev) ? prev : []).map((m) =>
                m.id === draftAssistantId
                  ? {
                      ...m,
                      content: streamErr?.status === 403
                        ? "Seu acesso foi negado para esta execução. Revise a sessão e tente novamente."
                        : "Sessão expirada ou inconsistente. Entre novamente para continuar.",
                      agent_name: m.agent_name || initialDraftAgentName || "Orkio",
                    }
                  : m
              )
            );
            if (streamErr?.status === 403) {
              setV2vPhase("error");
              setV2vError("Acesso negado para esta execução.");
              return false;
            }
            const expired = await logoutIfSessionReallyExpired("chatStream401");
            if (!expired) {
              setV2vPhase(null);
              setV2vError("Sessão oscilou. Tente enviar novamente.");
            }
            return false;
          } else {
            if (!ORKIO_CHAT_DIRECT_FALLBACK_ENABLED) {
              failStreamWithoutDirectFallback("CHAT_STREAM_DEGRADED_NO_DIRECT_FALLBACK");
            }
            appendExecutionTrace({
              kind: "system",
              label: "Alternando para resposta direta",
              detail: "O stream foi degradado. Orkio vai tentar /api/chat com timeout controlado.",
            });
            try {
              resp = await runDirectChat();
            } catch (fallbackErr) {
              appendExecutionTrace({
                kind: "error",
                label: "Fallback direto falhou",
                detail: describeDirectRailError(fallbackErr),
              });
              throw fallbackErr;
            }
          }
        }

      } else {
        if (!ORKIO_CHAT_DIRECT_FALLBACK_ENABLED) {
          failStreamWithoutDirectFallback("CHAT_STREAM_PRIMARY_DISABLED_DIRECT_FALLBACK_DISABLED");
        }
        try {
          appendExecutionTrace({
            kind: "system",
            label: "Trilho direto acionado",
            detail: "Enviando via /api/chat com timeout e abort controlados.",
          });
          resp = await runDirectChat();
        } catch (directErr) {
          appendExecutionTrace({
            kind: "error",
            label: "Execução direta falhou",
            detail: describeDirectRailError(directErr),
          });
          throw directErr;
        }
      }

      if (resp?.status === 429) {
        appendExecutionTrace({
          kind: "warning",
          label: "Capacidade temporariamente atingida",
          detail: "A resposta direta retornou 429. O usuário pode tentar novamente em instantes.",
        });
        setMessages((prev) =>
          (Array.isArray(prev) ? prev : []).map((m) =>
            m.id === draftAssistantId
              ? {
                  ...m,
                  content: "Capacidade temporariamente atingida. Tente novamente em instantes.",
                  agent_name: "Orkio",
                }
              : m
          )
        );
        setV2vPhase(null);
        setV2vError(null);
        closeCapacityModal();
        openCapacityModal(msg, resp?.headers?.get?.("retry-after") || null);
        return;
      }

       // V2V-PATCH: se fallback /api/chat criou thread, capturar thread_id do resp
       if (resp?.data?.thread_id) newThreadId = resp.data.thread_id;
      // F-03 FIX: usar newThreadId (var local) em vez de threadId (closure stale do React)
      // Se a conversa foi criada durante o SSE stream, threadId ainda aponta para a thread antiga
      const effectiveTidForLoad = String(newThreadId || threadId || "");

      const finalTextCandidate = sanitizePublicBetaAssistantText(String(
        extractAssistantVisibleTextFromPayload(streamDonePayload) ||
        extractAssistantVisibleTextFromPayload(streamMeta?.done_payload) ||
        streamMeta?.draft_text ||
        ""
      ).trim());

      const finalAgentName = resolveAssistantDisplayName(
        {
          ...(streamMeta?.done_payload || {}),
          ...(streamDonePayload || {}),
          runtime_hints:
            streamDonePayload?.runtime_hints ||
            streamMeta?.runtime_hints ||
            streamMeta?.done_payload?.runtime_hints ||
            null,
        },
        streamDonePayload?.agent_name || streamMeta?.done_payload?.agent_name || "Orkio"
      );
      const finalAgentId =
        streamDonePayload?.agent_id ||
        streamMeta?.done_payload?.agent_id ||
        null;
      const finalVoiceId =
        streamDonePayload?.voice_id ||
        streamMeta?.done_payload?.voice_id ||
        null;
      const finalAvatarUrl =
        streamDonePayload?.avatar_url ||
        streamMeta?.done_payload?.avatar_url ||
        null;

      if (effectiveTidForLoad) {
        consumeStoredThreadBootstrap(effectiveTidForLoad);
        const currentActiveForFinalize = String(activeThreadIdRef.current || "");
        // AO01_THREAD_FOCUS_GUARD:
        // Uma finalização atrasada de stream não pode roubar o foco
        // quando o usuário já selecionou manualmente outra conversa.
        if (effectiveTidForLoad === currentActiveForFinalize) {
          activeThreadIdRef.current = effectiveTidForLoad;
          requestedThreadIdRef.current = effectiveTidForLoad;
          persistActiveThreadId(effectiveTidForLoad);
          lockThreadSelection(effectiveTidForLoad, 20000);
        }
      }

      // EFATA777 v9:
      // Finalize the visible turn before refreshing the thread sidebar. A slow
      // /api/threads or an epoch/abort race cannot block the assistant answer.
      const freshMessages = effectiveTidForLoad
        ? await finalizeChatTurn({
            threadId: effectiveTidForLoad,
            draftAssistantId,
            finalTextCandidate,
            finalAgentName,
            finalAgentId,
            finalVoiceId,
            finalAvatarUrl,
            turnStartedAt,
          })
        : await finalizeChatTurn({
            threadId: "",
            draftAssistantId,
            finalTextCandidate,
            finalAgentName,
            finalAgentId,
            finalVoiceId,
            finalAvatarUrl,
            turnStartedAt,
          });

      const doneAssistantMessageId = String(
        streamDonePayload?.assistant_message_id ||
        streamMeta?.done_payload?.assistant_message_id ||
        ""
      ).trim();

      const freshHasDoneAssistantId = !!doneAssistantMessageId && (Array.isArray(freshMessages) ? freshMessages : []).some((m) => (
        String(m?.id || "") === doneAssistantMessageId ||
        String(m?.assistant_message_id || "") === doneAssistantMessageId
      ));

      const freshHasAssistant = freshHasDoneAssistantId || hasPersistedAssistantForTurn(freshMessages, turnStartedAt);

      // AO-28_STREAM_DRAFT_RECONCILE_GUARD
      // When the stream already produced a final visible answer but /api/messages
      // is still behind, keep the streamed draft visible until the next reconcile.
      if (!freshHasAssistant && finalTextCandidate) {
        setMessages((prev) => {
          const list = Array.isArray(prev) ? [...prev] : [];

          const alreadyHasPersisted = !!doneAssistantMessageId && list.some((m) => (
            String(m?.id || "") === doneAssistantMessageId ||
            String(m?.assistant_message_id || "") === doneAssistantMessageId
          ));

          if (alreadyHasPersisted) return list;

          const draftIdx = list.findIndex((m) => (
            String(m?.id || "") === String(draftAssistantId || "") ||
            (!!doneAssistantMessageId && String(m?.assistant_message_id || "") === doneAssistantMessageId)
          ));

          const preservedDraft = {
            id: draftAssistantId || `tmp-ass-${Date.now()}`,
            role: "assistant",
            content: finalTextCandidate,
            agent_name: finalAgentName || "Orkio",
            agent_id: finalAgentId || null,
            voice_id: finalVoiceId || null,
            avatar_url: finalAvatarUrl || null,
            thread_id: effectiveTidForLoad || threadId || activeThreadIdRef.current || "",
            assistant_message_id: doneAssistantMessageId || null,
            created_at: Math.floor(Date.now() / 1000),
            stream_reconcile_pending: true,
          };

          if (draftIdx >= 0) {
            list[draftIdx] = {
              ...list[draftIdx],
              ...preservedDraft,
              content: finalTextCandidate || list[draftIdx]?.content || "",
            };
            return list;
          }

          return [...list, preservedDraft];
        });
      }

      if (!freshHasAssistant && effectiveTidForLoad) {
        scheduleFinalTurnReconcile({
          threadId: effectiveTidForLoad,
          turnStartedAt,
          delayMs: 1200,
        });
      }

      if (effectiveTidForLoad) {
        void loadThreads({ preserveThreadId: effectiveTidForLoad, keepMessages: true });
      }

      void refreshWalletSummary({ silent: true });

      // PATCH0100_14: store agent info from response
      if (resp?.data) {
        const ai = { agent_id: resp.data.agent_id, agent_name: resp.data.agent_name, voice_id: resolveAgentVoice({ agent_name: resp.data.agent_name, voice_id: resp.data.voice_id }), avatar_url: resp.data.avatar_url };
        setLastAgentInfo(ai);
        if (resp.data.agent_name) setActiveRuntimeAgent(resolveAssistantDisplayName(resp.data, "Orkio"));
        if (resp.data.runtime_hints) {
          setRuntimeHints(resp.data.runtime_hints || null);
          if (resp.data.runtime_hints?.capabilities) {
            setAgentCapabilities(normalizeCapabilityPayload(resp.data.runtime_hints.capabilities));
          }
        }
        if (resp.data.trace_id) setLastTraceId(resp.data.trace_id);
        if (!resp?.data?.used_stream) {
          appendExecutionTrace({
            kind: "agent",
            label: `${resp.data.agent_name || "Orkio"} consolidou a resposta`,
            detail: resp.data.runtime_hints?.routing?.mode ? `modo ${resp.data.runtime_hints.routing.mode}` : "",
            agentName: resp.data.agent_name || "",
          });
          appendExecutionTrace({
            kind: "done",
            label: "Execução concluída",
            detail: buildExecutionDoneDetail({ runtime_hints: resp.data.runtime_hints || null }),
          });
        }
      }
      // V2V-PATCH: Auto-play TTS — fase TTS + fase playing com trace_id
      if (voiceModeRef.current) {
        if (micEnabledRef.current) stopMic();
        const prevLast = messagesRef.current?.slice?.().reverse?.().find?.(m => m.role === "assistant" && !String(m?.id||"").startsWith("tmp-ass-"))?.created_at || null;
        const fresh = (freshMessages || []);
        const assistants = (fresh || []).filter(m => m.role === "assistant" && !String(m.id || "").startsWith("tmp-ass-"));
        let toSpeak = assistants;
        if (prevLast) {
          // F-04: epoch Unix (segundos) → ms para JS
          const prevT = new Date((prevLast || 0) * 1000).getTime();
          toSpeak = assistants.filter(m => {
            const t = new Date((m.created_at || 0) * 1000).getTime();
            // BUG-03 FIX: filtro estrito (>) — não incluir a msg anterior (prevT)
            return isFinite(t) && t > prevT;
          });
        } else {
          toSpeak = assistants.slice(-1);
        }

        // Team: fala cada mensagem sequencialmente com voz correta por agente
        // Single: só a última
        if (destMode !== "team" && toSpeak.length > 1) toSpeak = toSpeak.slice(-1);

        const currentTrace = v2vTraceRef.current || traceId;
        const shouldAutoSpeakThisTurn =
          !!opts?.explicitVoiceRequested ||
          !!opts?.voiceRequested ||
          !!opts?.realtimeTurn;

        for (const m of toSpeak) {
          const content = (m.content || "").trim();
          if (!content) continue;
          if (!shouldAutoSpeakThisTurn) continue;
          const agentIdFallback = m.agent_id || null;
          // preferir message_id (backend resolve voz); agent_id só como fallback
          setV2vPhase('tts');
          try { setUploadStatus(`🔊 Gerando voz (${m.agent_name || 'agente'})...`); } catch {}
          await playTts(content, agentIdFallback, {
            forceAuto: true,
            messageId: m.id || null,
            traceId: currentTrace,
          });
        }
        setV2vPhase(null);
        setV2vError(null);
        // BUG-01 FIX: fallback — se playTts não reiniciou o mic (ex: autoplay bloqueado)
        // garantir que o ciclo V2V continua ouvindo
        if (voiceModeRef.current && !micEnabledRef.current) {
          scheduleMicRestart("post-tts");
        }
      }

      return true;
    } catch (e) {
      if (isStale()) return false;
      console.error("[V2V] sendMessage error:", e);
      if (
        e?.code === "CHAT_STREAM_ENDED_WITHOUT_DONE" ||
        e?.code === "CHAT_STREAM_NO_USEFUL_CHUNK_TIMEOUT" ||
        e?.code === "CHAT_STREAM_NO_ACTIVITY_TIMEOUT"
      ) {
        appendExecutionTrace({
          kind: "warning",
          label: "Stream finalizado sem confirmação",
          detail: e?.code || "frontend_stream_terminal_guard",
        });
        setMessages((prev) =>
          (Array.isArray(prev) ? prev : []).map((m) =>
            m.id === draftAssistantId
              ? {
                  ...m,
                  content:
                    e?.draftText ||
                    "Peço perdão. Não consegui concluir a resposta pelo stream nesta tentativa. A tentativa foi encerrada com segurança; tente novamente.",
                  agent_name: m.agent_name || "Orkio",
                }
              : m
          )
        );
        setV2vPhase(null);
        setV2vError(null);
        return false;
      }
      if (e?.status === 401) {
        const expired = await logoutIfSessionReallyExpired("sendMessage");
        if (expired) {
          setSending(false);
          return false;
        }
      }
      if (isAbortLikeError(e)) {
        appendExecutionTrace({
          kind: "system",
          label: "Stream interrompido",
          detail: "Tentando sincronizar a resposta persistida.",
        });
        const effectiveTidForLoad = String(threadId || activeThreadIdRef.current || "");
        if (effectiveTidForLoad) {
          await finalizeChatTurn({
            threadId: effectiveTidForLoad,
            draftAssistantId,
            finalTextCandidate: "",
            finalAgentName: resolveAssistantDisplayName({ agent_name: activeRuntimeAgent }, "Orkio"),
            turnStartedAt,
          });
        }
        setV2vPhase(null);
        setV2vError(null);
        return false;
      }
      if (
        e?.code === "CHAT_STREAM_FAILED_NO_DIRECT_FALLBACK" ||
        e?.code === "CHAT_STREAM_DEGRADED_NO_DIRECT_FALLBACK" ||
        e?.code === "CHAT_STREAM_PRIMARY_DISABLED_DIRECT_FALLBACK_DISABLED"
      ) {
        setV2vPhase("error");
        setV2vError("Stream não estabilizou e o fallback direto não estava disponível neste build.");
        return false;
      }
      if (e?.status === 429 || e?.code === "RATE_LIMITED" || e?.isRateLimited) {
        appendExecutionTrace({
          kind: "warning",
          label: "Capacidade temporariamente atingida",
          detail: "A execução foi limitada temporariamente. Nenhum fallback duplicado foi acionado.",
        });
        setMessages((prev) =>
          (Array.isArray(prev) ? prev : []).map((m) =>
            m.id === draftAssistantId
              ? {
                  ...m,
                  content: "Capacidade temporariamente atingida. Tente novamente em instantes.",
                  agent_name: "Orkio",
                }
              : m
          )
        );
        closeCapacityModal();
        openCapacityModal(msg, e?.retryAfter || null);
        setV2vPhase(null);
        setV2vError(null);
        return false;
      }
      setV2vPhase('error');
      const walletDetail = normalizeWalletErrorPayload(e);
      if (walletDetail || isWalletBlockedError(e)) {
        const detail = walletDetail || { code: "WALLET_INSUFFICIENT_BALANCE" };
        appendExecutionTrace({
          kind: "error",
          label: "Wallet bloqueou a execução",
          detail: buildWalletBlockedMessage(detail),
        });
        setWalletBlockedDetail(detail);
        setV2vError(buildWalletBlockedMessage(detail));
        setMessages((prev) => prev.map((m) => (
          m.id === draftAssistantId
            ? {
                ...m,
                content: buildWalletBlockedMessage(detail),
                agent_name: m.agent_name || "Wallet",
              }
            : m
        )));
        void refreshWalletSummary({ silent: false });
      } else {
        setWalletBlockedDetail(null);
        appendExecutionTrace({
          kind: "error",
          label: "Execução falhou",
          detail: e?.message || "Falha ao enviar mensagem",
        });
        // BUG-04 FIX: trocar alert() por setV2vError — alert() bloqueia JS thread
        // e impede o V2V de reiniciar o microfone
        setV2vError(normalizeUserFacingRuntimeMessage(e?.message || "Falha ao enviar mensagem"));
      }
      return false;
    } finally {
      const stillCurrentTurn =
        streamCtlRef.current === ctl ||
        myRun === streamRunRef.current;

      if (stillCurrentTurn || sendingRef.current) {
        sendingRef.current = false;
        setSending(false);
        try { setUploadStatus(''); } catch {}
      }
      if (streamCtlRef.current === ctl) {
        streamCtlRef.current = null;
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Voice recognition helpers
  function ensureSpeech() {
    if (!speechSupported) return null;
    if (speechRef.current) return speechRef.current;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = SPEECH_RECOGNITION_LANG;
    rec.interimResults = true;
    rec.continuous = true;
    speechRef.current = rec;
    return rec;
  }

  function stopMic() {
    micEnabledRef.current = false;
    setMicEnabled(false);
    if (micRestartTimeoutRef.current) {
      clearTimeout(micRestartTimeoutRef.current);
      micRestartTimeoutRef.current = null;
    }
    // V2V-PATCH: parar MediaRecorder se ativo
    stopMicMediaRecorder();
    // parar SpeechRecognition se ativo
    const rec = speechRef.current;
    if (rec) {
      try { rec.onend = null; rec.stop(); } catch {}
    }
  }

  function clearMediaRecorderTimers() {
    if (mediaRecorderSilenceIntervalRef.current) {
      clearInterval(mediaRecorderSilenceIntervalRef.current);
      mediaRecorderSilenceIntervalRef.current = null;
    }
    if (mediaRecorderSilenceTimeoutRef.current) {
      clearTimeout(mediaRecorderSilenceTimeoutRef.current);
      mediaRecorderSilenceTimeoutRef.current = null;
    }
  }

  function scheduleMicRestart(reason = "unknown", delay = 300) {
    if (!voiceModeRef.current || micEnabledRef.current) return;
    if (micRestartTimeoutRef.current) clearTimeout(micRestartTimeoutRef.current);
    micRestartTimeoutRef.current = setTimeout(() => {
      micRestartTimeoutRef.current = null;
      if (!voiceModeRef.current || micEnabledRef.current) return;
      console.info('[V2V] mic restart reason=%s', reason);
      startMic();
    }, Math.max(0, Number(delay) || 0));
  }

  function resolveSttLanguage() {
    const explicit = (
      window.__ORKIO_ENV__?.VITE_STT_LANGUAGE ||
      window.__ORKIO_ENV__?.VITE_REALTIME_TRANSCRIBE_LANGUAGE ||
      import.meta.env.VITE_STT_LANGUAGE ||
      import.meta.env.VITE_REALTIME_TRANSCRIBE_LANGUAGE ||
      ""
    ).trim();
    if (explicit) return explicit;
    return voiceModeRef.current ? "pt" : null;
  }

  // V2V-PATCH: startMic usa MediaRecorder (webm/opus) quando disponível.
  // MediaRecorder → /api/stt (Whisper) → texto → sendMessage()
  // Fallback: SpeechRecognition (Chrome-only) → texto → sendMessage()
  function startMic() {
    if (micRestartTimeoutRef.current) {
      clearTimeout(micRestartTimeoutRef.current);
      micRestartTimeoutRef.current = null;
    }
    clearMediaRecorderTimers();
    micEnabledRef.current = true;
    setMicEnabled(true);
    setV2vError(null);

    // ── Caminho 1: MediaRecorder (todos os browsers modernos, qualidade superior) ──
    if (mediaRecorderSupported && voiceModeRef.current) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          if (!micEnabledRef.current) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          mediaRecorderStreamRef.current = stream;

          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

          const mr = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = mr;
          audioChunksRef.current = [];

          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
          };

          mr.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            // BUG-02 FIX: stop intencional (stopMicMediaRecorder) → descartar chunks
            if (stopIntentionalRef.current) {
              stopIntentionalRef.current = false;
              audioChunksRef.current = [];
              return;
            }
            if (!micEnabledRef.current && !voiceModeRef.current) return;

            const chunks = audioChunksRef.current;
            audioChunksRef.current = [];
            if (!chunks.length) return;

            const blob = new Blob(chunks, { type: mimeType });
            if (blob.size < 500) {
              console.warn('[V2V] áudio muito curto, ignorando');
              return;
            }

            const trace = `v2v-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            v2vTraceRef.current = trace;
            setV2vPhase('stt');
            setUploadStatus('🎙️ Transcrevendo fala...');

            console.info('[V2V] v2v_record_received trace_id=%s size=%d', trace, blob.size);

            try {
              const sttLang = resolveSttLanguage();
              const result = await transcribeAudio(blob, { token, org: tenant, trace_id: trace, language: sttLang || null });
              const text = (result?.text || '').trim();
              console.info('[V2V] v2v_stt_ok trace_id=%s chars=%d preview=%s', trace, text.length, text.slice(0, 60));

              if (!text) {
                console.warn('[V2V] v2v_stt_fail trace_id=%s reason=empty_transcript', trace);
                setV2vPhase('error');
                setV2vError('Nenhum texto reconhecido. Fale novamente.');
                setUploadStatus('⚠️ Fala não reconhecida. Tente novamente.');
                setTimeout(() => setUploadStatus(''), 2500);
                // Reiniciar escuta
                if (micEnabledRef.current && voiceModeRef.current) {
                  scheduleMicRestart('empty_transcript', 800);
                }
                return;
              }

              setText(text);
              setV2vPhase('chat');
              setUploadStatus(`🎙️ "${text.slice(0, 50)}${text.length > 50 ? '…' : ''}"`);

              if (voiceModeRef.current && micEnabledRef.current) {
                micEnabledRef.current = false;
                setMicEnabled(false);
                // pequeno delay para garantir que o texto aparece no input
                setTimeout(() => sendMessage(), 80);
              }
            } catch (e) {
              console.error('[V2V] v2v_stt_fail trace_id=%s error:', trace, e);
              setV2vPhase('error');
              setV2vError(normalizeUserFacingRuntimeMessage(e?.message || "erro desconhecido", "voice"));
              setUploadStatus(`❌ STT: ${e?.message || 'Erro de transcrição'}`);
              setTimeout(() => setUploadStatus(''), 3000);
            }
          };

          // Gravar em segmentos de 4s — silêncio detectado por VAD simples (tamanho do chunk)
          mr.start(100); // PATCH0100_24D: smaller chunks for better VAD // coleta chunks a cada 4s

          // Auto-stop após 30s máximo ou quando detectar silêncio
          let silenceTimer = null;
          let lastSize = 0;

          // PATCH0100_24D: VAD menos agressivo (1.5s de silêncio consecutivo)
          let consecutiveSilences = 0;

          mediaRecorderSilenceIntervalRef.current = setInterval(() => {
            const currentSize = audioChunksRef.current.reduce((s, c) => s + c.size, 0);
            const delta = currentSize - lastSize;
            lastSize = currentSize;

            // Espera acumular um mínimo de áudio e só encerra após 3 janelas silenciosas (~1.5s)
            if (currentSize > 3000 && delta < 500) {
              consecutiveSilences += 1;
            } else {
              consecutiveSilences = 0;
            }

            if (consecutiveSilences >= 3) {
              clearMediaRecorderTimers();
              
              try { mr.stop(); } catch {}
            }
          }, 500);

          silenceTimer = setTimeout(() => {
            clearMediaRecorderTimers();
            if (mr.state === 'recording') {
              try { mr.stop(); } catch {}
            }
          }, 30000);

          mr.onerror = (e) => {
            clearMediaRecorderTimers();
            clearTimeout(silenceTimer);
            console.error('[V2V] MediaRecorder error:', e);
            micEnabledRef.current = false;
            setMicEnabled(false);
            setV2vPhase('error');
            setV2vError('Erro no microfone. Verifique permissões.');
          };
        })
        .catch(err => {
          console.warn('[V2V] getUserMedia falhou, fallback SpeechRecognition:', err?.message);
          micEnabledRef.current = false;
          setMicEnabled(false);
          // fallback para SpeechRecognition
          _startSpeechRecognition();
        });
      return;
    }

    // ── Caminho 2: SpeechRecognition (fallback Chrome/Edge) ──
    _startSpeechRecognition();
  }

  function stopMicMediaRecorder() {
    // PATCH0100_24D: não zerar chunks antes do onstop (race condition)
    // BUG-02 FIX: sinalizar stop intencional para que onstop descarte os chunks
    stopIntentionalRef.current = true;
    clearMediaRecorderTimers();
    const mr = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    const stream = mediaRecorderStreamRef.current;
    mediaRecorderStreamRef.current = null;
    if (stream) {
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
    }

    // NÃO limpar audioChunksRef aqui: o handler onstop consome os chunks.
    if (mr && mr.state === 'recording') {
      try { mr.stop(); } catch {}
    }
  }

  function _startSpeechRecognition() {
    const rec = ensureSpeech();
    if (!rec) {
      setV2vError('Microfone não disponível neste browser. Use Chrome ou ative permissões.');
      micEnabledRef.current = false;
      setMicEnabled(false);
      return;
    }

    let finalText = "";
    let autoSendTimer = null;
    rec.onresult = (evt) => {
      let interim = "";
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const transcript = evt.results[i][0].transcript;
        if (evt.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      const merged = (finalText || interim || "").trim();
      if (merged) setText(merged);

      if (voiceModeRef.current && finalText.trim()) {
        if (autoSendTimer) clearTimeout(autoSendTimer);
        autoSendTimer = setTimeout(() => {
          const toSend = finalText.trim();
          if (toSend && voiceModeRef.current) {
            finalText = "";
            try { rec.stop(); } catch {}
            micEnabledRef.current = false;
            setMicEnabled(false);
            sendMessage();
          }
        }, 1500);
      }
    };

    rec.onerror = () => { /* keep enabled; onend will handle retry */ };

    rec.onend = () => {
      if (!micEnabledRef.current) return;
      const now = Date.now();
      const st = micRetryRef.current;
      if (now - st.lastTry > 20000) { st.tries = 0; }
      st.lastTry = now;
      st.tries += 1;
      if (st.tries > 3) {
        micEnabledRef.current = false;
        setMicEnabled(false);
        setUploadStatus("Microfone pausou. Clique no 🎙️ para retomar.");
        setTimeout(() => setUploadStatus(""), 2500);
        return;
      }
      setTimeout(() => {
        if (micEnabledRef.current) { try { rec.start(); } catch {} }
      }, 300);
    };

    try { rec.start(); } catch {}
  }

  function toggleMic() {
    if (!speechSupported) return;
    if (micEnabled) stopMic();
    else startMic();
  }

  // PATCH0100_13: Voice Mode helpers
  function toggleVoiceMode() {
    if (SUMMIT_VOICE_MODE !== "stt_tts") return;
    const next = !voiceMode;
    if (next && realtimeModeRef.current) {
      void stopRealtime('voice_mode_selected');
      setRealtimeMode(false);
      realtimeModeRef.current = false;
    }
    setVoiceMode(next);
    voiceModeRef.current = next;
    if (next) {
      setV2vPhase(null);
      setV2vError(null);
      const canRecord = mediaRecorderSupported;
      if (canRecord && !micEnabled) startMic();
      const modeLabel = 'MediaRecorder + STT';
      setUploadStatus(`Voice mode active (${modeLabel}) — speak naturally and Orkio will answer out loud.`);
      setTimeout(() => setUploadStatus(''), 4000);
    } else {
      if (micEnabled) stopMic();
      stopTts();
      setV2vPhase(null);
      setV2vError(null);
      setUploadStatus('');
    }
  }



function inferInterestType(raw) {
  const s = (raw || "").toLowerCase();
  if (/(invest|aportar|aporte|funding|investor)/i.test(s)) return "investor";
  if (/(comprar|contratar|adquirir|saas|demo|pricing|plan|plano)/i.test(s)) return "sales";
  if (/(parceria|partner|partnership)/i.test(s)) return "partnership";
  return "general";
}

function buildFounderHandoffMessage() {
  const draft = (text || "").trim();
  if (draft) return draft;
  const lastUser = [...(messagesRef.current || [])].reverse().find((m) => m?.role === "user" && (m?.content || "").trim());
  return (lastUser?.content || "The user would like to speak with Daniel about a strategic opportunity.").trim();
}

function handleFounderHandoff() {
  if (!FOUNDER_HANDOFF_ENTRYPOINT_ENABLED) {
    notifyDisabledFeature("founder_handoff");
    return;
  }

  const message = buildFounderHandoffMessage();
  if (!message || handoffBusy) return;
  setHandoffDraft(message);
  setHandoffInterestType(inferInterestType(message));
  setShowHandoffModal(true);
}

async function confirmFounderHandoff() {
  const message = (handoffDraft || buildFounderHandoffMessage()).trim();
  if (!message || handoffBusy) return;
  setHandoffBusy(true);
  setHandoffNotice("");
  try {
    await requestFounderHandoff({
      token,
      org: tenant,
      thread_id: threadId || null,
      interest_type: handoffInterestType || inferInterestType(message),
      message,
      source: "app_console",
      consent_contact: true,
    });
    setShowHandoffModal(false);
    setHandoffDraft("");
    setHandoffNotice("Founder follow-up requested. Daniel will review the context and continue with the right next step.");
    setTimeout(() => setHandoffNotice(""), 6000);
  } catch (e) {
    const detail = typeof e?.message === "string" ? e.message : "Could not request founder follow-up.";
    setHandoffNotice(detail);
    setTimeout(() => setHandoffNotice(""), 6000);
  } finally {
    setHandoffBusy(false);
  }
}



  function clearRealtimePendingAutoStop() {
    if (rtcPendingAutoStopTimerRef.current) {
      try { clearTimeout(rtcPendingAutoStopTimerRef.current); } catch {}
      rtcPendingAutoStopTimerRef.current = null;
    }
  }

  function getRealtimeSessionAgeMs() {
    try {
      const started = Number(rtcSessionStartedAtRef.current || 0);
      return started ? Math.max(0, Date.now() - started) : null;
    } catch {
      return null;
    }
  }

  function isExplicitRealtimeEndReason(reason = "") {
    // AO68A-HF6R10:
    // Only true user intent or public timebox completion may call /api/realtime/end.
    // Startup cleanup, pre_start reset, pagehide, watchdog, fallback and provider errors
    // must never consume the public quota/cooldown.
    const r = String(reason || "").toLowerCase().trim();
    return (
      r === "client_stop" ||
      r === "toggle_off" ||
      r === "client_stop_fullscreen_clock" ||
      r === "time_limit_frontend" ||
      r === "time_limit_frontend_hard_stop" ||
      r === "backend_cooldown"
    );
  }

  function isManualRealtimeStopReason(reason = "") {
    return isExplicitRealtimeEndReason(reason);
  }


  function isPrematureAutoRealtimeStopReason(reason = "") {
    const r = String(reason || "").toLowerCase();
    if (isManualRealtimeStopReason(r)) return false;
    return (
      r.includes("startup_watchdog") ||
      r.includes("watchdog") ||
      r.includes("no_audio") ||
      r.includes("audio_watchdog") ||
      r.includes("response_timeout") ||
      r.includes("speech") ||
      r.includes("silence") ||
      r.includes("fallback") ||
      r.includes("auto") ||
      r.includes("trigger_failed") ||
      r.includes("mic_ended") ||
      r.includes("dc_closed") ||
      r.includes("pc_disconnected") ||
      r.includes("pc_closed") ||
      r.includes("pc_failed") ||
      r.includes("realtime_error")
    );
  }

  function shouldHoldRealtimeInsteadOfEnding(reason = "", sessionAgeMs = null) {
    const r = String(reason || "").toLowerCase();
    const age = Number(sessionAgeMs);
    if (!Number.isFinite(age)) return false;
    if (age >= 30000) return false;
    if (isManualRealtimeStopReason(r)) return false;
    return isPrematureAutoRealtimeStopReason(r) || Boolean(r);
  }

  function clearRealtimeResponseTimeout() {
    if (rtcResponseTimeoutRef.current) {
      try { clearTimeout(rtcResponseTimeoutRef.current); } catch {}
      rtcResponseTimeoutRef.current = null;
    }
  }

  function clearRealtimeAutoResponseFallback() {
    if (rtcAutoResponseFallbackTimerRef.current) {
      try { clearTimeout(rtcAutoResponseFallbackTimerRef.current); } catch {}
      rtcAutoResponseFallbackTimerRef.current = null;
    }
  }

  function normalizeRealtimeAuthorityText(value = "") {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 180);
  }

  function getRealtimeAuthorityTargetSlug() {
    if (isManualTeamConversationActive()) {
      return getManualTeamConversationFocusSlug() || "orkio";
    }
    if (isManualAgentAuthorityLocked()) {
      return getManualRealtimeTargetSlug() || "orkio";
    }

    return canonicalAgentSlug(
      meetingStateRef.current?.active_persona_slug ||
      meetingStateRef.current?.active_speaker_slug ||
      meetingStateRef.current?.target_agent_slug ||
      rtcHostAgentNameRef.current ||
      activeRuntimeAgent ||
      "orkio"
    ) || "orkio";
  }

  function getRealtimeAuthorityTurnIndex() {
    const raw = Number(meetingStateRef.current?.turn_index ?? meetingStateRef.current?.turnIndex ?? 0);
    return Number.isFinite(raw) ? raw : 0;
  }

  function buildRealtimeAuthorityKey({
    sessionId = "",
    turnIndex = null,
    targetAgentSlug = "",
    transcript = "",
    reason = "",
  } = {}) {
    const sid = String(sessionId || rtcSessionIdRef.current || "").trim();
    const turn = turnIndex == null ? getRealtimeAuthorityTurnIndex() : Number(turnIndex || 0);
    const target = canonicalAgentSlug(targetAgentSlug || getRealtimeAuthorityTargetSlug() || "orkio") || "orkio";
    const textKey = normalizeRealtimeAuthorityText(transcript || rtcLastFinalTranscriptRef.current || reason || "empty");
    return [sid || "no_session", Number.isFinite(turn) ? turn : 0, target, textKey || "empty"].join(":");
  }

  function logRealtimeAuthorityTelemetry(eventName, payload = {}) {
    try {
      const rawEventName = String(eventName || "").trim();
      // PATCH_32_REV_F:
      // "authority_lock_released" belongs to the response-create guard, not to
      // manual button authority. Rename the telemetry event so backend/ops never
      // interpret it as releasing manual_agent_lock.
      const telemetryEventName = rawEventName === "authority_lock_released"
        ? "response_authority_lock_released"
        : rawEventName;
      const manualTargetSlug = getManualAuthoritySlug() || selectedManualAgentSlugRef.current || "";
      const meta = {
        ...(payload && typeof payload === "object" ? payload : {}),
        patch: "PATCH_PREMIUM_REV_B_RESPONSE_AUTHORITY_LOCK",
        session_id: rtcSessionIdRef.current || null,
        active_session_id: rtcActiveSessionIdRef.current || null,
        epoch: rtcActiveSessionEpochRef.current || 0,
        turn_index: getRealtimeAuthorityTurnIndex(),
        target_agent_slug: getRealtimeAuthorityTargetSlug(),
        manual_target_slug: manualTargetSlug || null,
        selected_agent_slug: manualTargetSlug || null,
        manual_agent_lock: Boolean(manualTargetSlug),
        manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        manual_sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
        manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
        response_authority_only: rawEventName === "authority_lock_released",
      };
      logRealtimeStep(`patch_premium_rev_b:${telemetryEventName}`, meta);
      queueRealtimeTelemetry(telemetryEventName, {
        ...meta,
        manual_lock_staging_proof_silence_version: PATCH_32_REV_I_MANUAL_LOCK_STAGING_PROOF_SILENCE_VERSION,
        manual_lock_staging_proof_production_guard_version: PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION,
        ...(isPatch32ManualLockStagingProofEnabled()
          ? { manual_lock_staging_proof_version: getPatch32ManualLockStagingProofVersion() }
          : {}),
      });
      if (rawEventName === "authority_lock_released") {
        logManualLockStagingProof("response_authority_lock_released_preserved_manual_button", {
          ...meta,
          response_authority_only: true,
          proof_scope: "response_authority_reset",
        });
      }
    } catch {}
  }

  function resetRealtimeResponseAuthority(reason = "reset") {
    try {
      rtcResponseAuthorityRef.current = null;
      rtcResponseInFlightRef.current = false;
      rtcLastResponseCreatedAtRef.current = 0;
      rtcResponseCreateDedupeRef.current = new Set();
      rtcFinalCommitDedupeRef.current = new Set();
      logRealtimeAuthorityTelemetry("authority_lock_released", { reason, reset: true });
    } catch {}
  }

  function claimRealtimeActiveSession(sessionId, reason = "claim") {
    const sid = String(sessionId || "").trim();
    rtcActiveSessionIdRef.current = sid || null;
    rtcActiveSessionEpochRef.current = Number(rtcActiveSessionEpochRef.current || 0) + 1;
    resetRealtimeResponseAuthority(`active_session_${reason}`);
    logRealtimeAuthorityTelemetry("active_session_claimed", {
      reason,
      session_id: sid || null,
      epoch: rtcActiveSessionEpochRef.current,
    });
    return rtcActiveSessionEpochRef.current;
  }

  function invalidateRealtimeActiveSession(reason = "invalidate") {
    const previousSessionId = rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null;
    rtcActiveSessionIdRef.current = null;
    rtcActiveSessionEpochRef.current = Number(rtcActiveSessionEpochRef.current || 0) + 1;
    resetRealtimeResponseAuthority(`active_session_${reason}`);
    logRealtimeAuthorityTelemetry("active_session_invalidated", {
      reason,
      previous_session_id: previousSessionId,
      epoch: rtcActiveSessionEpochRef.current,
    });
  }

  function isRealtimeSessionCurrent(sessionId = "", epoch = null) {
    const sid = String(sessionId || "").trim();
    if (!sid) return false;
    const currentSid = String(rtcSessionIdRef.current || "").trim();
    const activeSid = String(rtcActiveSessionIdRef.current || currentSid || "").trim();
    if (!currentSid || sid !== currentSid || sid !== activeSid) return false;
    if (epoch != null && Number(epoch) !== Number(rtcActiveSessionEpochRef.current || 0)) return false;
    return true;
  }

  function shouldIgnoreStaleRealtimeSessionEvent(sessionId = "", epoch = null, eventType = "event", source = "unknown") {
    if (isRealtimeSessionCurrent(sessionId, epoch)) return false;
    rtcStaleSessionEventCountRef.current = Number(rtcStaleSessionEventCountRef.current || 0) + 1;
    logRealtimeAuthorityTelemetry("stale_session_event_ignored", {
      source,
      event_type: eventType,
      stale_session_id: String(sessionId || "") || null,
      current_session_id: rtcSessionIdRef.current || null,
      active_session_id: rtcActiveSessionIdRef.current || null,
      event_epoch: epoch,
      current_epoch: rtcActiveSessionEpochRef.current || 0,
      count: rtcStaleSessionEventCountRef.current,
    });
    return true;
  }

  function acquireRealtimeResponseAuthority({
    reason = "unknown",
    sessionId = "",
    transcript = "",
    targetAgentSlug = "",
  } = {}) {
    const sid = String(sessionId || rtcSessionIdRef.current || "").trim();
    if (!isRealtimeSessionCurrent(sid)) {
      logRealtimeAuthorityTelemetry("response_create_blocked", {
        reason,
        blocked_reason: "stale_or_missing_session",
        attempted_session_id: sid || null,
      });
      return { allowed: false, key: "" };
    }

    const key = buildRealtimeAuthorityKey({
      sessionId: sid,
      targetAgentSlug,
      transcript: transcript || rtcLastFinalTranscriptRef.current || reason,
      reason,
    });

    const current = rtcResponseAuthorityRef.current;
    const now = Date.now();
    if (current?.key && current.key !== key && (now - Number(current.acquiredAt || 0)) < 45000) {
      logRealtimeAuthorityTelemetry("response_create_blocked", {
        reason,
        blocked_reason: "authority_lock_inflight",
        attempted_key: key,
        active_key: current.key,
        active_reason: current.reason || "",
        age_ms: now - Number(current.acquiredAt || 0),
      });
      return { allowed: false, key };
    }

    if (rtcResponseCreateDedupeRef.current?.has?.(key)) {
      logRealtimeAuthorityTelemetry("response_create_blocked", {
        reason,
        blocked_reason: "duplicate_turn_key",
        attempted_key: key,
      });
      return { allowed: false, key };
    }

    rtcResponseCreateDedupeRef.current.add(key);
    rtcResponseAuthorityRef.current = {
      key,
      reason,
      sessionId: sid,
      targetAgentSlug: canonicalAgentSlug(targetAgentSlug || getRealtimeAuthorityTargetSlug()) || "orkio",
      acquiredAt: now,
    };
    logRealtimeAuthorityTelemetry("authority_lock_acquired", { reason, key });
    logRealtimeAuthorityTelemetry("response_create_allowed", { reason, key });
    return { allowed: true, key };
  }

  function releaseRealtimeResponseAuthority(reason = "release", key = "") {
    try {
      const current = rtcResponseAuthorityRef.current || {};
      if (key && current?.key && String(key) !== String(current.key)) {
        logRealtimeAuthorityTelemetry("authority_lock_release_ignored", {
          reason,
          release_key: key,
          active_key: current.key,
        });
        return;
      }
      rtcResponseAuthorityRef.current = null;
      rtcResponseInFlightRef.current = false;
      logRealtimeAuthorityTelemetry("authority_lock_released", {
        reason,
        key: key || current?.key || "",
      });
    } catch {}
  }

  function markRealtimeFinalCommittedForTurn(content = "", opts = {}) {
    const key = buildRealtimeAuthorityKey({
      sessionId: opts?.sessionId || rtcSessionIdRef.current || "",
      turnIndex: opts?.turnIndex ?? getRealtimeAuthorityTurnIndex(),
      targetAgentSlug: opts?.targetAgentSlug || getRealtimeAuthorityTargetSlug(),
      transcript: content,
      reason: opts?.source || "final",
    });
    if (rtcFinalCommitDedupeRef.current?.has?.(key)) {
      logRealtimeAuthorityTelemetry("duplicate_final_ignored", {
        source: opts?.source || "unknown",
        key,
        content_len: String(content || "").length,
      });
      return { accepted: false, key };
    }
    rtcFinalCommitDedupeRef.current.add(key);
    return { accepted: true, key };
  }

  function hasRealtimeFinalCommittedForTurn(content = "", opts = {}) {
    const key = buildRealtimeAuthorityKey({
      sessionId: opts?.sessionId || rtcSessionIdRef.current || "",
      turnIndex: opts?.turnIndex ?? getRealtimeAuthorityTurnIndex(),
      targetAgentSlug: opts?.targetAgentSlug || getRealtimeAuthorityTargetSlug(),
      transcript: content,
      reason: opts?.source || "final",
    });
    return Boolean(rtcFinalCommitDedupeRef.current?.has?.(key));
  }

  function scheduleRealtimeAutoResponseFallback(transcript = "", source = "transcript_final") {
    const clean = String(transcript || "").trim();
    if (!clean) return;

    clearRealtimeAutoResponseFallback();
    rtcLastTranscriptForAutoResponseRef.current = clean;

    rtcAutoResponseFallbackTimerRef.current = setTimeout(() => {
      try {
        if (!realtimeModeRef.current) return;
        if (!rtcSessionIdRef.current) return;
        if (rtcTimeboxClosingRef.current) return;
        if (rtcResponseInFlightRef.current) {
          const hasRecentServerResponse = Boolean(
            rtcLastResponseCreatedAtRef.current &&
            (Date.now() - Number(rtcLastResponseCreatedAtRef.current || 0)) < 2500
          );
          if (hasRecentServerResponse) return;

          logRealtimeStep("ao01_hf6r17:clearing_stale_inflight_before_forced_audio_response", {
            source,
            sessionAgeMs: getRealtimeSessionAgeMs(),
            marker: ORKIO_AO66R_HF4_BUILD_MARKER,
          });
          rtcResponseInFlightRef.current = false;
          rtcLastResponseCreatedAtRef.current = 0;
          clearRealtimeResponseTimeout();
        }

        const dc = rtcDcRef.current;
        if (!dc || dc.readyState !== "open") {
          logRealtimeStep("ao66r_hf4:auto_response_fallback_skipped_dc_closed", {
            source,
            readyState: dc?.readyState || null,
            marker: ORKIO_AO66R_HF4_BUILD_MARKER,
          });
          return;
        }

        const latest = String(rtcLastFinalTranscriptRef.current || "").trim();
        if (!latest || latest !== rtcLastTranscriptForAutoResponseRef.current) return;

        logRealtimeStep("ao66r_hf4:auto_response_fallback_trigger", {
          source,
          transcriptLen: latest.length,
          marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        });

        triggerRealtimeResponse("auto_fallback_after_transcript");
      } catch (err) {
        logRealtimeStep("ao66r_hf4:auto_response_fallback_failed", {
          source,
          message: err?.message || null,
          marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        });
      } finally {
        rtcAutoResponseFallbackTimerRef.current = null;
      }
    }, 450);
  }


function clearRealtimeIdleFollowup() {
  if (rtcIdleFollowupTimerRef.current) {
    try { clearTimeout(rtcIdleFollowupTimerRef.current); } catch {}
    rtcIdleFollowupTimerRef.current = null;
  }
}

function markRealtimeUserActivity() {
  rtcLastUserActivityAtRef.current = Date.now();
  rtcIdleFollowupSentRef.current = false;
  clearRealtimeIdleFollowup();
}

function scheduleRealtimeIdleFollowup() {
  clearRealtimeIdleFollowup();
  if (!REALTIME_IDLE_FOLLOWUP_ENABLED) return;
  if (!realtimeModeRef.current) return;

  const assistantAgentId = rtcHostAgentIdRef.current || destSingle || null;
  const assistantAgentName = resolveRealtimeVisibleSpeakerName("", rtcHostAgentNameRef.current || activeRuntimeAgent || "Orkio");
  const displayName = resolveRealtimeIdleDisplayName(user);
  rtcIdleFollowupTimerRef.current = setTimeout(async () => {
    try {
      if (!realtimeModeRef.current) return;
      if (rtcIdleFollowupSentRef.current) return;
      const idleFor = Date.now() - (rtcLastUserActivityAtRef.current || 0);
      if (idleFor < REALTIME_IDLE_FOLLOWUP_MS) return;

      rtcIdleFollowupSentRef.current = true;
      const prompt = displayName
        ? `${displayName}, você ainda está online? Estou aqui caso queira continuar.`
        : "Você ainda está comigo? Estou aqui caso queira continuar.";

      const mid = `rtc_idle_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      setMessages((prev) => prev.concat([{
        id: mid,
        role: "assistant",
        content: prompt,
        agent_id: assistantAgentId ? String(assistantAgentId) : null,
        agent_name: "Orkio",
        created_at: Math.floor(Date.now()/1000),
      }]));
      queueRealtimeEvent({ event_type: 'response.final', role: 'assistant', content: prompt, is_final: true, meta: { source: 'idle_followup' } });

      try {
        await playTts(prompt, assistantAgentId, { forceAuto: true });
      } catch (err) {
        console.warn("[Realtime] idle follow-up tts failed", err);
      }
    } catch (err) {
      console.warn("[Realtime] idle follow-up failed", err);
    }
  }, REALTIME_IDLE_FOLLOWUP_MS);
}


  async function activateSilentRealtimeFallback(reason = "realtime_fallback", options = {}) {
    const shouldDisarm = options?.disarm !== false;
    const reasonText = String(reason || "realtime_fallback");
    const sessionAgeMs = getRealtimeSessionAgeMs();

    // AO66A-HF3:
    // During the first seconds of a Realtime call, browser/WebRTC callbacks can
    // report "no audio", "dc closed", "mic ended" or fallback conditions before
    // the model has enough time to produce audio. Do not convert those early
    // signals into /api/realtime/end. Keep the timebox alive and wait for either
    // a manual stop, TTL expiration, or a real post-warmup failure.
    if (shouldHoldRealtimeInsteadOfEnding(reasonText, sessionAgeMs)) {
      try {
        console.warn("REALTIME_FALLBACK_HELD_EARLY", {
          reason: reasonText,
          sessionId: rtcSessionIdRef.current || null,
          sessionAgeMs,
          shouldDisarm,
          marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        });
      } catch {}
      logRealtimeStep("ao66a_hf3:fallback_held_early", {
        reason: reasonText,
        sessionAgeMs,
        shouldDisarm,
        marker: ORKIO_AO66R_HF4_BUILD_MARKER,
      });
      setV2vPhase("listening");
      updateRealtimePremiumStatus("listening", "Realtime ativo. Aguardando áudio ou transcrição.");
      setUploadStatus("⚡ Realtime ativo. Mantive a sessão aberta para aguardar a voz.");
      setTimeout(() => setUploadStatus(""), 2500);
      return;
    }

    if (rtcFallbackActiveRef.current && shouldDisarm) return;
    rtcFallbackActiveRef.current = true;
    clearRealtimeResponseTimeout();
    clearRealtimeIdleFollowup();
    logRealtimeStep("fallback:activate", { reason: reasonText, shouldDisarm });
    try { await stopRealtime(reasonText); } catch {}
    if (shouldDisarm) {
      setRealtimeMode(false);
      realtimeModeRef.current = false;
      setV2vPhase("fallback");
      setUploadStatus("Realtime fallback active.");
      setTimeout(() => setUploadStatus(""), 1200);
      try {
        setVoiceMode(true);
        voiceModeRef.current = true;
        if (!micEnabledRef.current) startMic();
      } catch {}
    } else {
      setV2vPhase("error");
      setUploadStatus(`❌ Realtime diagnostic: ${reasonText}`);
      setTimeout(() => setUploadStatus(""), 2500);
    }
  }

  async function guardAndMaybeBlockRealtimeTranscript(raw) {
    const message = (raw || "").toString().trim();
    if (!message) return false;
    try {
      const res = await guardRealtimeTranscript({ thread_id: rtcThreadIdRef.current || threadId || null, message });
      const payload = res?.data || {};
      if (!payload?.blocked) return false;
      setRtcReadyToRespond(false);
      rtcLastFinalTranscriptRef.current = "";
      queueRealtimeEvent({ event_type: "response.final", role: "assistant", content: payload.reply || "", is_final: true, meta: { source: "server_guard" } });
      commitRealtimeAssistantFinal(payload.reply || "", { source: "server_guard" });
      return true;
    } catch (err) {
      console.warn("[Realtime] guard check failed", err);
      return false;
    }
  }

  // ORKIO_AO60H_REALTIME_MOBILE_AUDIO_TRANSCRIPT_LIFECYCLE
  function clearRealtimeAudioWatchdog() {
    if (rtcAudioWatchdogRef.current) {
      try { clearInterval(rtcAudioWatchdogRef.current); } catch {}
      rtcAudioWatchdogRef.current = null;
    }
  }

  function ensureRealtimeAudioOutput(reason = "repair") {
    try {
      const audioEl = rtcAudioElRef.current;
      if (!audioEl) return false;

      try { audioEl.autoplay = true; } catch {}
      try { audioEl.playsInline = true; } catch {}
      try { audioEl.muted = false; } catch {}
      try { audioEl.volume = 1; } catch {}
      try { audioEl.setAttribute("playsinline", ""); } catch {}
      try { audioEl.setAttribute("webkit-playsinline", ""); } catch {}

      if (rtcRemoteStreamRef.current && audioEl.srcObject !== rtcRemoteStreamRef.current) {
        try { audioEl.srcObject = rtcRemoteStreamRef.current; } catch {}
      }

      if (!audioEl.isConnected && typeof document !== "undefined" && document.body) {
        try {
          audioEl.style.display = "none";
          document.body.appendChild(audioEl);
        } catch {}
      }

      const shouldPlay = Boolean(audioEl.srcObject) && (audioEl.paused || Number(audioEl.volume || 0) < 0.95 || audioEl.muted);
      if (shouldPlay) {
        const p = audioEl.play?.();
        if (p && typeof p.catch === "function") {
          p.catch((err) => {
            logRealtimeStep("audio:play_blocked", {
              reason,
              message: err?.message || null,
              visibility: typeof document !== "undefined" ? document.visibilityState : null,
            });
          });
        }
      }

      logRealtimeStep("audio:output_repaired", {
        reason,
        paused: !!audioEl.paused,
        muted: !!audioEl.muted,
        volume: Number(audioEl.volume || 0),
        connected: !!audioEl.isConnected,
        hasStream: !!audioEl.srcObject,
      });
      return true;
    } catch (err) {
      logRealtimeStep("audio:repair_failed", { reason, message: err?.message || null });
      return false;
    }
  }

  function flushRealtimePartialTranscript(reason = "partial_flush") {
    try {
      if (rtcAssistantFinalCommittedRef.current) return false;
      const textFinal = (rtcTextBufRef.current || "").trim();
      const audioFinal = (rtcAudioTranscriptBufRef.current || "").trim();
      const finalText = textFinal || audioFinal;
      if (!finalText) return false;
      logRealtimeStep("runtime:partial_transcript_flushed", {
        reason,
        source: textFinal ? "text_buffer" : "audio_transcript_buffer",
        finalText,
      });
      commitRealtimeAssistantFinal(finalText, { source: reason });
      rtcTextBufRef.current = "";
      rtcAudioTranscriptBufRef.current = "";
      return true;
    } catch (err) {
      logRealtimeStep("runtime:partial_transcript_flush_failed", { reason, message: err?.message || null });
      return false;
    }
  }

  function startRealtimeAudioWatchdog() {
    clearRealtimeAudioWatchdog();
    rtcAudioWatchdogRef.current = setInterval(() => {
      try {
        if (!realtimeModeRef.current || !rtcSessionIdRef.current) return;
        ensureRealtimeAudioOutput("watchdog");
      } catch {}
    }, 2500);
  }

  function isRealtimeDocumentVisible() {
    try {
      if (typeof document === "undefined") return true;
      return document.visibilityState !== "hidden";
    } catch {
      return true;
    }
  }

  async function requestRealtimeWakeLock(reason = "realtime_active") {
    try {
      if (typeof navigator === "undefined" || !navigator.wakeLock?.request) {
        logRealtimeStep("mobile:wake_lock_not_supported", { reason });
        return false;
      }

      if (!isRealtimeDocumentVisible()) {
        logRealtimeStep("mobile:wake_lock_deferred_hidden", { reason });
        return false;
      }

      const existing = rtcWakeLockRef.current;
      if (existing && existing.released !== true) {
        logRealtimeStep("mobile:wake_lock_already_active", { reason });
        return true;
      }

      const lock = await navigator.wakeLock.request("screen");
      rtcWakeLockRef.current = lock;

      try {
        lock.addEventListener?.("release", () => {
          logRealtimeStep("mobile:wake_lock_released", {
            reason,
            wanted: Boolean(rtcWakeLockWantedRef.current),
            realtime: Boolean(realtimeModeRef.current || rtcSessionIdRef.current || rtcConnectingRef.current),
            visibility: typeof document !== "undefined" ? document.visibilityState : null,
          });

          // Reacquire when release was caused by transient browser/OS behavior while Realtime remains foreground-active.
          if (
            rtcWakeLockWantedRef.current &&
            (realtimeModeRef.current || rtcSessionIdRef.current || rtcConnectingRef.current) &&
            isRealtimeDocumentVisible()
          ) {
            setTimeout(() => {
              try { void requestRealtimeWakeLock("release_reacquire"); } catch {}
            }, 600);
          }
        });
      } catch {}

      logRealtimeStep("mobile:wake_lock_acquired", { reason });
      return true;
    } catch (err) {
      logRealtimeStep("mobile:wake_lock_unavailable", { reason, message: err?.message || null });
      return false;
    }
  }

  function clearRealtimeWakeLockGuard(reason = "wake_guard_clear") {
    try {
      if (rtcWakeLockGuardTimerRef.current) {
        clearInterval(rtcWakeLockGuardTimerRef.current);
        rtcWakeLockGuardTimerRef.current = null;
      }
      logRealtimeStep("mobile:wake_lock_guard_cleared", { reason });
    } catch {}
  }

  function startRealtimeWakeLockGuard(reason = "realtime_active") {
    try {
      rtcWakeLockWantedRef.current = true;
      void requestRealtimeWakeLock(reason);

      clearRealtimeWakeLockGuard("restart");
      rtcWakeLockGuardTimerRef.current = setInterval(() => {
        try {
          if (!rtcWakeLockWantedRef.current) return;
          if (!(realtimeModeRef.current || rtcSessionIdRef.current || rtcConnectingRef.current)) return;
          if (!isRealtimeDocumentVisible()) return;
          const lock = rtcWakeLockRef.current;
          if (!lock || lock.released === true) {
            void requestRealtimeWakeLock("guard_tick_reacquire");
          }
        } catch {}
      }, 30000);

      logRealtimeStep("mobile:wake_lock_guard_started", { reason });
    } catch {}
  }

  async function releaseRealtimeWakeLock(reason = "realtime_stop") {
    try {
      rtcWakeLockWantedRef.current = false;
      clearRealtimeWakeLockGuard(reason);
      const lock = rtcWakeLockRef.current;
      rtcWakeLockRef.current = null;
      if (lock) await lock.release?.();
      logRealtimeStep("mobile:wake_lock_release_requested", { reason });
    } catch {}
  }

  // ORKIO_AO60I_REALTIME_TIMEBOX_COOLDOWN_COUNTER
  function formatRealtimeCountdown(totalSeconds) {
    const safe = Math.max(0, Math.ceil(Number(totalSeconds || 0)));
    const mm = String(Math.floor(safe / 60)).padStart(2, "0");
    const ss = String(safe % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function formatRealtimeDurationLabel(totalSeconds) {
    const safe = Math.max(1, Math.ceil(Number(totalSeconds || REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS)));
    if (safe < 60) return `${safe} segundo${safe === 1 ? "" : "s"}`;
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    if (hours > 0) {
      const hourLabel = `${hours} hora${hours === 1 ? "" : "s"}`;
      if (!minutes && !seconds) return hourLabel;
      const minuteLabel = minutes ? `, ${minutes} minuto${minutes === 1 ? "" : "s"}` : "";
      const secondLabel = seconds ? ` e ${seconds} segundo${seconds === 1 ? "" : "s"}` : "";
      return `${hourLabel}${minuteLabel}${secondLabel}`;
    }
    if (!seconds) return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
    return `${minutes} minuto${minutes === 1 ? "" : "s"} e ${seconds} segundo${seconds === 1 ? "" : "s"}`;
  }

  function resolveRealtimeStartTimeboxSeconds(startPayload = null) {
    // AO61A-HF3: backend remaining_seconds is the runtime source of truth for resumed sessions.
    try {
      const timebox = startPayload?.timebox || {};
      const remainingSeconds = Number(timebox?.remaining_seconds);
      const maxSeconds = Number(timebox?.max_seconds);
      const policyRemaining = Number(rtcTimeboxPolicyRef.current?.remainingSeconds);
      const policyMax = Number(rtcTimeboxPolicyRef.current?.maxSeconds);

      const candidates = [remainingSeconds, policyRemaining, maxSeconds, policyMax, REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS];
      for (const candidate of candidates) {
        if (Number.isFinite(candidate) && candidate > 0) return Math.max(1, Math.ceil(candidate));
      }
    } catch {}
    return REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS;
  }

  function shouldShowRealtimeCounter() {
    // HF6.2 — usuários públicos/não-admin devem ver o timer de 2 minutos.
    // Admin/founder-admin permanece sem contador público.
    return Boolean(
      REALTIME_FRONTEND_HARD_TIMEBOX_ENABLED === true
      && SUMMIT_VOICE_MODE === "realtime"
      && isRealtimeTimeboxLimitedUser()
      && (
        rtcTimeboxRemaining !== null
        || rtcCooldownRemaining > 0
      )
    );
  }

  function getRealtimeCounterLabel() {
    if (rtcCooldownRemaining > 0 && !realtimeMode) {
      return `🕒 ${formatRealtimeCountdown(rtcCooldownRemaining)}`;
    }
    if (rtcTimeboxRemaining !== null) {
      return `⏳ ${formatRealtimeCountdown(rtcTimeboxRemaining)}`;
    }
    if (realtimeMode) {
      return `⏳ ${formatRealtimeCountdown(rtcTimeboxPolicyRef.current?.maxSeconds || REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS)}`;
    }
    return "";
  }

  function getRealtimeFixedCounterTitle() {
    if (rtcCooldownRemaining > 0 && !realtimeMode) return "🕒 Cooldown";
    if (rtcTimeboxRemaining !== null || realtimeMode) return "🎙️ Realtime";
    return "Realtime";
  }

  function getRealtimeFixedCounterSubtitle() {
    if (rtcCooldownRemaining > 0 && !realtimeMode) return "O chat por texto continua disponível.";
    if (rtcPremiumStatusDetail) return rtcPremiumStatusDetail;
    if (rtcPremiumStatus) return getRealtimePremiumStatusLabel();
    if (realtimeMode) return "Ouvindo com tela ativa.";
    return "";
  }

  function updateRealtimePremiumStatus(status = null, detail = "") {
    // AO61A_REALTIME_PREMIUM_UX_COOLDOWN_TRANSCRIPTION_LOCK
    try { setRtcPremiumStatus(status || null); } catch {}
    try { setRtcPremiumStatusDetail(String(detail || "")); } catch {}
  }

  // AO66A_REALTIME_FULLSCREEN_CLOCK_TRANSCRIPT_SUMMARY
  // AO64D-HF1: Summary lifecycle moved to useRealtimeTranscriptSummary.
  // Keep these thin wrappers so the existing Realtime/WebRTC flow remains untouched.
  function normalizeRealtimeTranscriptText(value) {
    return realtimeSummary.normalizeText(value);
  }

  function resetRealtimeTranscriptSession(reason = "reset") {
    try { rtcRealtimeInlineUserKeyRef.current = ""; } catch {}
    try { rtcRealtimeInlineAssistantKeyRef.current = ""; } catch {}
    return realtimeSummary.reset(reason);
  }

  function appendRealtimeTranscriptTurn(role, content, meta = {}) {
    return realtimeSummary.appendTurn(role, content, meta);
  }

  function buildRealtimeTranscriptSummary(reason = "ended", extra = {}) {
    return realtimeSummary.build(reason, extra);
  }

  function publishRealtimeTranscriptSummary(reason = "ended", extra = {}) {
    // AO68E-HF1: keep summary data available for audit, but never open a separate
    // transcript screen. The conversation belongs to the canonical chat timeline.
    try { setRealtimeTranscriptSummaryOpen(false); } catch {}
    return realtimeSummary.publish(reason, { ...(extra || {}), forceOpen: false });
  }


  // RTB-05_REALTIME_CHAT_PERSISTENCE_AND_DOC_CONTEXT
  // Mantém turnos finais do Realtime visíveis no chat após reload/reconciliação
  // Documentos agora são resolvidos pelo backend RTB-07 quando necessário.
  function getRealtimeInlineCacheKey(targetThreadId = "") {
    const tid = String(targetThreadId || resolveRealtimeThreadId() || threadId || activeThreadIdRef.current || "").trim();
    return tid ? `orkio_realtime_inline_turns_v1:${tid}` : "";
  }

  function normalizeRealtimeCacheText(value = "") {
    return normalizeRealtimeTranscriptText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function readRealtimeInlineCachedTurns(targetThreadId = "") {
    try {
      const key = getRealtimeInlineCacheKey(targetThreadId);
      if (!key || typeof window === "undefined" || !window.localStorage) return [];
      const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          ...item,
          role: String(item.role || "").toLowerCase() === "assistant" ? "assistant" : "user",
          content: normalizeRealtimeTranscriptText(item.content || ""),
          created_at: Number(item.created_at || 0) || Math.floor(Date.now() / 1000),
          meta: {
            ...(item.meta && typeof item.meta === "object" ? item.meta : {}),
            realtime_inline_turn: true,
            realtime_cache_restored: true,
          },
        }))
        .filter((item) => item.content);
    } catch {
      return [];
    }
  }

  function messageEquivalentForRealtimeCache(a, b) {
    const roleA = String(a?.role || "").toLowerCase() === "assistant" ? "assistant" : "user";
    const roleB = String(b?.role || "").toLowerCase() === "assistant" ? "assistant" : "user";
    if (roleA !== roleB) return false;
    return normalizeRealtimeCacheText(a?.content || "") === normalizeRealtimeCacheText(b?.content || "");
  }

  function mergeRealtimeInlineCachedTurns(messagesLike = [], targetThreadId = "") {
    const base = Array.isArray(messagesLike) ? messagesLike : [];
    const cached = readRealtimeInlineCachedTurns(targetThreadId);
    if (!cached.length) return base;

    const merged = [...base];
    for (const turn of cached) {
      const exists = merged.some((item) => messageEquivalentForRealtimeCache(item, turn));
      if (!exists) merged.push(turn);
    }
    return orderChatMessages(merged);
  }

  function cacheRealtimeInlineChatTurn(messageLike, targetThreadId = "") {
    try {
      const tid = String(targetThreadId || threadId || activeThreadIdRef.current || "").trim();
      const key = getRealtimeInlineCacheKey(tid);
      if (!key || typeof window === "undefined" || !window.localStorage) return false;

      const cleanText = normalizeRealtimeTranscriptText(messageLike?.content || "");
      if (!cleanText) return false;

      const item = {
        id: String(messageLike?.id || `rtc_cache_${Date.now()}`),
        role: String(messageLike?.role || "").toLowerCase() === "assistant" ? "assistant" : "user",
        content: cleanText,
        agent_id: messageLike?.agent_id || null,
        agent_name: messageLike?.agent_name || (String(messageLike?.role || "").toLowerCase() === "assistant" ? "Orkio" : "Você"),
        final_speaker: messageLike?.final_speaker || messageLike?.agent_name || null,
        visible_agent: messageLike?.visible_agent || messageLike?.agent_name || null,
        created_at: Number(messageLike?.created_at || 0) || Math.floor(Date.now() / 1000),
        meta: {
          ...(messageLike?.meta && typeof messageLike.meta === "object" ? messageLike.meta : {}),
          realtime_inline_turn: true,
          realtime_cached_locally: true,
          realtime_session_id: rtcSessionIdRef.current || lastRealtimeSessionId || null,
        },
      };

      const current = readRealtimeInlineCachedTurns(tid);
      const exists = current.some((existing) => messageEquivalentForRealtimeCache(existing, item));
      const next = exists ? current : current.concat([item]);
      const trimmed = next.slice(-80);
      window.localStorage.setItem(key, JSON.stringify(trimmed));
      return true;
    } catch {
      return false;
    }
  }

  async function persistRealtimeInlineChatTurnToThread(messageLike, targetThreadId = "") {
    try {
      const tid = String(targetThreadId || threadId || activeThreadIdRef.current || "").trim();
      const cleanText = normalizeRealtimeTranscriptText(messageLike?.content || "");
      if (!tid || !cleanText) return false;

      // Best-effort: se o backend aceitar POST /api/messages, a transcrição
      // passa a sobreviver também em outro navegador/dispositivo. Se não aceitar,
      // o cache local acima preserva a UX sem quebrar a sessão.
      await apiFetch("/api/messages", {
        method: "POST",
        token,
        org: tenant,
        skipAuthRedirect: true,
        body: {
          thread_id: tid,
          role: String(messageLike?.role || "").toLowerCase() === "assistant" ? "assistant" : "user",
          content: cleanText,
          agent_id: messageLike?.agent_id || null,
          agent_name: messageLike?.agent_name || null,
          source: "realtime_inline_transcript",
          meta: {
            ...(messageLike?.meta && typeof messageLike.meta === "object" ? messageLike.meta : {}),
            realtime_inline_turn: true,
            realtime_session_id: rtcSessionIdRef.current || lastRealtimeSessionId || null,
            client_generated_id: messageLike?.id || null,
            marker: "RTB-05_REALTIME_CHAT_PERSISTENCE",
          },
        },
      });
      return true;
    } catch (err) {
      try {
        console.info("RTB05_REALTIME_INLINE_PERSIST_BEST_EFFORT_SKIPPED", {
          status: err?.status || null,
          message: err?.message || null,
        });
      } catch {}
      return false;
    }
  }

  function buildRealtimeInlineDedupeKey(role, content) {
    const safeRole = String(role || "").trim().toLowerCase() === "assistant" ? "assistant" : "user";
    const safeContent = normalizeRealtimeTranscriptText(content)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    return `${safeRole}:${safeContent}`;
  }

  function appendRealtimeInlineChatTurn(role, content, meta = {}) {
    const cleanText = normalizeRealtimeTranscriptText(content);
    if (!cleanText) return false;

    const safeRole = String(role || "").trim().toLowerCase() === "assistant" ? "assistant" : "user";
    const dedupeKey = buildRealtimeInlineDedupeKey(safeRole, cleanText);
    if (!dedupeKey || dedupeKey.endsWith(":")) return false;

    const dedupeRef = safeRole === "assistant"
      ? rtcRealtimeInlineAssistantKeyRef
      : rtcRealtimeInlineUserKeyRef;

    if (String(dedupeRef.current || "") === dedupeKey) return false;
    dedupeRef.current = dedupeKey;

    const now = Math.floor(Date.now() / 1000);
    const sessionId = rtcSessionIdRef.current || lastRealtimeSessionId || null;
    const displayUserName = String(user?.name || user?.full_name || "Você").trim() || "Você";

    setMessages((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const last = list[list.length - 1] || null;
      const lastKey = last?.meta?.realtime_inline_turn
        ? buildRealtimeInlineDedupeKey(last?.role, last?.content)
        : "";

      if (lastKey && lastKey === dedupeKey) return list;

      const realtimeSpeakerName = safeRole === "assistant"
        ? resolveRealtimeVisibleSpeakerName(cleanText, rtcHostAgentNameRef.current || activeRuntimeAgent || "Orkio")
        : displayUserName;

      const realtimeMessage = {
        id: `rtc_${safeRole}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        role: safeRole,
        content: cleanText,
        agent_id: safeRole === "assistant" ? (rtcHostAgentIdRef.current || canonicalAgentSlug(realtimeSpeakerName) || "orkio") : null,
        agent_name: realtimeSpeakerName,
        final_speaker: realtimeSpeakerName,
        visible_agent: realtimeSpeakerName,
        created_at: now,
        meta: {
          ...(meta && typeof meta === "object" ? meta : {}),
          realtime_inline_turn: true,
          realtime_session_id: sessionId,
          source: meta?.source || "realtime_final_transcript",
          marker: "AO68E-HF1_REALTIME_INLINE_CHAT",
        },
      };

      const realtimeTargetThreadId = resolveRealtimeThreadId() || rtcThreadIdRef.current || threadId || activeThreadIdRef.current || "";
      try { cacheRealtimeInlineChatTurn(realtimeMessage, realtimeTargetThreadId); } catch {}
      try { void persistRealtimeInlineChatTurnToThread(realtimeMessage, realtimeTargetThreadId); } catch {}

      return list.concat([realtimeMessage]);
    });

    try {
      console.log("REALTIME_INLINE_CHAT_TURN_COMMITTED", {
        role: safeRole,
        sessionId,
        length: cleanText.length,
        marker: "AO68E-HF1_REALTIME_INLINE_CHAT",
      });
    } catch {}

    return true;
  }

  function getRealtimePremiumStatusLabel() {
    if (rtcCooldownRemaining > 0 && !realtimeMode) {
      return `🕒 Voz disponível novamente em ${formatRealtimeCountdown(rtcCooldownRemaining)}`;
    }
    if (rtcPremiumStatus === "connecting") return "🎙️ Conectando...";
    if (rtcPremiumStatus === "listening") return "🎙️ Ouvindo...";
    if (rtcPremiumStatus === "transcribing") return "📝 Transcrição ativa";
    if (rtcPremiumStatus === "responding") {
      const speaker = resolveRealtimeVisibleSpeakerName("", rtcHostAgentNameRef.current || activeRuntimeAgent || "Orkio");
      return `🔊 ${speaker} respondendo...`;
    }
    if (rtcPremiumStatus === "ending") return "⚠️ Encerrando em breve...";
    if (rtcPremiumStatus === "cooldown") {
      return `🕒 Voz disponível novamente em ${formatRealtimeCountdown(rtcCooldownRemaining || REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS)}`;
    }
    if (realtimeMode) return "🎙️ Ouvindo...";
    return "";
  }

  function isRealtimeTimeboxLimitedUser() {
    if (REALTIME_FRONTEND_HARD_TIMEBOX_ENABLED !== true) return false;

    // Admin/founder-admin and backend-declared bypass never use the public beta limit.
    if (canAccessAdmin || rtcAdminTimeboxBypassRef.current === true || rtcAdminTimeboxBypass === true) return false;

    // AO72B-HF1: every public user receives the 2-minute local guard even while
    // the recovery backend still reports advisory_only_esg. Server-side,
    // cross-device enforcement remains a separate mandatory backend patch.
    return true;
  }

  function clearRealtimeTimeboxTimer(options = {}) {
    try {
      if (rtcTimeboxTimerRef.current) clearInterval(rtcTimeboxTimerRef.current);
    } catch {}
    try {
      if (rtcTimeboxHardStopTimerRef.current) clearTimeout(rtcTimeboxHardStopTimerRef.current);
    } catch {}
    rtcTimeboxTimerRef.current = null;
    rtcTimeboxHardStopTimerRef.current = null;
    rtcTimeboxDeadlineRef.current = 0;
    if (!options?.preserveDisplay) setRtcTimeboxRemaining(null);
  }

  function clearRealtimeAnnouncementFallback() {
    try {
      if (rtcTimeboxAnnouncementFallbackTimerRef.current) {
        clearTimeout(rtcTimeboxAnnouncementFallbackTimerRef.current);
      }
    } catch {}
    rtcTimeboxAnnouncementFallbackTimerRef.current = null;
  }

  function clearRealtimeFinalStopTimer() {
    try {
      if (rtcTimeboxFinalStopTimerRef.current) {
        clearTimeout(rtcTimeboxFinalStopTimerRef.current);
      }
    } catch {}
    rtcTimeboxFinalStopTimerRef.current = null;
  }

  function resetRealtimeTimeboxConversationState() {
    clearRealtimeAnnouncementFallback();
    clearRealtimeFinalStopTimer();
    try { rtcTimeboxAnnouncementPendingRef.current = false; } catch {}
    try { rtcTimeboxAnnouncementResponseIdRef.current = null; } catch {}
    try { rtcTimeboxAnnouncementTranscriptRef.current = ""; } catch {}
    try { rtcTimeboxAnnouncementAudioSeenRef.current = false; } catch {}
    try { rtcOpeningMicrophoneMutedRef.current = false; } catch {}
    try { rtcTimeboxClosingRef.current = false; } catch {}
    try { rtcTimeboxClosingNoticeSentRef.current = false; } catch {}
    try { rtcTimeboxClosingNoticeDoneRef.current = false; } catch {}
    try { rtcTimeboxClosingResponseIdRef.current = null; } catch {}
    try { rtcTimeboxFinalStopScheduledRef.current = false; } catch {}
  }

  function readPersistedRealtimeCooldownUntil() {
    if (typeof window === "undefined") return 0;
    try {
      const value = Number(window.localStorage?.getItem(REALTIME_COOLDOWN_STORAGE_KEY) || 0);
      return Number.isFinite(value) && value > Date.now() ? value : 0;
    } catch {
      return 0;
    }
  }

  function persistRealtimeCooldownUntil(until = 0) {
    if (typeof window === "undefined") return;
    try {
      if (Number(until) > Date.now()) {
        window.localStorage?.setItem(REALTIME_COOLDOWN_STORAGE_KEY, String(Math.ceil(Number(until))));
      } else {
        window.localStorage?.removeItem(REALTIME_COOLDOWN_STORAGE_KEY);
      }
    } catch {}
  }

  function clearRealtimeCooldownTimer() {
    try {
      if (rtcCooldownTimerRef.current) clearInterval(rtcCooldownTimerRef.current);
    } catch {}
    rtcCooldownTimerRef.current = null;
  }

  function startRealtimeCooldown(seconds = REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS, reason = "cooldown") {
    // HF6.1 — cooldown local silenciado; backend é a autoridade do limite.
    if (
      REALTIME_FRONTEND_HARD_TIMEBOX_ENABLED !== true
    ) {

      clearRealtimeCooldownTimer();

      rtcCooldownUntilRef.current = 0;

      setRtcCooldownRemaining(0);

      return;
    }

    // ORKIO_AO60K_HF2_429_COOLDOWN_HARDENING
    // If the backend returns 429/Retry-After, the UI must enter cooldown even when
    // the local cached user object is stale or incorrectly looks like admin.
    const duration = Math.max(1, Math.ceil(Number(seconds || REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS)));
    const existingUntil = readPersistedRealtimeCooldownUntil();
    const until = Math.max(existingUntil, Date.now() + duration * 1000);
    rtcCooldownUntilRef.current = until;
    persistRealtimeCooldownUntil(until);

    clearRealtimeCooldownTimer();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((rtcCooldownUntilRef.current - Date.now()) / 1000));
      setRtcCooldownRemaining(remaining);
      if (remaining > 0) {
        updateRealtimePremiumStatus("cooldown", `O chat por texto continua disponível. Liberação em ${formatRealtimeCountdown(remaining)}.`);
      }
      if (remaining <= 0) {
        clearRealtimeCooldownTimer();
        rtcCooldownUntilRef.current = 0;
        persistRealtimeCooldownUntil(0);
        updateRealtimePremiumStatus(null, "");
      }
    };

    tick();
    rtcCooldownTimerRef.current = setInterval(tick, 1000);
    logRealtimeStep("timebox:cooldown_started", { reason, seconds: duration, marker: ORKIO_AO61A_BUILD_MARKER });
  }

  // ORKIO_AO60K_HF5_FRONTEND_MOBILE_REALTIME_RESTART_TRANSCRIPT_FIX
  function clearRealtimeStartupWatchdog() {
    try {
      if (rtcStartupWatchdogTimerRef.current) clearTimeout(rtcStartupWatchdogTimerRef.current);
    } catch {}
    rtcStartupWatchdogTimerRef.current = null;
  }

  function clearRealtimeActivationProbe() {
    try {
      if (rtcActivationProbeTimerRef.current) clearTimeout(rtcActivationProbeTimerRef.current);
    } catch {}
    rtcActivationProbeTimerRef.current = null;
  }

  function hardResetRealtimeClientState(reason = "hard_reset") {
    logRealtimeStep("hf5:hard_reset_begin", { reason, sessionId: rtcSessionIdRef.current || null });
    try { invalidateRealtimeActiveSession(reason || "hard_reset"); } catch {}
    try {
      rtcManualSwitchGateRef.current = {
        locked: false,
        generation: 0,
        generation_id: "",
        target_agent_slug: "orkio",
        phase: "READY",
        session_update_sent: false,
        started_at_ms: 0,
      };
      rtcPendingSessionUpdateRef.current = null;
    } catch {}

    try { clearRealtimeResponseTimeout(); } catch {}
    try { clearRealtimeAutoResponseFallback(); } catch {}
    try { clearRealtimeIdleFollowup(); } catch {}
    try { clearRealtimeAudioWatchdog(); } catch {}
    try { clearRealtimeStartupWatchdog(); } catch {}
    try { clearRealtimeActivationProbe(); } catch {}
    try { clearRealtimeTimeboxTimer(); } catch {}
    try { rtcConversationStartedRef.current = false; } catch {}
    try { rtcTimeboxStartedRef.current = false; } catch {}
    try { rtcPendingTimeboxSecondsRef.current = null; } catch {}
    try { resetRealtimeTimeboxConversationState(); } catch {}
    try { clearRealtimeLivePoll(); } catch {}
    try {
      if (rtcFlushTimerRef.current) {
        clearInterval(rtcFlushTimerRef.current);
        rtcFlushTimerRef.current = null;
      }
    } catch {}

    try {
      const dc = rtcDcRef.current;
      rtcDcRef.current = null;
      if (dc) {
        try { dc.onopen = null; } catch {}
        try { dc.onmessage = null; } catch {}
        try { dc.onerror = null; } catch {}
        try { dc.onclose = null; } catch {}
        try { dc.close?.(); } catch {}
      }
    } catch {}

    try {
      const pc = rtcPcRef.current;
      rtcPcRef.current = null;
      if (pc) {
        try { pc.ontrack = null; } catch {}
        try { pc.onconnectionstatechange = null; } catch {}
        try { pc.oniceconnectionstatechange = null; } catch {}
        try { pc.getSenders?.().forEach((sender) => { try { sender.track?.stop?.(); } catch {} }); } catch {}
        try { pc.getReceivers?.().forEach((receiver) => { try { receiver.track?.stop?.(); } catch {} }); } catch {}
        try { pc.close?.(); } catch {}
      }
    } catch {}

    try {
      const a = rtcAudioElRef.current;
      rtcAudioElRef.current = null;
      rtcRemoteStreamRef.current = null;
      if (a) {
        try { a.pause?.(); } catch {}
        try { a.srcObject = null; } catch {}
        try { if (a.isConnected) a.remove?.(); } catch {}
      }
    } catch {}

    try {
      const processing = rtcAudioProcessingRef.current;
      rtcAudioProcessingRef.current = null;
      if (processing) {
        try { processing.destination?.stream?.getTracks?.().forEach((t) => { try { t.stop?.(); } catch {} }); } catch {}
        try { processing.rawStream?.getTracks?.().forEach((t) => { try { t.stop?.(); } catch {} }); } catch {}
        try { processing.ctx?.close?.(); } catch {}
      }
    } catch {}

    try { rtcEventQueueRef.current = []; } catch {}
    try { realtimeBridgeBusyRef.current = false; } catch {}
    try { realtimeBridgeLastKeyRef.current = ""; } catch {}
    try { rtcSeenBackendResponseIdsRef.current = new Set(); } catch {}
    try { rtcTextBufRef.current = ""; } catch {}
    try { rtcAudioTranscriptBufRef.current = ""; } catch {}
    try { rtcLastFinalTranscriptRef.current = ""; } catch {}
    try { rtcLastAssistantFinalRef.current = ""; } catch {}
    try { rtcRealtimeDocumentBridgeKeyRef.current = ""; } catch {}
    try { rtcAssistantFinalCommittedRef.current = false; } catch {}
    try { rtcAssistantFinalMessageIdRef.current = null; } catch {}
    try { rtcAssistantFinalTextRef.current = ""; } catch {}
    try { rtcAssistantPendingFinalTextRef.current = ""; } catch {}
    try { rtcAssistantPendingFinalSourceRef.current = ""; } catch {}
    try { if (rtcAssistantPendingFinalTimerRef.current) clearTimeout(rtcAssistantPendingFinalTimerRef.current); rtcAssistantPendingFinalTimerRef.current = null; } catch {}
    try { if (rtcTimeboxHardStopTimerRef.current) clearTimeout(rtcTimeboxHardStopTimerRef.current); rtcTimeboxHardStopTimerRef.current = null; rtcTimeboxDeadlineRef.current = 0; } catch {}
    try { clearRealtimePendingAutoStop(); } catch {}
    try { rtcSessionStartedAtRef.current = 0; } catch {}
    try { rtcLastStopReasonRef.current = ""; } catch {}
    try { rtcResponseInFlightRef.current = false; } catch {}
    try { rtcResponseAuthorityRef.current = null; } catch {}
    try { rtcResponseCreateDedupeRef.current = new Set(); } catch {}
    try { rtcFinalCommitDedupeRef.current = new Set(); } catch {}
    try { rtcLastResponseCreatedAtRef.current = 0; } catch {}
    try { rtcActivationProbeSentRef.current = false; } catch {}
    try { rtcFallbackActiveRef.current = false; } catch {}
    try { rtcLivePollSessionIdRef.current = null; } catch {}
    try { setRtcReadyToRespond(false); } catch {}
    try { setRtcPunctStatus(null); } catch {}

    logRealtimeStep("hf5:hard_reset_done", { reason });
  }

  function startRealtimeStartupWatchdog(sessionId, reason = "start") {
    clearRealtimeStartupWatchdog();
    if (!sessionId) return;
    rtcStartupWatchdogTimerRef.current = setTimeout(() => {
      try {
        if (!realtimeModeRef.current) return;
        if (rtcSessionIdRef.current !== sessionId) return;

        const dcReady = rtcDcRef.current?.readyState === "open";
        const pcState = String(rtcPcRef.current?.connectionState || rtcPcRef.current?.iceConnectionState || "").toLowerCase();
        if (dcReady) return;

        logRealtimeStep("ao66r_hf4:startup_watchdog_datachannel_not_ready", {
          sessionId,
          reason,
          pcState,
          ageMs: getRealtimeSessionAgeMs(),
          marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        });
        updateRealtimePremiumStatus("connecting", "Ainda estabilizando a conexão de voz. Não encerrei a sessão automaticamente.");
        setUploadStatus("⚡ A voz ainda está estabilizando. Aguarde alguns segundos ou toque em Encerrar se quiser cancelar.");
        setTimeout(() => setUploadStatus(""), 4500);
        // AO66A-HF2: do not auto-end at the old 15s watchdog point.
        // The user may be on mobile/PWA and the datachannel can settle late.
        return;
      } catch {}
    }, 15000);
  }

  function extractRealtimeRetryAfterSeconds(err) {
    // ORKIO_AO60K_HF2_429_COOLDOWN_HARDENING
    // Accept all common API error shapes used by apiFetch/fetch wrappers and CDNs.
    const candidates = [
      err?.retry_after_seconds,
      err?.retryAfter,
      err?.retry_after,
      err?.retryAfterSeconds,
      err?.data?.retry_after_seconds,
      err?.data?.retryAfter,
      err?.data?.retry_after,
      err?.data?.detail?.retry_after_seconds,
      err?.data?.detail?.retryAfter,
      err?.detail?.retry_after_seconds,
      err?.detail?.retryAfter,
      err?.payload?.retry_after_seconds,
      err?.payload?.retryAfter,
      err?.response?.data?.retry_after_seconds,
      err?.response?.data?.detail?.retry_after_seconds,
      err?.response?.data?.detail?.retryAfter,
      err?.headers?.["Retry-After"],
      err?.headers?.["retry-after"],
      err?.response?.headers?.["Retry-After"],
      err?.response?.headers?.["retry-after"],
    ];
    for (const value of candidates) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return Math.ceil(n);
    }

    try {
      const raw = [
        err?.message,
        err?.userMessage,
        typeof err?.detail === "string" ? err.detail : "",
        typeof err?.data === "string" ? err.data : "",
        typeof err?.payload === "string" ? err.payload : "",
      ].filter(Boolean).join(" ");
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : (raw.trim().startsWith("{") ? JSON.parse(raw) : null);
      const n = Number(
        parsed?.retry_after_seconds ||
        parsed?.retryAfter ||
        parsed?.detail?.retry_after_seconds ||
        parsed?.detail?.retryAfter ||
        parsed?.data?.retry_after_seconds ||
        parsed?.data?.retryAfter
      );
      if (Number.isFinite(n) && n > 0) return Math.ceil(n);
    } catch {}

    return null;
  }

  function isRealtimeCooldownOrRateLimitError(err) {
    // ORKIO_AO60K_HF2_429_COOLDOWN_HARDENING
    const rawParts = [
      err?.code,
      err?.status,
      err?.statusText,
      err?.name,
      err?.message,
      err?.userMessage,
      err?.detail,
      err?.data,
      err?.payload,
      err?.error,
    ];

    let raw = "";
    try {
      raw = rawParts.map((part) => {
        if (part === null || part === undefined) return "";
        if (typeof part === "string") return part;
        if (typeof part === "number" || typeof part === "boolean") return String(part);
        return JSON.stringify(part);
      }).filter(Boolean).join(" | ").toLowerCase();
    } catch {
      raw = String(err?.message || err || "").toLowerCase();
    }

    return Boolean(
      extractRealtimeRetryAfterSeconds(err) ||
      err?.status === 429 ||
      err?.response?.status === 429 ||
      err?.code === "RATE_LIMITED" ||
      err?.code === "REALTIME_COOLDOWN_ACTIVE" ||
      err?.isRateLimited === true ||
      raw.includes("429") ||
      raw.includes("rate_limited") ||
      raw.includes("rate limited") ||
      raw.includes("too many requests") ||
      raw.includes("realtime_cooldown_active") ||
      raw.includes("cooldown")
    );
  }

  function applyRealtimeCooldownFromError(err, reason = "backend_cooldown_or_rate_limit") {
    // AO01-HF6R16: admin/billing errors must not be converted into public beta cooldown.
    const rawCooldownMessage = String(err?.message || err?.userMessage || err?.payload?.message || err?.payload?.detail || err?.detail || "").toLowerCase();
    if (
      rawCooldownMessage.includes("insufficient_quota") ||
      rawCooldownMessage.includes("current quota") ||
      rawCooldownMessage.includes("billing") ||
      rawCooldownMessage.includes("exceeded your current quota")
    ) {
      try { clearRealtimeTimeboxTimer(); } catch {}
      try { setRtcCooldownRemaining(0); } catch {}
      try { rtcCooldownUntilRef.current = 0; } catch {}
      try { setV2vPhase("error"); } catch {}
      const billingMessage = "Realtime indisponível por quota/billing da OpenAI. Faça recarga ou ajuste de billing antes de novo teste. O chat por texto continua disponível.";
      try { updateRealtimePremiumStatus("error", billingMessage); } catch {}
      try { setV2vError(billingMessage); } catch {}
      try { setUploadStatus(`⚠️ ${billingMessage}`); setTimeout(() => setUploadStatus(""), 6000); } catch {}
      return 0;
    }
    if (canAccessAdmin || rtcAdminTimeboxBypassRef.current === true) {
      try { clearRealtimeTimeboxTimer(); } catch {}
      try { setRtcCooldownRemaining(0); } catch {}
      try { rtcCooldownUntilRef.current = 0; } catch {}
      try { setV2vPhase("error"); } catch {}
      const msg = normalizeUserFacingRuntimeMessage(err, "realtime");
      try { updateRealtimePremiumStatus("error", msg); } catch {}
      try { setV2vError(msg); } catch {}
      try { setUploadStatus(`⚠️ ${msg}`); setTimeout(() => setUploadStatus(""), 4500); } catch {}
      return 0;
    }

    // ORKIO_AO60K_HF2_429_COOLDOWN_HARDENING
    const waitSeconds = Math.max(
      1,
      Math.ceil(Number(extractRealtimeRetryAfterSeconds(err) || REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS))
    );
    rtcBackendTimeboxLimitedRef.current = true;
    try { setRtcBackendTimeboxLimited(true); } catch {}
    try { clearRealtimeTimeboxTimer(); } catch {}
    try { startRealtimeCooldown(waitSeconds, reason); } catch {}
    const label = formatRealtimeCountdown(waitSeconds);

    try { setRealtimeMode(false); } catch {}
    realtimeModeRef.current = false;
    try { setRtcReadyToRespond(false); } catch {}
    try { setV2vPhase("cooldown"); } catch {}
    try { updateRealtimePremiumStatus("cooldown", `O chat por texto continua disponível. Liberação em ${label}.`); } catch {}
    try { setV2vError(`A voz em tempo real estará disponível novamente em ${label}. O chat por texto continua disponível.`); } catch {}
    try { setUploadStatus(`⏳ Voz disponível novamente em ${label}. O chat por texto continua disponível.`); } catch {}
    try { setTimeout(() => setUploadStatus(""), 4500); } catch {}
    try { logRealtimeStep("timebox:cooldown_applied_from_error", { reason, waitSeconds }); } catch {}
    return waitSeconds;
  }



  function setRealtimeMicrophoneEnabled(enabled) {
    try {
      rtcPcRef.current?.getSenders?.().forEach((sender) => {
        if (sender?.track?.kind === "audio") sender.track.enabled = Boolean(enabled);
      });
    } catch {}
    try {
      rtcAudioProcessingRef.current?.rawStream?.getAudioTracks?.().forEach((track) => {
        track.enabled = Boolean(enabled);
      });
    } catch {}
  }

  function announceRealtimeTimeboxEnding(remainingSeconds = 0) {
    try {
      if (!isRealtimeTimeboxLimitedUser()) return false;
      if (rtcTimeboxClosingRef.current) return Boolean(rtcTimeboxClosingNoticeSentRef.current);

      const dc = rtcDcRef.current;
      if (!dc || dc.readyState !== "open") return false;

      rtcTimeboxClosingRef.current = true;
      rtcTimeboxClosingNoticeDoneRef.current = false;
      rtcTimeboxClosingNoticeSentRef.current = false;
      rtcTimeboxClosingResponseIdRef.current = null;
      rtcTimeboxFinalStopScheduledRef.current = false;
      clearRealtimeActivationProbe();
      clearRealtimeAutoResponseFallback();
      clearRealtimeIdleFollowup();
      setRtcReadyToRespond(false);
      setRealtimeMicrophoneEnabled(false);

      // AO72D-HF1: at 00:00, stop accepting new user turns, cancel any late answer,
      // then allow only the final closing message to finish before ending the session.
      const hadActiveResponse = Boolean(rtcResponseInFlightRef.current);
      if (hadActiveResponse) {
        sendRealtimeClientEvent(dc, { type: "response.cancel" }, "timebox_zero_cancel_active_response");
      }
      sendRealtimeClientEvent(dc, { type: "input_audio_buffer.clear" }, "timebox_zero_clear_input");
      rtcResponseInFlightRef.current = false;

      const rawName = String(user?.name || user?.first_name || "").trim();
      const firstName = rawName
        ? rawName.split(/\s+/)[0].replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9'’-]/g, "")
        : "";
      const vocative = firstName ? `${firstName}, ` : "";
      const cooldownLabel = formatRealtimeDurationLabel(REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS);
      const lang = normalizeRealtimeLanguageProfile(rtcLanguageProfileRef.current);

      const spokenText =
        lang === "en"
          ? `${vocative}we have reached the end of our two minutes. I will close the voice session safely now. The text chat remains available, and voice returns in ${cooldownLabel}.`
          : lang === "es"
            ? `${vocative}hemos llegado al final de nuestros dos minutos. Cerraré la voz con seguridad ahora. El chat de texto sigue disponible y la voz vuelve en ${cooldownLabel}.`
            : `${vocative}chegamos ao fim dos dois minutos. Vou encerrar a voz agora. A conversa continua pelo chat.`;

      updateRealtimePremiumStatus("ending", "⏱️ Tempo concluído. Aguarde a frase final do Orkio.");
      setUploadStatus("⏱️ Dois minutos concluídos. Aguarde a frase final antes do encerramento.");

      const scheduleSafetyStop = (reason = "closing_message_timeout") => {
        clearRealtimeFinalStopTimer();
        rtcTimeboxFinalStopTimerRef.current = setTimeout(() => {
          try {
            if (!rtcSessionIdRef.current || rtcStopInFlightRef.current) return;
            logRealtimeStep("ao72d_hf1:timebox_final_message_timeout", {
              reason,
              graceMs: REALTIME_FINAL_MESSAGE_GRACE_MS,
              sessionId: rtcSessionIdRef.current || null,
            });
            void stopRealtime("time_limit_frontend_hard_stop");
          } catch {}
        }, REALTIME_FINAL_MESSAGE_GRACE_MS);
      };

      const dispatchClosingNotice = () => {
        try {
          if (!realtimeModeRef.current || !rtcSessionIdRef.current) return;
          const currentDc = rtcDcRef.current;
          if (!currentDc || currentDc.readyState !== "open") {
            scheduleSafetyStop("closing_dc_not_open");
            return;
          }

          const sent = requestRealtimeSpokenResponse(currentDc, {
            reason: "timebox_final_closing_notice_after_zero",
            conversationItem: false,
            instructions: `Fale exatamente esta mensagem, em tom calmo e em até cinco segundos. Não acrescente perguntas, ofertas, pitch ou continuação do assunto: ${spokenText}`,
          });

          rtcTimeboxClosingNoticeSentRef.current = Boolean(sent);
          scheduleSafetyStop(sent ? "closing_response_wait" : "closing_response_not_sent");

          if (sent) {
            queueRealtimeTelemetry("timebox_final_closing_notice_sent_after_zero", {
              remainingSeconds,
              cooldownSeconds: REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS,
              hasName: Boolean(firstName),
            });
            logRealtimeStep("ao72d_hf1:timebox_final_closing_notice_sent_after_zero", {
              remainingSeconds,
              cooldownSeconds: REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS,
              hasName: Boolean(firstName),
            });
          }
        } catch (err) {
          scheduleSafetyStop("closing_dispatch_exception");
          logRealtimeStep("ao72d_hf1:timebox_final_closing_notice_failed", {
            message: err?.message || null,
            remainingSeconds,
          });
        }
      };

      // Let any cancelled late answer settle before creating the sole closing response.
      setTimeout(dispatchClosingNotice, hadActiveResponse ? 220 : 80);
      return true;
    } catch (err) {
      logRealtimeStep("ao72d_hf1:timebox_closing_phase_failed", {
        message: err?.message || null,
        remainingSeconds,
      });
      return false;
    }
  }

  function startRealtimeTimebox(seconds = REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS, options = {}) {
    const force = Boolean(options?.force);
    const source = String(options?.source || "unknown");

    if (REALTIME_FRONTEND_HARD_TIMEBOX_ENABLED !== true) {
      clearRealtimeTimeboxTimer();
      try { setRtcTimeboxRemaining(null); } catch {}
      try { rtcTimeboxDeadlineRef.current = 0; } catch {}
      logRealtimeStep("ao64d_hf5:timebox_suppressed_advisory_only", { seconds, force, source });
      return;
    }

    if (!force && !isRealtimeTimeboxLimitedUser() && rtcBackendTimeboxLimitedRef.current !== true) return;
    clearRealtimeTimeboxTimer();
    clearRealtimeFinalStopTimer();

    const maxSeconds = Math.max(1, Math.ceil(Number(seconds || REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS)));
    try { rtcTimeboxPolicyRef.current = { ...(rtcTimeboxPolicyRef.current || {}), remainingSeconds: maxSeconds }; } catch {}
    const startedAt = Date.now();
    const endsAt = startedAt + maxSeconds * 1000;
    rtcTimeboxDeadlineRef.current = endsAt;
    rtcTimeboxFinalStopScheduledRef.current = false;

    // Emergency-only stop. Normal flow reaches 00:00, speaks the closing message,
    // waits for its matching response.done and only then calls stopRealtime().
    try {
      if (rtcTimeboxHardStopTimerRef.current) clearTimeout(rtcTimeboxHardStopTimerRef.current);
      rtcTimeboxHardStopTimerRef.current = setTimeout(() => {
        try {
          if (!rtcSessionIdRef.current || rtcStopInFlightRef.current) return;
          console.warn("REALTIME_TIMEBOX_EMERGENCY_STOP", {
            marker: "AO72D-HF1_GREETING_BEFORE_TIMER_FINAL_AFTER_ZERO",
            sessionId: rtcSessionIdRef.current || null,
            maxSeconds,
            source,
          });
          setRealtimeMicrophoneEnabled(false);
          const dc = rtcDcRef.current;
          if (dc && dc.readyState === "open" && rtcResponseInFlightRef.current) {
            sendRealtimeClientEvent(dc, { type: "response.cancel" }, "timebox_emergency_stop_cancel_response");
          }
          void stopRealtime("time_limit_frontend_hard_stop");
        } catch {}
      }, Math.max(1, maxSeconds * 1000 + REALTIME_FINAL_MESSAGE_GRACE_MS + 5000));
    } catch {}

    let warned30 = false;
    let warned15 = false;
    let warned5 = false;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRtcTimeboxRemaining(remaining);

      if (remaining > REALTIME_PUBLIC_BETA_CLOSING_NOTICE_SECONDS && !rtcResponseInFlightRef.current) {
        updateRealtimePremiumStatus("listening", "📝 Transcrição ativa");
      }

      if (remaining <= 30 && remaining > 15 && !warned30) {
        warned30 = true;
        updateRealtimePremiumStatus("ending", "⚠️ Restam 30 segundos. Vamos concluir com calma.");
        setUploadStatus("⚠️ Restam 30 segundos de voz. Conclua a ideia principal.");
        setTimeout(() => setUploadStatus(""), 4000);
        logRealtimeStep("hf6_3:timebox_warning_30s", {
          remaining,
          marker: ORKIO_HF6_3_BUILD_MARKER,
        });
      }

      if (remaining <= 15 && remaining > 5 && !warned15) {
        warned15 = true;
        updateRealtimePremiumStatus("ending", "⚠️ Restam 15 segundos. Preparando encerramento.");
        setUploadStatus("⚠️ Restam 15 segundos. O Orkio fará uma frase final.");
        setTimeout(() => setUploadStatus(""), 3500);
        logRealtimeStep("hf6_3:timebox_warning_15s", {
          remaining,
          marker: ORKIO_HF6_3_BUILD_MARKER,
        });
      }

      if (remaining <= 5 && remaining > 0 && !warned5) {
        warned5 = true;
        updateRealtimePremiumStatus("ending", "⏱️ Encerramento em instantes.");
        setUploadStatus("⏱️ Encerrando em instantes. Aguarde a frase final.");
        setTimeout(() => setUploadStatus(""), 3000);
        logRealtimeStep("hf6_3:timebox_warning_5s", {
          remaining,
          marker: ORKIO_HF6_3_BUILD_MARKER,
        });
      }

      if (remaining <= 0) {
        try {
          if (rtcTimeboxTimerRef.current) clearInterval(rtcTimeboxTimerRef.current);
        } catch {}
        rtcTimeboxTimerRef.current = null;
        setRtcTimeboxRemaining(0);

        logRealtimeStep("ao72d_hf1:timebox_zero_reached", {
          maxSeconds,
          marker: "AO72D-HF1_GREETING_BEFORE_TIMER_FINAL_AFTER_ZERO",
          closingNoticeSent: Boolean(rtcTimeboxClosingNoticeSentRef.current),
          closingNoticeDone: Boolean(rtcTimeboxClosingNoticeDoneRef.current),
        });

        updateRealtimePremiumStatus("ending", "⏱️ Tempo concluído. Aguarde a frase final do Orkio.");
        setUploadStatus("⏱️ Dois minutos concluídos. Aguarde a frase final antes do encerramento.");

        const closingStarted = announceRealtimeTimeboxEnding(0);
        if (!closingStarted) {
          clearRealtimeFinalStopTimer();
          rtcTimeboxFinalStopTimerRef.current = setTimeout(() => {
            try {
              if (rtcSessionIdRef.current && !rtcStopInFlightRef.current) {
                void stopRealtime("time_limit_frontend_hard_stop");
              }
            } catch {}
          }, REALTIME_FINAL_MESSAGE_POST_DONE_GRACE_MS);
        }
      }
    };

    tick();
    rtcTimeboxTimerRef.current = setInterval(tick, 1000);
    logRealtimeStep("ao72d_hf1:timebox_started_after_spoken_phrase", {
      seconds: maxSeconds,
      marker: "AO72D-HF1_GREETING_BEFORE_TIMER_FINAL_AFTER_ZERO",
      source,
      deadline: rtcTimeboxDeadlineRef.current,
    });
  }

  function markRealtimeConversationActivated(source = "provider_event", meta = {}) {
    try {
      if (rtcConversationStartedRef.current) return false;
      rtcConversationStartedRef.current = true;
      const activationMeta = {
        source: String(source || "provider_event"),
        sessionId: rtcSessionIdRef.current || null,
        sessionAgeMs: getRealtimeSessionAgeMs(),
        ...(meta && typeof meta === "object" ? meta : {}),
      };
      logRealtimeStep("ao72a_hf1:conversation_activated", activationMeta);
      queueRealtimeTelemetry("conversation_activated", activationMeta);
      return true;
    } catch (err) {
      try { console.warn("REALTIME_CONVERSATION_ACTIVATION_MARK_FAILED", err); } catch {}
      return false;
    }
  }

  function startRealtimeConversationTimeboxIfNeeded(source = "assistant_announcement", secondsOverride = null) {
    try {
      markRealtimeConversationActivated(source, { timeboxCandidate: true });
      if (rtcTimeboxStartedRef.current) return false;
      if (rtcOverlayForceClosed) return false;
      if (!rtcTimeboxAnnouncementPendingRef.current) return false;

      const limited = isRealtimeTimeboxLimitedUser() || rtcBackendTimeboxLimitedRef.current === true;
      if (!limited) return false;

      const pending = Number(
        secondsOverride ||
        rtcPendingTimeboxSecondsRef.current ||
        rtcTimeboxPolicyRef.current?.remainingSeconds ||
        rtcTimeboxPolicyRef.current?.maxSeconds ||
        REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS
      );
      const seconds = Math.max(1, Math.ceil(pending || REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS));

      rtcTimeboxStartedRef.current = true;
      rtcPendingTimeboxSecondsRef.current = null;
      rtcTimeboxAnnouncementPendingRef.current = false;
      clearRealtimeAnnouncementFallback();

      console.log("REALTIME_TIMEBOX_STARTED_WITH_SPOKEN_ANNOUNCEMENT", {
        marker: "AO72C-HF1_TIMEBOX_SPOKEN_SYNC",
        source,
        seconds,
        sessionId: rtcSessionIdRef.current || null,
        announcementTranscript: String(rtcTimeboxAnnouncementTranscriptRef.current || "").slice(-160),
      });
      queueRealtimeTelemetry("timebox_started_with_spoken_announcement", {
        source,
        seconds,
        sessionId: rtcSessionIdRef.current || null,
      });

      startRealtimeTimebox(seconds, { force: true, source });
      updateRealtimePremiumStatus("listening", `📝 Transcrição ativa — ${formatRealtimeCountdown(seconds)} disponíveis.`);
      return true;
    } catch (err) {
      try { console.warn("REALTIME_TIMEBOX_SPOKEN_SYNC_FAILED", err); } catch {}
      return false;
    }
  }

  function maybeStartRealtimeTimeboxFromAnnouncementText(fragment = "", source = "announcement_transcript") {
    try {
      if (!rtcTimeboxAnnouncementPendingRef.current || rtcTimeboxStartedRef.current) return false;
      const piece = String(fragment || "");
      if (piece) {
        rtcTimeboxAnnouncementTranscriptRef.current =
          `${rtcTimeboxAnnouncementTranscriptRef.current || ""}${piece}`.slice(-1200);
      }
      const normalized = String(rtcTimeboxAnnouncementTranscriptRef.current || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const announced = /\b(dois|2)\s+minutos?\b|\btwo\s+minutes?\b|\b(dos|2)\s+minutos?\b/.test(normalized);
      if (!announced) return false;
      return startRealtimeConversationTimeboxIfNeeded(`${source}:two_minutes_phrase`);
    } catch {
      return false;
    }
  }

  function scheduleRealtimeAnnouncementTimeboxFallback(source = "announcement_audio_started") {
    try {
      if (!rtcTimeboxAnnouncementPendingRef.current || rtcTimeboxStartedRef.current) return;
      if (rtcTimeboxAnnouncementFallbackTimerRef.current) return;
      rtcTimeboxAnnouncementFallbackTimerRef.current = setTimeout(() => {
        rtcTimeboxAnnouncementFallbackTimerRef.current = null;
        startRealtimeConversationTimeboxIfNeeded(`${source}:fallback_after_audio`);
      }, REALTIME_ANNOUNCEMENT_PHRASE_FALLBACK_MS);
    } catch {}
  }


  function hashPatch35RevGText(value = "") {
    const str = String(value || "");
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return `${Math.abs(hash).toString(16)}:${str.length}`;
  }

  function extractPatch35RevGVoiceFromClientPayload(payload = {}) {
    try {
      return (
        payload?.response?.audio?.output?.voice ||
        payload?.response?.audio?.voice ||
        payload?.response?.voice ||
        payload?.session?.audio?.output?.voice ||
        payload?.session?.voice ||
        rtcVoiceRef.current ||
        null
      );
    } catch {
      return null;
    }
  }

  function extractPatch35RevGInstructionsFromClientPayload(payload = {}) {
    try {
      return String(
        payload?.response?.instructions ||
        payload?.session?.instructions ||
        ""
      );
    } catch {
      return "";
    }
  }

  function buildPatch35RevGCorrelationSnapshot(extra = {}) {
    const meetingState = meetingStateRef.current || {};
    const responseMetadata = extra?.response_metadata || extra?.metadata || {};
    let teamMode = false;
    let manualTargetSlug = "";
    let manualTeamFocusSlug = "";
    let manualTeamTurnQueue = [];
    try { teamMode = Boolean(isManualTeamConversationActive()); } catch {}
    try { manualTargetSlug = getManualAuthoritySlug() || ""; } catch {}
    try { manualTeamFocusSlug = teamMode ? (getManualTeamConversationFocusSlug() || "") : ""; } catch {}
    try { manualTeamTurnQueue = teamMode ? (getManualTeamConversationTurnQueue(manualTeamFocusSlug || "") || []) : []; } catch {}
    const selectedManualAgentSlug = (() => {
      try { return selectedManualAgentSlugRef.current || ""; } catch { return ""; }
    })();
    const activeSpeakerSlug = canonicalAgentSlug(
      extra?.active_speaker_slug ||
      responseMetadata?.speaker_slug ||
      responseMetadata?.target_agent_slug ||
      meetingState?.active_speaker_slug ||
      meetingState?.last_speaker_slug ||
      manualTeamFocusSlug ||
      selectedManualAgentSlug ||
      ""
    );
    const activePersonaSlug = canonicalAgentSlug(
      extra?.active_persona_slug ||
      responseMetadata?.persona_slug ||
      meetingState?.active_persona_slug ||
      activeSpeakerSlug ||
      ""
    );
    return {
      marker: PATCH_35_REV_G_REALTIME_RESPONSE_CORRELATION_AUDIT_VERSION,
      source_function: extra?.source_function || null,
      stage: extra?.stage || null,
      direction: extra?.direction || null,
      event_type: extra?.event_type || null,
      event_id: extra?.event_id || null,
      response_id: extra?.response_id || null,
      item_id: extra?.item_id || null,
      conversation_item_id: extra?.conversation_item_id || null,
      previous_item_id: extra?.previous_item_id || null,
      correlation_id: extra?.correlation_id || null,
      session_id: rtcSessionIdRef.current || null,
      realtime_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
      created_at_ms: Date.now(),
      active_speaker_slug: activeSpeakerSlug || null,
      active_persona_slug: activePersonaSlug || null,
      selected_manual_agent_slug: selectedManualAgentSlug || null,
      manual_target_slug: manualTargetSlug || null,
      manual_team_focus_slug: manualTeamFocusSlug || null,
      manual_team_turn_queue: Array.isArray(manualTeamTurnQueue) ? manualTeamTurnQueue : [],
      team_mode: teamMode,
      room_mode: teamMode ? PATCH_34_REVB_ROOM_MODE : null,
      response_control: teamMode ? PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL : null,
      voice: extra?.voice || rtcVoiceRef.current || null,
      instructions_hash: extra?.instructions_hash || null,
      response_in_flight: Boolean(rtcResponseInFlightRef.current),
      pending_session_update: Boolean(rtcPendingSessionUpdateRef.current),
      raw_type: extra?.raw_type || null,
    };
  }

  function logPatch35RevGRealtimeCorrelation(stage, extra = {}) {
    try {
      const audit = buildPatch35RevGCorrelationSnapshot({ ...extra, stage });
      try { console.info("PATCH35_REVG_RT_CORRELATION", audit); } catch {}
      try { logRealtimeStep("patch35_revg:rt_correlation", audit); } catch {}
      try { queueRealtimeTelemetry("patch35_revg_rt_correlation", audit); } catch {}
      return audit;
    } catch (err) {
      try {
        console.warn("PATCH35_REVG_RT_CORRELATION_FAILED", {
          marker: PATCH_35_REV_G_REALTIME_RESPONSE_CORRELATION_AUDIT_VERSION,
          stage,
          message: err?.message || null,
        });
      } catch {}
      return null;
    }
  }

  function rememberPatch35RevGResponseCreateCorrelation(eventId, payload = {}, reason = "") {
    try {
      const metadata = payload?.response?.metadata || {};
      const correlationId = `revg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const instructions = extractPatch35RevGInstructionsFromClientPayload(payload);
      const record = {
        correlation_id: correlationId,
        event_id: eventId || null,
        reason,
        created_at_ms: Date.now(),
        response_metadata: metadata,
        active_speaker_slug: metadata?.speaker_slug || metadata?.target_agent_slug || null,
        active_persona_slug: metadata?.persona_slug || null,
        manual_team_focus_slug: metadata?.manual_team_focus_slug || null,
        manual_target_slug: metadata?.manual_target_slug || null,
        voice: extractPatch35RevGVoiceFromClientPayload(payload),
        instructions_hash: hashPatch35RevGText(instructions),
      };
      rtcPatch35RevGLastResponseCreateRef.current = record;
      if (eventId) {
        rtcPatch35RevGResponseCorrelationRef.current[String(eventId)] = record;
      }
      return record;
    } catch {
      return null;
    }
  }

  function attachPatch35RevGResponseIdToLastCorrelation(responseId) {
    try {
      if (!responseId) return null;
      const last = rtcPatch35RevGLastResponseCreateRef.current || null;
      if (!last) return null;
      const record = { ...last, response_id: responseId, response_created_at_ms: Date.now() };
      rtcPatch35RevGResponseCorrelationRef.current[String(responseId)] = record;
      rtcPatch35RevGLastResponseCreateRef.current = record;
      return record;
    } catch {
      return null;
    }
  }

  function sendRealtimeClientEvent(dc, payload, reason = "client_event") {
    try {
      if (!dc || dc.readyState !== "open") {
        logRealtimeStep("ao66r:send_skip_dc_not_open", {
          reason,
          readyState: dc?.readyState || null,
          type: payload?.type || null,
          marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        });
        return false;
      }

      const eventId = payload?.event_id || `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const patch33RevBRejectedSessionKeys =
        payload?.type === "session.update"
          ? collectPatch33RevBProviderSessionRejectedKeys(payload?.session || {})
          : [];
      const providerSafePayload = sanitizePatch33RevBRealtimeClientEventPayload(payload || {});
      const finalPayload = { event_id: eventId, ...(providerSafePayload || {}) };

      const patch35RevGInstructions = extractPatch35RevGInstructionsFromClientPayload(finalPayload);
      const patch35RevGResponseMetadata = finalPayload?.response?.metadata || finalPayload?.session?.metadata || {};
      const patch35RevGCreateRecord =
        finalPayload?.type === "response.create"
          ? rememberPatch35RevGResponseCreateCorrelation(eventId, finalPayload, reason)
          : null;

      if (["session.update", "response.cancel", "response.create", "conversation.item.create", "input_audio_buffer.clear"].includes(String(finalPayload?.type || ""))) {
        logPatch35RevGRealtimeCorrelation("client_event_before_send", {
          source_function: "sendRealtimeClientEvent",
          direction: "client_to_provider",
          event_type: finalPayload?.type || null,
          event_id: eventId,
          item_id: finalPayload?.item?.id || null,
          conversation_item_id: finalPayload?.item?.id || null,
          correlation_id: patch35RevGCreateRecord?.correlation_id || null,
          response_metadata: patch35RevGResponseMetadata,
          voice: extractPatch35RevGVoiceFromClientPayload(finalPayload),
          instructions_hash: patch35RevGInstructions ? hashPatch35RevGText(patch35RevGInstructions) : null,
          raw_type: finalPayload?.type || null,
        });
      }

      if (patch33RevBRejectedSessionKeys.length) {
        const sanitizerAudit = {
          reason,
          type: payload?.type || null,
          event_id: eventId,
          removed_keys: patch33RevBRejectedSessionKeys,
          removed_count: patch33RevBRejectedSessionKeys.length,
          provider_session_payload_clean: true,
          version: PATCH_33_REV_B_REALTIME_PROVIDER_PAYLOAD_SANITIZER_VERSION,
        };
        try { logRealtimeStep("patch33_revb:provider_payload_sanitized", sanitizerAudit); } catch {}
        try { queueRealtimeTelemetry("patch33_revb_provider_payload_sanitized", sanitizerAudit); } catch {}
        try { console.info("[PATCH_33_REV_B_REALTIME_PROVIDER_PAYLOAD_SANITIZER]", sanitizerAudit); } catch {}
      }

      try {
        console.log("REALTIME_CLIENT_EVENT", {
          reason,
          type: finalPayload.type,
          event_id: eventId,
          response_modalities: finalPayload?.response?.output_modalities || null,
          provider_session_payload_clean: finalPayload?.type === "session.update" ? true : null,
          sanitizer_version: finalPayload?.type === "session.update" ? PATCH_33_REV_B_REALTIME_PROVIDER_PAYLOAD_SANITIZER_VERSION : null,
          marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        });
      } catch {}

      dc.send(JSON.stringify(finalPayload));
      if (["session.update", "response.cancel", "response.create", "conversation.item.create", "input_audio_buffer.clear"].includes(String(finalPayload?.type || ""))) {
        logPatch35RevGRealtimeCorrelation("client_event_after_send", {
          source_function: "sendRealtimeClientEvent",
          direction: "client_to_provider",
          event_type: finalPayload?.type || null,
          event_id: eventId,
          item_id: finalPayload?.item?.id || null,
          conversation_item_id: finalPayload?.item?.id || null,
          correlation_id: patch35RevGCreateRecord?.correlation_id || null,
          response_metadata: patch35RevGResponseMetadata,
          voice: extractPatch35RevGVoiceFromClientPayload(finalPayload),
          instructions_hash: patch35RevGInstructions ? hashPatch35RevGText(patch35RevGInstructions) : null,
          raw_type: finalPayload?.type || null,
        });
      }
      try { queueRealtimeTelemetry("client_event_sent", { reason, type: finalPayload.type, event_id: eventId }); } catch {}
      logRealtimeStep("ao66r:client_event_sent", {
        reason,
        type: finalPayload.type,
        event_id: eventId,
        marker: ORKIO_AO66R_HF4_BUILD_MARKER,
      });
      return true;
    } catch (err) {
      logRealtimeStep("ao66r:client_event_failed", {
        reason,
        type: payload?.type || null,
        message: err?.message || null,
        marker: ORKIO_AO66R_HF4_BUILD_MARKER,
      });
      return false;
    }
  }

  function requestRealtimeSpokenResponse(dc, {
    reason = "activation",
    instructions = "",
    inputText = "",
    conversationItem = false,
  } = {}) {
    const switchGate = rtcManualSwitchGateRef.current || {};
    if (switchGate.locked) {
      try {
        logRealtimeStep("patch39:response_create_blocked_by_switch_gate", {
          marker: PATCH_39_REALTIME_MANUAL_SWITCH_HARD_GATE_VERSION,
          reason,
          phase: switchGate.phase || null,
          switch_generation_id: switchGate.generation_id || null,
          target_agent_slug: switchGate.target_agent_slug || null,
        });
      } catch {}
      return false;
    }
    const cleanInstructions = String(instructions || "").trim();
    const cleanInput = String(inputText || "").trim();
    const teamConversationActive = isManualTeamConversationActive();
    const manualTargetSlug = teamConversationActive ? "team" : getManualAuthoritySlug();
    const teamFocusSlug = teamConversationActive ? (getManualTeamConversationFocusSlug() || "orkio") : "";
    const targetAgentSlugForResponse = canonicalAgentSlug(
      teamConversationActive
        ? teamFocusSlug
        : (manualTargetSlug || getRealtimeAuthorityTargetSlug() || "orkio")
    ) || "orkio";
    const personaSlugForResponse = teamConversationActive ? "team" : targetAgentSlugForResponse;
    const teamTurnQueueForResponse = teamConversationActive ? getManualTeamConversationTurnQueue(targetAgentSlugForResponse) : [];
    try {
      logRealtimeStep("patch32_revc:manual_authority_request_target_resolved", {
        reason,
        manual_target_slug: manualTargetSlug || null,
        resolved_target_agent_slug: targetAgentSlugForResponse,
        response_persona_slug: personaSlugForResponse,
        active_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
        event_session_id: rtcSessionIdRef.current || null,
        manual_agent_lock: Boolean(manualTargetSlug),
        manual_team_conversation_active: teamConversationActive,
        manual_team_focus_slug: teamConversationActive ? targetAgentSlugForResponse : null,
        manual_team_turn_queue: teamTurnQueueForResponse,
        response_control: teamConversationActive ? PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL : PATCH_32_SINGLE_AGENT_CONTROL,
        team_conversation_orchestrator_version: teamConversationActive ? PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION : null,
        team_conversation_staging_verification_version: teamConversationActive ? PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION : null,
        manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
      });
    } catch {}
    const targetAgentForResponse =
      findAgentByCanonicalSlug(targetAgentSlugForResponse) ||
      findAgentByRuntimeIdentity(targetAgentSlugForResponse) ||
      null;
    const voiceResolution = resolveAgentVoiceResolution(targetAgentForResponse || { slug: targetAgentSlugForResponse, name: targetAgentSlugForResponse });
    const resolvedAgentVoice = voiceResolution.voice;
    if (resolvedAgentVoice) {
      rtcVoiceRef.current = resolvedAgentVoice;
    }
    const voice = coerceVoiceId(resolvedAgentVoice || rtcVoiceRef.current || ORKIO_CANONICAL_VOICE_ID || ORKIO_DEFAULT_VOICE_ID);
    const voiceProfileForAudit = voiceResolution.voice_profile || resolveAgentVoiceProfile(targetAgentForResponse || { slug: targetAgentSlugForResponse, name: targetAgentSlugForResponse });
    const canonicalPersonaInstructions = registryBuildCanonicalRealtimeAgentInstructions(personaSlugForResponse, {
      fallbackSlug: "orkio",
      includeKnownAgents: true,
    });
    const voiceTurnInstructions = buildRealtimeVoiceInstruction(
      rtcLanguageProfileRef.current,
      cleanInput || rtcLastFinalTranscriptRef.current || "",
      personaSlugForResponse
    );
    const teamConversationInstructions = teamConversationActive
      ? buildPatch33TeamConversationInstruction(cleanInput || rtcLastFinalTranscriptRef.current || "", targetAgentSlugForResponse, {
          manual_team_turn_queue: teamTurnQueueForResponse,
          response_control: PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL,
        })
      : "";
    const finalIdentityLock = teamConversationActive
      ? buildPatch33TeamConversationIdentityLock(targetAgentSlugForResponse, voiceResolution)
      : buildFinalRealtimeIdentityLock(targetAgentSlugForResponse, voiceResolution);
    const responseInstructions = [
      canonicalPersonaInstructions,
      teamConversationInstructions,
      cleanInstructions || voiceTurnInstructions,
      finalIdentityLock,
    ].filter(Boolean).join("\n\n");
    const authority = acquireRealtimeResponseAuthority({
      reason,
      sessionId: rtcSessionIdRef.current || "",
      transcript: cleanInput || rtcLastFinalTranscriptRef.current || reason,
      targetAgentSlug: targetAgentSlugForResponse,
    });
    if (!authority.allowed) {
      setRtcReadyToRespond(false);
      return false;
    }

    try {
      const materializationAudit = {
        event: "PERSONA_MATERIALIZATION_AUDIT",
        version: "PATCH_31_FINAL_PERSONA_MATERIALIZATION_AUDIT_V1",
        session_id: rtcSessionIdRef.current || null,
        turn_index: getRealtimeAuthorityTurnIndex(),
        requested_agent: meetingStateRef.current?.last_turn?.target_agent_slug || targetAgentSlugForResponse,
        resolved_agent: targetAgentSlugForResponse,
        speaker_slug: targetAgentSlugForResponse,
        persona_slug: targetAgentSlugForResponse,
        prompt_profile: personaSlugForResponse,
        prompt_profile_version: teamConversationActive ? PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION : "PATCH_31_FINAL_FULL_CANONICAL_REALTIME_PERSONA_V1",
        manual_team_conversation_active: teamConversationActive,
        manual_team_focus_slug: teamConversationActive ? targetAgentSlugForResponse : null,
        manual_team_turn_queue: teamTurnQueueForResponse,
        response_control: teamConversationActive ? PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL : PATCH_32_SINGLE_AGENT_CONTROL,
        voice_profile: voiceProfileForAudit?.profile_id || targetAgentSlugForResponse,
        voice_registry_version: voiceProfileForAudit?.version || "PATCH_31_CANONICAL_AGENT_VOICE_PROFILE_V1",
        voice_precedence_version: voiceResolution.precedence_version,
        provider_voice: voice,
        voice_source: voiceResolution.voice_source,
        db_voice_present: voiceResolution.db_voice_present,
        db_voice_ignored: voiceResolution.db_voice_ignored,
        db_voice_override_allowed: voiceResolution.db_voice_override_allowed,
        voice_contract_version: voiceResolution.voice_contract_version,
        voice_override_policy: voiceResolution.voice_override_policy,
        voice_precedence: voiceResolution.voice_precedence,
        response_authority_key: authority.key,
        final_identity_lock: true,
        reason,
      };
      logRealtimeStep("patch31_final:persona_materialization_audit", materializationAudit);
      queueRealtimeTelemetry("persona_materialization_audit", materializationAudit);
    } catch {}

    if (conversationItem && cleanInput) {
      sendRealtimeClientEvent(dc, {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: cleanInput }],
        },
      }, `${reason}:conversation_item`);
    }

    rtcResponseInFlightRef.current = true;
    clearRealtimeResponseTimeout();
    rtcResponseTimeoutRef.current = setTimeout(() => {
      try {
        if (!realtimeModeRef.current || !rtcSessionIdRef.current) return;
        if (rtcLastResponseCreatedAtRef.current) return;
        logRealtimeStep("ao66r:response_create_no_server_response_yet", {
          reason,
          sessionAgeMs: getRealtimeSessionAgeMs(),
          marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        });
        updateRealtimePremiumStatus("listening", "Realtime conectado. Aguardando resposta de áudio.");
      } catch {}
    }, 6000);

    queueRealtimeTelemetry("response_create_attempt", {
      reason,
      conversationItem: Boolean(conversationItem),
      hasInputText: Boolean(cleanInput),
      hasInstructions: Boolean(cleanInstructions),
      voice,
      provider_voice: voice,
      voice_source: voiceResolution.voice_source,
      voice_precedence_version: voiceResolution.precedence_version,
      voice_contract_version: voiceResolution.voice_contract_version,
      voice_override_policy: voiceResolution.voice_override_policy,
      db_voice_ignored: voiceResolution.db_voice_ignored,
      prompt_profile: targetAgentSlugForResponse,
      prompt_profile_version: "PATCH_31_FINAL_FULL_CANONICAL_REALTIME_PERSONA_V1",
      final_identity_lock: true,
      manual_team_conversation_active: teamConversationActive,
      manual_team_focus_slug: teamConversationActive ? targetAgentSlugForResponse : null,
      manual_team_turn_queue: teamTurnQueueForResponse,
      team_conversation_mode: teamConversationActive ? PATCH_33_TEAM_CONVERSATION_MODE : null,
      team_conversation_orchestrator_version: teamConversationActive ? PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION : null,
        team_conversation_staging_verification_version: teamConversationActive ? PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION : null,
      response_control: teamConversationActive ? PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL : PATCH_32_SINGLE_AGENT_CONTROL,
    });

    const ok = sendRealtimeClientEvent(dc, {
      type: "response.create",
      response: {
        // AO64D-HF5_RESPONSE_CREATE_GA_SAFE:
        // Provider-safe response.create payload.
        output_modalities: ["audio"],
        audio: {
          output: {
            voice,
          },
        },
        instructions: responseInstructions,
        metadata: buildRealtimeResponseMetadata({
          switch_generation_id: switchGate.generation_id || "initial",
          switch_generation: Number(switchGate.generation || 0),
          target_agent_slug: targetAgentSlugForResponse,
          speaker_slug: targetAgentSlugForResponse,
          persona_slug: targetAgentSlugForResponse,
          source: "orkio_web",
          reason,
          persona_materialization_version: "PATCH_31_FINAL_PERSONA_MATERIALIZATION_AUDIT_V1",
          canonical_persona_version: "PATCH_31_FINAL_FULL_CANONICAL_REALTIME_PERSONA_V1",
          voice_precedence_version: voiceResolution.precedence_version,
          voice_contract_version: voiceResolution.voice_contract_version,
          voice_override_policy: voiceResolution.voice_override_policy,
          target_agent_slugs: teamConversationActive ? teamTurnQueueForResponse : [targetAgentSlugForResponse],
          resolved_agent: targetAgentSlugForResponse,
          manual_target_slug: teamConversationActive ? "team" : manualTargetSlug,
          manual_team_conversation_active: teamConversationActive,
          manual_team_focus_slug: teamConversationActive ? targetAgentSlugForResponse : null,
          manual_team_turn_queue: teamTurnQueueForResponse,
          manual_team_turn_index: manualTeamConversationTurnIndexRef.current || 0,
          multi_agent_turn: teamConversationActive ? true : false,
          response_control: teamConversationActive ? PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL : PATCH_32_SINGLE_AGENT_CONTROL,
          team_conversation_mode: teamConversationActive ? PATCH_33_TEAM_CONVERSATION_MODE : null,
          team_conversation_orchestrator_version: teamConversationActive ? PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION : null,
        team_conversation_staging_verification_version: teamConversationActive ? PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION : null,
          provider_voice: voice,
          voice_source: voiceResolution.voice_source,
          session_voice_sync_version: PATCH_32_PREDEPLOY_PREMIUM_VERSION,
          db_voice_ignored: voiceResolution.db_voice_ignored,
          final_identity_lock: true,
        }),
      },
    }, `${reason}:response_create`);

    if (ok) {
      try {
        console.log("REALTIME_RESPONSE_CREATE_SENT", {
          reason,
          hasInstructions: Boolean(cleanInstructions),
          hasInputText: Boolean(cleanInput),
          conversationItem: Boolean(conversationItem),
          marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        });
      } catch {}
    } else {
      releaseRealtimeResponseAuthority("response_create_send_failed", authority.key);
      rtcResponseInFlightRef.current = false;
      clearRealtimeResponseTimeout();
    }

    return ok;
  }

  function scheduleRealtimeActivationProbe(dc, source = "data_channel_open") {
    clearRealtimeActivationProbe();
    rtcActivationProbeSentRef.current = false;

    rtcActivationProbeTimerRef.current = setTimeout(() => {
      try {
        if (!realtimeModeRef.current || !rtcSessionIdRef.current) return;
        const currentDc = rtcDcRef.current || dc;
        if (!currentDc || currentDc.readyState !== "open") return;
        if (rtcLastResponseCreatedAtRef.current) return;
        if (rtcResponseInFlightRef.current) return;
        if (rtcActivationProbeSentRef.current) return;

        rtcActivationProbeSentRef.current = true;
        logRealtimeStep("ao66r:activation_probe_trigger", {
          source,
          sessionAgeMs: getRealtimeSessionAgeMs(),
          marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        });

        const probe = buildRealtimeActivationProbeInstruction(rtcLanguageProfileRef.current);
        requestRealtimeSpokenResponse(currentDc, {
          reason: "activation_probe",
          conversationItem: true,
          inputText: probe.inputText,
          instructions: probe.instructions,
        });
      } catch (err) {
        logRealtimeStep("ao66r:activation_probe_failed", {
          source,
          message: err?.message || null,
          marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        });
      } finally {
        rtcActivationProbeTimerRef.current = null;
      }
    }, 1200);
  }

  function announceRealtimeTimeboxStart(dc, seconds = REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS) {
    if (!dc || dc.readyState !== "open") return false;

    const maxSeconds = Math.max(1, Math.ceil(Number(seconds || REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS)));
    const durationLabel = formatRealtimeDurationLabel(maxSeconds);
    const lang = normalizeRealtimeLanguageProfile(rtcLanguageProfileRef.current);
    const limited = Boolean(isRealtimeTimeboxLimitedUser());

    // AO72D-HF1: greeting first, timer phrase second. The countdown starts only
    // when the assistant transcript reaches "two minutes", after the greeting.
    const activeAgentName = String(rtcHostAgentNameRef.current || "Orkio").trim() || "Orkio";
    const activeAgentSlug = canonicalAgentSlug(activeAgentName);
    const activeAgentIntro =
      activeAgentSlug === "orion"
        ? (lang === "en" ? "Orion, Patroai technical CTO agent" : lang === "es" ? "Orion, agente CTO técnico de Patroai" : "Orion, agente CTO técnico da Patroai")
        : activeAgentSlug === "chris"
          ? (lang === "en" ? "Chris, Patroai financial strategy agent" : lang === "es" ? "Chris, agente financiero estratégico de Patroai" : "Chris, agente financeiro estratégico da Patroai")
          : activeAgentSlug === "team"
            ? (lang === "en" ? "Team, Patroai coordination agent" : lang === "es" ? "Team, agente de coordinación de Patroai" : "Team, agente de coordenação da Patroai")
            : activeAgentName;

    const announcement =
      lang === "en"
        ? (
          limited
            ? `Hello, I am ${activeAgentIntro}. It is a pleasure to speak with you in real time. We have ${durationLabel} of conversation starting now. Where would you like to begin?`
            : `Hello, I am ${activeAgentIntro}. It is a pleasure to speak with you in real time. Where would you like to begin?`
        )
        : lang === "es"
          ? (
            limited
              ? `Hola, soy ${activeAgentIntro}. Es un placer hablar contigo en tiempo real. Tenemos ${durationLabel} de conversación a partir de ahora. ¿Por dónde quieres empezar?`
              : `Hola, soy ${activeAgentIntro}. Es un placer hablar contigo en tiempo real. ¿Por dónde quieres empezar?`
          )
          : (
            limited
              ? `Olá, eu sou ${activeAgentIntro}. Prazer em falar com você em tempo real. Temos ${durationLabel} de conversa a partir de agora. Por onde você quer começar?`
              : `Olá, eu sou ${activeAgentIntro}. Prazer em falar com você em tempo real. Por onde você quer começar?`
          );

    const activationInput =
      lang === "en"
        ? "Start this real-time voice session now with the exact short greeting provided."
        : lang === "es"
          ? "Inicia ahora esta sesión de voz en tiempo real con el saludo breve exacto indicado."
          : "Inicie agora esta sessão de voz em tempo real com a saudação curta exata indicada.";

    logRealtimeStep("ao72d_hf1:start_announcement_requested", {
      seconds: maxSeconds,
      durationLabel,
      languageProfile: lang,
      limited,
      hf6_2Marker: ORKIO_HF6_2_BUILD_MARKER,
      nonAdminPublicTimebox: Boolean(limited),
      greetingBeforeTimer: true,
    });

    if (limited && !rtcTimeboxStartedRef.current) {
      clearRealtimeAnnouncementFallback();
      rtcTimeboxAnnouncementPendingRef.current = true;
      rtcTimeboxAnnouncementResponseIdRef.current = null;
      rtcTimeboxAnnouncementTranscriptRef.current = "";
      rtcTimeboxAnnouncementAudioSeenRef.current = false;
      rtcOpeningMicrophoneMutedRef.current = true;
      setRealtimeMicrophoneEnabled(false);
    }

    const sent = requestRealtimeSpokenResponse(dc, {
      reason: "start_announcement_greeting_before_timer",
      conversationItem: true,
      inputText: activationInput,
      instructions: `Fale exatamente esta mensagem, começando pela saudação e sem acrescentar nada antes ou depois: ${announcement}`,
    });

    if (!sent && limited) {
      rtcTimeboxAnnouncementPendingRef.current = false;
      rtcOpeningMicrophoneMutedRef.current = false;
      setRealtimeMicrophoneEnabled(true);
      clearRealtimeAnnouncementFallback();
    }
    return sent;
  }

    function markRealtimePausedForBackground(reason = "mobile_background") {
    try {
      setV2vPhase("error");
      setV2vError(
        "Realtime pausado porque o PWA foi para segundo plano ou a tela foi bloqueada. Toque no ⚡ para reconectar."
      );
      setUploadStatus("⚡ Realtime pausado. Toque no ⚡ para reconectar.");
      setTimeout(() => setUploadStatus(""), 3500);
      logRealtimeStep("mobile:background_pause", { reason });
    } catch {}
  }

  async function startRealtime() {
    if (rtcConnectingRef.current) {
      console.warn("[Realtime] start skipped: already connecting");
      logRealtimeStep("start:skip_connecting");
      return;
    }

    if (isRealtimeTimeboxLimitedUser() && rtcCooldownRemaining > 0) {
      const label = formatRealtimeCountdown(rtcCooldownRemaining);
      logRealtimeStep("start:blocked_by_local_cooldown", { remaining_seconds: rtcCooldownRemaining });
      setRealtimeMode(false);
      realtimeModeRef.current = false;
      setV2vPhase("cooldown");
      updateRealtimePremiumStatus("cooldown", `O chat por texto continua disponível. Liberação em ${label}.`);
      setV2vError(`A voz em tempo real estará disponível novamente em ${label}. O chat por texto continua disponível.`);
      setUploadStatus(`⏳ Voz disponível novamente em ${label}. O chat por texto continua disponível.`);
      setTimeout(() => setUploadStatus(""), 3500);
      return;
    }

    rtcConnectingRef.current = true;
    try { rtcConversationStartedRef.current = false; } catch {}
    try { rtcTimeboxStartedRef.current = false; } catch {}
    try { rtcPendingTimeboxSecondsRef.current = null; } catch {}
    try { resetRealtimeTimeboxConversationState(); } catch {}
    try { setRtcOverlayForceClosed(false); } catch {}
    updateRealtimePremiumStatus("connecting", "Preparando microfone e sessão de voz.");
    try { setV2vPhase("connecting"); } catch {}
    try { console.log(ORKIO_AO61A_BUILD_MARKER, { event: "start_begin" }); console.log(ORKIO_AO61A_HF3_BUILD_MARKER, { event: "start_begin" }); console.log(ORKIO_AO61A_HF4_BUILD_MARKER, { event: "start_begin" }); } catch {}
    const startNonce = ++rtcStartNonceRef.current;
    try { invalidateRealtimeActiveSession("start_begin"); } catch {}

    try {
      const effectiveRealtimeThreadId = resolveRealtimeThreadId();
      try { console.log("REALTIME_START_BEGIN", { threadId, effectiveRealtimeThreadId, destMode, destSingle, sessionId: rtcSessionIdRef.current || null }); } catch {}
      logRealtimeStep('start:begin', { threadId, effectiveRealtimeThreadId, destMode, destSingle, summitRuntimeMode: summitRuntimeModeRef.current, summitLanguageProfile: summitLanguageProfileRef.current });
      setV2vError(null);
      setV2vPhase('connecting');
      setUploadStatus('⚡ Conectando Realtime (WebRTC)...');

      const realtimeBrowserPreflight = getRealtimeBrowserPreflight();
      logRealtimeStep("start:browser_preflight", realtimeBrowserPreflight);
      if (!realtimeBrowserPreflight.ok) {
        throw buildRealtimeDiagnosticError(
          String(realtimeBrowserPreflight.reason || "realtime_browser_preflight_failed").toUpperCase(),
          realtimePreflightMessage(realtimeBrowserPreflight.reason),
          realtimeBrowserPreflight
        );
      }

      // ORKIO_AO60J_REALTIME_FOREGROUND_WAKE_GUARD
      // Acquire as early as possible after user gesture/preflight so the phone does not auto-lock during setup.
      startRealtimeWakeLockGuard("start_preflight_ok");

      // ORKIO_AO60K_HF5_FRONTEND_MOBILE_REALTIME_RESTART_TRANSCRIPT_FIX
      // Always hard-reset stale mobile/WebRTC state before a new session.
      // If a backend session id exists, close it first without starting local cooldown:
      // the new /start response remains the source of truth.
      if (rtcSessionIdRef.current) {
        // AO68A-HF6R10:
        // Do not call stopRealtime() during pre-start cleanup.
        // It sends /api/realtime/end and turns failed warmups into consumed public quota.
        logRealtimeStep("ao68a_hf6r10:pre_start_local_cleanup_no_backend_end", {
          previousSessionId: rtcSessionIdRef.current || null,
          startNonce,
        });
        try { clearRealtimeResponseTimeout(); } catch {}
        try { clearRealtimeActivationProbe(); } catch {}
        try { clearRealtimeAutoResponseFallback(); } catch {}
        try { clearRealtimeStartupWatchdog(); } catch {}
        try { clearRealtimeAudioWatchdog(); } catch {}
        try { clearRealtimeIdleFollowup(); } catch {}
        try { clearRealtimeTimeboxTimer(); } catch {}
        try { clearRealtimeLivePoll(); } catch {}
      }
      hardResetRealtimeClientState("pre_start", { startNonce, noBackendEnd: true });

      resetRealtimeTranscriptSession("realtime_start");

      try { setRtcAuditEvents([]); } catch {}
      try { setRtcPunctStatus(null); } catch {}
      try { setSummitSessionScore(null); } catch {}


      const preliminaryAgentIdToSend = resolveRealtimeAgentId(); // realtime must honor the selected visible agent
      const realtimeManualContract = buildManualAgentAuthorityContract("", preliminaryAgentIdToSend, { realtime: true }) || {};
      const realtimeManualPayload = buildManualAuthorityPayload(rtcSessionIdRef.current || null);
      const agentIdToSend = realtimeManualContract.agent_id || preliminaryAgentIdToSend;
      const selectedAgentObjForRealtime =
        findAgentByRuntimeIdentity(agentIdToSend) ||
        findAgentByCanonicalSlug(realtimeManualContract.realtime_voice_agent_slug) ||
        findAgentByRuntimeIdentity(realtimeManualContract.realtime_voice_agent_slug) ||
        findAgentByRuntimeIdentity(destSingle) ||
        findAgentByCanonicalSlug(realtimeManualContract.target_agent_slug) ||
        null;
      rtcHostAgentIdRef.current = agentIdToSend || null;
      rtcHostAgentNameRef.current = String(selectedAgentObjForRealtime?.name || realtimeManualContract.visible_agent || "").trim() || "Orkio";
      logRealtimeStep("start:agent_resolved", {
        agent_id: agentIdToSend || null,
        agent_name: rtcHostAgentNameRef.current,
        destMode,
        destSingle,
        destMulti,
        manual_agent_lock: Boolean(realtimeManualContract.manual_agent_lock),
        manual_target_slug: realtimeManualContract.manual_target_slug || realtimeManualPayload.manual_target_slug || null,
        manual_authority_version: realtimeManualContract.manual_authority_version || realtimeManualPayload.manual_authority_version || null,
        target_agent_slug: realtimeManualContract.target_agent_slug || null,
        target_agent_slugs: realtimeManualContract.target_agent_slugs || [],
      });
      const ORKIO_ENV = (typeof window !== "undefined" && window.__ORKIO_ENV__) ? window.__ORKIO_ENV__ : {};
      const envVoice = (ORKIO_ENV.VITE_REALTIME_VOICE || import.meta.env.VITE_REALTIME_VOICE || "").trim();
      const rtModel = (ORKIO_ENV.VITE_REALTIME_MODEL || import.meta.env.VITE_REALTIME_MODEL || "gpt-realtime-mini").trim();
      const effectiveRealtimeTtlSeconds = isRealtimeTimeboxLimitedUser()
        ? REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS
        : 3600;
      const magicEnabled = (ORKIO_ENV.VITE_REALTIME_MAGICWORDS || import.meta.env.VITE_REALTIME_MAGICWORDS || "true").toString().trim().toLowerCase() !== "false";
      rtcMagicEnabledRef.current = magicEnabled;

      // PATCH_32_PREDEPLOY:
      // Voice priority is canonical registry-driven and must honor the selected
      // manual button before the Realtime session starts.
      const selectedAgentObj = selectedAgentObjForRealtime || findAgentByRuntimeIdentity(agentIdToSend) || (agents || []).find(a => String(a.id) === String(agentIdToSend));
      const selectedVoiceResolution = resolveAgentVoiceResolution(selectedAgentObj || { id: agentIdToSend, slug: realtimeManualContract.realtime_voice_agent_slug || realtimeManualContract.target_agent_slug || "orkio" });
      const rtVoice = coerceVoiceId(selectedVoiceResolution.voice || envVoice || ORKIO_DEFAULT_VOICE_ID);
      rtcVoiceRef.current = rtVoice;
      const realtimeAgentInstructions = [
        registryBuildCanonicalRealtimeAgentInstructions(realtimeManualContract.realtime_voice_agent_slug || realtimeManualContract.target_agent_slug || selectedAgentObj?.slug || selectedAgentObj?.name || "orkio", {
          fallbackSlug: "orkio",
          includeKnownAgents: true,
        }),
        buildRealtimeAgentInstructions(selectedAgentObj),
        `PATCH_32_PREDEPLOY_START_VOICE_SYNC: sessão iniciada com voz ${rtVoice} para o agente manual selecionado.`,
      ].filter(Boolean).join("\n\n");
      logRealtimeStep("patch32_predeploy:start_voice_resolved", {
        provider_voice: rtVoice,
        voice_source: selectedVoiceResolution.voice_source || null,
        selected_agent_slug: realtimeManualContract.realtime_voice_agent_slug || realtimeManualContract.target_agent_slug || null,
        manual_agent_lock: Boolean(realtimeManualContract.manual_agent_lock),
        manual_lock_persistence_version: realtimeManualContract.manual_lock_persistence_version || PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
        manual_lock_contract_propagation_version: PATCH_32_REV_G_MANUAL_LOCK_CONTRACT_PROPAGATION_VERSION,
        session_voice_sync_version: PATCH_32_PREDEPLOY_PREMIUM_VERSION,
        team_panel_version: realtimeManualContract.team_panel_version || null,
        manual_team_panel_order: realtimeManualContract.manual_team_panel_order || null,
      });

      // AO68A-HF5: explicit Summit/platform mode + onboarding language propagation.
      // Before HF5, language_profile was only sent in Summit mode. Normal Realtime stayed on env/auto.
      const runtimeMode = summitRuntimeModeRef.current === "summit" ? "summit" : "platform";
      const onboardingLanguage = getUserOnboardingLanguage(user, onboardingForm);
      const languageProfile = normalizeRealtimeLanguageProfile(
        runtimeMode === "summit"
          ? (summitLanguageProfileRef.current || onboardingLanguage || "auto")
          : (onboardingLanguage || summitLanguageProfileRef.current || "auto")
      );
      rtcLanguageProfileRef.current = languageProfile;

      const patch34StartRoomActive = Boolean(
        realtimeManualContract.manual_team_conversation_active ||
        realtimeManualContract.manual_target_slug === "team" ||
        String(realtimeManualContract.dest_mode || destMode || "").trim().toLowerCase() === "team"
      );
      const patch34StartRoomFocusSlug = canonicalAgentSlug(
        realtimeManualContract.manual_team_focus_slug ||
        realtimeManualContract.target_agent_slug ||
        selectedAgentObj?.slug ||
        selectedAgentObj?.key ||
        selectedAgentObj?.name ||
        "orkio"
      ) || "orkio";
      const patch34StartRoomState = patch34StartRoomActive
        ? buildPatch34RoomState({
            sessionId: "",
            threadId: effectiveRealtimeThreadId || threadId || "",
            activeSlug: patch34StartRoomFocusSlug,
            source: "realtime_start_payload",
            phase: "READY",
            persisted: true,
          })
        : null;

      const realtimeStartPayload = {
        agent_id: agentIdToSend,
        thread_id: effectiveRealtimeThreadId || null,
        voice: rtVoice,
        model: rtModel,
        ttl_seconds: effectiveRealtimeTtlSeconds,
        language_profile: languageProfile,
        language: languageProfile,
        dest_mode: realtimeManualContract.dest_mode || destMode,
        visible_agent: realtimeManualContract.visible_agent || rtcHostAgentNameRef.current || selectedAgentObj?.name || null,
        target_agent_slug: realtimeManualContract.target_agent_slug || canonicalAgentSlug(selectedAgentObj?.slug || selectedAgentObj?.key || selectedAgentObj?.name || agentIdToSend),
        target_agent_slugs: Array.isArray(realtimeManualContract.target_agent_slugs) ? realtimeManualContract.target_agent_slugs : [],
        requested_agent_names: Array.isArray(realtimeManualContract.requested_agent_names) && realtimeManualContract.requested_agent_names.length
          ? realtimeManualContract.requested_agent_names
          : (selectedAgentObj?.name ? [selectedAgentObj.name] : []),
        agent_ids: Array.isArray(realtimeManualContract.agent_ids) && realtimeManualContract.agent_ids.length
          ? realtimeManualContract.agent_ids
          : (String(destMode || "").trim().toLowerCase() === "multi" ? destMulti : null),
        multi_agent_turn: Boolean(realtimeManualContract.multi_agent_turn),
        response_control: realtimeManualContract.response_control || (String(destMode || "").trim().toLowerCase() === "multi" ? "manual_multi" : "single_turn"),
        manual_agent_lock: Boolean(realtimeManualContract.manual_agent_lock),
        manual_target_slug: realtimeManualContract.manual_target_slug || realtimeManualPayload.manual_target_slug || null,
        manual_agent_source: realtimeManualContract.manual_agent_source || "",
        manual_authority_version: realtimeManualContract.manual_authority_version || realtimeManualPayload.manual_authority_version || "",
        manual_sticky_state_version: realtimeManualContract.manual_sticky_state_version || realtimeManualPayload.manual_sticky_state_version || PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
        manual_lock_persistence_version: realtimeManualContract.manual_lock_persistence_version || realtimeManualPayload.manual_lock_persistence_version || PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
        manual_lock_staging_proof_version: getPatch32ManualLockStagingProofVersion(),
        manual_lock_staging_proof_production_guard_version: PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION,
        manual_authority_source: realtimeManualContract.manual_authority_source || realtimeManualPayload.manual_authority_source || PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE,
        manual_authority_updated_at: realtimeManualContract.manual_authority_updated_at || realtimeManualPayload.manual_authority_updated_at || 0,
        manual_team_panel_required: Boolean(realtimeManualContract.manual_team_panel_required),
        manual_team_panel_order: realtimeManualContract.manual_team_panel_order || null,
        team_panel_version: realtimeManualContract.team_panel_version || "",
        team_panel_mode: realtimeManualContract.team_panel_mode || "",
        team_panel_voice_moderator_slug: realtimeManualContract.team_panel_voice_moderator_slug || "",
        manual_team_conversation_active: Boolean(realtimeManualContract.manual_team_conversation_active),
        manual_team_focus_slug: realtimeManualContract.manual_team_focus_slug || null,
        manual_team_turn_queue: realtimeManualContract.manual_team_turn_queue || null,
        manual_team_turn_index: realtimeManualContract.manual_team_turn_index || 0,
        team_conversation_mode: realtimeManualContract.team_conversation_mode || "",
        team_conversation_orchestrator_version: realtimeManualContract.team_conversation_orchestrator_version || "",
        team_conversation_staging_verification_version: realtimeManualContract.team_conversation_staging_verification_version || "",
        realtime_provider_payload_sanitizer_version: PATCH_33_REV_B_REALTIME_PROVIDER_PAYLOAD_SANITIZER_VERSION,
        live_agent_switch_runtime_fix_version: PATCH_33_REV_C_LIVE_AGENT_SWITCH_RUNTIME_FIX_VERSION,
        realtime_room_engine_version: patch34StartRoomActive ? PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION : "",
        room_mode: patch34StartRoomActive ? PATCH_34_REVB_ROOM_MODE : "",
        room_state: patch34StartRoomState,
        session_voice_sync_version: PATCH_32_PREDEPLOY_PREMIUM_VERSION,
        preferred_address_names: resolveProfileAddressNames(user, typeof window !== "undefined" ? window.localStorage : null),
        profile_address_preference_version: PROFILE_ADDRESS_PREFERENCE_VERSION,
        auto_handoff_enabled: realtimeManualContract.auto_handoff_enabled !== false,
        // EFATA777 V8:
        // Admin/founder Realtime is client-controlled so the frontend can inspect
        // the final transcript, apply the voice handoff, and only then create one
        // spoken response. This prevents duplicate/old-speaker answers.
        client_controlled_response: !isRealtimeTimeboxLimitedUser(),
      };

      const startPayload = runtimeMode === "summit"
        ? { ...realtimeStartPayload, mode: "summit", response_profile: "stage" }
        : { ...realtimeStartPayload, mode: "platform", response_profile: "natural" };
      const { data: start } = await apiFetch("/api/realtime/start", {
        method: "POST",
        token,
        org: tenant,
        body: startPayload,
      });

      logRealtimeStep("start:language_profile_resolved", {
        runtimeMode,
        onboardingLanguage,
        languageProfile,
      });
      logRealtimeStep('start:session_ok', start);
      // ORKIO_AO60K_HF5B_FRONTEND_ENDED_AT_SECONDS_TIMEBOX_VERIFY
      // Runtime proof: confirms the active bundle received backend timebox policy.
      try {
        console.log("REALTIME_TIMEBOX_POLICY", {
          marker: ORKIO_AO60K_HF5B_BUILD_MARKER,
          ao61aMarker: ORKIO_AO61A_BUILD_MARKER,
          timebox: start?.timebox || null,
          canAccessAdmin: Boolean(canAccessAdmin),
          runtimeMode: summitRuntimeModeRef.current,
        });
      } catch {}
      // ORKIO_AO60K_HF2_429_COOLDOWN_HARDENING
  // Harden 429/cooldown UX so Realtime never stays visually active after backend blocks /start.
  // ORKIO_AO60K_HF1_RUNTIME_TIMEBOX_SYNC
      // Backend is the source of truth. If backend says this session is limited,
      // force frontend counter/stop/cooldown even if the cached local user object
      // temporarily looks like admin/superadmin.
      try {
        const timebox = start?.timebox || {};
        const maxSeconds = Number(timebox?.max_seconds);
        const remainingSeconds = Number(timebox?.remaining_seconds);
        const cooldownSeconds = Number(timebox?.cooldown_seconds);
        const backendBypass = String(
          timebox?.bypass ||
          start?.bypass ||
          start?.timebox_bypass ||
          ""
        ).trim().toLowerCase();
        const adminBypassByBackend = backendBypass === "admin" || timebox?.admin_bypass === true;
        const limitedByBackend = (
          timebox?.limited === true ||
          String(timebox?.limited || "").trim().toLowerCase() === "true" ||
          (Number.isFinite(remainingSeconds) && remainingSeconds > 0) ||
          (Number.isFinite(maxSeconds) && maxSeconds > 0) ||
          (Number.isFinite(cooldownSeconds) && cooldownSeconds > 0)
        );
        // HF6.2: non-admin users must never inherit an admin/no-limit bypass from backend copy alone.
        // Public/local authority wins for UI enforcement: only locally confirmed admin bypasses the 2-minute guard.
        const effectiveAdminBypass = Boolean(canAccessAdmin);
        const effectiveLimitedByBackend = (
          REALTIME_FRONTEND_HARD_TIMEBOX_ENABLED === true
            ? (effectiveAdminBypass ? false : Boolean(limitedByBackend))
            : false
        );
        rtcAdminTimeboxBypassRef.current = effectiveAdminBypass;
        setRtcAdminTimeboxBypass(effectiveAdminBypass);
        rtcBackendTimeboxLimitedRef.current = effectiveLimitedByBackend;
        setRtcBackendTimeboxLimited(effectiveLimitedByBackend);
        if (effectiveLimitedByBackend || isRealtimeTimeboxLimitedUser()) {
          rtcTimeboxPolicyRef.current = {
            maxSeconds: Number.isFinite(maxSeconds) && maxSeconds > 0 ? Math.ceil(maxSeconds) : REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS,
            remainingSeconds: Number.isFinite(remainingSeconds) && remainingSeconds > 0 ? Math.ceil(remainingSeconds) : null,
            cooldownSeconds: Number.isFinite(cooldownSeconds) && cooldownSeconds > 0 ? Math.ceil(cooldownSeconds) : REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS,
          };
          setRtcTimeboxRemaining(rtcTimeboxPolicyRef.current.remainingSeconds || rtcTimeboxPolicyRef.current.maxSeconds);
          logRealtimeStep("timebox:backend_policy_synced", {
            limited: Boolean(effectiveLimitedByBackend),
            maxSeconds: rtcTimeboxPolicyRef.current.maxSeconds,
            remainingSeconds: rtcTimeboxPolicyRef.current.remainingSeconds,
            cooldownSeconds: rtcTimeboxPolicyRef.current.cooldownSeconds,
            canAccessAdmin: Boolean(canAccessAdmin),
            backendAdminBypassIgnoredForNonAdmin: Boolean(!canAccessAdmin && adminBypassByBackend),
            hf3Marker: ORKIO_AO61A_HF3_BUILD_MARKER,
            hf6_2Marker: ORKIO_HF6_2_BUILD_MARKER,
          });
        } else {
          rtcTimeboxPolicyRef.current = null;
          setRtcTimeboxRemaining(null);
          clearRealtimeTimeboxTimer();
          try { setRtcCooldownRemaining(0); } catch {}
          try { rtcCooldownUntilRef.current = 0; } catch {}
          logRealtimeStep("timebox:admin_bypass_synced", {
            canAccessAdmin: Boolean(canAccessAdmin),
            adminBypassByBackend: Boolean(adminBypassByBackend),
            effectiveAdminBypass: Boolean(effectiveAdminBypass),
            limitedByBackend: Boolean(limitedByBackend),
            ttlSeconds: effectiveRealtimeTtlSeconds,
            hf6_2Marker: ORKIO_HF6_2_BUILD_MARKER,
          });
        }
      } catch {}
      const EPHEMERAL_KEY = start?.client_secret?.value || start?.client_secret_value || start?.value || null;
      if (!EPHEMERAL_KEY) {
        logRealtimeStep('start:ephemeral_missing', start);
        throw new Error('Realtime token vazio');
      }
      logRealtimeStep('start:ephemeral_ok', { session_id: start?.session_id || null, thread_id: start?.thread_id || null });

      applyRealtimeMeetingStateFromPayload(start, "realtime_start");
      if (start?.room_state || start?.meeting_state?.room_mode === PATCH_34_REVB_ROOM_MODE) {
        const startRoomState = start?.room_state || start?.meeting_state || null;
        if (startRoomState && typeof startRoomState === "object") {
          manualRealtimeRoomStateRef.current = {
            ...startRoomState,
            session_id: start?.session_id || startRoomState.session_id || "",
            room_mode: PATCH_34_REVB_ROOM_MODE,
            mode: PATCH_34_REVB_ROOM_MODE,
            multi_agent_turn: true,
            response_control: PATCH_34_REVB_ROOM_RESPONSE_CONTROL,
            has_snapshot: true,
            version: PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION,
          };
          try {
            logRealtimeStep("patch34_revb:room_state_from_start", {
              session_id: start?.session_id || null,
              room_mode: PATCH_34_REVB_ROOM_MODE,
              active_speaker_slug: manualRealtimeRoomStateRef.current.active_speaker_slug || null,
              room_state_persisted: Boolean(manualRealtimeRoomStateRef.current.persisted || manualRealtimeRoomStateRef.current.room_state_persisted),
              has_snapshot: true,
              version: PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION,
            });
          } catch {}
        }
      }

      rtcSessionIdRef.current = start?.session_id || null;
      const ownedRealtimeSessionId = String(start?.session_id || "").trim();
      const ownedRealtimeSessionEpoch = claimRealtimeActiveSession(ownedRealtimeSessionId, "start_session_ok");
      rtcSessionStartedAtRef.current = Date.now();
      clearRealtimePendingAutoStop();
      try { console.log("REALTIME_SESSION_STARTED", { sessionId: start?.session_id || null, threadId: start?.thread_id || threadId || null, marker: ORKIO_AO66R_HF4_BUILD_MARKER }); } catch {}
      setLastRealtimeSessionId(start?.session_id || null);
      rtcThreadIdRef.current = start?.thread_id || effectiveRealtimeThreadId || threadId || null;

      // ORKIO_AO60K_HF5_FRONTEND_MOBILE_REALTIME_RESTART_TRANSCRIPT_FIX
      // Show the visual timer immediately after /start 200 + backend timebox policy.
      // Do not wait for DataChannel.open; mobile can take longer and users must see the clock.
      try {
        const immediateTimeboxSeconds = resolveRealtimeStartTimeboxSeconds(start);
        try {
          console.log("REALTIME_TIMEBOX_STARTING", {
            marker: ORKIO_AO61A_BUILD_MARKER,
            hf3Marker: ORKIO_AO61A_HF3_BUILD_MARKER,
            previousMarker: ORKIO_AO60K_HF5B_BUILD_MARKER,
            immediateTimeboxSeconds,
            timebox: start?.timebox || null,
            policy: rtcTimeboxPolicyRef.current || null,
            backendTimeboxLimited: Boolean(rtcBackendTimeboxLimitedRef.current),
          });
        } catch {}
        // AO68A-HF6R8:
        // Public users see the clock after /start 200.
        // Admin/superadmin sessions remain live without public hard-stop.
        if (isRealtimeTimeboxLimitedUser()) {
          rtcPendingTimeboxSecondsRef.current = immediateTimeboxSeconds;
          setRtcTimeboxRemaining(immediateTimeboxSeconds);
          startRealtimeTimebox(immediateTimeboxSeconds, {
            force: true,
            source: "after_start_200_public_clock_open",
          });
          updateRealtimePremiumStatus("connecting", `Relógio aberto. ${String(rtcHostAgentNameRef.current || "Orkio").trim() || "Orkio"} fará a saudação inicial por voz.`);
        } else {
          rtcPendingTimeboxSecondsRef.current = null;
          clearRealtimeTimeboxTimer();
          setRtcTimeboxRemaining(null);
          updateRealtimePremiumStatus("connecting", `Realtime ao vivo. ${String(rtcHostAgentNameRef.current || "Orkio").trim() || "Orkio"} fará a saudação inicial por voz.`);
        }
        startRealtimeStartupWatchdog(rtcSessionIdRef.current, "after_start_200");
      } catch {}
      // AO01_REALTIME_THREAD_FOCUS_GUARD:
      // Realtime pode receber thread_id do backend, mas não pode roubar
      // o foco de uma conversa já ativa/escolhida pelo usuário.
      if (start?.thread_id && !threadId && !activeThreadIdRef.current) {
        try { activateThread(start.thread_id, { clearMessages: true }); } catch {}
      } else if (effectiveRealtimeThreadId && start?.thread_id && String(start.thread_id) !== String(effectiveRealtimeThreadId)) {
        // Do not let realtime steal the visible conversation focus.
        try {
          logRealtimeStep("start:backend_thread_id_ignored_for_focus", {
            backend_thread_id: start.thread_id,
            effective_realtime_thread_id: effectiveRealtimeThreadId,
          });
        } catch {}
      }

      rtcEventQueueRef.current = [];
      rtcSeenBackendResponseIdsRef.current = new Set();
      if (rtcFlushTimerRef.current) { try { clearInterval(rtcFlushTimerRef.current); } catch {} }
      rtcFlushTimerRef.current = setInterval(() => { try { flushRealtimeEvents(); } catch {} }, 400);
      startRealtimeLivePoll();

      const pc = new RTCPeerConnection();
      rtcPcRef.current = pc;

      // AO01-HF6R17_REALTIME_AUDIO_OUTPUT_NEGOTIATION
      // Explicitly ask WebRTC to receive assistant audio. Relying only on the
      // microphone sender may leave the provider free to complete text events
      // without delivering a playable remote audio track.
      try {
        pc.addTransceiver("audio", { direction: "recvonly" });
        logRealtimeStep("audio:recvonly_transceiver_added");
      } catch (err) {
        logRealtimeStep("audio:recvonly_transceiver_failed", { message: err?.message || null });
      }

      // Remote audio output
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.muted = false;
      audioEl.volume = 1;
      try { audioEl.controls = false; } catch {}
      try { audioEl.preload = "auto"; } catch {}
      try { audioEl.setAttribute("playsinline", ""); } catch {}
      try { audioEl.setAttribute("webkit-playsinline", ""); } catch {}
      try {
        audioEl.style.display = "none";
        document.body.appendChild(audioEl);
      } catch {}
      rtcAudioElRef.current = audioEl;

      pc.ontrack = (e) => {
        try {
          if (shouldIgnoreStaleRealtimeSessionEvent(ownedRealtimeSessionId, ownedRealtimeSessionEpoch, "pc.ontrack", "pc.ontrack")) return;
          let remoteStream = e.streams?.[0] || rtcRemoteStreamRef.current || null;
          if (!remoteStream && e.track) {
            remoteStream = new MediaStream();
          }
          if (remoteStream && e.track && !remoteStream.getTracks?.().some((t) => t.id === e.track.id)) {
            try { remoteStream.addTrack(e.track); } catch {}
          }
          rtcRemoteStreamRef.current = remoteStream || null;
          if (rtcRemoteStreamRef.current && audioEl.srcObject !== rtcRemoteStreamRef.current) {
            audioEl.srcObject = rtcRemoteStreamRef.current;
          }
          logRealtimeStep("audio:ontrack", {
            kind: e.track?.kind || null,
            readyState: e.track?.readyState || null,
            streams: e.streams?.length || 0,
            remoteTracks: rtcRemoteStreamRef.current?.getTracks?.().length || 0,
          });
          ensureRealtimeAudioOutput("ontrack");
        } catch (err) {
          logRealtimeStep("audio:ontrack_failed", { message: err?.message || null });
        }
      };

      // Mic input
      let realtimeMicPermissionState = null;
      try {
        if (navigator?.permissions?.query) {
          const permissionStatus = await navigator.permissions.query({ name: "microphone" });
          realtimeMicPermissionState = permissionStatus?.state || null;
          logRealtimeStep("start:mic_permission_state", { state: realtimeMicPermissionState });
          if (realtimeMicPermissionState === "denied") {
            throw buildRealtimeDiagnosticError(
              "MIC_PERMISSION_DENIED",
              "O microfone está bloqueado para este PWA. Libere a permissão de microfone nas configurações do navegador/app e tente novamente.",
              { permissionState: realtimeMicPermissionState }
            );
          }
        }
      } catch (permissionErr) {
        if (permissionErr?.code === "MIC_PERMISSION_DENIED") throw permissionErr;
        logRealtimeStep("start:mic_permission_probe_unavailable", { message: permissionErr?.message || null });
      }

      logRealtimeStep('start:request_mic');
      const micConstraints = {
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 16000,
        },
        video: false,
      };
      let ms;
      try {
        ms = await navigator.mediaDevices.getUserMedia(micConstraints);
      } catch (micPrimaryErr) {
        logRealtimeStep("start:mic_primary_failed", {
          name: micPrimaryErr?.name || null,
          message: micPrimaryErr?.message || null,
          permissionState: realtimeMicPermissionState,
        });
        try {
          ms = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          logRealtimeStep("start:mic_fallback_ok");
        } catch (micFallbackErr) {
          logRealtimeStep("start:mic_fallback_failed", {
            name: micFallbackErr?.name || null,
            message: micFallbackErr?.message || null,
            permissionState: realtimeMicPermissionState,
          });
          const micFailureName = String(micFallbackErr?.name || micPrimaryErr?.name || "").toLowerCase();
          const micFailureMessage = String(micFallbackErr?.message || micPrimaryErr?.message || "").toLowerCase();
          const denied = micFailureName.includes("notallowed") || micFailureName.includes("permission");
          const deviceMissing = (
            micFailureName.includes("notfound") ||
            micFailureMessage.includes("requested device not found") ||
            micFailureMessage.includes("device not found") ||
            micFailureMessage.includes("microphone not found")
          );
          throw buildRealtimeDiagnosticError(
            denied ? "MIC_PERMISSION_DENIED" : (deviceMissing ? "MIC_DEVICE_NOT_FOUND" : "MIC_GET_USER_MEDIA_FAILED"),
            denied
              ? "O microfone está bloqueado para este PWA. Libere a permissão de microfone nas configurações do navegador/app e tente novamente."
              : deviceMissing
                ? "Microfone não encontrado. Verifique permissões ou continue por texto."
                : "Não consegui capturar o áudio do microfone neste dispositivo. Tente novamente, revise as permissões ou continue por texto.",
            {
              primaryName: micPrimaryErr?.name || null,
              primaryMessage: micPrimaryErr?.message || null,
              fallbackName: micFallbackErr?.name || null,
              fallbackMessage: micFallbackErr?.message || null,
              permissionState: realtimeMicPermissionState,
            }
          );
        }
      }
      const rawTrack = ms.getAudioTracks?.()[0] || ms.getTracks?.()[0] || null;
      if (!rawTrack) throw new Error("Microfone indisponível");

      let outboundStream = ms;
      let outboundTrack = rawTrack;

      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx({ sampleRate: 16000, latencyHint: "interactive" });
          const source = ctx.createMediaStreamSource(ms);
          const gainNode = ctx.createGain();
          gainNode.gain.value = 0.75;
          const destination = ctx.createMediaStreamDestination();
          source.connect(gainNode);
          gainNode.connect(destination);
          const processedTrack = destination.stream.getAudioTracks?.()[0] || null;
          if (processedTrack) {
            outboundStream = destination.stream;
            outboundTrack = processedTrack;
            rtcAudioProcessingRef.current = { ctx, source, gainNode, destination, rawStream: ms };
          } else {
            try { ctx.close?.(); } catch {}
          }
        }
      } catch (audioErr) {
        console.warn("[Realtime] mic processing chain unavailable, using raw track", audioErr);
      }

      logRealtimeStep('start:mic_ok', { label: outboundTrack?.label || null, readyState: outboundTrack?.readyState || null });
      queueRealtimeTelemetry('mic_ok', { label: outboundTrack?.label || null, readyState: outboundTrack?.readyState || null });
      outboundTrack.onended = () => {
        try {
          logRealtimeStep("mic:ended");
          if (realtimeModeRef.current) {
            void activateSilentRealtimeFallback("mic_ended");
          }
        } catch {}
      };
      pc.addTrack(outboundTrack, outboundStream);

      // Events channel
      const dc = pc.createDataChannel('oai-events');
      rtcDcRef.current = dc;

      pc.onconnectionstatechange = () => {
        if (shouldIgnoreStaleRealtimeSessionEvent(ownedRealtimeSessionId, ownedRealtimeSessionEpoch, "pc.connection_state", "pc.onconnectionstatechange")) return;
        const state = pc.connectionState || "unknown";
        logRealtimeStep("pc:connection_state", { state });
        queueRealtimeTelemetry("pc_connection_state", { state, iceState: pc.iceConnectionState || null, signalingState: pc.signalingState || null });
        if (state === "failed" || state === "disconnected" || state === "closed") {
          flushRealtimePartialTranscript(`pc_${state}_partial_flush`);
          setV2vError(`Realtime connection ${state}`);
          if (realtimeModeRef.current) void activateSilentRealtimeFallback(`pc_${state}`);
        } else if (state === "connected") {
          ensureRealtimeAudioOutput("pc_connected");
        }
      };

      dc.addEventListener("close", () => {
        if (shouldIgnoreStaleRealtimeSessionEvent(ownedRealtimeSessionId, ownedRealtimeSessionEpoch, "dc.close", "datachannel.close")) return;
        logRealtimeStep("dc:close");
        queueRealtimeTelemetry("datachannel_close", { readyState: dc.readyState || null });
        flushRealtimePartialTranscript("dc_close_partial_flush");
        releaseRealtimeResponseAuthority("dc.close", rtcResponseAuthorityRef.current?.key || "");
        rtcResponseInFlightRef.current = false;
        if (realtimeModeRef.current) {
          setV2vPhase("error");
          setV2vError("Realtime channel closed");
          void activateSilentRealtimeFallback("dc_closed");
        }
      });

      dc.addEventListener("error", (err) => {
        if (shouldIgnoreStaleRealtimeSessionEvent(ownedRealtimeSessionId, ownedRealtimeSessionEpoch, "dc.error", "datachannel.error")) return;
        console.warn("[Realtime] datachannel error", err);
        logRealtimeStep("dc:error", { message: err?.message || null });
        queueRealtimeTelemetry("datachannel_error", { message: err?.message || null, readyState: dc.readyState || null });
      });

            dc.addEventListener('open', () => {
        if (shouldIgnoreStaleRealtimeSessionEvent(ownedRealtimeSessionId, ownedRealtimeSessionEpoch, "dc.open", "datachannel.open")) return;
        queueRealtimeTelemetry("datachannel_open", { readyState: dc.readyState || null, pcState: pc.connectionState || null, iceState: pc.iceConnectionState || null });
        setV2vPhase('listening');
        updateRealtimePremiumStatus("listening", "📝 Transcrição ativa");

        const activeTimeboxSeconds = isRealtimeTimeboxLimitedUser()
          ? Math.max(
              1,
              Math.ceil(Number(start?.timebox?.max_seconds || rtcTimeboxPolicyRef.current?.maxSeconds || REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS))
            )
          : 3600;

        if (isRealtimeTimeboxLimitedUser()) {
          const durationLabel = formatRealtimeDurationLabel(activeTimeboxSeconds);
          const cooldownSeconds = Math.max(
            1,
            Math.ceil(Number(rtcTimeboxPolicyRef.current?.cooldownSeconds || REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS))
          );
          const cooldownLabel = formatRealtimeDurationLabel(cooldownSeconds);
          const activeAgentLabel = String(rtcHostAgentNameRef.current || "Orkio").trim() || "Orkio";
          setUploadStatus(`⚡ ${activeAgentLabel} em tempo real — até ${durationLabel}. Depois, nova voz em ${cooldownLabel}. Texto liberado.`);
          setTimeout(() => setUploadStatus(''), 3500);
          if (!rtcPendingTimeboxSecondsRef.current) {
            rtcPendingTimeboxSecondsRef.current = resolveRealtimeStartTimeboxSeconds({ timebox: rtcTimeboxPolicyRef.current });
          }
          setRtcTimeboxRemaining(rtcPendingTimeboxSecondsRef.current || activeTimeboxSeconds);
        } else {
          const activeAgentLabel = String(rtcHostAgentNameRef.current || "Orkio").trim() || "Orkio";
          setUploadStatus(`⚡ ${activeAgentLabel} em tempo real ativo.`);
          setTimeout(() => setUploadStatus(''), 1500);
          rtcPendingTimeboxSecondsRef.current = null;
          clearRealtimeTimeboxTimer();
          setRtcTimeboxRemaining(null);
        }

        startRealtimeAudioWatchdog();
        clearRealtimeStartupWatchdog();
        startRealtimeWakeLockGuard("data_channel_open");
        ensureRealtimeAudioOutput("data_channel_open");

        // AO68A-HF6R8 — Realtime transcription follows onboarding language and keeps audio response armed.
        try {
          const envLang = String(
            window.__ORKIO_ENV__?.VITE_REALTIME_TRANSCRIBE_LANGUAGE ||
            import.meta.env.VITE_REALTIME_TRANSCRIBE_LANGUAGE ||
            ""
          ).trim();

          const preferredLang = normalizeRealtimeLanguageProfile(
            rtcLanguageProfileRef.current ||
            (summitRuntimeModeRef.current === "summit" ? summitLanguageProfileRef.current : "") ||
            envLang ||
            "auto"
          );

          const langHint = resolveRealtimeTranscriptionLanguage(preferredLang);
          const transcriptionModel = String(
            window.__ORKIO_ENV__?.VITE_REALTIME_TRANSCRIBE_MODEL ||
            import.meta.env.VITE_REALTIME_TRANSCRIBE_MODEL ||
            "gpt-4o-mini-transcribe"
          ).trim() || "gpt-4o-mini-transcribe";

          const transcription = { model: transcriptionModel };
          if (langHint) transcription.language = langHint;

          const realtimeInstructions =
            preferredLang === "en"
              ? "You are Orkio in real time. Start by speaking first. Keep the conversation focused on the user's last clear answer. Ask one short question at a time. If the audio is unclear, ask the user to repeat."
              : preferredLang === "es"
                ? "Eres Orkio en tiempo real. Empieza hablando primero. Mantén la conversación enfocada en la última respuesta clara del usuario. Haz una pregunta corta por vez. Si el audio no está claro, pide que el usuario repita."
                : preferredLang === "pt"
                  ? "Você é Orkio em tempo real. Comece falando primeiro. Mantenha a conversa focada na última resposta clara do usuário. Faça uma pergunta curta por vez. Se o áudio estiver confuso, peça para o usuário repetir."
                  : "You are Orkio in real time. Start by speaking first. Answer in the same language the user is using. Keep the conversation focused and ask one short question at a time.";

          try {
            console.log("REALTIME_TRANSCRIPTION_LANGUAGE", {
              marker: "AO68A-HF6R8_REALTIME_RESPONSE_CREATE_AUDIO_ARMING",
              envLang,
              preferredLang,
              langHint,
              transcriptionModel,
              vadThreshold: REALTIME_SERVER_VAD_THRESHOLD,
              vadSilenceMs: REALTIME_SERVER_VAD_SILENCE_MS,
              vadPrefixMs: REALTIME_SERVER_VAD_PREFIX_MS,
            });
          } catch {}

          sendRealtimeClientEvent(dc, {
            type: "session.update",
            session: {
              type: "realtime",
              instructions: realtimeAgentInstructions,
              // AO64D-HF5_RESPONSE_CREATE_GA_SAFE:
              // Do not send session.modalities. Use output_modalities only.
              output_modalities: ["audio"],
              audio: {
                input: {
                  transcription,
                  turn_detection: {
                    type: "server_vad",
                    threshold: REALTIME_SERVER_VAD_THRESHOLD,
                    silence_duration_ms: REALTIME_SERVER_VAD_SILENCE_MS,
                    prefix_padding_ms: REALTIME_SERVER_VAD_PREFIX_MS,
                    create_response: isRealtimeTimeboxLimitedUser(),
                    interrupt_response: true
                  }
                },
                output: {
                  voice: rtcVoiceRef.current
                }
              },
            }
          }, "session_update_audio_vad");
        } catch (err) {
          logRealtimeStep("runtime:transcription_language_update_failed", { message: err?.message || null });
        }

        try { void bridgeCachedThreadDocumentsToRealtime("data_channel_open"); } catch {}

        // AO66R: send a proof-of-audio greeting and, if the provider does not emit
        // response.created quickly, send one fallback conversation item + response.create.
        // This separates "session/call opened" from "audio response actually activated".
        const greetingSent = announceRealtimeTimeboxStart(dc, activeTimeboxSeconds);
        queueRealtimeTelemetry("greeting_sent", { sent: Boolean(greetingSent), activeTimeboxSeconds });
        scheduleRealtimeActivationProbe(dc, "data_channel_open");
      });

      dc.addEventListener('message', (e) => {
        try {
          const ev = JSON.parse(e.data);
          if (shouldIgnoreStaleRealtimeSessionEvent(ownedRealtimeSessionId, ownedRealtimeSessionEpoch, ev?.type || "dc.message", "datachannel.message")) return;

          try {
            const patch35RevGServerEventType = String(ev?.type || "");
            const patch35RevGResponseId = ev?.response?.id || ev?.response_id || null;
            const patch35RevGItemId = ev?.item?.id || ev?.item_id || ev?.response?.output?.[0]?.id || null;
            const patch35RevGCorrelationRecord = patch35RevGResponseId
              ? (rtcPatch35RevGResponseCorrelationRef.current?.[String(patch35RevGResponseId)] || attachPatch35RevGResponseIdToLastCorrelation(patch35RevGResponseId))
              : null;
            if (
              patch35RevGServerEventType === "response.created" ||
              patch35RevGServerEventType === "response.output_item.added" ||
              patch35RevGServerEventType === "response.output_item.done" ||
              patch35RevGServerEventType === "response.audio.delta" ||
              patch35RevGServerEventType === "response.output_audio.delta" ||
              patch35RevGServerEventType === "response.audio.done" ||
              patch35RevGServerEventType === "response.output_audio.done" ||
              patch35RevGServerEventType === "response.audio_transcript.delta" ||
              patch35RevGServerEventType === "response.output_audio_transcript.delta" ||
              patch35RevGServerEventType === "response.audio_transcript.done" ||
              patch35RevGServerEventType === "response.output_audio_transcript.done" ||
              patch35RevGServerEventType === "response.done" ||
              patch35RevGServerEventType === "conversation.item.created" ||
              patch35RevGServerEventType === "conversation.item.completed" ||
              patch35RevGServerEventType === "conversation.item.input_audio_transcription.completed" ||
              patch35RevGServerEventType === "error"
            ) {
              logPatch35RevGRealtimeCorrelation("provider_event_received", {
                source_function: "datachannel.message",
                direction: "provider_to_client",
                event_type: patch35RevGServerEventType,
                event_id: ev?.event_id || null,
                response_id: patch35RevGResponseId,
                item_id: patch35RevGItemId,
                conversation_item_id: patch35RevGItemId,
                previous_item_id: ev?.previous_item_id || ev?.item?.previous_item_id || null,
                correlation_id: patch35RevGCorrelationRecord?.correlation_id || null,
                response_metadata: patch35RevGCorrelationRecord?.response_metadata || ev?.response?.metadata || {},
                voice: patch35RevGCorrelationRecord?.voice || ev?.response?.audio?.output?.voice || null,
                instructions_hash: patch35RevGCorrelationRecord?.instructions_hash || null,
                raw_type: patch35RevGServerEventType,
              });
            }
          } catch {}

          try {
            const eventTypeForLog = String(ev?.type || "");
            console.log("REALTIME_SERVER_EVENT", {
              type: eventTypeForLog,
              response_id: ev?.response?.id || ev?.response_id || null,
              item_id: ev?.item?.id || ev?.item_id || null,
              marker: ORKIO_AO66R_HF4_BUILD_MARKER,
            });
          } catch {}

          try {
            const providerEventType = String(ev?.type || "");
            const providerResponseId = ev?.response?.id || ev?.response_id || null;
            const correlation = providerResponseId
              ? rtcPatch35RevGResponseCorrelationRef.current?.[String(providerResponseId)]
              : null;
            const responseGeneration = Number(correlation?.response_metadata?.switch_generation ?? -1);
            const currentGeneration = Number(rtcManualSwitchGateRef.current?.generation || 0);
            const staleGeneration = Boolean(
              providerResponseId &&
              Number.isFinite(responseGeneration) &&
              responseGeneration >= 0 &&
              responseGeneration < currentGeneration
            );
            const terminalEvent = providerEventType === "response.done" || providerEventType === "error";
            if (staleGeneration && !terminalEvent) {
              logRealtimeStep("patch39:stale_response_generation_discarded", {
                marker: PATCH_39_REALTIME_MANUAL_SWITCH_HARD_GATE_VERSION,
                event_type: providerEventType,
                response_id: providerResponseId,
                response_generation: responseGeneration,
                current_generation: currentGeneration,
                target_agent_slug: rtcManualSwitchGateRef.current?.target_agent_slug || null,
              });
              return;
            }
          } catch {}

          if (String(ev?.type || "") === "session.updated") {
            const gate = rtcManualSwitchGateRef.current || {};
            if (gate.locked && gate.phase === "SESSION_UPDATE_SENT") {
              const currentTarget = canonicalAgentSlug(getRealtimeAuthorityTargetSlug() || "orkio") || "orkio";
              if (currentTarget === gate.target_agent_slug) {
                rtcManualSwitchGateRef.current = {
                  ...gate,
                  locked: false,
                  phase: "READY",
                  confirmed_at_ms: Date.now(),
                };
                try {
                  logRealtimeStep("patch39:manual_switch_gate_released", {
                    marker: PATCH_39_REALTIME_MANUAL_SWITCH_HARD_GATE_VERSION,
                    switch_generation: gate.generation,
                    switch_generation_id: gate.generation_id,
                    target_agent_slug: gate.target_agent_slug,
                    provider_event: "session.updated",
                  });
                  queueRealtimeTelemetry("patch39_manual_switch_gate_released", {
                    marker: PATCH_39_REALTIME_MANUAL_SWITCH_HARD_GATE_VERSION,
                    switch_generation: gate.generation,
                    switch_generation_id: gate.generation_id,
                    target_agent_slug: gate.target_agent_slug,
                  });
                } catch {}
                setRtcReadyToRespond(true);
              }
            }
          }

          try {
            const eventType = String(ev?.type || "");
            const assistantFinalEvent = (
              eventType === "response.output_text.done" ||
              eventType === "response.output_audio_transcript.done" ||
              eventType === "response.audio_transcript.done" ||
              eventType === "response.audio_transcript.final" ||
              eventType === "response.text.done" ||
              eventType === "response.done"
            );
            if (assistantFinalEvent) {
              const extractedAssistantText = extractRealtimeAssistantTextFromEvent(ev);
              console.log("REALTIME_ASSISTANT_TRANSCRIPT_EVENT", {
                marker: ORKIO_AO61A_HF3_BUILD_MARKER,
                hf4Marker: ORKIO_AO61A_HF4_BUILD_MARKER,
                type: eventType,
                hasText: Boolean(extractedAssistantText),
                length: extractedAssistantText.length,
              });
              if (extractedAssistantText) {
                clearRealtimeResponseTimeout();
                clearRealtimeAutoResponseFallback();
                if (eventType === "response.done") {
                  rtcResponseInFlightRef.current = false;
                  flushPendingRealtimeSessionUpdate("assistant_final_response_done");
                }
                scheduleRealtimeAssistantFinalCommit(extractedAssistantText, { source: eventType, delayMs: eventType === "response.done" ? 150 : 1100 });
              }
            }
          } catch {}

                    // Turn arming + optional Magic Words (B3)
          // server_vad + create_response=true is the source of truth.
          // We do not auto-fire response.create on final transcript here; we wait for the server
          // to emit the response events, while still allowing optional manual / magic-word triggers
          // when explicitly requested by the user.
          if (ev?.type === 'conversation.item.input_audio_transcription.completed') {
            markRealtimeConversationActivated("input_audio_transcription.completed", {
              transcriptLength: String(ev?.transcript || ev?.text || ev?.result?.transcript || "").length,
            });
            const raw = (ev?.transcript || ev?.text || ev?.result?.transcript || '').toString();
            try {
              console.log("REALTIME_USER_FINAL_TRANSCRIPT", {
                transcript: raw,
                length: raw.length,
                marker: ORKIO_AO66R_HF4_BUILD_MARKER,
              });
            } catch {}
            updateRealtimePremiumStatus("transcribing", "📝 Transcrição ativa");
            queueRealtimeEvent({
              event_type: 'transcript.final',
              role: 'user',
              content: raw,
              is_final: true,
              meta: {
                agent_name: rtcHostAgentNameRef.current || activeRuntimeAgent || "",
                active_agent: rtcHostAgentNameRef.current || activeRuntimeAgent || "",
                agent_id: rtcHostAgentIdRef.current || null,
                dest_mode: destMode,
                meeting_orchestrator_client: true,
                manual_agent_lock: isManualAgentAuthorityLocked(),
                manual_target_slug: getManualAuthoritySlug(),
                manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
                manual_sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
                manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
                manual_lock_staging_proof_version: getPatch32ManualLockStagingProofVersion(),
                manual_lock_staging_proof_production_guard_version: PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION,
                manual_authority_source: PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE,
                manual_authority_updated_at: manualAuthorityRef.current?.updatedAt || 0,
                selected_agent_slug: getManualAuthoritySlug(),
              },
            });
            try {} catch {}
            rtcLastFinalTranscriptRef.current = raw;
            const realtimeAgentHandoffApplied = maybeApplyRealtimeAgentHandoffFromTranscript(raw, "input_audio_transcription.completed");
            appendRealtimeTranscriptTurn("user", raw, { source: "input_audio_transcription.completed" });
            appendRealtimeInlineChatTurn("user", raw, { source: "input_audio_transcription.completed" });
            markRealtimeUserActivity();

            Promise.resolve(guardAndMaybeBlockRealtimeTranscript(raw)).then((blocked) => {
              if (blocked) return;
              if (rtcTimeboxClosingRef.current) {
                setRtcReadyToRespond(false);
                logRealtimeStep("ao72c_hf1:user_transcript_ignored_during_closing", {
                  transcriptLen: raw.length,
                });
                return;
              }
              setRtcReadyToRespond(!!raw.trim());
              const norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
              const endsWithCmd = (s, cmd) => s === cmd || s.endsWith(' ' + cmd);
              const isMagic = endsWithCmd(norm, 'continue') || endsWithCmd(norm, 'please') || endsWithCmd(norm, 'prossiga') || endsWithCmd(norm, 'por favor');
              if (rtcMagicEnabledRef.current && isMagic) {
                try {
                  if (rtcLastMagicRef.current !== norm) {
                    rtcLastMagicRef.current = norm;
                    triggerRealtimeResponse("magic");
                  }
                } catch (err) {
                  console.warn('[Realtime] magic trigger failed', err);
                }
              } else if (raw.trim()) {
                // AO01-HF6R18:
                // Public-beta/timeboxed users do not run the backend multi-agent turn
                // (see AO60G_REALTIME_MULTI_AGENT_SUPPRESSED), so they must not depend
                // only on server_vad.create_response. In production evidence, Remshire
                // users reached input_audio_transcription.completed but no response.*
                // audio events followed, while Admin worked through the unrestricted
                // agent/backend path. For limited sessions, force exactly one client
                // response.create immediately after the final transcript.
                setRtcReadyToRespond(true);
                const shouldForceLimitedAudio = isRealtimeTimeboxLimitedUser();
                logRealtimeStep('ao01_hf6r18:final_transcript_response_policy', {
                  limited: Boolean(shouldForceLimitedAudio),
                  transcriptLen: raw.length,
                  responseInFlight: Boolean(rtcResponseInFlightRef.current),
                  marker: ORKIO_AO66R_HF4_BUILD_MARKER,
                });
                if (shouldForceLimitedAudio) {
                  try {
                    triggerRealtimeResponse("public_beta_force_audio_after_final_transcript");
                  } catch (err) {
                    logRealtimeStep('ao01_hf6r18:public_beta_force_audio_failed', {
                      message: err?.message || null,
                      marker: ORKIO_AO66R_HF4_BUILD_MARKER,
                    });
                    scheduleRealtimeAutoResponseFallback(raw, "public_beta_force_audio_retry");
                  }
                } else {
                  // Admin/unlimited sessions use client-controlled response.create so
                  // handoff requests can switch to Orion before the model answers.
                  if (realtimeAgentHandoffApplied) {
                    try {
                      window.setTimeout(() => {
                        try {
                          triggerRealtimeResponse("agent_handoff_delayed");
                        } catch (innerErr) {
                          logRealtimeStep("realtime:agent_handoff_trigger_failed", {
                            message: innerErr?.message || null,
                          });
                          scheduleRealtimeAutoResponseFallback(raw, "agent_handoff_fallback");
                        }
                      }, 520);
                    } catch (err) {
                      logRealtimeStep("realtime:agent_handoff_schedule_failed", {
                        message: err?.message || null,
                      });
                      scheduleRealtimeAutoResponseFallback(raw, "agent_handoff_fallback");
                    }
                  } else {
                    scheduleRealtimeAutoResponseFallback(raw, "input_audio_transcription.completed_force_audio");
                  }
                }
              }
            });
          }
// Basic telemetry + optional live captions
          if ((ev?.type === 'response.text.delta' || ev?.type === 'response.output_text.delta') && ev?.delta) {
            clearRealtimeResponseTimeout();
            rtcTextBufRef.current += ev.delta;
          }
          if (ev?.type === 'response.created') {
            const createdResponseId = ev?.response?.id || ev?.response_id || null;
            try {
              if (rtcResponseAuthorityRef.current && createdResponseId) {
                rtcResponseAuthorityRef.current.responseId = createdResponseId;
              }
            } catch {}
            if (
              rtcTimeboxAnnouncementPendingRef.current &&
              !rtcTimeboxAnnouncementResponseIdRef.current &&
              createdResponseId
            ) {
              rtcTimeboxAnnouncementResponseIdRef.current = createdResponseId;
              logRealtimeStep("ao72d_hf1:start_announcement_response_created", {
                responseId: createdResponseId,
              });
            }
            if (
              rtcTimeboxClosingRef.current &&
              rtcTimeboxClosingNoticeSentRef.current &&
              !rtcTimeboxClosingResponseIdRef.current &&
              createdResponseId
            ) {
              rtcTimeboxClosingResponseIdRef.current = createdResponseId;
              logRealtimeStep("ao72d_hf1:closing_response_created", {
                responseId: createdResponseId,
              });
            }
            markRealtimeConversationActivated("response.created", {
              responseId: createdResponseId,
            });
            queueRealtimeTelemetry("session_activated", { source: "response.created", response_id: ev?.response?.id || ev?.response_id || null });
            try {
              console.log("REALTIME_ASSISTANT_RESPONSE_RECEIVED", {
                type: ev?.type,
                response_id: ev?.response?.id || ev?.response_id || null,
                marker: ORKIO_AO66R_HF4_BUILD_MARKER,
              });
            } catch {}
            clearRealtimeResponseTimeout();
            clearRealtimeActivationProbe();
            clearRealtimeAutoResponseFallback();
            rtcLastResponseCreatedAtRef.current = Date.now();
            rtcActivationProbeSentRef.current = false;
            rtcResponseInFlightRef.current = true;
            setV2vPhase('responding');
            updateRealtimePremiumStatus("responding", `${String(rtcHostAgentNameRef.current || "Orkio").trim() || "Orkio"} está respondendo por voz.`);
            rtcTextBufRef.current = '';
            rtcAudioTranscriptBufRef.current = '';
            rtcLastAssistantFinalRef.current = '';
            rtcAssistantFinalCommittedRef.current = false;
            rtcAssistantFinalMessageIdRef.current = null;
            rtcAssistantFinalTextRef.current = "";
            rtcAssistantPendingFinalTextRef.current = "";
            rtcAssistantPendingFinalSourceRef.current = "";
            clearRealtimeAssistantPendingFinalTimer();
          }
          if (ev?.type === 'response.output_item.added') {
            clearRealtimeResponseTimeout();
          }
          if (ev?.type === 'response.content_part.added') {
            clearRealtimeResponseTimeout();
          }
          if (ev?.type === 'response.text.done') {
            clearRealtimeResponseTimeout();
            rtcResponseInFlightRef.current = false;
            const t = (rtcTextBufRef.current || '').trim();
            rtcTextBufRef.current = '';
            rtcAudioTranscriptBufRef.current = '';
            if (t) {
              logRealtimeStep('runtime:response_finalized_pending', { source: 'response.text.done', finalText: t, marker: ORKIO_AO61A_HF4_BUILD_MARKER });
              scheduleRealtimeAssistantFinalCommit(t, { source: 'response.text.done', delayMs: 1100 });
            }
          }
          // Audio transcript (when model outputs audio without text)
          if (ev?.type === 'response.audio.delta' || ev?.type === 'response.output_audio.delta') {
            markRealtimeConversationActivated(ev?.type || "response.audio.delta", { assistantAudio: true });
            queueRealtimeTelemetry("assistant_audio_started", { source: ev?.type || "response.audio.delta" });
            if (rtcTimeboxAnnouncementPendingRef.current && !rtcTimeboxStartedRef.current) {
              rtcTimeboxAnnouncementAudioSeenRef.current = true;
              scheduleRealtimeAnnouncementTimeboxFallback(ev?.type || "response.audio.delta");
            }
            clearRealtimeResponseTimeout();
            try { ensureRealtimeAudioOutput("response_audio_delta"); } catch {}
          }
          if ((ev?.type === 'response.audio_transcript.delta' || ev?.type === 'response.output_audio_transcript.delta') && ev?.delta) {
            clearRealtimeResponseTimeout();
            maybeStartRealtimeTimeboxFromAnnouncementText(ev.delta, ev?.type || "response.audio_transcript.delta");
            rtcAudioTranscriptBufRef.current = (rtcAudioTranscriptBufRef.current || '') + ev.delta;
            try {
              const preview = (rtcAudioTranscriptBufRef.current || "").trim();
              if (preview) {
                setUploadStatus(`🔊 Orkio: ${preview.slice(-90)}`);
              }
            } catch {}
          }
          if (ev?.type === 'response.audio_transcript.done' || ev?.type === 'response.audio_transcript.final') {
            clearRealtimeResponseTimeout();
            rtcResponseInFlightRef.current = false;
            const at = ((rtcAudioTranscriptBufRef.current || '') + (ev?.transcript || '')).trim();
            maybeStartRealtimeTimeboxFromAnnouncementText(ev?.transcript || at, ev?.type || "response.audio_transcript.done");
            rtcAudioTranscriptBufRef.current = '';
            if (at) {
              logRealtimeStep('runtime:response_finalized_pending', { source: 'response.audio_transcript', finalText: at, marker: ORKIO_AO61A_HF4_BUILD_MARKER });
              scheduleRealtimeAssistantFinalCommit(at, { source: 'response.audio_transcript', delayMs: 1100 });
            }
          }

          if (ev?.type === 'response.output_item.done') {
            clearRealtimeResponseTimeout();
            logRealtimeStep('runtime:response_output_item_done', {
              item_id: ev?.item?.id || ev?.item_id || null,
            });
          }

          if (ev?.type === 'response.done') {
            markRealtimeConversationActivated("response.done", {
              responseId: ev?.response?.id || ev?.response_id || null,
            });
            queueRealtimeTelemetry("response_done", {
              responseId: ev?.response?.id || ev?.response_id || null,
            });
            clearRealtimeResponseTimeout();
            clearRealtimeActivationProbe();
            clearRealtimeAutoResponseFallback();
            rtcResponseInFlightRef.current = false;
            flushPendingRealtimeSessionUpdate("response.done");
            const completedResponseId = ev?.response?.id || ev?.response_id || null;
            if (rtcTimeboxClosingRef.current) {
              const expectedClosingResponseId = rtcTimeboxClosingResponseIdRef.current;
              const isExpectedClosingResponse = Boolean(
                rtcTimeboxClosingNoticeSentRef.current &&
                expectedClosingResponseId &&
                completedResponseId &&
                String(expectedClosingResponseId) === String(completedResponseId)
              );

              if (isExpectedClosingResponse) {
                rtcTimeboxClosingNoticeDoneRef.current = true;
                clearRealtimeAutoResponseFallback();
                clearRealtimeIdleFollowup();
                clearRealtimeFinalStopTimer();
                setRtcReadyToRespond(false);
                updateRealtimePremiumStatus("ending", "✅ Mensagem final concluída. Encerrando a voz.");
                logRealtimeStep("ao72d_hf1:timebox_final_closing_notice_done", {
                  responseId: completedResponseId,
                });

                if (!rtcTimeboxFinalStopScheduledRef.current) {
                  rtcTimeboxFinalStopScheduledRef.current = true;
                  rtcTimeboxFinalStopTimerRef.current = setTimeout(() => {
                    try {
                      if (rtcSessionIdRef.current && !rtcStopInFlightRef.current) {
                        void stopRealtime("time_limit_frontend");
                      }
                    } catch {}
                  }, REALTIME_FINAL_MESSAGE_POST_DONE_GRACE_MS);
                }
              } else {
                logRealtimeStep("ao72d_hf1:non_closing_response_done_ignored_during_closing", {
                  responseId: completedResponseId,
                  expectedClosingResponseId,
                  closingNoticeSent: Boolean(rtcTimeboxClosingNoticeSentRef.current),
                });
              }
            } else {
              const openingResponseId = rtcTimeboxAnnouncementResponseIdRef.current;
              const isOpeningResponseDone = Boolean(
                rtcOpeningMicrophoneMutedRef.current &&
                (
                  !openingResponseId ||
                  !completedResponseId ||
                  String(openingResponseId) === String(completedResponseId)
                )
              );

              if (isOpeningResponseDone) {
                rtcOpeningMicrophoneMutedRef.current = false;
                setRealtimeMicrophoneEnabled(true);
                logRealtimeStep("ao72d_hf1:opening_finished_microphone_enabled", {
                  responseId: completedResponseId,
                  timerStarted: Boolean(rtcTimeboxStartedRef.current),
                });
              }

              if (rtcTimeboxAnnouncementPendingRef.current) {
                startRealtimeConversationTimeboxIfNeeded("response.done_announcement_fallback");
              }
            }
            if (!rtcConversationStartedRef.current) updateRealtimePremiumStatus("listening", "📝 Transcrição ativa");

            const textFinal = (rtcTextBufRef.current || '').trim();
            const audioFinal = ((rtcAudioTranscriptBufRef.current || '') + (ev?.transcript || '')).trim();
            const pendingFinal = (rtcAssistantPendingFinalTextRef.current || '').trim();
            const extractedFinal = extractRealtimeAssistantTextFromEvent(ev);
            const finalText = pickLongerRealtimeAssistantText(textFinal, audioFinal, pendingFinal, extractedFinal);

            rtcTextBufRef.current = '';
            rtcAudioTranscriptBufRef.current = '';
            rtcAssistantPendingFinalTextRef.current = '';
            rtcAssistantPendingFinalSourceRef.current = '';
            clearRealtimeAssistantPendingFinalTimer();

            if (finalText) {
              logRealtimeStep('runtime:response_finalized', {
                source: 'response.done:longest',
                finalText,
                marker: ORKIO_AO61A_HF4_BUILD_MARKER,
                textLen: textFinal.length,
                audioLen: audioFinal.length,
                pendingLen: pendingFinal.length,
                extractedLen: extractedFinal.length,
              });
              commitRealtimeAssistantFinal(finalText, { source: 'response.done:longest' });
            } else {
              logRealtimeStep('runtime:response_done_without_text', {
                source: 'response.done',
                textBuf: textFinal.length,
                audioTranscriptBuf: audioFinal.length,
                pendingBuf: pendingFinal.length,
              });
            }
            releaseRealtimeResponseAuthority("response.done", rtcResponseAuthorityRef.current?.key || "");
          }

          if (ev?.type === 'error') {
            clearRealtimeResponseTimeout();
            clearRealtimeAutoResponseFallback();
            releaseRealtimeResponseAuthority("provider_error", rtcResponseAuthorityRef.current?.key || "");
            rtcResponseInFlightRef.current = false;
            flushPendingRealtimeSessionUpdate("provider_error");
            if (rtcTimeboxClosingRef.current) {
              logRealtimeStep('ao72c_hf1:provider_error_ignored_during_timebox_closing', {
                code: ev?.error?.code || null,
                message: ev?.error?.message || null,
              });
            } else {
              console.warn('[Realtime] error', ev);
              logRealtimeStep('runtime:error_event', ev);
              setV2vError(normalizeUserFacingRuntimeMessage(ev?.error?.message || 'Erro Realtime', 'realtime'));
              setV2vPhase('error');
              void activateSilentRealtimeFallback('realtime_error', { disarm: false });
            }
          }
        } catch (err) {
          console.warn('[Realtime] DataChannel handler error', err, e?.data);
          logRealtimeStep('runtime:message_handler_error', {
            message: err?.message || null,
            raw: e?.data || null,
          });
        }
      });

      // SDP handshake
      logRealtimeStep('start:create_offer');
      queueRealtimeTelemetry("offer_create_start", { pcState: pc.connectionState || null, iceState: pc.iceConnectionState || null });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      logRealtimeStep('start:local_description_set', { sdpLength: offer?.sdp?.length || 0 });
      queueRealtimeTelemetry("local_description_set", { sdpLength: offer?.sdp?.length || 0, signalingState: pc.signalingState || null });

      const sdpAbortController = new AbortController();
      const sdpTimeout = setTimeout(() => {
        try { sdpAbortController.abort(); } catch {}
      }, 20000);

      let sdpResponse;
      try {
        queueRealtimeTelemetry("sdp_fetch_start", { endpoint: "https://api.openai.com/v1/realtime/calls", model: start?.model || null });
        sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
          method: 'POST',
          body: offer.sdp,
          signal: sdpAbortController.signal,
          headers: {
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
            'Content-Type': 'application/sdp',
          },
        });
      } catch (sdpFetchErr) {
        logRealtimeStep("start:sdp_fetch_failed", {
          name: sdpFetchErr?.name || null,
          message: sdpFetchErr?.message || null,
        });
        queueRealtimeTelemetry("sdp_fetch_failed", { name: sdpFetchErr?.name || null, message: sdpFetchErr?.message || null, aborted: sdpFetchErr?.name === "AbortError" });
        throw buildRealtimeDiagnosticError(
          "REALTIME_SDP_FETCH_FAILED",
          "Não consegui concluir a conexão de voz em tempo real com o provedor agora. O chat continua disponível por texto.",
          {
            name: sdpFetchErr?.name || null,
            message: sdpFetchErr?.message || null,
            aborted: sdpFetchErr?.name === "AbortError",
          }
        );
      } finally {
        try { clearTimeout(sdpTimeout); } catch {}
      }

      const sdpText = await sdpResponse.text().catch(() => '');
      if (!sdpResponse.ok) {
        logRealtimeStep('start:sdp_error', { status: sdpResponse.status, body: sdpText || sdpResponse.statusText });
        queueRealtimeTelemetry("sdp_error", { status: sdpResponse.status, body: String(sdpText || sdpResponse.statusText || "").slice(0, 800) });
        throw new Error(`SDP handshake falhou (${sdpResponse.status}): ${sdpText || sdpResponse.statusText}`);
      }

      logRealtimeStep('start:sdp_ok', { answerLength: sdpText.length });
      queueRealtimeTelemetry("sdp_ok", { answerLength: sdpText.length, status: sdpResponse.status });
      const answer = { type: 'answer', sdp: sdpText };
      await pc.setRemoteDescription(answer);
      queueRealtimeTelemetry("remote_description_set", { signalingState: pc.signalingState || null, pcState: pc.connectionState || null, iceState: pc.iceConnectionState || null });
      logRealtimeStep('start:ready', { sessionId: start?.session_id || null, threadId: start?.thread_id || threadId || null });

    } catch (e) {
      console.error('[Realtime] startRealtime error', e);
      queueRealtimeTelemetry("start_catch", { code: e?.code || null, status: e?.status || null, message: e?.message || null, userMessage: e?.userMessage || null });
      logRealtimeStep('start:catch', {
        code: e?.code || null,
        status: e?.status || null,
        url: e?.url || null,
        userMessage: e?.userMessage || null,
        message: e?.message || 'Falha ao iniciar Realtime',
        stack: e?.stack || null,
        sessionId: rtcSessionIdRef.current || null,
        threadId: rtcThreadIdRef.current || threadId || null,
      });
      setV2vPhase('error');
      if (isRealtimeCooldownOrRateLimitError(e)) {
        // AO68A-HF6R9:
        // /start cooldown must not trigger stopRealtime(), because stopRealtime() calls
        // /api/realtime/end and can close/recount an already warming session.
        const waitSeconds = applyRealtimeCooldownFromError(e, "start_blocked_by_cooldown");
        clearRealtimeResponseTimeout();
        clearRealtimeActivationProbe();
        clearRealtimeAutoResponseFallback();
        clearRealtimeStartupWatchdog();
        rtcConnectingRef.current = false;
        const label = formatRealtimeCountdown(waitSeconds);
        setRealtimeMode(false);
        realtimeModeRef.current = false;
        setV2vPhase("cooldown");
        setV2vError(`A voz em tempo real estará disponível novamente em ${label}. O chat por texto continua disponível.`);
        updateRealtimePremiumStatus("cooldown", `O chat por texto continua disponível. Liberação em ${label}.`);
        return;
      }
      const friendlyRealtimeError = normalizeUserFacingRuntimeMessage(
        [
          e?.code,
          e?.status ? `status_${e.status}` : "",
          e?.userMessage,
          e?.message,
        ].filter(Boolean).join(" | ") || "Falha ao iniciar Realtime",
        "realtime"
      );
      setV2vError(friendlyRealtimeError);
      setUploadStatus("❌ Realtime indisponível. Você pode continuar por texto.");
      setTimeout(() => setUploadStatus(""), 3500);

      // AO68A-HF6R8: do not call /api/realtime/end immediately after initial
      // browser/WebRTC/SDP failure. Keep the backend evidence intact and avoid
      // killing a session that may still be stabilizing on mobile/PWA.
      logRealtimeStep("ao68a_hf6r8:start_error_no_early_end", {
        code: e?.code || null,
        status: e?.status || null,
        message: e?.message || null,
        sessionId: rtcSessionIdRef.current || null,
      });
      hardResetRealtimeClientState("start_error_local_reset_only");
    } finally {
      rtcConnectingRef.current = false;
    }
  }

  
  function triggerRealtimeResponse(reason = "manual") {
    try {
      if (rtcManualSwitchGateRef.current?.locked) {
        logRealtimeStep("patch39:trigger_blocked_by_switch_gate", {
          marker: PATCH_39_REALTIME_MANUAL_SWITCH_HARD_GATE_VERSION,
          reason,
          phase: rtcManualSwitchGateRef.current?.phase || null,
          switch_generation_id: rtcManualSwitchGateRef.current?.generation_id || null,
          target_agent_slug: rtcManualSwitchGateRef.current?.target_agent_slug || null,
        });
        setRtcReadyToRespond(false);
        return;
      }
      if (rtcTimeboxClosingRef.current) {
        setRtcReadyToRespond(false);
        logRealtimeStep("ao72c_hf1:response_blocked_during_timebox_closing", { reason });
        return;
      }
      if (!isRealtimeSessionCurrent(rtcSessionIdRef.current || "")) {
        logRealtimeAuthorityTelemetry("response_create_blocked", { reason, blocked_reason: "stale_active_session" });
        setRtcReadyToRespond(false);
        return;
      }
      const dc = rtcDcRef.current;
      if (!dc || dc.readyState !== "open") {
        throw new Error("DataChannel não está aberto");
      }
      if (rtcResponseInFlightRef.current) {
        logRealtimeStep("response:skip_inflight", { reason });
        return;
      }
      const lastTranscript = (rtcLastFinalTranscriptRef.current || "").trim();
      if (!lastTranscript) {
        logRealtimeStep("response:skip_empty", { reason });
        return;
      }
      rtcResponseInFlightRef.current = true;
      clearRealtimeResponseTimeout();
      clearRealtimeActivationProbe();
      clearRealtimeAutoResponseFallback();
      clearRealtimeIdleFollowup();
      rtcResponseTimeoutRef.current = setTimeout(() => {
        setUploadStatus("⌛ Realtime ainda processando...");
        setTimeout(() => setUploadStatus(""), 1200);
      }, 7000);
      const targetSlugForResponse = getRealtimeAuthorityTargetSlug();
      const targetAgentForResponse =
        findAgentByCanonicalSlug(targetSlugForResponse) ||
        findAgentByRuntimeIdentity(targetSlugForResponse) ||
        findAgentByRuntimeIdentity(rtcHostAgentIdRef.current) ||
        findAgentByRuntimeIdentity(rtcHostAgentNameRef.current) ||
        null;
      requestRealtimeSpokenResponse(dc, {
        reason,
        conversationItem: true,
        inputText: lastTranscript,
        instructions: [
          buildRealtimeAgentInstructions(targetAgentForResponse),
          buildRealtimeVoiceInstruction(
            rtcLanguageProfileRef.current,
            lastTranscript,
            targetSlugForResponse
          ),
        ].filter(Boolean).join("\n\n"),
      });
      setRtcReadyToRespond(false);
      setV2vPhase("responding");
      setUploadStatus(reason === "magic" ? "✨ Command received — responding..." : reason === "auto_vad" ? "🎙️ Speech detected — responding..." : "▶️ Responding...");
      setTimeout(() => setUploadStatus(""), 1500);
    } catch (e) {
      rtcResponseInFlightRef.current = false;
      console.warn("[Realtime] triggerRealtimeResponse failed", e);
      logRealtimeStep("ao66a_hf3:trigger_response_failed_no_auto_end", {
        message: e?.message || null,
        sessionAgeMs: getRealtimeSessionAgeMs(),
        marker: ORKIO_AO66R_HF4_BUILD_MARKER,
      });
      setUploadStatus("⚡ Não consegui disparar a resposta ainda. Mantive o Realtime aberto.");
      setTimeout(() => setUploadStatus(""), 2200);
      if (!shouldHoldRealtimeInsteadOfEnding("trigger_failed", getRealtimeSessionAgeMs())) {
        void activateSilentRealtimeFallback("trigger_failed");
      }
    }
  }


  // PATCH0100_27A: Realtime event logging (batched, non-blocking)
  function queueRealtimeEvent({ event_type, role, content = null, is_final = false, meta = null } = {}) {
    const sid = rtcSessionIdRef.current;
    if (!sid) return;
    const normalizedEventType = String(event_type || "event").trim() || "event";
    const contentText = content == null ? "" : String(content);
    const baseMeta = (meta && typeof meta === "object") ? meta : {};
    const meetingEchoSpeaker = resolveRealtimeMeetingEchoSpeaker();
    const activeAgentName = String(
      baseMeta.agent_name ||
      baseMeta.active_agent ||
      meetingEchoSpeaker.name ||
      rtcHostAgentNameRef.current ||
      activeRuntimeAgent ||
      ""
    ).trim();
    const activeAgentSlug = canonicalAgentSlug(
      (isManualTeamConversationActive() ? getManualTeamConversationFocusSlug() : "") ||
      (isManualAgentAuthorityLocked() ? getManualRealtimeTargetSlug() : "") ||
      baseMeta.target_agent_slug ||
      baseMeta.agent_slug ||
      meetingEchoSpeaker.slug ||
      activeAgentName ||
      rtcHostAgentIdRef.current ||
      ""
    );
    const activeAgentId = baseMeta.agent_id || meetingEchoSpeaker.agent_id || rtcHostAgentIdRef.current || "";
    const payload = {
      event_type: normalizedEventType,
      role,
      is_final: Boolean(is_final),
      text: contentText,
      content: contentText,
      transcript: (is_final && String(role || "").toLowerCase() === "user") ? contentText : "",
      source: "frontend_realtime_event_queue",
      agent_name: activeAgentName || undefined,
      active_agent: activeAgentName || undefined,
      target_agent_slug: activeAgentSlug || undefined,
      manual_target_slug: isManualAgentAuthorityLocked() ? getManualAuthoritySlug() : undefined,
      manual_team_conversation_active: isManualTeamConversationActive() || undefined,
      manual_team_focus_slug: isManualTeamConversationActive() ? getManualTeamConversationFocusSlug() : undefined,
      manual_team_turn_queue: isManualTeamConversationActive() ? getManualTeamConversationTurnQueue() : undefined,
      team_conversation_orchestrator_version: isManualTeamConversationActive() ? PATCH_33_TEAM_CONVERSATION_ORCHESTRATOR_VERSION : undefined,
      team_conversation_staging_verification_version: isManualTeamConversationActive() ? PATCH_33_REV_A_TEAM_CONVERSATION_STAGING_VERIFICATION_VERSION : undefined,
      response_control: isManualTeamConversationActive() ? PATCH_33_TEAM_CONVERSATION_RESPONSE_CONTROL : undefined,
      agent_id: activeAgentId || undefined,
    };

    rtcEventQueueRef.current.push({
      session_id: sid,
      client_event_id: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : (`ce-${Date.now()}-${Math.random().toString(36).slice(2,10)}`),
      event_type: normalizedEventType,
      // Compatibility aliases for the recovery schema and readable backend logs.
      name: normalizedEventType,
      type: normalizedEventType,
      role,
      content: contentText,
      created_at: Math.floor(Date.now()/1000),
      is_final,
      agent_name: activeAgentName || undefined,
      active_agent: activeAgentName || undefined,
      target_agent_slug: activeAgentSlug || undefined,
      manual_target_slug: isManualAgentAuthorityLocked() ? getManualAuthoritySlug() : undefined,
      agent_id: activeAgentId || undefined,
      payload,
      meta: {
        ...baseMeta,
        event_type: normalizedEventType,
        role,
        is_final: Boolean(is_final),
        text: contentText,
        content: contentText,
        transcript: (is_final && String(role || "").toLowerCase() === "user") ? contentText : "",
        agent_name: activeAgentName || undefined,
        active_agent: activeAgentName || undefined,
        target_agent_slug: activeAgentSlug || undefined,
        manual_target_slug: isManualAgentAuthorityLocked() ? getManualAuthoritySlug() : undefined,
        agent_id: activeAgentId || undefined,
      },
    });
    try {
      if (is_final && (content || '').toString().trim()) {
        const item = {
          session_id: sid,
          event_type,
          role,
          content: (content || '').toString(),
          transcript_punct: null,
          created_at: Math.floor(Date.now()/1000),
        };
        setRtcAuditEvents(prev => prev.concat([item]));
      }
    } catch {}
  }

  function normalizeRealtimeMeetingState(batchResult) {
    const payload = batchResult?.data || batchResult || {};
    const directive =
      payload?.meeting_orchestrator ||
      payload?.meetingOrchestrator ||
      payload?.realtime_meeting ||
      {};
    const candidates = [
      payload?.meeting_state,
      payload?.meetingState,
      directive?.meeting_state,
      directive?.meetingState,
      payload?.session?.meeting_state,
      payload?.session?.meta?.meeting_state,
    ];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === "object") return candidate;
    }
    return null;
  }

  function applyRealtimeMeetingStateFromPayload(batchResult, source = "unknown") {
    try {
      const state = normalizeRealtimeMeetingState(batchResult);
      if (!state || typeof state !== "object") return false;
      const stateSessionId = String(state?.session_id || "").trim();
      const incomingStateSlug = canonicalAgentSlug(
        state?.active_speaker_slug ||
        state?.active_persona_slug ||
        state?.target_agent_slug ||
        state?.visible_agent ||
        ""
      );
      const incomingParticipants = Array.isArray(state?.participant_slugs)
        ? state.participant_slugs
        : (Array.isArray(state?.participants) ? state.participants : []);
      const isEmptyMeetingStateUpdate = Boolean(
        !stateSessionId &&
        !incomingStateSlug &&
        !String(state?.active_speaker_name || state?.active_agent_name || "").trim() &&
        incomingParticipants.length === 0 &&
        !String(state?.transition_reason || state?.response_control || "").trim()
      );
      const isBlankStateUpdate = Boolean(
        !stateSessionId &&
        !incomingStateSlug &&
        incomingParticipants.length === 0 &&
        String(state?.transition_reason || "").trim().toLowerCase() === "state_update"
      );
      if (isEmptyMeetingStateUpdate || isBlankStateUpdate) {
        try {
          logRealtimeStep("patch32_reve:empty_meeting_state_ignored", {
            source,
            reason: isBlankStateUpdate ? "blank_state_update" : "empty_state",
            manual_target_slug: getManualAuthoritySlug() || null,
            selected_manual_agent_slug: selectedManualAgentSlugRef.current || null,
            manual_agent_lock: isManualAgentAuthorityLocked(),
            manual_sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
          });
          queueRealtimeTelemetry("patch32_reve_empty_meeting_state_ignored", {
            source,
            reason: isBlankStateUpdate ? "blank_state_update" : "empty_state",
            manual_target_slug: getManualAuthoritySlug() || null,
            manual_agent_lock: isManualAgentAuthorityLocked(),
            manual_sticky_state_version: PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
            manual_lock_staging_proof_version: getPatch32ManualLockStagingProofVersion(),
            manual_lock_staging_proof_production_guard_version: PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION,
          });
          logManualLockStagingProof("empty_meeting_state_ignored_preserved_manual_button", {
            source,
            reason: isBlankStateUpdate ? "blank_state_update" : "empty_state",
            expected_manual_slug: getManualAuthoritySlug() || selectedManualAgentSlugRef.current || null,
            proof_scope: "meeting_state_guard",
          });
        } catch {}
        return false;
      }
      if (stateSessionId && !isRealtimeSessionCurrent(stateSessionId)) {
        logRealtimeStep("patch32_revc:manual_authority_stale_session_ignored", {
          source,
          active_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
          event_session_id: stateSessionId,
          manual_target_slug: getManualAuthoritySlug() || null,
          manual_agent_lock: isManualAgentAuthorityLocked(),
          manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        });
        return false;
      }

      if (isManualAgentAuthorityLocked()) {
        const manualTargetSlug = getManualAuthoritySlug();
        const expectedTeamFocusSlug = manualTargetSlug === "team"
          ? getManualTeamConversationFocusSlug()
          : "";
        const incomingSlug = canonicalAgentSlug(
          state?.active_speaker_slug ||
          state?.active_persona_slug ||
          state?.target_agent_slug ||
          state?.visible_agent ||
          ""
        );
        const teamModeratorOk = (
          manualTargetSlug === "team" &&
          [...PATCH_32_CANONICAL_TEAM_AGENT_SLUGS, "team"].includes(incomingSlug) &&
          (
            incomingSlug === "team" ||
            !expectedTeamFocusSlug ||
            incomingSlug === expectedTeamFocusSlug
          )
        );
        if (incomingSlug && manualTargetSlug && incomingSlug !== manualTargetSlug && incomingSlug !== "team" && !teamModeratorOk) {
          try {
            logRealtimeStep("patch32_revc:manual_authority_stale_session_ignored", {
              source,
              incoming_speaker_slug: incomingSlug,
              manual_target_slug: manualTargetSlug,
              active_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
              event_session_id: stateSessionId || null,
              manual_agent_lock: true,
              manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
              version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
            });
          } catch {}
          return false;
        }
        if (teamModeratorOk && incomingSlug && incomingSlug !== "team") {
          try {
            logRealtimeStep("patch35_reve:team_participant_state_accepted", {
              marker: PATCH_35_REV_E_FORENSIC_TEAM_AUTHORITY_CONTRACT_VERSION,
              loop_guard_version: PATCH_38_REALTIME_TEAM_ECHO_LOOP_GUARD_VERSION,
              source,
              incoming_speaker_slug: incomingSlug,
              manual_target_slug: manualTargetSlug,
              expected_team_focus_slug: expectedTeamFocusSlug || null,
              active_session_id: rtcActiveSessionIdRef.current || rtcSessionIdRef.current || null,
              event_session_id: stateSessionId || null,
            });
            // PATCH38: this is a server-state acknowledgement, not a new user
            // action. Re-enqueueing it into events:batch creates a feedback loop
            // that repeatedly reasserts the previous Team speaker.
          } catch {}

        }
      }

      const previousState = meetingStateRef.current && typeof meetingStateRef.current === "object"
        ? meetingStateRef.current
        : null;
      const previousTurn = Number(previousState?.turn_index ?? -1);
      const nextTurn = Number(state?.turn_index ?? previousTurn);
      const previousSlug = canonicalAgentSlug(
        previousState?.active_speaker_slug ||
        previousState?.active_persona_slug ||
        previousState?.target_agent_slug ||
        ""
      );
      const nextSlug = canonicalAgentSlug(
        state?.active_speaker_slug ||
        state?.active_persona_slug ||
        state?.target_agent_slug ||
        state?.visible_agent ||
        ""
      );
      const previousReason = String(previousState?.transition_reason || "").trim().toLowerCase();
      const nextReason = String(state?.transition_reason || "").trim().toLowerCase();
      const sourceKey = String(source || "").trim().toLowerCase();
      const nextIsClientEcho = nextReason === "client_state_echo" || sourceKey.includes("client_state_echo");
      const previousWasServerAuthority = Boolean(
        previousState &&
        previousReason &&
        previousReason !== "client_state_echo"
      );
      const nextIsOlderTurn = Number.isFinite(previousTurn) && Number.isFinite(nextTurn) && nextTurn < previousTurn;
      const nextRevertsSameTurnServerSpeaker = Boolean(
        previousState &&
        nextIsClientEcho &&
        previousWasServerAuthority &&
        Number.isFinite(previousTurn) &&
        Number.isFinite(nextTurn) &&
        nextTurn === previousTurn &&
        previousSlug &&
        nextSlug &&
        previousSlug !== nextSlug
      );

      if (nextIsOlderTurn || nextRevertsSameTurnServerSpeaker) {
        try {
          logRealtimeStep("patch31_final:meeting_state_echo_ignored", {
            source,
            reason: nextIsOlderTurn ? "older_turn" : "same_turn_server_speaker_reversion",
            previous_turn_index: Number.isFinite(previousTurn) ? previousTurn : null,
            next_turn_index: Number.isFinite(nextTurn) ? nextTurn : null,
            previous_speaker_slug: previousSlug || null,
            next_speaker_slug: nextSlug || null,
            previous_transition_reason: previousReason || null,
            next_transition_reason: nextReason || null,
            client_apply_contract: "PATCH_31_FINAL_MEETING_STATE_APPLY_GUARD_V1",
          });
        } catch {}
        return false;
      }

      const activeName = canonicalizeSpeakerLabel(
        state?.active_speaker_name ||
        state?.active_agent_name ||
        state?.visible_agent ||
        nextSlug ||
        ""
      );
      const activeSlug = nextSlug || canonicalAgentSlug(activeName || "");

      const stateForClient = {
        ...state,
        client_apply_contract: "PATCH_31_FINAL_MEETING_STATE_APPLY_GUARD_V1",
      };
      meetingStateRef.current = stateForClient;
      setMeetingState(stateForClient);
      if (
        String(stateForClient?.version || "").startsWith("PATCH_34") ||
        String(stateForClient?.room_mode || stateForClient?.mode || "").trim().toLowerCase() === PATCH_34_REVB_ROOM_MODE ||
        String(stateForClient?.response_control || "").trim() === PATCH_34_REVB_ROOM_RESPONSE_CONTROL
      ) {
        manualRealtimeRoomStateRef.current = {
          ...stateForClient,
          room_mode: PATCH_34_REVB_ROOM_MODE,
          mode: PATCH_34_REVB_ROOM_MODE,
          multi_agent_turn: true,
          response_control: PATCH_34_REVB_ROOM_RESPONSE_CONTROL,
          has_snapshot: true,
          version: PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION,
        };
        try {
          logRealtimeStep("patch34_revb:room_state_applied", {
            source,
            session_id: manualRealtimeRoomStateRef.current.session_id || null,
            active_speaker_slug: manualRealtimeRoomStateRef.current.active_speaker_slug || null,
            room_mode: PATCH_34_REVB_ROOM_MODE,
            room_state_persisted: Boolean(manualRealtimeRoomStateRef.current.persisted || manualRealtimeRoomStateRef.current.room_state_persisted),
            has_snapshot: true,
            version: PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION,
          });
        } catch {}
      }

      if (activeName) {
        setActiveRuntimeAgent(activeName);
        rtcHostAgentNameRef.current = activeName;
      }

      let resolvedVoiceForState = "";
      let resolvedVoiceSourceForState = "";
      if (activeSlug) {
        const activeAgent = findAgentByCanonicalSlug(activeSlug) || findAgentByRuntimeIdentity(activeSlug);
        if (activeAgent?.id) {
          rtcHostAgentIdRef.current = activeAgent.id;
        }
        const voiceResolutionForState = resolveAgentVoiceResolution(activeAgent || { name: activeName || activeSlug, slug: activeSlug });
        resolvedVoiceForState = voiceResolutionForState.voice;
        resolvedVoiceSourceForState = voiceResolutionForState.voice_source;
        if (resolvedVoiceForState) {
          rtcVoiceRef.current = resolvedVoiceForState;
        }
      }

      try {
        logRealtimeStep("patch31_final:meeting_state_applied", {
          source,
          active_speaker_slug: activeSlug || null,
          active_speaker_name: activeName || null,
          turn_index: state?.turn_index ?? null,
          participants: Array.isArray(state?.participant_slugs) ? state.participant_slugs : [],
          voice_id: resolvedVoiceForState || null,
          voice_source: resolvedVoiceSourceForState || null,
          voice_authority: "PATCH_31_FINAL_CANONICAL_AGENT_VOICE_PROFILE",
          client_apply_contract: "PATCH_31_FINAL_MEETING_STATE_APPLY_GUARD_V1",
        });
      } catch {}

      return true;
    } catch {
      return false;
    }
  }

  function resolveRealtimeMeetingEchoSpeaker() {
    const state = meetingStateRef.current && typeof meetingStateRef.current === "object"
      ? meetingStateRef.current
      : {};
    const stateSlug = canonicalAgentSlug(
      state?.active_speaker_slug ||
      state?.active_persona_slug ||
      state?.target_agent_slug ||
      ""
    );
    const fallbackSlug = canonicalAgentSlug(rtcHostAgentNameRef.current || activeRuntimeAgent || "");
    const slug = stateSlug || fallbackSlug || "orkio";
    const agent = findAgentByCanonicalSlug(slug) || findAgentByRuntimeIdentity(slug) || null;
    const name = canonicalizeSpeakerLabel(
      state?.active_speaker_name ||
      agent?.name ||
      canonicalAgentDisplayNameFromSlug(slug) ||
      rtcHostAgentNameRef.current ||
      activeRuntimeAgent ||
      "Orkio"
    );
    return {
      slug,
      name,
      agent_id: agent?.id || rtcHostAgentIdRef.current || null,
      source: stateSlug ? "meeting_state" : "runtime_fallback",
    };
  }

  function normalizeRealtimeBridgeResponse(batchResult) {
    return batchResult?.rtb02_bridge || batchResult?.data?.rtb02_bridge || batchResult?.payload?.rtb02_bridge || null;
  }

  function normalizeRealtimeMeetingDirective(batchResult) {
    const payload = batchResult?.data || batchResult || {};
    const directive =
      payload?.meeting_orchestrator ||
      payload?.meetingOrchestrator ||
      payload?.realtime_meeting ||
      null;

    if (!directive || typeof directive !== "object") return null;
    if (String(directive?.status || "").toLowerCase() !== "directive") return null;
    return directive;
  }

  function buildRealtimeMeetingDirectiveInstructions(agentObj, directive = {}) {
    const base = buildRealtimeAgentInstructions(agentObj);
    const directiveInstructions = String(directive?.instructions || "").trim();
    const target = directive?.target_agent || {};
    const targetName = String(
      target?.display_name ||
      agentObj?.name ||
      directive?.target_agent_slug ||
      rtcHostAgentNameRef.current ||
      "Orkio"
    ).trim();

    return [
      base,
      "",
      "EFATA777_V8 — Meeting Orchestrator ativo.",
      "Esta é uma sala de reunião por turnos. Não há sobreposição de vozes.",
      `Agente ativo deste turno: ${targetName}.`,
      `Tipo do turno: ${String(directive?.kind || "turn").trim() || "turn"}.`,
      directive?.room_mode ? "Modo sala: ativo." : "Modo sala: inativo.",
      "Regra crítica: fale apenas como o agente ativo deste turno.",
      "Regra crítica: não diga que executou auditoria, deploy, push, PR, integração, chamada externa ou War Room real se isso não estiver confirmado nos eventos técnicos.",
      directiveInstructions,
    ].filter(Boolean).join("\n\n");
  }

  async function handleRealtimeMeetingOrchestratorDirective(batchResult) {
    const directive = normalizeRealtimeMeetingDirective(batchResult);
    if (!directive) return false;
    const patch34DirectiveAllowed = Boolean(
      isPatch34TeamRoomActive() &&
      (
        directive?.room_mode ||
        String(directive?.response_control || "").trim() === PATCH_34_REVB_ROOM_RESPONSE_CONTROL ||
        String(directive?.realtime_room_engine_version || directive?.room_state?.version || "").startsWith("PATCH_34")
      )
    );
    if (isManualAgentAuthorityLocked() && !patch34DirectiveAllowed) {
      try {
        logRealtimeStep("patch32_manual:meeting_orchestrator_directive_ignored", {
          directive_kind: directive?.kind || null,
          directive_target: directive?.target_agent_slug || directive?.active_agent_slug || null,
          selected_agent_slug: getManualRealtimeTargetSlug(),
          manual_agent_lock: true,
          version: PATCH_32_MANUAL_AGENT_AUTHORITY_VERSION,
        });
        queueRealtimeTelemetry("manual_meeting_orchestrator_directive_ignored", {
          directive_kind: directive?.kind || null,
          directive_target: directive?.target_agent_slug || directive?.active_agent_slug || null,
          selected_agent_slug: getManualRealtimeTargetSlug(),
          manual_agent_lock: true,
          manual_authority_version: PATCH_32_MANUAL_AGENT_AUTHORITY_VERSION,
        });
      } catch {}
      return false;
    } else if (patch34DirectiveAllowed) {
      try {
        logRealtimeStep("patch35:patch34_meeting_orchestrator_directive_allowed", {
          directive_kind: directive?.kind || null,
          directive_target: directive?.target_agent_slug || directive?.active_agent_slug || null,
          manual_agent_lock: isManualAgentAuthorityLocked(),
          room_mode: PATCH_34_REVB_ROOM_MODE,
          response_control: directive?.response_control || null,
        });
      } catch {}
    }
    applyRealtimeMeetingStateFromPayload(batchResult, "meeting_orchestrator_directive");

    const sid = String(directive?.session_id || "").trim();
    if (sid && rtcSessionIdRef.current && sid !== String(rtcSessionIdRef.current)) return false;

    const directiveKey = String(
      directive?.dedupe_key ||
      `${sid}:${directive?.kind || ""}:${directive?.target_agent_slug || ""}:${String(directive?.transcript || "").slice(0, 160)}`
    ).toLowerCase();

    if (!directiveKey) return false;
    if (rtcMeetingDirectiveBusyRef.current) return false;
    if (rtcMeetingDirectiveLastKeyRef.current === directiveKey) return false;

    const targetSlug = canonicalAgentSlug(
      directive?.target_agent_slug ||
      directive?.active_agent_slug ||
      directive?.target_agent?.slug ||
      directive?.target_agent?.display_name ||
      ""
    );

    const targetAgent =
      findAgentByCanonicalSlug(targetSlug) ||
      findAgentByRuntimeIdentity(targetSlug) ||
      null;

    if (!targetAgent?.id) {
      try {
        logRealtimeStep("meeting_orchestrator:missing_target_agent", {
          targetSlug,
          directiveKind: directive?.kind || null,
        });
      } catch {}
      return false;
    }

    rtcMeetingDirectiveBusyRef.current = true;
    rtcMeetingDirectiveLastKeyRef.current = directiveKey;
    rtcMeetingDirectiveLastAppliedAtRef.current = Date.now();

    try {
      const targetName = canonicalizeSpeakerLabel(
        directive?.target_agent?.display_name ||
        targetAgent?.name ||
        targetSlug
      );

      rtcHostAgentIdRef.current = targetAgent.id;
      rtcHostAgentNameRef.current = targetName || targetAgent.name || targetSlug;
      selectRealtimeTeamSpeakerForRuntime(targetAgent.id, `meeting_orchestrator_${directive?.kind || "turn"}`);

      const dc = rtcDcRef.current;
      if (dc?.readyState === "open") {
        sendRealtimeSessionUpdateWhenIdle({
          type: "session.update",
          session: {
            type: "realtime",
            instructions: buildRealtimeMeetingDirectiveInstructions(targetAgent, directive),
          },
        }, "meeting_orchestrator_session_update", {
          target_agent_slug: targetSlug,
          room_mode: directive?.room_mode ? PATCH_34_REVB_ROOM_MODE : "",
        });
      }

      try {
        appendExecutionTrace({
          kind: "system",
          label: "EFATA777 V8 Meeting Orchestrator",
          detail: `Turno roteado para ${rtcHostAgentNameRef.current} (${directive?.kind || "turn"}).`,
        });
      } catch {}

      try {
        setActiveRuntimeAgent(rtcHostAgentNameRef.current);
        setRuntimeHandoffLabel(`Sala realtime: turno com ${rtcHostAgentNameRef.current}.`);
        setUploadStatus(`🛰️ Turno realtime encaminhado para ${rtcHostAgentNameRef.current}.`);
        setTimeout(() => setUploadStatus(""), 2200);
      } catch {}

      try {
        queueRealtimeTelemetry("meeting_orchestrator_directive_applied", {
          target_agent_slug: targetSlug,
          agent_id: targetAgent.id,
          agent_name: rtcHostAgentNameRef.current,
          kind: directive?.kind || "turn",
          room_mode: Boolean(directive?.room_mode),
        });
      } catch {}

      if (directive?.should_create_response !== false) {
        setRtcReadyToRespond(true);
        window.setTimeout(() => {
          try {
            triggerRealtimeResponse(`meeting_orchestrator_${directive?.kind || "turn"}`);
          } catch (err) {
            try {
              logRealtimeStep("meeting_orchestrator:trigger_failed", {
                message: err?.message || null,
                target: targetSlug,
              });
            } catch {}
            scheduleRealtimeAutoResponseFallback(
              String(directive?.transcript || rtcLastFinalTranscriptRef.current || ""),
              "meeting_orchestrator_trigger_fallback"
            );
          }
        }, 520);
      }

      return true;
    } finally {
      window.setTimeout(() => {
        rtcMeetingDirectiveBusyRef.current = false;
      }, 900);
    }
  }

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

  function buildRealtimeVisibleUserMessage(rawContent = "") {
    return stripInternalRuntimeEnvelope(rawContent);
  }

  function buildRealtimeOrchestrationBridgePrompt(bridge) {
    const rawText = buildRealtimeVisibleUserMessage(bridge?.text || "");
    if (!rawText) return "";

    // PATCH37:
    // Do not synthesize "@Orion orchestration_audit" from normal realtime speech.
    // Agent selection is carried by the destination contract and realtime state,
    // not by injecting an audit command into the user's message.
    try {
      logRealtimeStep("patch37:realtime_bridge_prompt_context_isolated", {
        version: PATCH_37_PROMPT_CONTEXT_ISOLATION_REALTIME_VERSION,
        source: "realtime_orchestration_bridge",
        original_length: String(bridge?.text || "").length,
        visible_length: rawText.length,
      });
    } catch {}

    return rawText;
  }

  async function handleRealtimeOrchestrationBridgeCandidate(batchResult) {
    const bridge = normalizeRealtimeBridgeResponse(batchResult);
    if (!bridge || bridge.status !== "candidate") return false;

    const bridgeText = String(bridge.text || "").trim();
    if (!bridgeText) return false;

    const bridgeKey = `${bridge.session_id || rtcSessionIdRef.current || ""}:${bridgeText.toLowerCase()}`;
    if (realtimeBridgeBusyRef.current || realtimeBridgeLastKeyRef.current === bridgeKey) return false;
    if (sendingRef.current) return false;

    realtimeBridgeBusyRef.current = true;
    realtimeBridgeLastKeyRef.current = bridgeKey;

    try {
      const prompt = buildRealtimeOrchestrationBridgePrompt(bridge);
      if (!prompt) return false;

      try {
        appendExecutionTrace({
          kind: "system",
          label: "RTB-02 Realtime Orchestration Bridge",
          detail: "Fala realtime encaminhada com contexto interno isolado.",
        });
      } catch {}

      try { setUploadStatus("⌛ Encaminhando fala realtime..."); } catch {}

      return await sendMessage(prompt, {
        realtimeTurn: true,
        voiceRequested: true,
        explicitVoiceRequested: true,
        source: "realtime_orchestration_bridge",
        realtime_session_id: bridge.session_id || rtcSessionIdRef.current || null,
        prompt_context_isolation_version: PATCH_37_PROMPT_CONTEXT_ISOLATION_REALTIME_VERSION,
      });
    } catch (err) {
      realtimeBridgeLastKeyRef.current = "";
      try {
        console.warn("[Realtime] RTB-02 bridge dispatch failed", err);
      } catch {}
      return false;
    } finally {
      realtimeBridgeBusyRef.current = false;
    }
  }

  function isMeaningfulRealtimeMeetingStateEcho(state = null) {
    if (!state || typeof state !== "object") return false;
    const stateSessionId = String(state?.session_id || "").trim();
    const activeSlug = canonicalAgentSlug(
      state?.active_speaker_slug ||
      state?.active_persona_slug ||
      state?.target_agent_slug ||
      state?.visible_agent ||
      ""
    );
    const participants = Array.isArray(state?.participant_slugs)
      ? state.participant_slugs
      : (Array.isArray(state?.participants) ? state.participants : []);
    const transition = String(state?.transition_reason || state?.response_control || "").trim();
    return Boolean(stateSessionId || activeSlug || participants.length || transition);
  }

  async function flushRealtimeEvents() {
    const sid = rtcSessionIdRef.current;
    if (!sid) return;
    const q = rtcEventQueueRef.current || [];
    if (!q.length) return;
    // Take a snapshot to avoid races
    rtcEventQueueRef.current = [];
    try {
      const echoSpeaker = resolveRealtimeMeetingEchoSpeaker();
      if (!isRealtimeSessionCurrent(sid)) {
        logRealtimeStep("patch32_revc:manual_authority_stale_session_ignored", {
          active_session_id: rtcActiveSessionIdRef.current || null,
          event_session_id: sid,
          manual_target_slug: getManualAuthoritySlug() || null,
          manual_agent_lock: isManualAgentAuthorityLocked(),
          manual_authority_version: PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        });
        return;
      }
      const manualEventContract = buildManualAgentAuthorityContract("", echoSpeaker.agent_id || rtcHostAgentIdRef.current || null, { realtime: true, sessionId: sid }) || {};
      const manualEventPayload = buildManualAuthorityPayload(sid);
      const manualTargetSlug = manualEventContract.manual_target_slug || manualEventPayload.manual_target_slug || getManualAuthoritySlug() || null;
      const meetingStateEcho = isMeaningfulRealtimeMeetingStateEcho(meetingStateRef.current)
        ? meetingStateRef.current
        : null;
      const patch34RoomStateEcho = getPatch34RoomStateEcho(sid);
      const patch34RoomActive = Boolean(
        patch34RoomStateEcho ||
        manualEventContract.manual_team_conversation_active ||
        manualEventPayload.manual_team_conversation_active ||
        manualTargetSlug === "team"
      );
      const patch34RoomAuthoritySlug = patch34RoomActive
        ? (
          canonicalAgentSlug(
            patch34RoomStateEcho?.target_agent_slug ||
            patch34RoomStateEcho?.active_speaker_slug ||
            manualEventContract.manual_team_focus_slug ||
            manualEventPayload.manual_team_focus_slug ||
            echoSpeaker.slug ||
            canonicalAgentSlug(rtcHostAgentNameRef.current || activeRuntimeAgent || "")
          ) || "orkio"
        )
        : "";
      if (!meetingStateEcho && !patch34RoomStateEcho) {
        try {
          logRealtimeStep("patch32_revf:empty_meeting_state_echo_not_sent", {
            session_id: sid,
            manual_target_slug: manualTargetSlug,
            manual_agent_lock: Boolean(manualTargetSlug),
            queued_events: q.length,
            manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
          });
        } catch {}
      }

      const { data: batchResult } = await apiFetch("/api/realtime/events:batch", {
        method: "POST",
        token,
        org: tenant,
        body: {
        session_id: sid,
        events: q,
        dest_mode: patch34RoomActive ? PATCH_34_REVB_ROOM_MODE : (manualEventContract.dest_mode || (manualTargetSlug === "team" ? "team" : "single")),
        agent_id: manualEventContract.agent_id || echoSpeaker.agent_id || rtcHostAgentIdRef.current || null,
        visible_agent: manualEventContract.visible_agent || echoSpeaker.name || rtcHostAgentNameRef.current || activeRuntimeAgent || "",
        target_agent_slug: patch34RoomActive
          ? patch34RoomAuthoritySlug
          : (manualEventContract.target_agent_slug || manualTargetSlug || echoSpeaker.slug || canonicalAgentSlug(rtcHostAgentNameRef.current || activeRuntimeAgent || "")),
        target_agent_slugs: patch34RoomActive
          ? (patch34RoomStateEcho?.target_agent_slugs || PATCH_32_CANONICAL_TEAM_AGENT_SLUGS)
          : (Array.isArray(manualEventContract.target_agent_slugs) && manualEventContract.target_agent_slugs.length
            ? manualEventContract.target_agent_slugs
            : [manualTargetSlug || echoSpeaker.slug || canonicalAgentSlug(rtcHostAgentNameRef.current || activeRuntimeAgent || "")].filter(Boolean)),
        requested_agent_names: Array.isArray(manualEventContract.requested_agent_names) && manualEventContract.requested_agent_names.length
          ? manualEventContract.requested_agent_names
          : (echoSpeaker.name ? [echoSpeaker.name] : (rtcHostAgentNameRef.current ? [rtcHostAgentNameRef.current] : [])),
        multi_agent_turn: patch34RoomActive ? true : Boolean(manualEventContract.multi_agent_turn),
        response_control: patch34RoomActive ? PATCH_34_REVB_ROOM_RESPONSE_CONTROL : (manualEventContract.response_control || (manualTargetSlug === "team" ? "manual_team_panel" : PATCH_32_SINGLE_AGENT_CONTROL)),
        manual_agent_lock: Boolean(manualTargetSlug),
        manual_target_slug: manualTargetSlug,
        manual_agent_source: manualEventContract.manual_agent_source || PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE,
        manual_authority_version: manualEventContract.manual_authority_version || manualEventPayload.manual_authority_version || PATCH_32_REV_C_MANUAL_TARGET_SOURCE_OF_TRUTH_VERSION,
        manual_sticky_state_version: manualEventContract.manual_sticky_state_version || manualEventPayload.manual_sticky_state_version || PATCH_32_REV_E_MANUAL_BUTTON_STICKY_STATE_VERSION,
        manual_lock_persistence_version: PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE_VERSION,
        manual_lock_staging_proof_version: getPatch32ManualLockStagingProofVersion(),
        manual_lock_staging_proof_production_guard_version: PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION,
        manual_authority_source: manualEventContract.manual_authority_source || manualEventPayload.manual_authority_source || PATCH_32_MANUAL_AGENT_AUTHORITY_SOURCE,
        manual_authority_updated_at: manualEventContract.manual_authority_updated_at || manualEventPayload.manual_authority_updated_at || 0,
        manual_team_panel_required: Boolean(manualEventContract.manual_team_panel_required),
        manual_team_panel_order: manualEventContract.manual_team_panel_order || null,
        team_panel_version: manualEventContract.team_panel_version || "",
        team_panel_mode: manualEventContract.team_panel_mode || "",
        team_panel_voice_moderator_slug: manualEventContract.team_panel_voice_moderator_slug || "",
        manual_team_conversation_active: patch34RoomActive ? true : Boolean(manualEventContract.manual_team_conversation_active || manualEventPayload.manual_team_conversation_active),
        manual_team_focus_slug: patch34RoomActive ? patch34RoomAuthoritySlug : (manualEventContract.manual_team_focus_slug || manualEventPayload.manual_team_focus_slug || null),
        manual_team_turn_queue: patch34RoomActive ? (patch34RoomStateEcho?.target_agent_slugs || PATCH_32_CANONICAL_TEAM_AGENT_SLUGS) : (manualEventContract.manual_team_turn_queue || manualEventPayload.manual_team_turn_queue || null),
        manual_team_turn_index: manualEventContract.manual_team_turn_index || manualEventPayload.manual_team_turn_index || 0,
        team_conversation_mode: manualEventContract.team_conversation_mode || manualEventPayload.team_conversation_mode || "",
        team_conversation_orchestrator_version: manualEventContract.team_conversation_orchestrator_version || manualEventPayload.team_conversation_orchestrator_version || "",
          team_conversation_staging_verification_version: manualEventContract.team_conversation_staging_verification_version || manualEventPayload.team_conversation_staging_verification_version || "",
        meeting_state: patch34RoomStateEcho || meetingStateEcho,
        room_state: patch34RoomStateEcho,
        room_mode: patch34RoomActive ? PATCH_34_REVB_ROOM_MODE : "",
        realtime_room_engine_version: patch34RoomActive ? PATCH_34_REVB_REALTIME_ROOM_ENGINE_VERSION : "",
        room_state_persisted: patch34RoomActive ? true : false,
        has_snapshot: patch34RoomActive ? true : false,
        client_echo_version: "PATCH_30_SERVER_SPEAKER_AUTHORITY_CLIENT_ECHO_QUARANTINE_V1",
        },
      });
      applyRealtimeMeetingStateFromPayload(batchResult, "events_batch");
      const meetingHandled = await handleRealtimeMeetingOrchestratorDirective(batchResult);
      if (!meetingHandled) {
        await handleRealtimeOrchestrationBridgeCandidate(batchResult);
      }
    } catch (err) {
      // On failure, put events back to try later (best-effort)
      rtcEventQueueRef.current = q.concat(rtcEventQueueRef.current || []);
      console.warn('[Realtime] events batch failed', err);
    }
  }

  // AO01-HF6R13 — WebRTC handshake telemetry bridge.
  // Backend logs showed /api/realtime/start 200 and polling, but no events:batch.
  // This helper writes every browser/WebRTC phase to /api/realtime/events:batch
  // so the next log proves where activation stops: mic, offer, SDP, remote answer,
  // DataChannel open/close/error, response.create or local catch.
  function queueRealtimeTelemetry(eventName, meta = {}) {
    try {
      const name = String(eventName || "").trim();
      if (!name) return;
      queueRealtimeEvent({
        event_type: name.startsWith("telemetry.") ? name : `telemetry.${name}`,
        role: "system",
        content: "",
        is_final: false,
        meta: {
          ...(meta && typeof meta === "object" ? meta : {}),
          ao01_hf6r13: true,
          session_age_ms: getRealtimeSessionAgeMs(),
          client_ts_ms: Date.now(),
        },
      });
      setTimeout(() => {
        try { void flushRealtimeEvents(); } catch {}
      }, 0);
    } catch (err) {
      try {
        console.warn("[Realtime] telemetry bridge failed", eventName, err);
      } catch {}
    }
  }



  function clearRealtimeLivePoll() {
    if (rtcLivePollTimerRef.current) {
      try { clearInterval(rtcLivePollTimerRef.current); } catch {}
      rtcLivePollTimerRef.current = null;
    }
    rtcLivePollSessionIdRef.current = null;
  }

  async function getRealtimeSessionCompat(args = {}) {
    const sid = String(args?.session_id || "").trim();
    if (!sid) return null;

    try {
      return await getRealtimeSession(args);
    } catch (err) {
      const status = Number(err?.status || err?.data?.status || err?.response?.status || 0);
      logRealtimeStep("ao68d_hf1:session_get_primary_failed", {
        sessionId: sid,
        status: Number.isFinite(status) ? status : 0,
        message: err?.message || null,
      });
    }

    try {
      const suffix = args?.finals_only ? "?finals_only=true" : "";
      const { data } = await apiFetch(`/api/realtime/${encodeURIComponent(sid)}${suffix}`, {
        method: "GET",
        token,
        org: tenant,
        skipAuthRedirect: true,
      });
      return data || null;
    } catch (fallbackErr) {
      logRealtimeStep("ao68d_hf1:session_get_compat_failed", {
        sessionId: sid,
        message: fallbackErr?.message || null,
        status: fallbackErr?.status || null,
      });
      throw fallbackErr;
    }
  }

  function safeParseRealtimeMeta(meta) {
    if (!meta) return {};
    if (typeof meta === "object") return meta;
    try { return JSON.parse(meta); } catch { return {}; }
  }

  async function handleBackendRealtimeAssistantResponses(payload) {
    const sid = rtcSessionIdRef.current;
    if (!sid) return;
    const payloadSessionId = String(payload?.session_id || payload?.id || payload?.session?.id || "").trim();
    if (payloadSessionId && payloadSessionId !== sid) {
      logRealtimeAuthorityTelemetry("stale_session_event_ignored", {
        source: "backend_realtime_session",
        event_type: "backend_poll_payload",
        stale_session_id: payloadSessionId,
        current_session_id: sid,
      });
      return;
    }

    const events = Array.isArray(payload?.events) ? payload.events : [];
    if (events.length) {
      setRtcAuditEvents(events);
    }

    const candidateEvents = events.filter((ev) => {
      const eventType = String(ev?.event_type || "").trim();
      const speakerType = String(ev?.speaker_type || ev?.role || "").trim().toLowerCase();
      return (
        (eventType === "response.final" || eventType === "transcript.final")
        && speakerType === "agent"
      );
    });

    for (const ev of candidateEvents) {
      const evId = String(ev?.id || "");
      if (!evId || rtcSeenBackendResponseIdsRef.current.has(evId)) continue;

      const meta = safeParseRealtimeMeta(ev?.meta);
      const content =
        String(
          ev?.transcript_punct ||
          ev?.transcript_raw ||
          ev?.content ||
          ""
        ).trim();

      if (!content) continue;
      const backendTargetSlug = canonicalAgentSlug(meta?.target_agent_slug || ev?.agent_slug || ev?.agent_name || getRealtimeAuthorityTargetSlug()) || getRealtimeAuthorityTargetSlug();
      if (hasRealtimeFinalCommittedForTurn(content, { sessionId: sid, targetAgentSlug: backendTargetSlug, source: "backend_realtime_session" })) {
        logRealtimeAuthorityTelemetry("duplicate_final_ignored", {
          source: "backend_realtime_session",
          event_id: evId,
          target_agent_slug: backendTargetSlug,
          content_len: content.length,
        });
        continue;
      }

      rtcSeenBackendResponseIdsRef.current.add(evId);
      markRealtimeFinalCommittedForTurn(content, { sessionId: sid, targetAgentSlug: backendTargetSlug, source: "backend_realtime_session" });

      const agentName = String(ev?.agent_name || meta?.agent_name || "Orkio").trim() || "Orkio";
      const agentId = ev?.agent_id || ev?.speaker_id || meta?.agent_id || null;
      const resolvedVoice = resolveAgentVoice({
        agent_name: agentName,
        voice_id: ev?.voice_id || meta?.voice_id || null,
      });

      setMessages((prev) => {
        const normalizedContentKey = normalizeRealtimeAssistantText(content)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        const exists = (prev || []).some((m) => {
          if (String(m?.id || "") === evId) return true;
          const sameRole = String(m?.role || "").toLowerCase() === "assistant";
          const sameContent = normalizeRealtimeAssistantText(m?.content || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase() === normalizedContentKey;
          const sameRealtime = Boolean(m?.meta?.realtime_assistant_transcript || m?.meta?.realtime_inline_turn);
          const createdAt = Number(m?.created_at || 0);
          const recentEnough = !createdAt || Math.abs(Math.floor(Date.now() / 1000) - createdAt) <= 45;
          return sameRole && sameContent && (sameRealtime || recentEnough);
        });
        if (exists) return prev;
        const backendRealtimeMessage = {
          id: evId,
          role: "assistant",
          content,
          agent_id: agentId ? String(agentId) : null,
          agent_name: agentName,
          voice_id: resolvedVoice,
          created_at: Math.floor(Date.now() / 1000),
          meta: { realtime_assistant_transcript: true, realtime_inline_turn: true, source: "backend_realtime_session" },
        };
        try { cacheRealtimeInlineChatTurn(backendRealtimeMessage, threadId || activeThreadIdRef.current || ""); } catch {}
        try { void persistRealtimeInlineChatTurnToThread(backendRealtimeMessage, threadId || activeThreadIdRef.current || ""); } catch {}
        return (prev || []).concat([backendRealtimeMessage]);
      });

      setUploadStatus(`📝 ${agentName}: ${content.slice(0, 80)}${content.length > 80 ? '…' : ''}`);
      setTimeout(() => setUploadStatus(''), 2200);

      try {
        await playTts(content, agentId, {
          forceAuto: true,
          messageId: null,
          traceId: v2vTraceRef.current || null,
          voiceOverride: resolvedVoice,
        });
      } catch (err) {
        console.warn("[Realtime] backend response TTS failed", err);
      }
    }
  }

  function startRealtimeLivePoll() {
    clearRealtimeLivePoll();
    const sid = rtcSessionIdRef.current;
    if (!sid) return;

    rtcLivePollSessionIdRef.current = sid;

    const pollOnce = async () => {
      try {
        if (!realtimeModeRef.current || !rtcSessionIdRef.current) {
          clearRealtimeLivePoll();
          return;
        }
        if (rtcSessionIdRef.current !== sid || rtcLivePollSessionIdRef.current !== sid) {
          logRealtimeStep("hf5:live_poll_stale_session_stopped", {
            pollSid: sid,
            currentSid: rtcSessionIdRef.current || null,
            livePollSid: rtcLivePollSessionIdRef.current || null,
          });
          clearRealtimeLivePoll();
          return;
        }
        const data = await getRealtimeSessionCompat({ session_id: sid, finals_only: true });
        await handleBackendRealtimeAssistantResponses(data || {});
      } catch (err) {
        console.warn("[Realtime] live poll failed", err);
      }
    };

    void pollOnce();
    rtcLivePollTimerRef.current = setInterval(() => { void pollOnce(); }, 1400);
    logRealtimeStep("hf5:live_poll_started", { sessionId: sid });
  }

  // PATCH0100_27_2B: finalize session on server + poll punctuated finals (best-effort)
  async function finalizeRealtimeSession(reason = 'client_stop') {
    const sid = rtcSessionIdRef.current;
    if (!sid) return;
    // stop timers
    if (rtcFlushTimerRef.current) { try { clearInterval(rtcFlushTimerRef.current); } catch {} rtcFlushTimerRef.current = null; }
    clearRealtimeLivePoll();
    // flush pending events
    try { await flushRealtimeEvents(); } catch {}
    // end session (best-effort)
    try { await endRealtimeSession({ session_id: sid, ended_at: Math.floor(Date.now() / 1000), meta: { reason } }); } catch {}

    // poll for punct updates (best-effort, bounded)
    try {
      setRtcPunctStatus('pending');
      const started = Date.now();
      const deadlineMs = 15000;
      let last = null;
      while (Date.now() - started < deadlineMs) {
        try {
          const data = await getRealtimeSessionCompat({ session_id: sid, finals_only: true });
          last = data;
          if (data?.events) {
            setRtcAuditEvents(data.events);
          }
          await handleBackendRealtimeAssistantResponses(data || {});
          if (data?.punct?.done) {
            setRtcPunctStatus('done');
            return;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 900));
      }
      // timeout but still set last snapshot
      if (last?.events) setRtcAuditEvents(last.events);
      setRtcPunctStatus('timeout');
    } catch {
      setRtcPunctStatus('timeout');
    }
  }

  function normalizeRealtimeAssistantText(rawText) {
    return (rawText || "").toString().replace(/\s+/g, " ").trim();
  }

  function pickLongerRealtimeAssistantText(...texts) {
    let best = "";
    for (const t of texts) {
      const s = normalizeRealtimeAssistantText(t);
      if (s.length > best.length) best = s;
    }
    return best;
  }

  function clearRealtimeAssistantPendingFinalTimer() {
    try {
      if (rtcAssistantPendingFinalTimerRef.current) clearTimeout(rtcAssistantPendingFinalTimerRef.current);
    } catch {}
    rtcAssistantPendingFinalTimerRef.current = null;
  }

  function scheduleRealtimeAssistantFinalCommit(rawText, { source = "unknown", delayMs = 900, sessionId = null, targetAgentSlug = null } = {}) {
    const scheduledSessionId = String(sessionId || rtcSessionIdRef.current || "").trim();
    const scheduledTargetAgentSlug = canonicalAgentSlug(targetAgentSlug || getRealtimeAuthorityTargetSlug()) || "orkio";
    const scheduledEpoch = rtcActiveSessionEpochRef.current || 0;
    if (scheduledSessionId && shouldIgnoreStaleRealtimeSessionEvent(scheduledSessionId, scheduledEpoch, "assistant_final.schedule", source)) return;
    const candidate = normalizeRealtimeAssistantText(rawText);
    if (!candidate) return;
    const currentPending = normalizeRealtimeAssistantText(rtcAssistantPendingFinalTextRef.current || "");
    if (candidate.length >= currentPending.length) {
      rtcAssistantPendingFinalTextRef.current = candidate;
      rtcAssistantPendingFinalSourceRef.current = source;
    }
    clearRealtimeAssistantPendingFinalTimer();
    rtcAssistantPendingFinalTimerRef.current = setTimeout(() => {
      const pending = normalizeRealtimeAssistantText(rtcAssistantPendingFinalTextRef.current || "");
      const pendingSource = rtcAssistantPendingFinalSourceRef.current || source;
      rtcAssistantPendingFinalTextRef.current = "";
      rtcAssistantPendingFinalSourceRef.current = "";
      if (pending) {
        if (shouldIgnoreStaleRealtimeSessionEvent(scheduledSessionId, scheduledEpoch, "assistant_final.commit_timer", pendingSource)) return;
        commitRealtimeAssistantFinal(pending, {
          source: pendingSource,
          sessionId: scheduledSessionId,
          targetAgentSlug: scheduledTargetAgentSlug,
        });
      }
    }, Math.max(150, Number(delayMs) || 900));
  }

  function extractRealtimeAssistantTextFromEvent(ev) {
    try {
      if (!ev || typeof ev !== "object") return "";
      const candidates = [
        ev.transcript,
        ev.text,
        ev.output_text,
        ev?.response?.output_text,
        ev?.item?.content?.[0]?.text,
        ev?.item?.content?.[0]?.transcript,
        ev?.content?.[0]?.text,
        ev?.content?.[0]?.transcript,
      ];
      for (const c of candidates) {
        const s = (c || "").toString().trim();
        if (s) return s;
      }

      const output = Array.isArray(ev?.response?.output) ? ev.response.output : [];
      for (const item of output) {
        const content = Array.isArray(item?.content) ? item.content : [];
        for (const part of content) {
          const s = (part?.text || part?.transcript || part?.audio_transcript || "").toString().trim();
          if (s) return s;
        }
      }
    } catch {}
    return "";
  }


  function inferRealtimeAgentNameForContent(content = "") {
    const raw = String(content || "");
    const normalized = raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (/\b(eu sou|sou|aqui e|aqui é|fala)\s+(o\s+)?orion\b/iu.test(normalized) || normalized.includes("orion entrou")) return "Orion";
    if (/\b(eu sou|sou|aqui e|aqui é|fala)\s+(a\s+)?chris\b/iu.test(normalized) || normalized.includes("chris entrou")) return "Chris";
    if (/\b(eu sou|sou|aqui e|aqui é|fala)\s+(o\s+)?team\b/iu.test(normalized)) return "Team";
    if (/\b(eu sou|sou|aqui e|aqui é|fala)\s+(o\s+)?orkio\b/iu.test(normalized)) return "Orkio";

    const active = canonicalizeSpeakerLabel(rtcHostAgentNameRef.current || activeRuntimeAgent || "");
    if (active && active !== "Agent") return active;

    const selectedAgent = findAgentByRuntimeIdentity(rtcHostAgentIdRef.current) || findAgentByRuntimeIdentity(destSingle) || null;
    const selectedName = canonicalizeSpeakerLabel(selectedAgent?.name || selectedAgent?.slug || selectedAgent?.id || "");
    return selectedName || "Orkio";
  }

  function commitRealtimeAssistantFinal(rawText, { source = 'unknown', sessionId = null, targetAgentSlug = null } = {}) {
    const commitSessionId = String(sessionId || rtcSessionIdRef.current || "").trim();
    if (commitSessionId && !isRealtimeSessionCurrent(commitSessionId)) {
      logRealtimeAuthorityTelemetry("stale_session_event_ignored", {
        source,
        event_type: "commitRealtimeAssistantFinal",
        stale_session_id: commitSessionId,
        current_session_id: rtcSessionIdRef.current || null,
      });
      return;
    }

    const finalText = normalizeRealtimeAssistantText(rawText);
    if (!finalText) return;
    const dedupeKey = finalText
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const previousText = normalizeRealtimeAssistantText(rtcAssistantFinalTextRef.current || "");
    const previousDedupe = previousText
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    if (rtcLastAssistantFinalRef.current === dedupeKey && finalText.length <= previousText.length) return;

    // HF4: allow a later, longer assistant transcript to upgrade the previously committed partial text.
    const existingMessageId = rtcAssistantFinalMessageIdRef.current;
    const isMeaningfulUpgrade = Boolean(
      rtcAssistantFinalCommittedRef.current
      && existingMessageId
      && finalText.length > Math.max(previousText.length + 12, Math.floor(previousText.length * 1.12))
      && dedupeKey !== previousDedupe
    );

    const finalAgentSlug = canonicalAgentSlug(targetAgentSlug || getRealtimeAuthorityTargetSlug()) || "orkio";
    const finalMark = markRealtimeFinalCommittedForTurn(finalText, {
      sessionId: commitSessionId || rtcSessionIdRef.current || "",
      targetAgentSlug: finalAgentSlug,
      source,
    });
    if (!finalMark.accepted && !isMeaningfulUpgrade) {
      return;
    }

    if (rtcAssistantFinalCommittedRef.current && !isMeaningfulUpgrade) {
      logRealtimeAuthorityTelemetry("duplicate_final_ignored", {
        source,
        blocked_reason: "assistant_final_already_committed",
        key: finalMark.key,
      });
      return;
    }

    rtcLastAssistantFinalRef.current = dedupeKey;
    rtcAssistantFinalCommittedRef.current = true;
    rtcAssistantFinalTextRef.current = finalText;
    appendRealtimeTranscriptTurn("assistant", finalText, { source });
    try { rtcRealtimeInlineAssistantKeyRef.current = buildRealtimeInlineDedupeKey("assistant", finalText); } catch {}

    queueRealtimeEvent({
      event_type: 'response.final',
      role: 'assistant',
      content: finalText,
      is_final: true,
      meta: {
        source,
        hf4: true,
        upgraded: isMeaningfulUpgrade,
        agent_name: rtcHostAgentNameRef.current || activeRuntimeAgent || "",
        active_agent: rtcHostAgentNameRef.current || activeRuntimeAgent || "",
        agent_id: rtcHostAgentIdRef.current || null,
        meeting_orchestrator_client: true,
        authority_key: finalMark.key || "",
        target_agent_slug: finalAgentSlug,
      },
    });

    try {
      const selectedAgentObj2 = (agents || []).find(a => String(a.id) === String(destSingle || "")) || findAgentByRuntimeIdentity(rtcHostAgentIdRef.current) || null;
      // EFATA777 V8:
      // Admin/founder Realtime must preserve the actual active speaker.
      // Do not collapse Orion/Chris back to Orkio when the session has switched.
      const inferredAgentName2 = inferRealtimeAgentNameForContent(finalText);
      const agentName2 = canonicalizeSpeakerLabel(
        rtcHostAgentNameRef.current ||
        selectedAgentObj2?.name ||
        inferredAgentName2 ||
        "Orkio"
      );
      const agentId2 = selectedAgentObj2?.id || rtcHostAgentIdRef.current || (destSingle || null);

      if (isMeaningfulUpgrade && existingMessageId) {
        setMessages((prev) => (prev || []).map((m) => (
          String(m?.id) === String(existingMessageId)
            ? { ...m, content: finalText, updated_at: Math.floor(Date.now() / 1000), meta: { ...(m?.meta || {}), realtime_transcript_upgraded: true } }
            : m
        )));
      } else {
        const mid = `rtc_ass_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        rtcAssistantFinalMessageIdRef.current = mid;
        const assistantRealtimeMessage = {
          id: mid,
          role: "assistant",
          content: finalText,
          agent_id: agentId2 ? String(agentId2) : null,
          agent_name: agentName2,
          final_speaker: agentName2,
          visible_agent: agentName2,
          created_at: Math.floor(Date.now()/1000),
          meta: { realtime_assistant_transcript: true, realtime_inline_turn: true, source },
        };
        try { cacheRealtimeInlineChatTurn(assistantRealtimeMessage, threadId || activeThreadIdRef.current || ""); } catch {}
        try { void persistRealtimeInlineChatTurnToThread(assistantRealtimeMessage, threadId || activeThreadIdRef.current || ""); } catch {}
        setMessages((prev) => prev.concat([assistantRealtimeMessage]));
      }
    } catch {}

    try {
      console.log("REALTIME_ASSISTANT_TRANSCRIPT_COMMIT", {
        marker: ORKIO_AO61A_HF4_BUILD_MARKER,
        source,
        length: finalText.length,
        upgraded: isMeaningfulUpgrade,
      });
    } catch {}

    // AO66R-HF4: if native Realtime audio does not play but assistant text arrived,
    // use the already validated classic TTS pipeline as a safe voice fallback.
    try {
      const selectedAgentObj3 = (agents || []).find(a => String(a.id) === String(destSingle || "")) || findAgentByRuntimeIdentity(rtcHostAgentIdRef.current) || null;
      const agentId3 = selectedAgentObj3?.id || rtcHostAgentIdRef.current || (destSingle || null);
      console.log("REALTIME_TTS_FALLBACK_REQUESTED", {
        marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        source,
        length: finalText.length,
      });
      Promise.resolve(playTts(finalText, agentId3, { forceAuto: true }))
        .then(() => {
          try { console.log("REALTIME_TTS_FALLBACK_PLAYED", { marker: ORKIO_AO66R_HF4_BUILD_MARKER }); } catch {}
        })
        .catch((err) => {
          try { console.warn("REALTIME_TTS_FALLBACK_FAILED", err); } catch {}
        });
    } catch (err) {
      try { console.warn("REALTIME_TTS_FALLBACK_EXCEPTION", err); } catch {}
    }

    setUploadStatus('📝 ' + finalText.slice(0, 80) + (finalText.length > 80 ? '…' : ''));
    setTimeout(() => setUploadStatus(''), 2500);
    setTimeout(() => { try { scheduleRealtimeIdleFollowup(); } catch {} }, REALTIME_REARM_AFTER_ASSISTANT_MS);
  }

  async function downloadRealtimeAta() {
    try {
      const sid = rtcSessionIdRef.current;
      if (!sid) {
        setUploadStatus('ℹ️ Nenhuma sessão Realtime disponível para exportar relatório.');
        setTimeout(() => setUploadStatus(''), 2000);
        return;
      }
      const blob = await downloadRealtimeAtaFile({ session_id: sid });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orkio-ata-${sid}.txt`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      try { URL.revokeObjectURL(url); } catch {}
      setUploadStatus('⬇️ Baixando relatório executivo da sessão...');
      setTimeout(() => setUploadStatus(''), 1800);
    } catch (e) {
      console.error('[Realtime] download report failed', e);
      setUploadStatus('❌ Falha ao baixar ata.');
      setTimeout(() => setUploadStatus(''), 2000);
    }
  }

async function stopRealtime(reason = 'client_stop') {
    const sid = rtcSessionIdRef.current;
    const reasonTextEarly = String(reason || "client_stop");
    const sessionAgeMs = getRealtimeSessionAgeMs();

    let allowBackendEnd = isExplicitRealtimeEndReason(reasonTextEarly);

    // AO01-HF6R11_REALTIME_WARMUP_BACKEND_END_GATE:
    // A backend realtime session must NOT be ended/consumed while the WebRTC
    // activation is still warming up. Logs showed /api/realtime/start 200 followed
    // by /api/realtime/end 200 in ~0-2s, before any DataChannel/server event/audio.
    // That turns a failed activation into public cooldown.
    //
    // Session creation is not activation. Only a real conversation/audio event should
    // allow backend finalization. While rtcConversationStartedRef is still false,
    // suppress /api/realtime/end for early explicit UI toggles, page/app races,
    // hydration double-clicks, and mobile/PWA lifecycle glitches.
    const realtimeWarmupEndSuppressed = Boolean(
      sid &&
      allowBackendEnd &&
      !rtcConversationStartedRef.current &&
      Number.isFinite(Number(sessionAgeMs)) &&
      Number(sessionAgeMs) >= 0 &&
      Number(sessionAgeMs) < 180000
    );

    if (realtimeWarmupEndSuppressed) {
      allowBackendEnd = false;
      try {
        console.warn("AO01_HF6R11_REALTIME_BACKEND_END_SUPPRESSED_WARMUP", {
          reason: reasonTextEarly,
          sessionId: sid,
          sessionAgeMs,
          conversationStarted: Boolean(rtcConversationStartedRef.current),
        });
      } catch {}
      logRealtimeStep("ao01_hf6r11:backend_end_suppressed_warmup", {
        reason: reasonTextEarly,
        sessionId: sid,
        sessionAgeMs,
      });
    }

    // AO66R-HF3: UI must never remain hostage to network/WebRTC cleanup.
    // For manual stop, close overlay immediately and open summary shell even if transcript is empty.
    const isManualStopEarly = isManualRealtimeStopReason(reasonTextEarly);
    if (isManualStopEarly) {
      try { setRtcOverlayForceClosed(true); } catch {}
      try { console.log("REALTIME_MANUAL_END", { reason: reasonTextEarly, sessionId: sid, marker: ORKIO_AO66R_HF4_BUILD_MARKER }); } catch {}
      try { clearRealtimePendingAutoStop(); } catch {}
      try { clearRealtimeTimeboxTimer(); } catch {}
      try { setRealtimeMode(false); } catch {}
      try { realtimeModeRef.current = false; } catch {}
      try { setRtcTimeboxRemaining(null); } catch {}
      try { setRtcReadyToRespond(false); } catch {}
      try { setV2vPhase(null); } catch {}
      try { updateRealtimePremiumStatus(null, ""); } catch {}
      try { console.log("REALTIME_OVERLAY_CLOSED", { reason: reasonTextEarly, sessionId: sid, marker: ORKIO_AO66R_HF4_BUILD_MARKER }); } catch {}
      try {
        publishRealtimeTranscriptSummary(reasonTextEarly, { sessionId: sid, source: "stopRealtime_manual_immediate", forceOpen: true });
        console.log("REALTIME_SUMMARY_OPENED", { reason: reasonTextEarly, sessionId: sid, marker: ORKIO_AO66R_HF4_BUILD_MARKER });
      } catch {}
    }
    const minAutoStopMs = 30000;
    const isPrematureAutoStop = Boolean(
      sid &&
      !allowBackendEnd &&
      shouldHoldRealtimeInsteadOfEnding(reasonTextEarly, sessionAgeMs)
    );

    try {
      console.log("REALTIME_END_REQUESTED", {
        reason: reasonTextEarly,
        sessionId: sid,
        sessionAgeMs,
        prematureAutoStopBlocked: isPrematureAutoStop,
        allowBackendEnd,
        marker: ORKIO_AO66R_HF4_BUILD_MARKER,
      });
    } catch {}

    if (isPrematureAutoStop) {
      clearRealtimePendingAutoStop();
      rtcLastStopReasonRef.current = reasonTextEarly;
      updateRealtimePremiumStatus("listening", "Realtime ativo. Aguardando áudio ou transcrição.");
      setUploadStatus("⚡ Mantendo a sessão de voz aberta. O timer continua ativo.");
      setTimeout(() => setUploadStatus(""), 2500);
      try {
        console.warn("REALTIME_END_BLOCKED_PREMATURE_HELD", {
          reason: reasonTextEarly,
          sessionId: sid,
          sessionAgeMs,
          minAutoStopMs,
          marker: ORKIO_AO66R_HF4_BUILD_MARKER,
        });
      } catch {}
      logRealtimeStep("ao66a_hf3:end_blocked_premature_held", {
        reason: reasonTextEarly,
        sessionAgeMs,
        minAutoStopMs,
        marker: ORKIO_AO66R_HF4_BUILD_MARKER,
      });
      return;
    }

    if (isManualRealtimeStopReason(reasonTextEarly)) {
      clearRealtimePendingAutoStop();
    }

    try { updateRealtimePremiumStatus("ending", "Encerrando sessão de voz com segurança."); } catch {}
    try {
      console.log("REALTIME_STOP_REASON", reasonTextEarly, { sessionId: sid, sessionAgeMs, marker: ORKIO_AO66R_HF4_BUILD_MARKER });
    } catch {}

    if (rtcStopInFlightRef.current) {
      logRealtimeStep("ao66r_hf4:stop_skip_inflight_ui_already_closed", { reason, sessionId: sid || null });
      try { setRtcOverlayForceClosed(true); } catch {}
      try { setRealtimeMode(false); } catch {}
      try { realtimeModeRef.current = false; } catch {}
      try { setRtcTimeboxRemaining(null); } catch {}
      try { publishRealtimeTranscriptSummary(reasonTextEarly, { sessionId: sid, source: "stopRealtime_inflight", forceOpen: true }); } catch {}
      return;
    }

    rtcStopInFlightRef.current = true;
    rtcConnectingRef.current = false;

    try {
      clearRealtimeResponseTimeout();
      clearRealtimeAutoResponseFallback();
      clearRealtimeIdleFollowup();
      clearRealtimeAudioWatchdog();
      clearRealtimeStartupWatchdog();
      clearRealtimePendingAutoStop();
      clearRealtimeTimeboxTimer();
      clearRealtimeLivePoll();
      await releaseRealtimeWakeLock(reason);
      flushRealtimePartialTranscript(`stop_${reason}_partial_flush`);
      rtcFallbackActiveRef.current = false;
      if (rtcFlushTimerRef.current) { try { clearInterval(rtcFlushTimerRef.current); } catch {} rtcFlushTimerRef.current = null; }

      try {
        if (sid) {
          queueRealtimeEvent({
            event_type: "lifecycle.end_requested",
            role: "system",
            content: "",
            is_final: false,
            meta: {
              reason: reasonTextEarly,
              allow_backend_end: Boolean(allowBackendEnd),
              conversation_started: Boolean(rtcConversationStartedRef.current),
              session_age_ms: sessionAgeMs,
              ao72a_hf1: true,
            },
          });
          await flushRealtimeEvents();

          if (allowBackendEnd) {
            await endRealtimeSession({
              session_id: sid,
              ended_at: Math.floor(Date.now() / 1000),
              meta: {
                reason,
                mode: summitRuntimeModeRef.current,
                hf6r10_explicit_end: true,
                ao72a_hf1_conversation_started: Boolean(rtcConversationStartedRef.current),
              },
            });
            logRealtimeStep("ao72a_hf1:backend_end_ok", {
              reason: reasonTextEarly,
              sessionId: sid,
              sessionAgeMs,
            });
            try {
              console.log("REALTIME_BACKEND_END_OK", {
                reason: reasonTextEarly,
                sessionId: sid,
                sessionAgeMs,
                marker: "AO72A-HF1-REALTIME-CLEAN-END",
              });
            } catch {}
          } else {
            logRealtimeStep("ao68a_hf6r10:backend_end_suppressed", {
              reason: reasonTextEarly,
              sessionId: sid,
              sessionAgeMs,
            });
            try {
              console.warn("REALTIME_BACKEND_END_SUPPRESSED", {
                reason: reasonTextEarly,
                sessionId: sid,
                sessionAgeMs,
                marker: "AO68A-HF6R10_NO_BACKEND_END_ON_WARMUP",
              });
            } catch {}
          }

          try {
            const data = await getRealtimeSessionCompat({ session_id: sid, finals_only: true });
            if (data?.events) setRtcAuditEvents(data.events);
            await handleBackendRealtimeAssistantResponses(data || {});
          } catch {}
          try {
            if (summitRuntimeModeRef.current === "summit") {
              const scoreRes = await getSummitSessionScore({ session_id: sid });
              setSummitSessionScore(scoreRes?.data?.score || null);
            }
          } catch {}
        }
      } catch (err) {
        console.warn('[Realtime] stop finalize failed', err);
      }

      publishRealtimeTranscriptSummary(reason, { sessionId: sid, source: "stopRealtime", forceOpen: isManualStopEarly });

      hardResetRealtimeClientState(`stop_${reason}`);

      try { setRealtimeMode(false); } catch {}
      try { realtimeModeRef.current = false; } catch {}
      try { setRtcTimeboxRemaining(null); } catch {}
      try { setRtcReadyToRespond(false); } catch {}
      if (isManualStopEarly) {
        try { publishRealtimeTranscriptSummary(reason, { sessionId: sid, source: "stopRealtime_after_cleanup", forceOpen: true }); } catch {}
      }

      try { rtcSessionIdRef.current = null; } catch {}
      try { rtcSessionStartedAtRef.current = 0; } catch {}
      try { rtcThreadIdRef.current = null; } catch {}
      try { setRtcReadyToRespond(false); } catch {}
      try { setV2vPhase(null); } catch {}

      const reasonText = String(reason || "");
      const shouldStartCooldown =
        Boolean(sid)
        && isRealtimeTimeboxLimitedUser()
        && (
          reasonText.includes("time_limit_frontend")
          || reasonText.includes("backend_cooldown")
        )
        && !reasonText.includes("start_error")
        && !reasonText.includes("start_blocked_by_cooldown")
        && !reasonText.includes("pre_start_hard_reset")
        && !reasonText.includes("startup_watchdog");

      if (shouldStartCooldown) {
        startRealtimeCooldown(rtcTimeboxPolicyRef.current?.cooldownSeconds || REALTIME_PUBLIC_BETA_COOLDOWN_SECONDS, reason);
      } else {
        updateRealtimePremiumStatus(null, "");
      }
    } catch (err) {
      console.warn('[Realtime] stopRealtime hard cleanup failed', err);
      hardResetRealtimeClientState(`stop_exception_${reason}`);
    } finally {
      rtcStopInFlightRef.current = false;
      rtcConnectingRef.current = false;
      if (isManualStopEarly) {
        try { setRtcOverlayForceClosed(true); } catch {}
        try { setRealtimeMode(false); } catch {}
        try { realtimeModeRef.current = false; } catch {}
        try { setRtcTimeboxRemaining(null); } catch {}
        try { setRtcReadyToRespond(false); } catch {}
        try { setV2vPhase(null); } catch {}
        try { updateRealtimePremiumStatus(null, ""); } catch {}
        try { publishRealtimeTranscriptSummary(reasonTextEarly, { sessionId: sid, source: "stopRealtime_finally", forceOpen: true }); } catch {}
      }
      if (!realtimeModeRef.current) {
        try { setRtcTimeboxRemaining(null); } catch {}
      }
    }
  }

  useEffect(() => {
    function handleRealtimeVisibilityChange() {
      try {
        if (!realtimeModeRef.current && !rtcSessionIdRef.current) return;
        const state = typeof document !== "undefined" ? document.visibilityState : "visible";
        logRealtimeStep("mobile:visibility_change", { state });
        if (state === "hidden") {
          rtcLastVisibilityHiddenAtRef.current = Date.now();
          setUploadStatus("⚡ Realtime ativo. Mantenha a tela ligada para preservar voz e transcrição.");
          return;
        }

        if (state === "visible") {
          const hiddenMs = rtcLastVisibilityHiddenAtRef.current ? Date.now() - rtcLastVisibilityHiddenAtRef.current : null;
          rtcLastVisibilityHiddenAtRef.current = null;
          startRealtimeWakeLockGuard("visibility_visible");
          ensureRealtimeAudioOutput("visibility_visible");
          logRealtimeStep("mobile:visibility_restored", { hidden_ms: hiddenMs });
          if (hiddenMs && hiddenMs > 15000 && rtcSessionIdRef.current) {
            setUploadStatus("⚡ Realtime retomado. Se o áudio estiver baixo, toque no ⚡ para reconectar limpo.");
            setTimeout(() => setUploadStatus(""), 3500);
          }
        }
      } catch {}
    }

    function handleRealtimePageHide() {
      try {
        if (!realtimeModeRef.current && !rtcSessionIdRef.current) return;
        // AO68A-HF6R10:
        // Mobile/PWA pagehide must not end backend Realtime sessions.
        // It was creating fake usage and public cooldown during warmup.
        markRealtimePausedForBackground("pagehide_no_backend_end");
        logRealtimeStep("ao68a_hf6r10:pagehide_no_backend_end", {
          sessionId: rtcSessionIdRef.current || null,
          sessionAgeMs: getRealtimeSessionAgeMs(),
        });
      } catch {}
    }

    function handleRealtimeFocus() {
      try {
        if (!realtimeModeRef.current && !rtcSessionIdRef.current) return;
        startRealtimeWakeLockGuard("window_focus");
        ensureRealtimeAudioOutput("window_focus");
      } catch {}
    }

    try { document.addEventListener("visibilitychange", handleRealtimeVisibilityChange); } catch {}
    try { window.addEventListener("focus", handleRealtimeFocus); } catch {}
    try { window.addEventListener("pageshow", handleRealtimeFocus); } catch {}
    try { window.addEventListener("pagehide", handleRealtimePageHide); } catch {}

    return () => {
      try { document.removeEventListener("visibilitychange", handleRealtimeVisibilityChange); } catch {}
      try { window.removeEventListener("focus", handleRealtimeFocus); } catch {}
      try { window.removeEventListener("pageshow", handleRealtimeFocus); } catch {}
      try { window.removeEventListener("pagehide", handleRealtimePageHide); } catch {}
    };
  }, []);


  async function submitStageReview(clarity, naturalness, institutionalFit) {
    const sid = rtcSessionIdRef.current || lastRealtimeSessionId || null;
    const targetSid = sid || lastRealtimeSessionId;
    if (!targetSid) return;
    try {
      setSummitReviewPending(true);
      const res = await submitSummitSessionReview({
        session_id: targetSid,
        clarity,
        naturalness,
        institutional_fit: institutionalFit,
      });
      try {
        const scoreRes = await getSummitSessionScore({ session_id: targetSid });
        setSummitSessionScore(scoreRes?.data?.score || { human_review: res?.data?.review || null });
      } catch {
        setSummitSessionScore((prev) => ({ ...(prev || {}), human_review: res?.data?.review || null }));
      }
      setUploadStatus("✅ Avaliação do Summit registrada.");
      setTimeout(() => setUploadStatus(""), 1800);
    } catch (err) {
      console.warn("[Summit] review failed", err);
    } finally {
      setSummitReviewPending(false);
    }
  }


  function nudgeRealtimeActivation(source = "voice_button_retry") {
    try {
      const sid = rtcSessionIdRef.current || null;
      const dc = rtcDcRef.current || null;
      const dcState = dc?.readyState || null;
      const ageMs = getRealtimeSessionAgeMs();

      logRealtimeStep("ao68a_hf6r9:activation_nudge", {
        source,
        sessionId: sid,
        dcState,
        ageMs,
        connecting: Boolean(rtcConnectingRef.current),
        conversationStarted: Boolean(rtcConversationStartedRef.current),
      });

      if (!sid) return false;

      setRealtimeMode(true);
      realtimeModeRef.current = true;
      setV2vError(null);

      if (dc && dc.readyState === "open") {
        if (
          rtcResponseInFlightRef.current &&
          !rtcLastResponseCreatedAtRef.current &&
          ageMs > 8000
        ) {
          rtcResponseInFlightRef.current = false;
          clearRealtimeResponseTimeout();
        }

        setV2vPhase("listening");
        updateRealtimePremiumStatus("listening", "Realtime ativo. Reenviando saudação de voz.");
        ensureRealtimeAudioOutput(`hf6r9_${source}`);
        announceRealtimeTimeboxStart(
          dc,
          isRealtimeTimeboxLimitedUser()
            ? resolveRealtimeStartTimeboxSeconds({ timebox: rtcTimeboxPolicyRef.current })
            : 3600
        );
        scheduleRealtimeActivationProbe(dc, `hf6r9_${source}`);
        setUploadStatus("⚡ Realtime ativo. Reenviei a ativação de voz sem reiniciar a sessão.");
        setTimeout(() => setUploadStatus(""), 2500);
        return true;
      }

      updateRealtimePremiumStatus("connecting", "Realtime abrindo. Mantive a sessão viva e não reiniciei o cooldown.");
      setV2vPhase("connecting");
      setUploadStatus("⚡ Realtime ainda abrindo. Não clique novamente para reiniciar; estou mantendo a sessão viva.");
      setTimeout(() => setUploadStatus(""), 3500);

      if (sid) {
        startRealtimeStartupWatchdog(sid, `hf6r9_${source}`);
      }

      return true;
    } catch (err) {
      logRealtimeStep("ao68a_hf6r9:activation_nudge_failed", {
        source,
        message: err?.message || null,
      });
      return false;
    }
  }

  function toggleRealtimeMode() {
    if (!REALTIME_ENTRYPOINT_ENABLED) {
      try {
        if (realtimeModeRef.current || rtcSessionIdRef.current) {
          void stopRealtime("realtime_entrypoint_disabled");
        }
      } catch {}
      try { setRealtimeMode(false); } catch {}
      try { realtimeModeRef.current = false; } catch {}
      try { setRtcReadyToRespond(false); } catch {}
      try { setRtcTimeboxRemaining(null); } catch {}
      try { setRtcCooldownRemaining(0); } catch {}
      try { setRtcOverlayForceClosed(true); } catch {}
      try { setV2vPhase(null); } catch {}
      try { updateRealtimePremiumStatus(null, ""); } catch {}
      notifyDisabledFeature("realtime");
      return;
    }

    if (SUMMIT_VOICE_MODE !== "realtime") return;
    const next = !realtimeMode;

    // AO68D-HF1_REALTIME_TOGGLE_OFF_MUST_DISARM:
    // HF6R9 protected against accidental second taps during warmup, but in staging it
    // made the visible Realtime button impossible to disarm: every off-click became
    // an activation nudge. A user/admin explicit off-click must always cleanly stop
    // the local WebRTC/audio/DataChannel state. Backend /end is still gated inside
    // stopRealtime(), so this does not reintroduce fake quota/cooldown consumption.
    if (!next && realtimeMode) {
      logRealtimeStep("ao68d_hf1:toggle_off_requested", {
        sessionId: rtcSessionIdRef.current || null,
        ageMs: getRealtimeSessionAgeMs(),
        conversationStarted: Boolean(rtcConversationStartedRef.current),
      });
    }

    if (next && rtcSessionIdRef.current && !rtcConversationStartedRef.current) {
      const nudged = nudgeRealtimeActivation("start_tap_existing_session");
      if (nudged) return;
    }

    if (next && isRealtimeTimeboxLimitedUser() && rtcCooldownRemaining > 0) {
      // AO68A-HF6R10:
      // If the browser still has a warming session, retry activation instead of showing cooldown.
      const ageMs = getRealtimeSessionAgeMs();
      if (rtcSessionIdRef.current && !rtcConversationStartedRef.current && ageMs >= 0 && ageMs < 180000) {
        const nudged = nudgeRealtimeActivation("cooldown_tap_existing_warmup_session");
        if (nudged) return;
      }

      const label = formatRealtimeCountdown(rtcCooldownRemaining);
      setV2vPhase("error");
      setV2vError(`A voz em tempo real estará disponível novamente em ${label}. O chat por texto continua disponível.`);
      setUploadStatus(`⏳ Voz disponível novamente em ${label}.`);
      setTimeout(() => setUploadStatus(""), 3500);
      return;
    }

    setRealtimeMode(next);
    realtimeModeRef.current = next;

    if (next) {
      // Disable classic voice mode to avoid mic contention
      if (voiceModeRef.current) {
        setVoiceMode(false);
        voiceModeRef.current = false;
      }
      try { stopMic(); } catch {}
      try { stopTts(); } catch {}
      void Promise.resolve(startRealtime()).catch((err) => {
        // ORKIO_AO60K_HF2_429_COOLDOWN_HARDENING
        console.warn("[Realtime] startRealtime rejected outside internal catch", err);
        if (isRealtimeCooldownOrRateLimitError(err)) {
          applyRealtimeCooldownFromError(err, "toggle_start_rejected_cooldown");
          // AO68A-HF6R9: never call /api/realtime/end only because /start returned cooldown.
          // There may be a still-warming session in the browser or backend.
          setRealtimeMode(false);
          realtimeModeRef.current = false;
          return;
        }
        const friendlyRealtimeError = normalizeUserFacingRuntimeMessage(
          [
            err?.code,
            err?.status ? `status_${err.status}` : "",
            err?.userMessage,
            err?.message,
          ].filter(Boolean).join(" | ") || "Falha ao iniciar Realtime",
          "realtime"
        );
        setRealtimeMode(false);
        realtimeModeRef.current = false;
        setV2vPhase("error");
        setV2vError(friendlyRealtimeError);
        setUploadStatus("❌ Realtime indisponível. Você pode continuar por texto.");
        setTimeout(() => setUploadStatus(""), 3500);
      });
    } else {
      void stopRealtime('toggle_off');
      setV2vPhase(null);
      setV2vError(null);
      setUploadStatus('');
    }
  }

  function stopTts(reason = "manual_stop") {
    // AO65A-HF4/HF5: hard stop must invalidate every pending TTS generation/playback path.
    // This prevents a delayed /api/tts blob, stale Audio callback, or automatic V2V replay from resuming after stop.
    const stoppedMessageId = lastSpokenMessageIdRef.current || null;
    const stoppedText = lastSpokenMsgRef.current || "";

    ttsStopRequestedRef.current = true;
    ttsPlaySeqRef.current += 1;

    const shouldSuppressAuto =
      reason !== "before_new_play" &&
      reason !== "natural_end" &&
      reason !== "tts_error";

    if (shouldSuppressAuto) {
      // HF5/HF6: shield against auto TTS / V2V restarts triggered by stale async callbacks.
      // HF6 keeps a manual-stop latch active until the next real user click.
      const suppressUntil = Date.now() + 10 * 60 * 1000;
      ttsSuppressAutoUntilRef.current = suppressUntil;
      ttsManualStopUntilRef.current = suppressUntil;
      ttsManualStopActiveRef.current = true;
      ttsStoppedMessageIdRef.current = stoppedMessageId;
      ttsStoppedTextRef.current = stoppedText;
    }

    try {
      ttsAbortRef.current?.abort?.();
    } catch (_) {}
    ttsAbortRef.current = null;

    const activeAudio = ttsAudioRef.current;
    ttsAudioRef.current = null;

    if (activeAudio) {
      try {
        activeAudio.onended = null;
        activeAudio.onerror = null;
        activeAudio.onpause = null;
      } catch (_) {}
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch (_) {}
      try {
        activeAudio.removeAttribute("src");
        activeAudio.load?.();
      } catch (_) {}
    }

    if (ttsObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(ttsObjectUrlRef.current);
      } catch (_) {}
      ttsObjectUrlRef.current = null;
    }

    try {
      if (micRestartTimeoutRef.current) {
        clearTimeout(micRestartTimeoutRef.current);
        micRestartTimeoutRef.current = null;
      }
    } catch (_) {}

    lastSpokenMessageIdRef.current = null;
    lastSpokenMsgRef.current = "";
    setTtsPlaying(false);
    setTtsPlayingMessageId(null);
    if (v2vPhase === "playing" || v2vPhase === "tts") {
      setV2vPhase(null);
    }
  }

  function resolveUnifiedClassicTtsVoice(voiceOverride = null) {
    // AO65V-FE8: frontend canonical voice lock for classic message TTS.
    // Evidence from DevTools showed /api/tts receiving voice="shimmer".
    // Backend was obeying inp.voice correctly; therefore the browser bundle must
    // stop resolving the Orkio TTS button to the legacy local fallback.
    const ORKIO_ENV = (typeof window !== "undefined" && window.__ORKIO_ENV__) ? window.__ORKIO_ENV__ : {};
    const ORKIO_CANONICAL = coerceVoiceId(ORKIO_CANONICAL_VOICE_ID || "cedar", "cedar");

    const normalizeCandidate = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      return coerceVoiceId(raw, ORKIO_CANONICAL);
    };

    const envRealtimeVoice = normalizeCandidate(
      ORKIO_ENV.VITE_REALTIME_VOICE ||
      import.meta.env.VITE_REALTIME_VOICE ||
      ""
    );

    const envOrkioVoice = normalizeCandidate(
      ORKIO_ENV.VITE_ORKIO_VOICE_ID ||
      import.meta.env.VITE_ORKIO_VOICE_ID ||
      ""
    );

    const currentRealtimeVoice = normalizeCandidate(rtcVoiceRef.current);
    const explicitOverride = normalizeCandidate(voiceOverride);

    const candidate =
      explicitOverride ||
      currentRealtimeVoice ||
      envRealtimeVoice ||
      envOrkioVoice ||
      ORKIO_CANONICAL;

    // Cedar is the official Orkio voice. If any stale bundle/runtime fallback still
    // produces the previous local default ("shimmer"), canonical Cedar must win.
    const resolvedVoice = candidate === "shimmer" ? ORKIO_CANONICAL : candidate;
    return coerceVoiceId(resolvedVoice, ORKIO_CANONICAL);
  }

  async function playTts(textToSpeak, agentId, opts = {}) {
    // F-01 FIX: desestruturar opts no início da função
    const { forceAuto = false, messageId = null, traceId = null, voiceOverride = null, userInitiated = false } = opts || {};
    if (!textToSpeak || textToSpeak.length < 2) return;

    // AO65A-HF5: after a manual stop, block every non-user-initiated TTS restart.
    // This is stricter than forceAuto because some delayed paths can call playTts() without forceAuto.
    const nowMs = Date.now();
    const suppressUntil = Number(ttsSuppressAutoUntilRef.current || 0);
    const stoppedUntil = Number(ttsManualStopUntilRef.current || 0);
    const sameStoppedMessage = Boolean(messageId && ttsStoppedMessageIdRef.current && String(messageId) === String(ttsStoppedMessageIdRef.current));
    const sameStoppedText = Boolean(!messageId && ttsStoppedTextRef.current && String(textToSpeak || "") === String(ttsStoppedTextRef.current || ""));
    const manualStopActive = Boolean(ttsManualStopActiveRef.current);
    if (!userInitiated && (manualStopActive || nowMs < suppressUntil || (nowMs < stoppedUntil && (sameStoppedMessage || sameStoppedText)))) {
      console.info("[V2V] TTS suppressed after manual stop message_id=%s agent_id=%s userInitiated=%s forceAuto=%s manualStopActive=%s", messageId, agentId, userInitiated, forceAuto, manualStopActive);
      return;
    }

    // AO47B2_FRONTEND_SUPPRESS_CLASSIC_TTS_DURING_REALTIME
    // Realtime já possui áudio nativo. Durante sessão Realtime, nunca chamar /api/tts clássico.
    if (realtimeModeRef.current || rtcSessionIdRef.current) {
      console.info(
        "[AO47B2] classic TTS suppressed during active realtime session session_id=%s thread_id=%s",
        rtcSessionIdRef.current || null,
        threadId || null
      );
      return;
    }

    // AO65A-HF3/HF4: permitir desligar também enquanto o /api/tts ainda está gerando.
    const sameMessageRequested = messageId
      ? messageId === lastSpokenMessageIdRef.current
      : textToSpeak === lastSpokenMsgRef.current;
    if ((ttsPlaying || ttsPlayingMessageId || ttsAudioRef.current || ttsAbortRef.current) && sameMessageRequested) {
      if (userInitiated) {
        stopTts("user_toggle");
      } else {
        console.info("[V2V] duplicate non-user TTS ignored while current audio is active message_id=%s agent_id=%s", messageId, agentId);
      }
      return;
    }

    // Evitar reler a mesma mensagem (idempotência), sem bloquear o stop acima.
    if (messageId && messageId === lastSpokenMessageIdRef.current) return;
    if (!messageId && textToSpeak === lastSpokenMsgRef.current) return;
    lastSpokenMessageIdRef.current = messageId || null;
    lastSpokenMsgRef.current = textToSpeak;

    if (userInitiated) {
      // A fresh click by the user is the only thing allowed to clear the manual stop shield.
      ttsSuppressAutoUntilRef.current = 0;
      ttsManualStopUntilRef.current = 0;
      ttsManualStopActiveRef.current = false;
      ttsStoppedMessageIdRef.current = null;
      ttsStoppedTextRef.current = "";
    }

    // Limpar markdown para fala mais natural
    let clean = textToSpeak
      .replace(/```[\s\S]*?```/g, ' código omitido ')
      .replace(/`[^`]+`/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_~>|]/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim();
    if (voiceModeRef.current) {
      if (clean.length > 1200) clean = clean.slice(0, 1200);
    } else {
      if (clean.length > 4096) clean = clean.slice(0, 4096);
    }
    if (clean.length < 2) return;

    stopTts("before_new_play");
    // stopTts() marks a stop request; this new play request must clear it.
    ttsStopRequestedRef.current = false;
    const ttsController = new AbortController();
    const playSeq = ++ttsPlaySeqRef.current;
    ttsAbortRef.current = ttsController;

    const isCurrentTtsPlay = () =>
      ttsPlaySeqRef.current === playSeq &&
      ttsAbortRef.current === ttsController &&
      !ttsStopRequestedRef.current &&
      !ttsController.signal.aborted;

    setTtsPlaying(true);
    setTtsPlayingMessageId(messageId || "__manual__");
    setV2vPhase('playing');

    const effectiveTrace = traceId || v2vTraceRef.current || null;
    console.info('[V2V] v2v_play_start trace_id=%s message_id=%s agent_id=%s', effectiveTrace, messageId, agentId);

    try {
      const base = (window.__ORKIO_ENV__?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
      const apiUrl = base.endsWith('/api') ? base.slice(0, -4) : base;

      const effectiveTenant = resolveAuthenticatedTenant(user, tenant);
      const ttsHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      if (effectiveTenant) ttsHeaders['X-Org-Slug'] = effectiveTenant;
      if (effectiveTrace) ttsHeaders['X-Trace-Id'] = effectiveTrace;

      const ORKIO_ENV = (typeof window !== "undefined" && window.__ORKIO_ENV__) ? window.__ORKIO_ENV__ : {};
      const ttsSpeed = coerceTtsSpeed(
        ORKIO_ENV.VITE_ORKIO_TTS_SPEED || import.meta.env.VITE_ORKIO_TTS_SPEED || ORKIO_DEFAULT_TTS_SPEED
      );
      const unifiedVoice = resolveUnifiedClassicTtsVoice(voiceOverride);

      const res = await fetch(`${apiUrl}/api/tts`, {
        method: 'POST',
        headers: ttsHeaders,
        signal: ttsController.signal,
        // AO65A-HF4: use the same voice profile as Realtime for classic message TTS.
        // This avoids Orkio sounding different between the 🔊 button and Realtime.
        body: JSON.stringify({
          text: clean,
          voice: unifiedVoice,
          speed: ttsSpeed,
          // AO65A-HF5: force backend to honor inp.voice.
          // /api/tts resolves voice as message_id → agent_id → inp.voice → default,
          // so sending message_id/agent_id here can override the Realtime voice.
          agent_id: null,
          message_id: null,
          // AO47B2: defesa adicional para o backend AO47B1 conseguir bloquear se este caminho for chamado.
          thread_id: threadId || null,
        }),
      });

      if (!isCurrentTtsPlay()) {
        return;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        if (!isCurrentTtsPlay()) return;
        console.warn('[V2V] v2v_tts_fail trace_id=%s status=%d body=%s', effectiveTrace, res.status, errText.slice(0, 200));
        setTtsPlaying(false);
        setTtsPlayingMessageId(null);
        setV2vPhase('error');
        setV2vError(`TTS falhou (HTTP ${res.status})`);
        if (res.status === 401) {
          alert("Sessão expirada. Faça login novamente.");
          try { localStorage.removeItem("orkio_token"); } catch (_) {}
          window.location.href = "/auth";
        }
        return;
      }

      const blob = await res.blob();

      if (!isCurrentTtsPlay()) {
        return;
      }

      if (!blob || blob.size < 50) {
        console.warn('[V2V] v2v_tts_fail trace_id=%s reason=empty_blob size=%d', effectiveTrace, blob?.size);
        setTtsPlaying(false);
        setTtsPlayingMessageId(null);
        setV2vPhase('error');
        setV2vError('TTS retornou áudio vazio');
        return;
      }

      console.info('[V2V] v2v_tts_ok trace_id=%s bytes=%d voice=%s', effectiveTrace, blob.size, unifiedVoice);
      const url = URL.createObjectURL(blob);

      if (!isCurrentTtsPlay()) {
        try { URL.revokeObjectURL(url); } catch (_) {}
        return;
      }

      ttsObjectUrlRef.current = url;
      const audio = new Audio(url);
      ttsAudioRef.current = audio;

      await new Promise((resolve, reject) => {
        const cleanupCurrentAudio = (nextPhase = null) => {
          try { URL.revokeObjectURL(url); } catch (_) {}
          if (ttsObjectUrlRef.current === url) ttsObjectUrlRef.current = null;
          if (ttsAudioRef.current === audio) ttsAudioRef.current = null;

          // Only the current play is allowed to change visible TTS state.
          // Stale audio callbacks from an older blob must never flip the button or restart UI state.
          if (ttsPlaySeqRef.current === playSeq) {
            setTtsPlaying(false);
            setTtsPlayingMessageId(null);
            setV2vPhase(nextPhase);
          }
        };

        audio.onended = () => {
          if (!isCurrentTtsPlay()) {
            cleanupCurrentAudio(null);
            resolve();
            return;
          }
          console.info('[V2V] v2v_play_end trace_id=%s', effectiveTrace);
          stopTts("natural_end");
          // Reiniciar microfone após fala (ciclo V2V) apenas em voice mode clássico.
          if (voiceModeRef.current && (speechSupported || mediaRecorderSupported) && !micEnabledRef.current) {
            scheduleMicRestart('tts_end', 0);
          }
          resolve();
        };

        audio.onerror = (err) => {
          if (!isCurrentTtsPlay()) {
            cleanupCurrentAudio(null);
            resolve();
            return;
          }
          console.error('[V2V] audio.onerror trace_id=%s', effectiveTrace, err);
          cleanupCurrentAudio('error');
          setV2vError('Erro ao reproduzir áudio');
          reject(new Error('Audio playback error'));
        };

        audio.play().catch(err => {
          if (!isCurrentTtsPlay()) {
            cleanupCurrentAudio(null);
            resolve();
            return;
          }
          // autoplay bloqueado pelo browser — fallback silencioso
          console.warn('[V2V] autoplay blocked trace_id=%s:', effectiveTrace, err?.message);
          cleanupCurrentAudio(null);
          // BUG-01 FIX: reiniciar mic mesmo sem áudio — ciclo V2V não pode morrer aqui
          if (voiceModeRef.current && !micEnabledRef.current) {
            scheduleMicRestart('tts_autoplay_blocked', 300);
          }
          resolve(); // não rejeitar — V2V deve continuar mesmo sem áudio
        });
      });
    } catch (e) {
      if (e?.name === "AbortError" || ttsController.signal.aborted || ttsStopRequestedRef.current) {
        if (ttsAbortRef.current === ttsController) {
          ttsAbortRef.current = null;
        }
        setTtsPlaying(false);
        setTtsPlayingMessageId(null);
        setV2vPhase(null);
        return;
      }
      console.error('[V2V] v2v_tts_fail trace_id=%s error:', effectiveTrace, e);
      if (isCurrentTtsPlay()) {
        setTtsPlaying(false);
        setTtsPlayingMessageId(null);
        setV2vPhase('error');
        setV2vError(e?.message || 'Erro desconhecido no TTS');
      }
    } finally {
      if (ttsAbortRef.current === ttsController) {
        ttsAbortRef.current = null;
      }
    }
  }

  function changeTtsVoice(v) {
    setTtsVoice(v);
    localStorage.setItem('orkio_tts_voice', v);
  }

  // Upload flow
  function onPickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    setUploadFileObj(f);
    setUploadScope("thread");
    setUploadAgentIds([]);
    setUploadOpen(true);
  }


  const RTB05_REALTIME_DOCUMENT_TEXT_LIMIT = 16000;
  const RTB05_REALTIME_DOCUMENT_CACHE_LIMIT = 5;

  function getRealtimeDocumentCacheKey(targetThreadId = "") {
    const tid = String(targetThreadId || threadId || activeThreadIdRef.current || "").trim();
    return tid ? `orkio_realtime_documents_v1:${tid}` : "";
  }

  function extractTextCandidateFromUploadPayload(payloadLike) {
    try {
      const payload = payloadLike?.data && typeof payloadLike.data === "object"
        ? payloadLike.data
        : (payloadLike || {});

      const directCandidates = [
        payload?.extracted_text,
        payload?.extractedText,
        payload?.text,
        payload?.content,
        payload?.document_text,
        payload?.documentText,
        payload?.preview_text,
        payload?.previewText,
        payload?.summary,
      ];

      for (const candidate of directCandidates) {
        const value = String(candidate || "").trim();
        if (value) return value;
      }

      const chunkCandidates = [
        payload?.chunks,
        payload?.document_chunks,
        payload?.documentChunks,
        payload?.excerpts,
        payload?.snippets,
      ];

      for (const arr of chunkCandidates) {
        if (!Array.isArray(arr) || !arr.length) continue;
        const joined = arr
          .map((item) => {
            if (typeof item === "string") return item;
            if (!item || typeof item !== "object") return "";
            return item.text || item.content || item.excerpt || item.snippet || item.body || "";
          })
          .map((item) => String(item || "").trim())
          .filter(Boolean)
          .join("\n\n");
        if (joined.trim()) return joined.trim();
      }
    } catch {}
    return "";
  }

  function isClientReadableTextFile(file) {
    try {
      const name = String(file?.name || "").toLowerCase();
      const type = String(file?.type || "").toLowerCase();
      if (type.startsWith("text/")) return true;
      if (type.includes("json") || type.includes("csv") || type.includes("xml") || type.includes("markdown")) return true;
      return /\.(txt|md|markdown|csv|json|xml|html|css|js|jsx|ts|tsx|py|rb|php|java|go|rs|sql|yml|yaml|toml|ini|log)$/i.test(name);
    } catch {
      return false;
    }
  }

  async function readClientSideDocumentExcerpt(file) {
    try {
      if (!file || !isClientReadableTextFile(file)) return "";
      if (typeof file.text !== "function") return "";
      const raw = await file.text();
      return String(raw || "").trim();
    } catch {
      return "";
    }
  }

  async function resolveRealtimeDocumentText(uploadResult, file) {
    const fromBackend = extractTextCandidateFromUploadPayload(uploadResult);
    if (fromBackend) return { text: fromBackend, source: "backend_upload_payload" };

    const fromClient = await readClientSideDocumentExcerpt(file);
    if (fromClient) return { text: fromClient, source: "client_file_text" };

    return { text: "", source: "" };
  }

  function buildRealtimeDocumentCacheItem(uploadResult, file, documentText = "", source = "") {
    const payload = uploadResult?.data && typeof uploadResult.data === "object"
      ? uploadResult.data
      : (uploadResult || {});
    const filename = String(payload?.filename || file?.name || "arquivo").trim() || "arquivo";
    const fileId = String(payload?.file_id || payload?.id || payload?.document_id || "").trim();
    const size = Number(file?.size || payload?.size || 0) || 0;
    const lastModified = Number(file?.lastModified || 0) || 0;
    const cacheId = `${fileId || filename}:${size}:${lastModified}`;
    const textValue = String(documentText || "").trim();
    const excerpt = textValue.slice(0, RTB05_REALTIME_DOCUMENT_TEXT_LIMIT);

    return {
      id: cacheId,
      file_id: fileId || null,
      filename,
      size,
      last_modified: lastModified,
      text: excerpt,
      truncated: textValue.length > excerpt.length,
      source: source || "",
      cached_at: Math.floor(Date.now() / 1000),
      extracted_chars: Number(payload?.extracted_chars || textValue.length || 0) || 0,
      chunks_created: Number(payload?.chunks_created || 0) || 0,
      extraction_failed: payload?.extraction_failed === true,
    };
  }

  function cacheRealtimeDocumentContext(targetThreadId, uploadResult, file, documentText = "", source = "") {
    try {
      const tid = String(targetThreadId || threadId || activeThreadIdRef.current || "").trim();
      const key = getRealtimeDocumentCacheKey(tid);
      if (!key || typeof window === "undefined" || !window.localStorage) return null;

      const item = buildRealtimeDocumentCacheItem(uploadResult, file, documentText, source);
      if (!item.filename) return null;

      const current = JSON.parse(window.localStorage.getItem(key) || "[]");
      const list = Array.isArray(current) ? current : [];
      const filtered = list.filter((existing) => String(existing?.id || "") !== String(item.id || ""));
      const next = filtered.concat([item]).slice(-RTB05_REALTIME_DOCUMENT_CACHE_LIMIT);
      window.localStorage.setItem(key, JSON.stringify(next));
      return item;
    } catch {
      return null;
    }
  }

  function readRealtimeDocumentContextCache(targetThreadId = "") {
    try {
      const key = getRealtimeDocumentCacheKey(targetThreadId);
      if (!key || typeof window === "undefined" || !window.localStorage) return [];
      const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          ...item,
          filename: String(item.filename || "arquivo").trim() || "arquivo",
          text: String(item.text || "").trim(),
          id: String(item.id || item.filename || "").trim(),
        }))
        .filter((item) => item.filename);
    } catch {
      return [];
    }
  }

  function sendRealtimeDocumentContextItem(documentItem, reason = "document_context") {
    try {
      if (!documentItem || !realtimeModeRef.current || !rtcSessionIdRef.current) return false;
      const dc = rtcDcRef.current;
      if (!dc || dc.readyState !== "open") return false;

      const filename = String(documentItem.filename || "arquivo").trim() || "arquivo";
      const docText = String(documentItem.text || "").trim();
      const source = String(documentItem.source || "").trim();
      const truncated = Boolean(documentItem.truncated);
      const extractedChars = Number(documentItem.extracted_chars || docText.length || 0) || 0;
      const chunksCreated = Number(documentItem.chunks_created || 0) || 0;
      const extractionFailed = documentItem.extraction_failed === true;

      const documentBlock = docText
        ? [
            `CONTEÚDO DISPONÍVEL DO DOCUMENTO "${filename}":`,
            docText,
            truncated ? "[Trecho truncado para caber no contexto da sessão Realtime. Use o chat textual para análise integral se necessário.]" : "",
          ].filter(Boolean).join("\n\n")
        : "O conteúdo integral do documento ainda não foi fornecido ao Realtime; apenas os metadados do upload estão disponíveis.";

      const contextText = [
        "CONTEXTO DOCUMENTAL DA THREAD:",
        `O usuário anexou o arquivo "${filename}" à conversa atual.`,
        extractionFailed
          ? "O upload foi concluído, mas a extração de texto falhou."
          : extractedChars > 0 || chunksCreated > 0
            ? `O backend registrou indexação ou extração (${extractedChars || 0} caracteres; ${chunksCreated || 0} trechos).`
            : "Não há confirmação completa de indexação pelo backend.",
        source ? `Fonte do contexto enviado ao Realtime: ${source}.` : "",
        documentBlock,
        "Regra: use o conteúdo acima quando o usuário perguntar sobre o documento. Não diga que não recebeu o arquivo se este contexto estiver presente. Não invente conteúdo ausente.",
      ].filter(Boolean).join("\n\n");

      const sent = sendRealtimeClientEvent(dc, {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: contextText }],
        },
      }, `rtb05:${reason}`);

      if (sent) {
        queueRealtimeTelemetry("document_context_attached", {
          filename,
          hasText: Boolean(docText),
          textLength: docText.length,
          source,
          reason,
        });
        return true;
      }
    } catch (err) {
      logRealtimeStep("rtb05:document_context_send_failed", {
        filename: documentItem?.filename || null,
        message: err?.message || null,
      });
    }
    return false;
  }

  async function bridgeCachedThreadDocumentsToRealtime(reason = "data_channel_open") {
    try {
      const tid = String(resolveRealtimeThreadId() || threadId || activeThreadIdRef.current || "").trim();
      if (!tid || !realtimeModeRef.current || !rtcSessionIdRef.current) return false;
      const dc = rtcDcRef.current;
      if (!dc || dc.readyState !== "open") return false;

      const bridgeKey = `${rtcSessionIdRef.current}:${tid}:${reason}`;
      if (rtcRealtimeDocumentBridgeKeyRef.current === bridgeKey) return false;

      const result = await bridgeRealtimeDocumentContext({
        apiFetch,
        token,
        org: tenant,
        threadId: tid,
        query: "documentos anexados à thread",
        dc,
        sendRealtimeClientEvent,
        queueRealtimeTelemetry,
        logRealtimeStep,
        reason,
      });

      if (result?.sent) {
        rtcRealtimeDocumentBridgeKeyRef.current = bridgeKey;
      }
      return Boolean(result?.sent);
    } catch (err) {
      logRealtimeStep("rtb07:cached_documents_bridge_failed", {
        reason,
        message: err?.message || null,
      });
      return false;
    }
  }


  async function bridgeUploadedFileToRealtime(uploadResult, file, options = {}) {
    try {
      if (!realtimeModeRef.current || !rtcSessionIdRef.current) return false;
      const dc = rtcDcRef.current;
      if (!dc || dc.readyState !== "open") return false;

      const payload = uploadResult?.data && typeof uploadResult.data === "object"
        ? uploadResult.data
        : (uploadResult || {});
      const fileId = String(payload?.file_id || payload?.id || "").trim();
      const filename = String(payload?.filename || file?.name || "arquivo").trim() || "arquivo";
      const targetThreadId = String(options?.threadId || payload?.thread_id || threadId || activeThreadIdRef.current || "").trim();

      const result = await bridgeRealtimeDocumentContext({
        apiFetch,
        token,
        org: tenant,
        threadId: targetThreadId,
        fileId,
        query: filename,
        dc,
        sendRealtimeClientEvent,
        queueRealtimeTelemetry,
        logRealtimeStep,
        reason: "file_upload_context",
      });

      if (result?.sent) {
        logRealtimeStep("rtb07:file_upload_document_context_attached", {
          filename,
          fileId: fileId || null,
          threadId: targetThreadId,
          contextChars: result?.documentContext?.context_chars || result?.documentContext?.file_context_chars || 0,
        });
      } else {
        logRealtimeStep("rtb07:file_upload_document_context_unavailable", {
          filename,
          fileId: fileId || null,
          threadId: targetThreadId,
          reason: result?.reason || "empty_context",
        });
      }

      return Boolean(result?.sent);
    } catch (err) {
      logRealtimeStep("rtb07:file_upload_context_failed", {
        filename: file?.name || null,
        message: err?.message || null,
      });
      return false;
    }
  }


  async function confirmUpload() {
    const f = uploadFileObj;
    if (!f) return;
    // PATCH0100_17_ENSURE_THREAD_BEFORE_UPLOAD: uploads need a thread to be visible in chat
    let effectiveThreadId = threadId;
    if (!effectiveThreadId && (uploadScope === "thread" || uploadScope === "institutional")) {
      try {
        const created = await apiFetch("/api/threads", { method: "POST", token, org: tenant, body: { title: "Nova conversa" }});
        effectiveThreadId = created?.data?.id;
        if (effectiveThreadId) activateThread(effectiveThreadId, { clearMessages: true });
      } catch (e) {
        console.warn("could not create thread before upload", e);
      }
    }

    try {
      setUploadProgress(true);
      setUploadStatus("Enviando arquivo...");

      if (uploadScope === "thread") {
        console.info("[Upload] start", { scope: "thread", filename: f?.name, threadId: effectiveThreadId, size: f?.size || null });
        const uploadResult = await uploadFile(f, { token, org: tenant, threadId: effectiveThreadId, intent: "chat" });
        const realtimeBridged = await bridgeUploadedFileToRealtime(uploadResult, f, { threadId: effectiveThreadId });
        setUploadStatus(realtimeBridged ? "Arquivo anexado e contexto enviado ao Realtime ✅" : "Arquivo anexado à conversa ✅");
        try { await loadMessages(effectiveThreadId, { force: true, expectedEpoch: activeThreadEpochRef.current }); } catch {}
      } else if (uploadScope === "agents") {
        if (!canAccessAdmin) {
          setUploadStatus("No beta público, arquivos são anexados à conversa com Orkio.");
          const uploadResult = await uploadFile(f, { token, org: tenant, threadId: effectiveThreadId, intent: "chat" });
          const realtimeBridged = await bridgeUploadedFileToRealtime(uploadResult, f, { threadId: effectiveThreadId });
          setUploadStatus(realtimeBridged ? "Arquivo anexado e contexto enviado ao Realtime ✅" : "Arquivo anexado à conversa ✅");
          try { await loadMessages(effectiveThreadId, { force: true, expectedEpoch: activeThreadEpochRef.current }); } catch {}
          return;
        }
        console.info("[Upload] start", { scope: "agents", filename: f?.name, agentIds: uploadAgentIds, size: f?.size || null });
        if (!uploadAgentIds.length) {
          alert("Selecione ao menos um agente.");
          return;
        }
        await uploadFile(f, { token, org: tenant, agentIds: uploadAgentIds, intent: "agent" });
        setUploadStatus("Arquivo vinculado aos agentes ✅");
      } else if (uploadScope === "institutional") {
        console.info("[Upload] start", { scope: "institutional", filename: f?.name, threadId: effectiveThreadId, size: f?.size || null });
        const admin = isAdmin(user);
        if (admin) {
          const uploadResult = await uploadFile(f, { token, org: tenant, threadId: effectiveThreadId, intent: "institutional", linkAllAgents: true });
          const realtimeBridged = await bridgeUploadedFileToRealtime(uploadResult, f, { threadId: effectiveThreadId });
          setUploadStatus(realtimeBridged ? "Arquivo institucional anexado e sinalizado ao Realtime ✅" : "Arquivo institucional (global) ✅");
          // STAB: reload com effectiveThreadId para garantir que mensagem system aparece
          try {
            if (effectiveThreadId) await loadMessages(effectiveThreadId, { expectedEpoch: activeThreadEpochRef.current });
          } catch (e) { console.warn("loadMessages after institutional upload failed:", e); }
        } else {
          // B2: request institutionalization; keep accessible in this thread
          const uploadResult = await uploadFile(f, { token, org: tenant, threadId: effectiveThreadId, intent: "chat", institutionalRequest: true });
          const realtimeBridged = await bridgeUploadedFileToRealtime(uploadResult, f, { threadId: effectiveThreadId });
          setUploadStatus(realtimeBridged ? "Solicitação anexada e sinalizada ao Realtime ✅" : "Solicitação enviada ao admin (institucional) ✅");
          try { await loadMessages(effectiveThreadId, { force: true, expectedEpoch: activeThreadEpochRef.current }); } catch {}
        }
      }

      setUploadOpen(false);
      setUploadFileObj(null);
      setTimeout(() => setUploadStatus(""), 2200);
    } catch (e) {
      console.error("upload error", e);
      console.warn("[Upload] failed", {
        scope: uploadScope,
        filename: f?.name || uploadFileObj?.name || null,
        message: e?.message || null,
      });
      setUploadStatus(restoreErrorMessage(e, "Falha no upload. Tente novamente."));
      setTimeout(() => setUploadStatus(""), 2500);
    } finally {
      setUploadProgress(false);
    }
  }

  const styles = {
    layout: {
      display: "flex",
      height: "100dvh",
      minHeight: "100dvh",
      overflow: "hidden",
      background:
        "radial-gradient(1200px 700px at 30% -10%, rgba(124,92,255,0.25), transparent 60%), linear-gradient(180deg, #05060a, #03030a)",
      color: "#fff",
      fontFamily: "system-ui",
    },
    sidebar: {
      width: "330px",
      height: "100dvh",
      position: "sticky",
      top: 0,
      zIndex: 18,
      overflow: "hidden",
      flexShrink: 0,
      borderRight: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(5,6,10,0.96)",
      backdropFilter: "blur(12px)",
      boxShadow: "12px 0 40px rgba(0,0,0,0.16)",
      display: "flex",
      flexDirection: "column",
      padding: "16px",
      gap: "12px",
    },
    brand: { fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em" },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      color: "rgba(255,255,255,0.8)",
    },
    topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
    newThreadBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 12px",
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.05)",
      color: "#fff",
      cursor: "pointer",
    },
    threads: { flex: 1, overflowY: "auto", padding: "0 8px" },
    emptyThreads: { padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.42)", fontSize: "13px", lineHeight: 1.45 },
    threadItem: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      width: "100%",
      padding: "12px",
      background: "transparent",
      border: "none",
      borderRadius: "10px",
      color: "rgba(255,255,255,0.7)",
      fontSize: "13px",
      cursor: "pointer",
      textAlign: "left",
      marginBottom: "4px",
    },
    threadItemActive: { background: "rgba(255,255,255,0.1)", color: "#fff" },
    threadTitle: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    threadEditBtn: {
      border: "none",
      background: "transparent",
      color: "rgba(255,255,255,0.55)",
      padding: "4px",
      borderRadius: "8px",
      cursor: "pointer",
    },
    userSection: {
      padding: "16px",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
    },
    userInfo: { display: "flex", alignItems: "center", gap: "10px" },
    userAvatar: {
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #7c5cff 0%, #35d0ff 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
    },
    userDetails: { display: "flex", flexDirection: "column" },
    userName: { fontSize: "13px", fontWeight: 700 },
    userEmail: { fontSize: "12px", color: "rgba(255,255,255,0.55)" },
    userActions: { display: "flex", alignItems: "center", gap: "8px" },
    iconBtn: {
      width: "36px",
      height: "36px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.05)",
      color: "#fff",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },

    premiumEmptyShell: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.55fr) minmax(320px, 400px)",
      gap: isMobile ? "18px" : "24px",
      alignItems: "stretch",
      padding: isMobile ? "8px" : "8px 6px",
    },
    premiumAside: {
      display: "grid",
      gap: "18px",
      alignContent: "start",
    },
    premiumAsideCard: {
      background: "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(7,11,21,1) 100%)",
      border: "1px solid rgba(148,163,184,0.16)",
      borderRadius: "30px",
      padding: isMobile ? "18px" : "22px",
      boxShadow: "0 30px 80px rgba(2, 6, 23, 0.38)",
    },
    premiumAsideEyebrow: {
      fontSize: "11px",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "rgba(148,163,184,0.88)",
      marginBottom: "9px",
      fontWeight: 900,
    },
    premiumAsideTitle: {
      fontSize: isMobile ? "18px" : "22px",
      lineHeight: 1.12,
      fontWeight: 900,
      marginBottom: "10px",
      color: "#f8fafc",
    },
    premiumAsideText: {
      fontSize: "14px",
      lineHeight: 1.72,
      color: "rgba(226,232,240,0.82)",
    },
    premiumLogList: {
      display: "grid",
      gap: "10px",
      marginTop: "14px",
    },
    premiumLogItem: {
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
      padding: "12px 12px",
      borderRadius: "16px",
      border: "1px solid rgba(148,163,184,0.12)",
      background: "rgba(2,6,23,0.34)",
      color: "rgba(241,245,249,0.88)",
      fontSize: "13px",
      lineHeight: 1.55,
    },
    premiumLogDot: {
      width: "8px",
      height: "8px",
      borderRadius: "999px",
      background: "linear-gradient(135deg, #7c3aed, #2563eb)",
      marginTop: "7px",
      flexShrink: 0,
    },
    premiumStatusRow: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
      gap: "10px",
      marginTop: "14px",
    },
    premiumStatusCard: {
      borderRadius: "18px",
      padding: "13px 12px",
      border: "1px solid rgba(148,163,184,0.12)",
      background: "rgba(255,255,255,0.04)",
    },
    premiumStatusLabel: {
      fontSize: "11px",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "rgba(148,163,184,0.72)",
      marginBottom: "6px",
      fontWeight: 800,
    },
    premiumStatusValue: {
      fontSize: "14px",
      fontWeight: 800,
      color: "#f8fafc",
      lineHeight: 1.3,
    },

    main: { flex: 1, minWidth: 0, height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" },
    topbar: {
      position: "sticky",
      top: 0,
      zIndex: 22,
      padding: "16px 18px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(7,9,16,0.96)",
      backdropFilter: "blur(14px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      flexWrap: "wrap",
    },
    title: { fontSize: "16px", fontWeight: 900 },
    health: { fontSize: "12px", color: "rgba(255,255,255,0.6)" },
    chatArea: { flex: 1, overflowY: "auto", padding: "16px 18px" },
    messageRow: { display: "flex", marginBottom: "12px" },
    messageBubble: {
      maxWidth: "820px",
      padding: "12px 12px",
      borderRadius: "16px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
    },
    userBubble: { background: "rgba(124,92,255,0.12)", border: "1px solid rgba(124,92,255,0.25)" },
    agentBubble: { background: "rgba(53,208,255,0.10)", border: "1px solid rgba(53,208,255,0.22)" },
    systemBubble: { background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.18)" },
    bubbleHeaderRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "6px" },
    bubbleHeaderName: { fontSize: "12px", color: "rgba(255,255,255,0.70)", fontWeight: 900 },
    bubbleHeaderTime: { fontSize: "12px", color: "rgba(255,255,255,0.55)", fontWeight: 700 },
    nameUser: { color: "rgba(196,176,255,0.95)" },
    nameAgent: { color: "rgba(160,240,255,0.95)" },
    nameSystem: { color: "rgba(255,255,255,0.82)" },
    messageContent: { whiteSpace: "pre-wrap", lineHeight: 1.45, fontSize: "14px" },
    messageTime: { marginTop: "8px", fontSize: "11px", color: "rgba(255,255,255,0.55)" },

    uploadStatus: {
      padding: "10px 18px",
      fontSize: "13px",
      color: "rgba(255,255,255,0.85)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
    },

    realtimeAudit: {
      padding: "10px 18px",
      fontSize: "12px",
      color: "rgba(255,255,255,0.82)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(80,160,255,0.06)",
      maxHeight: "220px",
      overflowY: "auto",
    },
    realtimeAuditHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "8px" },
    realtimeAuditTitle: { fontWeight: 900, letterSpacing: "0.2px" },
    realtimeAuditPill: { padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.05)", fontSize: "11px" },
    realtimeAuditItem: { padding: "8px 10px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", marginBottom: "8px" },
    realtimeAuditMeta: { display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "6px", opacity: 0.8 },
    realtimeAuditWho: { fontWeight: 900 },
    realtimeAuditText: { whiteSpace: "pre-wrap", lineHeight: 1.45 },


    composerContainer: { position: "sticky", bottom: composerViewportOffset, zIndex: 8, padding: "14px 18px calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(7,9,16,0.96)", backdropFilter: "blur(10px)" },
    composer: {
      display: "flex",
      alignItems: "flex-end",
      gap: "10px",
      padding: "10px",
      borderRadius: "18px",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.04)",
    },
    attachBtn: {
      width: "42px",
      height: "42px",
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.05)",
      color: "#fff",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: uploadProgress ? 0.6 : 1,
    },
    textarea: {
      flex: 1,
      minHeight: "42px",
      maxHeight: "180px",
      resize: "none",
      background: "transparent",
      border: "none",
      outline: "none",
      color: "#fff",
      fontSize: "14px",
      lineHeight: 1.4,
      padding: "10px 8px",
    },
    micBtn: {
      width: "42px",
      height: "42px",
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: micEnabled ? "rgba(53,208,255,0.15)" : "rgba(255,255,255,0.05)",
      color: "#fff",
      cursor: speechSupported ? "pointer" : "not-allowed",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: speechSupported ? 1 : 0.6,
    },
    sendBtn: {
      width: "42px",
      height: "42px",
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.05)",
      color: "#fff",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: sending ? 0.6 : 1,
    },
    select: {
      padding: "8px 10px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.05)",
      color: "#fff",
      fontSize: "12px",
      minWidth: isMobile ? "min(82vw, 250px)" : "180px",
      width: isMobile ? "min(82vw, 250px)" : "auto",
      maxWidth: isMobile ? "min(82vw, 250px)" : "340px",
      minHeight: "42px",
      lineHeight: 1.25,
      flexShrink: 0,
      cursor: "pointer",
    },
    agentSelectorDock: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
      flexWrap: "wrap",
      justifyContent: isMobile ? "flex-start" : "flex-end",
      minWidth: isMobile ? "100%" : "420px",
      maxWidth: "100%",
    },
    quickAgentBtn: {
      border: "1px solid rgba(255,255,255,0.13)",
      background: "rgba(255,255,255,0.055)",
      color: "#fff",
      minHeight: "34px",
      padding: "7px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 850,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    quickAgentBtnActive: {
      border: "1px solid rgba(96,165,250,0.45)",
      background: "linear-gradient(135deg, rgba(37,99,235,0.38), rgba(14,165,233,0.18))",
      boxShadow: "0 10px 24px rgba(37,99,235,0.18)",
    },
    modalBack: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
      padding: "16px",
    },
    modal: {
      width: "min(720px, 96vw)",
      borderRadius: "18px",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(12,12,20,0.96)",
      padding: "16px",
    },
    modalTitle: { fontSize: "14px", fontWeight: 900 },
    radioRow: { display: "flex", gap: "10px", alignItems: "center", marginTop: "10px", color: "rgba(255,255,255,0.85)" },
    modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" },
    btn: { border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", padding: "10px 12px", borderRadius: "14px", cursor: "pointer" },
    btnPrimary: { background: "rgba(124,92,255,0.22)", border: "1px solid rgba(124,92,255,0.35)", fontWeight: 800 },
    checkGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px", marginTop: "10px" },
    checkItem: { display: "flex", gap: "8px", alignItems: "center", padding: "8px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" },
    restoreStatePanel: {
      width: "min(640px, 100%)",
      margin: "64px auto 0",
      padding: "18px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.045)",
      boxShadow: "0 18px 54px rgba(0,0,0,0.22)",
    },
    restoreStateTitle: { fontSize: 16, fontWeight: 900, marginBottom: 8 },
    restoreStateText: { fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.72)" },
    restoreStateActions: { marginTop: 14, display: "flex", justifyContent: "flex-start" },
    hint: { fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "6px" },
  };

  function handleOnboardingComplete(nextUser) {
    const refreshedToken = nextUser?.access_token || token;
    const mergedUser = {
      ...(user || {}),
      ...(nextUser || {}),
      org_slug: nextUser?.org_slug || user?.org_slug || tenant,
      role: nextUser?.role || user?.role || "user",
      approved_at: nextUser?.approved_at ?? user?.approved_at ?? null,
      usage_tier: nextUser?.usage_tier ?? user?.usage_tier ?? null,
      signup_source: nextUser?.signup_source ?? user?.signup_source ?? null,
      signup_code_label: nextUser?.signup_code_label ?? user?.signup_code_label ?? null,
      product_scope: nextUser?.product_scope ?? user?.product_scope ?? null,
      onboarding_completed: true,
    };

    mergedUser.is_admin = hasAdminAccess(mergedUser);
    mergedUser.admin = mergedUser.is_admin === true;

    setUser(mergedUser);

    try {
      setSession({
        token: refreshedToken,
        user: mergedUser,
        tenant: mergedUser?.org_slug || tenant,
      });
      setToken(refreshedToken);
    } catch {}

    setOnboardingOpen(false);
    setOnboardingStatus("");
    setUploadStatus("✅ Onboarding concluído.");
    setTimeout(() => setUploadStatus(""), 1800);
  }

  const onboardingGateRequired = Boolean(
    token &&
    onboardingChecked &&
    onboardingOpen &&
    !showTermsModal &&
    user &&
    !user?.onboarding_completed
  );

  if (onboardingGateRequired) {
    return (
      <>
        <PWAInstallPrompt />
        <OnboardingModal
          user={user}
          onComplete={handleOnboardingComplete}
        />
      </>
    );
  }

  const meName = user?.name || user?.email || "Você";

  // ORKIO_AO57C_PUBLIC_BETA_ORKIO_ONLY_WEB_V3
  // UX layer only. Backend AO57B remains the authority for actual access control.
  // ORKIO_AO60F_HF4_NON_ADMIN_REALTIME_ORKIO_ONLY
  // During public beta, every non-admin user, including EFATAH777 and AMCHAMRSORKIO,
  // uses Orkio-only Realtime. Admin keeps full agent access for testing/release governance.
  const publicBetaOrkioOnly = !canAccessAdmin;
  const conversationRestoreState = threadsLoadState === "load_failed"
    ? "load_failed"
    : (threadsLoadState === "loading" || threadsLoadState === "retrying")
      ? threadsLoadState
      : (threadId && messagesLoadState === "load_failed")
        ? "load_failed"
        : (threadId && (messagesLoadState === "loading" || messagesLoadState === "retrying"))
          ? messagesLoadState
          : (!threadId && threadsLoadState === "empty")
            ? "empty"
            : messagesLoadState;
  const isCleanNewThreadActive = Boolean(
    threadId &&
    String(cleanNewThreadIdRef.current || "") === String(threadId || "") &&
    messages.length === 0
  );
  const shouldShowRestorePanel = !isCleanNewThreadActive && messages.length === 0 && (
    conversationRestoreState === "loading" ||
    conversationRestoreState === "retrying" ||
    conversationRestoreState === "load_failed"
  );
  const restorePanelTitle = conversationRestoreState === "load_failed"
    ? "Não foi possível carregar a conversa"
    : conversationRestoreState === "retrying"
      ? "Tentando restaurar a conversa"
      : "Carregando conversas";
  const restorePanelMessage = conversationRestoreState === "load_failed"
    ? (threadsLoadError || messagesLoadError || "Falha temporária ao carregar o histórico. Suas mensagens não foram apagadas.")
    : conversationRestoreState === "retrying"
      ? "Estamos tentando novamente antes de declarar que não há conversas."
      : "Buscando a última conversa ativa e o histórico preservado.";
  const isOrkioAgent = (agent) => {
    const raw = [
      agent?.name,
      agent?.slug,
      agent?.id,
      agent?.label,
    ].filter(Boolean).join(" ").toLowerCase();
    return raw.includes("orkio");
  };
  const visibleAgents = publicBetaOrkioOnly ? agents.filter(isOrkioAgent) : agents;
  const effectiveDestMode = publicBetaOrkioOnly ? "single" : destMode;
  const manualStickySlugForUi = normalizeManualAuthoritySlug(selectedManualAgentSlug || selectedManualAgentSlugRef.current || "", "");
  const manualStickyLabelForUi = manualStickySlugForUi
    ? (manualStickySlugForUi === "team"
        ? "Team"
        : canonicalizeSpeakerLabel(registryCanonicalAgentDisplayNameFromSlug(manualStickySlugForUi) || manualStickySlugForUi))
    : "";
  const meetingRoomActiveSpeaker = manualStickyLabelForUi || formatMeetingRoomSpeakerName(meetingState, "active") || activeRuntimeAgent || "";
  const meetingRoomLastSpeaker = manualStickyLabelForUi ? "" : formatMeetingRoomSpeakerName(meetingState, "last");
  const meetingRoomParticipants = manualStickySlugForUi === "team"
    ? resolveManualTeamPanelNames(resolveManualTeamPanelSlugs())
    : extractMeetingRoomParticipants(meetingState);
  const meetingRoomTurnIndex = Number.isFinite(Number(meetingState?.turn_index))
    ? Number(meetingState.turn_index)
    : null;

  const pendingApprovedPatchExecution = findPendingApprovedPatchExecution(messages);
  const orderedChatMessages = orderChatMessages(messages);
  const nonPublicOrgLabel = [tenant, user?.org_slug, user?.org, user?.tenant]
    .map((value) => String(value || "").trim())
    .find((value) => value && value.toLowerCase() !== "public");
  const appConsoleOrgLabel = nonPublicOrgLabel || (canAccessAdmin ? "autenticado" : (tenant || "public"));
  const sidebarEmptyText = threadsLoadState === "loading"
    ? "Carregando conversas..."
    : threadsLoadState === "retrying"
      ? "Restaurando conversas..."
      : threadsLoadState === "load_failed"
        ? (threadsLoadError || "Não foi possível carregar as conversas.")
        : "Nenhuma conversa ainda.";
  const latestSmartActionMessageId = (() => {
    for (let index = orderedChatMessages.length - 1; index >= 0; index -= 1) {
      const candidate = orderedChatMessages[index] || {};
      const role = String(candidate.role || "").toLowerCase();
      if (role !== "assistant" && role !== "agent") continue;
      const content = (
        candidate.content ||
        candidate.final_text ||
        candidate.text ||
        ""
      );
      if (!isSmartNextActionsEligible(content)) continue;
      return String(candidate.id || candidate.message_id || "");
    }
    return "";
  })();

  const realtimeOverlayActive = Boolean(
    !rtcOverlayForceClosed
    && SUMMIT_VOICE_MODE === "realtime"
    && (
      realtimeMode
      || rtcTimeboxRemaining !== null
      || v2vPhase === "connecting"
      || rtcPremiumStatus === "connecting"
      || rtcPremiumStatus === "listening"
      || rtcPremiumStatus === "transcribing"
      || rtcPremiumStatus === "responding"
      || rtcPremiumStatus === "ending"
    )
    && rtcPremiumStatus !== "cooldown"
  );
  const realtimeOverlayMaxSeconds = Math.max(
    1,
    Math.ceil(Number(rtcTimeboxPolicyRef.current?.maxSeconds || REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS))
  );
  const realtimeOverlayRemainingSeconds = rtcTimeboxRemaining !== null
    ? rtcTimeboxRemaining
    : realtimeOverlayMaxSeconds;
  const realtimeOverlayStatusLabel = getRealtimePremiumStatusLabel();
  const realtimeOverlayDetail = rtcPremiumStatusDetail || (realtimeMode ? "Conversa em tempo real ativa." : "");

  if (!onboardingChecked && !bootstrapFailOpen) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f1115", color: "#fff", fontFamily: "system-ui" }}>Carregando sua experiência...</div>;
  }

  return (
    <>
    <PWAInstallPrompt />
    {REALTIME_FRONTEND_HARD_TIMEBOX_ENABLED === true && isRealtimeTimeboxLimitedUser() && (
      <RealtimeTimeboxOverlay
      active={realtimeOverlayActive}
      remainingSeconds={realtimeOverlayRemainingSeconds}
      maxSeconds={realtimeOverlayMaxSeconds}
      status={rtcPremiumStatus || (realtimeMode ? "listening" : null)}
      statusLabel={realtimeOverlayStatusLabel}
      detail={realtimeOverlayDetail}
      voiceLabel="Orkio em tempo real"
      onStop={() => {
        // UX-FIX-01/P0.2:
        // The explicit "Encerrar voz agora" action must always release the user,
        // even when Realtime is still connecting, failed to find a microphone, or
        // the peer/data channel never reached the normal listening state.
        const sessionAgeMs = getRealtimeSessionAgeMs();

        try {
          console.log("REALTIME_MANUAL_END_FORCED", {
            marker: "UX_FIX_01_REALTIME_OVERLAY_FORCE_CLOSE",
            sessionId: rtcSessionIdRef.current || null,
            sessionAgeMs,
            status: rtcPremiumStatus || null,
            phase: v2vPhase || null,
          });
        } catch {}

        try { setRtcOverlayForceClosed(true); } catch {}
        try { clearRealtimeTimeboxTimer(); } catch {}
        try { setRtcTimeboxRemaining(null); } catch {}
        try { setRtcReadyToRespond(false); } catch {}
        try { setRealtimeMode(false); } catch {}
        try { realtimeModeRef.current = false; } catch {}
        try { setV2vPhase(null); } catch {}
        try { setV2vError(null); } catch {}
        try { setRtcPremiumStatus(null); } catch {}
        try { setRtcPremiumStatusDetail(""); } catch {}
        try { updateRealtimePremiumStatus(null, ""); } catch {}
        try { setUploadStatus("Voz encerrada. O chat por texto continua disponível."); } catch {}
        try { setTimeout(() => setUploadStatus(""), 1800); } catch {}

        try {
          const maybePromise = stopRealtime("client_stop_overlay_forced");
          if (maybePromise && typeof maybePromise.catch === "function") {
            maybePromise.catch((err) => {
              try { console.warn("REALTIME_FORCE_STOP_CLEANUP_FAILED", err); } catch {}
            });
          }
        } catch (err) {
          try { console.warn("REALTIME_FORCE_STOP_THROWN", err); } catch {}
        }
      }}
    />
    )}
    {/* AO68E-HF1: separate Realtime transcript modal removed.
        Final Realtime user/assistant turns are written directly into the main chat. */}
    {bootstrapFailOpen && (
      <div style={{ position: "fixed", top: "12px", left: "50%", transform: "translateX(-50%)", zIndex: 120, padding: "10px 14px", borderRadius: "12px", border: "1px solid rgba(251,191,36,0.35)", background: "rgba(120,53,15,0.92)", color: "#fde68a", fontSize: "12px", fontWeight: 700, boxShadow: "0 12px 28px rgba(0,0,0,0.28)" }}>
        Console liberado em modo fail-open. O bootstrap inicial demorou mais que o esperado.
      </div>
    )}
    {showTermsModal && (
      <TermsModal onAccepted={async () => {
        setShowTermsModal(false);
        const resolvedTermsVersion = await fetchCurrentTermsVersion();
        const acceptedAt = Math.floor(Date.now() / 1000);
        // Update local user object + React state to avoid stale gate after acceptance
        const u = getUser();
        if (u) {
          const nextUser = { ...u, terms_accepted_at: acceptedAt, terms_version: resolvedTermsVersion };
          localStorage.setItem("orkio_user", JSON.stringify(nextUser));
          setUser(nextUser);
          if (!nextUser?.onboarding_completed) setOnboardingOpen(true);
        } else {
          setUser((prev) => (prev ? { ...prev, terms_accepted_at: acceptedAt, terms_version: resolvedTermsVersion } : prev));
        }
      }} />
    )}

{onboardingOpen && !showTermsModal && (
      <OnboardingModal
        user={user}
        onComplete={(nextUser) => {
          const refreshedToken = nextUser?.access_token || token;
          const mergedUser = {
            ...(user || {}),
            ...(nextUser || {}),
            org_slug: nextUser?.org_slug || user?.org_slug || tenant,
            role: nextUser?.role || user?.role || "user",
            approved_at: nextUser?.approved_at ?? user?.approved_at ?? null,
            usage_tier: nextUser?.usage_tier ?? user?.usage_tier ?? null,
            signup_source: nextUser?.signup_source ?? user?.signup_source ?? null,
            signup_code_label: nextUser?.signup_code_label ?? user?.signup_code_label ?? null,
            product_scope: nextUser?.product_scope ?? user?.product_scope ?? null,
            onboarding_completed: true,
          };
          mergedUser.is_admin = hasAdminAccess(mergedUser);
          mergedUser.admin = mergedUser.is_admin === true;
          setUser(mergedUser);
          try {
            setSession({
              token: refreshedToken,
              user: mergedUser,
              tenant: mergedUser?.org_slug || tenant,
            });
            setToken(refreshedToken);
          } catch {}
          setOnboardingOpen(false);
          setOnboardingStatus("");
          setUploadStatus("✅ Onboarding concluído.");
          setTimeout(() => setUploadStatus(""), 1800);
        }}
      />
    )}
    <div style={styles.layout}>
      {isMobile && mobileSidebarOpen ? (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 39,
            background: "rgba(2,6,14,0.62)",
            backdropFilter: "blur(4px)",
          }}
        />
      ) : null}
      {/* Sidebar */}
      <div style={{ ...styles.sidebar, display: (!isMobile || mobileSidebarOpen) ? "flex" : "none", position: isMobile ? "fixed" : styles.sidebar.position, inset: isMobile ? "0 auto 0 0" : "auto", width: isMobile ? "min(88vw, 360px)" : styles.sidebar.width, zIndex: isMobile ? 40 : styles.sidebar.zIndex, boxShadow: isMobile ? "0 24px 80px rgba(0,0,0,0.45)" : styles.sidebar.boxShadow, borderRight: isMobile ? "1px solid rgba(255,255,255,0.08)" : styles.sidebar.borderRight }}>
        <div style={styles.topRow}>
          <div>
            <div style={styles.brand}>Patroai Console</div>
            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={styles.badge}>org: {appConsoleOrgLabel}</span>
              <span style={styles.badge}>{health === "ok" ? "ready" : health}</span>
            </div>
          </div>

          <button style={styles.newThreadBtn} onClick={() => { createThread(); if (isMobile) setMobileSidebarOpen(false); }} title="Nova conversa">
            <IconPlus /> Novo
          </button>
        </div>

        <div style={styles.threads}>
          {threads.length === 0 ? (
            <div style={styles.emptyThreads}>
              {sidebarEmptyText}
              {threadsLoadState === "load_failed" ? (
                <button
                  type="button"
                  onClick={() => loadThreads({ manualRetry: true, preserveThreadId: readStoredThreadId() })}
                  style={{ ...styles.btn, marginTop: 12, width: "100%" }}
                >
                  Tentar novamente
                </button>
              ) : null}
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  const nextId = String(t?.id || "");
                  if (nextId && nextId !== String(activeThreadIdRef.current || threadId || "")) {
                    activateThread(nextId, { clearMessages: true, persist: true, lockMs: 15000 });
                    if (isMobile) setMobileSidebarOpen(false);
                  }
                }}
                style={{
                  ...styles.threadItem,
                  ...(t.id === threadId ? styles.threadItemActive : {}),
                }}
              >
                <IconMessage />
                <span style={styles.threadTitle}>{t.title}</span>
                <button
                  style={styles.threadEditBtn}
                  onClick={(e) => { e.stopPropagation(); renameThread(t.id); }}
                  title="Renomear conversa"
                >
                  <IconEdit />
                </button>
                <button
                  style={styles.threadEditBtn}
                  onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                  title="Deletar conversa"
                >
                  <IconTrash />
                </button>
              </button>
            ))
          )}
        </div>

        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>{meName.charAt(0).toUpperCase()}</div>
            <div style={styles.userDetails}>
              <div style={styles.userName}>{user?.name || "Usuário"}</div>
              <div style={styles.userEmail}>{user?.email || ""}</div>
            </div>
          </div>

          <div style={styles.userActions}>
            {WALLET_UI_ENABLED ? (
              <button style={styles.iconBtn} onClick={() => nav("/wallet")} title={walletLowBalance ? "Recarregar wallet" : "Wallet & usage"}>
                💳
              </button>
            ) : null}
            {canAccessAdmin && (
              <button style={styles.iconBtn} onClick={() => nav("/admin")} title="Admin Console">
                <IconSettings />
              </button>
            )}
            {!user?.onboarding_completed ? (
              <button
                style={styles.iconBtn}
                onClick={() => setOnboardingOpen(true)}
                title="Completar cadastro"
              >
                ✨
              </button>
            ) : null}
            <button style={styles.iconBtn} onClick={doLogout} title="Sair">
              <IconLogout />
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>
        <div style={{ ...styles.topbar, padding: isMobile ? "12px 14px" : styles.topbar.padding }}>
          <div>
            <div style={{ ...styles.title, display: isMobile ? "none" : undefined }}>{threads.find((t) => t.id === threadId)?.title || "Conversa"}</div>
            <div style={{ ...styles.health, display: isMobile ? "none" : undefined }}>
              {publicBetaOrkioOnly
                ? "Destino: Orkio • beta público"
                : `Destino manual fixo: ${manualStickyLabelForUi || (destMode === "team" ? "Team" : destMode === "single" ? "Agente" : "Multi")} • botões: Team / Orkio / Chris${canAccessAdmin ? " / Orion / Laura" : ""}`}
            </div>
            {isMobile ? (
              <div
                style={{
                  marginTop: isMobile ? 0 : 12,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    try { void loadThreads({ preserveThreadId: String(activeThreadIdRef.current || threadId || "") }); } catch {}
                    setMobileSidebarOpen(true);
                  }}
                  style={{
                    minHeight: 42,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    fontWeight: 900,
                    letterSpacing: "-0.01em",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "0 14px",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
                    backdropFilter: "blur(12px)",
                  }}
                  aria-label="Abrir conversas"
                  title="Abrir conversas"
                >
                  <IconMessage />
                  Conversas
                </button>

                <button
                  type="button"
                  onClick={() => { void createThread(); }}
                  style={{
                    minHeight: 42,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "linear-gradient(135deg, rgba(139,92,246,0.78), rgba(245,158,11,0.54))",
                    color: "#fff",
                    fontWeight: 950,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "0 14px",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.24)",
                  }}
                  aria-label="Criar nova conversa"
                  title="Nova conversa"
                >
                  <IconPlus />
                  Nova
                </button>
              </div>
            ) : null}
          </div>

          <div style={styles.agentSelectorDock}>
            {isMobile ? (
              <>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen((v) => !v)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    minHeight: 40,
                    padding: "8px 12px",
                    borderRadius: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                  title="Abrir conversas"
                >
                  ☰ Chats
                </button>
                <button
                  type="button"
                  onClick={createThread}
                  style={{
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "linear-gradient(90deg, rgba(124,92,255,0.32), rgba(255,211,110,0.18))",
                    color: "#fff",
                    minHeight: 40,
                    padding: "8px 12px",
                    borderRadius: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                  title="Nova conversa"
                >
                  ＋ Novo
                </button>
              </>
            ) : null}
            {isMobile ? (
              <button
                type="button"
                onClick={doLogout}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  minHeight: 40,
                  padding: "8px 12px",
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title="Sair"
              >
                Sair
              </button>
            ) : null}
            {!publicBetaOrkioOnly ? (
              <>
                <select
                  style={styles.select}
                  value={destMode}
                  onChange={(e) => {
                    const nextMode = String(e.target.value || "team").trim().toLowerCase();
                    const safeMode = ["team", "single", "multi"].includes(nextMode) ? nextMode : "team";
                    if (safeMode === "team") setManualAuthoritySlug("team", "manual_button");
                    setDestMode(safeMode);
                    if (safeMode === "single" && !destSingle) {
                      const defaultAgent = visibleAgents.find((a) => canonicalAgentSlug(a?.name || a?.slug || a?.id) === "orkio") || visibleAgents[0] || null;
                      if (defaultAgent?.id) {
                        setDestSingle(defaultAgent.id);
                        setManualAuthoritySlug(canonicalAgentSlug(defaultAgent?.name || defaultAgent?.slug || defaultAgent?.id || "orkio") || "orkio", "manual_button");
                      }
                    }
                    persistDestinationState({ mode: safeMode });
                  }}
                >
                  <option value="team">Team</option>
                  <option value="single">1 agente</option>
                  <option value="multi">Multi Agentes</option>
                </select>

                {effectiveDestMode === "single" ? (
                  <select
                    style={styles.select}
                    value={destSingle}
                    onChange={(e) => {
                      const nextAgentId = String(e.target.value || "").trim();
                      const nextAgent = findAgentByRuntimeIdentity(nextAgentId) || findAgentByCanonicalSlug(nextAgentId) || null;
                      setManualAuthoritySlug(nextAgent?.slug || nextAgent?.key || nextAgent?.name || nextAgentId || "orkio", "manual_button");
                      setDestSingle(nextAgentId);
                      setDestMode("single");
                      persistDestinationState({ mode: "single", single: nextAgentId });
                    }}
                  >
                    {visibleAgents.map(a => <option key={a.id} value={a.id}>{formatAgentOptionLabel(a)}</option>)}
                  </select>
                ) : null}

                {effectiveDestMode === "multi" && !isMobile ? (
                  <select style={styles.select} value={String(destMulti.length || 0)} onChange={() => {}}>
                    <option value={String(destMulti.length || 0)}>
                      {destMulti.length ? `${destMulti.length} agentes selecionados` : "Selecionar no envio..."}
                    </option>
                  </select>
                ) : null}

                {canAccessAdmin ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {["Team", "Orkio", "Chris", "Orion", "Laura"].map((agentLabel) => {
                      const agentSlug = canonicalAgentSlug(agentLabel);
                      const activeSlug = normalizeManualAuthoritySlug(selectedManualAgentSlug || selectedManualAgentSlugRef.current || "", "team");
                      const isActive = activeSlug === agentSlug;
                      return (
                        <button
                          key={agentLabel}
                          type="button"
                          onClick={() => {
                            // PATCH_33_REV_C_LIVE_AGENT_SWITCH_RUNTIME_FIX:
                            // Capture Team state before any manual slug mutation. Previously
                            // setManualAuthoritySlug(agentSlug) ran first and deactivated the
                            // Team room, so Orion/Chris/Laura clicks collapsed to single mode.
                            const wasTeamConversationActive = isManualTeamConversationActive();
                            if (agentSlug === "team") {
                              setManualAuthoritySlug("team", "manual_button");
                              setDestMode("team");
                              setDestSingle("");
                              setDestMulti([]);
                              setActiveRuntimeAgent("Team");
                              persistDestinationState({ mode: "team", single: "", multi: [], manual_target_slug: "team", manual_slug: "team" });
                              applyManualTeamSelectionToRealtime("quick_team_button");
                              try {
                                setRuntimeHandoffLabel("Controle manual: Team.");
                                setUploadStatus("🤝 Team selecionado. Todos respondem por texto em fila; no áudio, Orkio modera por enquanto.");
                                setTimeout(() => setUploadStatus(""), 2600);
                              } catch {}
                              return;
                            }
                            if (realtimeModeRef.current && wasTeamConversationActive) {
                              const okTeam = promoteManualTeamParticipantToRealtime(agentSlug, "quick_team_participant_button");
                              if (okTeam) {
                                try {
                                  setRuntimeHandoffLabel(`Team: ${agentLabel} incluído no próximo turno.`);
                                  setUploadStatus(`🤝 ${agentLabel} incluído na sala Team sem reiniciar o Realtime.`);
                                  setTimeout(() => setUploadStatus(""), 2200);
                                } catch {}
                                return;
                              }
                            }
                            const ok = selectSingleAgentForRuntime(agentSlug, "quick_agent_button");
                            if (ok) {
                              applyManualAgentSelectionToRealtime(agentSlug, "quick_agent_button");
                              try {
                                setRuntimeHandoffLabel(`Controle manual: ${agentLabel}.`);
                                setUploadStatus(`🎯 ${agentLabel} selecionado como agente ativo.`);
                                setTimeout(() => setUploadStatus(""), 1800);
                              } catch {}
                            }
                            if (!ok) {
                              setUploadStatus(`Agente ${agentLabel} ainda não apareceu no roster.`);
                              setTimeout(() => setUploadStatus(""), 1800);
                            }
                          }}
                          style={{
                            ...styles.quickAgentBtn,
                            ...(isActive ? styles.quickAgentBtnActive : {}),
                          }}
                          title={`Selecionar ${agentLabel}`}
                        >
                          {agentLabel}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : (
              <div
                style={{
                  ...styles.select,
                  minHeight: 34,
                  display: "inline-flex",
                  alignItems: "center",
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.88)",
                }}
                title="Beta público: Orkio-only"
              >
                Orkio
              </div>
            )}
          </div>
        </div>

        {(!publicBetaOrkioOnly && (activeRuntimeAgent || runtimeHandoffLabel || meetingState || agentCapabilities)) ? (
          <div
            style={{
              margin: isMobile ? "10px 12px 0" : "12px 16px 0",
              padding: "10px 12px",
              borderRadius: 14,
              border: meetingState ? "1px solid rgba(103,232,249,0.18)" : "1px solid rgba(255,255,255,0.08)",
              background: meetingState ? "linear-gradient(135deg, rgba(8,47,73,0.34), rgba(30,41,59,0.56))" : "rgba(255,255,255,0.035)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              color: "rgba(255,255,255,0.82)",
              fontSize: 12,
            }}
          >
            {meetingState ? (
              <>
                <span style={{ fontWeight: 950, color: "rgba(103,232,249,0.94)", letterSpacing: "0.02em" }}>
                  Sala Team
                </span>
                {meetingRoomActiveSpeaker ? (
                  <span style={{ color: "rgba(255,255,255,0.78)" }}>
                    Speaker ativo: <strong style={{ color: "#fff" }}>{meetingRoomActiveSpeaker}</strong>
                  </span>
                ) : null}
                {isPatch32ManualLockStagingProofEnabled() && manualStickySlugForUi ? (
                  <span
                    title={`${PATCH_32_REV_H_MANUAL_LOCK_STAGING_PROOF_VERSION} | ${PATCH_32_REV_I_MANUAL_LOCK_STAGING_PROOF_SILENCE_VERSION} | ${PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD_VERSION}`}
                    style={{
                      color: "rgba(187,247,208,0.92)",
                      border: "1px solid rgba(34,197,94,0.26)",
                      borderRadius: 999,
                      padding: "3px 8px",
                      fontWeight: 900,
                    }}
                  >
                    Prova staging: botão {manualStickyLabelForUi || manualStickySlugForUi} fixo
                  </span>
                ) : null}
                {meetingRoomLastSpeaker && meetingRoomLastSpeaker !== meetingRoomActiveSpeaker ? (
                  <span style={{ color: "rgba(255,255,255,0.62)" }}>
                    Último speaker: {meetingRoomLastSpeaker}
                  </span>
                ) : null}
                {meetingRoomTurnIndex !== null ? (
                  <span style={{ color: "rgba(255,255,255,0.62)" }}>
                    Turno: {meetingRoomTurnIndex}
                  </span>
                ) : null}
                {meetingRoomParticipants.length ? (
                  <span
                    style={{
                      color: "rgba(255,255,255,0.62)",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: isMobile ? "normal" : "nowrap",
                    }}
                    title={meetingRoomParticipants.join(", ")}
                  >
                    Participantes: {meetingRoomParticipants.join(", ")}
                  </span>
                ) : null}
              </>
            ) : activeRuntimeAgent ? (
              <span style={{ fontWeight: 800 }}>
                {formatActiveAgentRuntime(activeRuntimeAgent)}
              </span>
            ) : null}
            {runtimeHandoffLabel ? (
              <span style={{ color: "rgba(255,255,255,0.68)" }}>{runtimeHandoffLabel}</span>
            ) : null}
            {agentCapabilities ? (
              <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.68)" }}>
                GitHub: {formatGithubRuntimeStatus(agentCapabilities)}
              </span>
            ) : null}
          </div>
        ) : null}

        {WALLET_UI_ENABLED ? (

        <div
          style={{
            margin: isMobile ? "10px 12px 0" : "12px 16px 0",
            borderRadius: 18,
            border: walletLowBalance ? "1px solid rgba(251,191,36,0.28)" : "1px solid rgba(255,255,255,0.08)",
            background: walletLowBalance ? "linear-gradient(135deg, rgba(120,53,15,0.28), rgba(30,41,59,0.72))" : "rgba(255,255,255,0.04)",
            padding: isMobile ? "12px" : "14px 16px",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: walletLowBalance ? "#fbbf24" : "rgba(103,232,249,0.88)" }}>
                Wallet
              </span>
              {walletActivePlanName ? (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
                  Plano ativo: {walletActivePlanName}
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.58)" }}>
                  Acesso orientado por wallet
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "baseline" }}>
              <div style={{ fontSize: isMobile ? 22 : 24, fontWeight: 900 }}>{fmtUsd(walletBalanceUsd)}</div>
              <div style={{ fontSize: 13, color: walletLowBalance ? "#fde68a" : "rgba(255,255,255,0.64)" }}>
                {walletLowBalance
                  ? `Saldo baixo. Recomendado manter acima de ${fmtUsd(walletLowBalanceThresholdUsd)}.`
                  : walletAutoRechargeEnabled
                  ? "Auto-recharge ativo."
                  : "Saldo pronto para uso."}
              </div>
            </div>
            {walletSummaryError ? (
              <div style={{ fontSize: 12, color: "#fda4af" }}>{walletSummaryError}</div>
            ) : walletSummaryUpdatedAt ? (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.44)" }}>
                Atualizado em {formatDateTime(walletSummaryUpdatedAt)}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => { void refreshWalletSummary({ silent: false }); }}
              disabled={walletSummaryLoading}
              style={{
                borderRadius: 12,
                padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                fontWeight: 700,
                cursor: walletSummaryLoading ? "default" : "pointer",
                opacity: walletSummaryLoading ? 0.7 : 1,
              }}
            >
              {walletSummaryLoading ? "Atualizando..." : "Atualizar"}
            </button>
            <button
              type="button"
              onClick={() => nav("/wallet")}
              style={{
                borderRadius: 12,
                padding: "10px 12px",
                border: walletLowBalance ? 0 : "1px solid rgba(255,255,255,0.12)",
                background: walletLowBalance ? "linear-gradient(135deg, #f59e0b, #fb7185)" : "rgba(255,255,255,0.08)",
                color: walletLowBalance ? "#111827" : "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {walletLowBalance ? "Recarregar wallet" : "Abrir wallet"}
            </button>
          </div>
        </div>

        ) : null}

        {/* Messages */}
        <div style={{ ...styles.chatArea, padding: isMobile ? "12px 12px 18px" : styles.chatArea.padding }}>
          {shouldShowRestorePanel ? (
            <div style={styles.restoreStatePanel}>
              <div style={styles.restoreStateTitle}>{restorePanelTitle}</div>
              <div style={styles.restoreStateText}>{restorePanelMessage}</div>
              <div style={styles.restoreStateActions}>
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  onClick={retryConversationRestore}
                  disabled={threadsLoadState === "loading" || messagesLoadState === "loading"}
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div style={styles.premiumEmptyShell}>
              <EmptyStatePremium
                user={user}
                onPrimaryAction={handlePremiumPrimaryAction}
                onSecondaryAction={handlePremiumSecondaryAction}
                onTertiaryAction={handlePremiumTertiaryAction}
                onFillPrompt={fillPremiumPrompt}
              />

              <div style={styles.premiumAside}>
                <div style={styles.premiumAsideCard}>
                  <div style={styles.premiumAsideEyebrow}>Continuity preserved</div>
                  <div style={styles.premiumAsideTitle}>A mudança agora precisa ser impossível de ignorar</div>
                  <div style={styles.premiumAsideText}>
                    O shell principal continua preservado, mas o centro do console passa a comunicar
                    direção, valor e próxima ação com mais intensidade. A ideia não é trocar a rota:
                    é transformar a primeira percepção do produto.
                  </div>

                  <div style={styles.premiumStatusRow}>
                    <div style={styles.premiumStatusCard}>
                      <div style={{ ...styles.premiumStatusLabel, display: isMobile ? "none" : undefined }}>Nova conversa</div>
                      <div style={styles.premiumStatusValue}>Preservada</div>
                    </div>
                    <div style={styles.premiumStatusCard}>
                      <div style={styles.premiumStatusLabel}>Acessos</div>
                      <div style={styles.premiumStatusValue}>{canAccessAdmin ? "Admin + usuário" : "Usuário ativo"}</div>
                    </div>
                    <div style={styles.premiumStatusCard}>
                      <div style={styles.premiumStatusLabel}>Jornada</div>
                      <div style={styles.premiumStatusValue}>Premium in-shell</div>
                    </div>
                  </div>
                </div>

                <div style={styles.premiumAsideCard}>
                  <div style={styles.premiumAsideEyebrow}>Execution preview</div>
                  <ExecutionTimeline steps={EMPTY_STATE_PREVIEW_STEPS} />
                </div>

                <div style={styles.premiumAsideCard}>
                  <div style={styles.premiumAsideEyebrow}>Telemetria executiva</div>
                  <div style={styles.premiumAsideText}>
                    Antes mesmo da primeira mensagem, o usuário já vê sinais concretos de prontidão,
                    continuidade funcional e leitura executiva mais madura.
                  </div>
                  <div style={styles.premiumLogList}>
                    {EMPTY_STATE_PREVIEW_LOGS.map((entry) => (
                      <div key={entry} style={styles.premiumLogItem}>
                        <span style={styles.premiumLogDot} />
                        <span>{entry}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            orderedChatMessages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                styles={styles}
                meName={meName}
                lastAgentInfo={lastAgentInfo}
                tryParseEvent={tryParseEvent}
                stripEventMarker={stripEventMarker}
                normalizeMessageSpeaker={normalizeMessageSpeaker}
                resolveAssistantDisplayName={resolveAssistantDisplayName}
                formatDateTime={formatDateTime}
                formatTs={formatTs}
                humanizeConsoleStatusMessage={humanizeConsoleStatusMessage}
                normalizeUserFacingRuntimeMessage={normalizeUserFacingRuntimeMessage}
                renderMessageContentPremium={renderMessageContentPremium}
                playTts={playTts}
                stopTts={stopTts}
                ttsPlaying={ttsPlaying}
                ttsPlayingMessageId={ttsPlayingMessageId}
                extractPatchGovernanceMeta={extractPatchGovernanceMeta}
                openPatchApprovalModal={openPatchApprovalModal}
                extractPatchApprovalMeta={extractPatchApprovalMeta}
                executeApprovedPatchFromMessage={executeApprovedPatchFromMessage}
                onSmartNextAction={handleSmartNextAction}
                smartNextActionsActive={
                  Boolean(latestSmartActionMessageId) &&
                  String(m.id || m.message_id || "") === latestSmartActionMessageId
                }
                smartNextActionsDisabled={
                  sending ||
                  smartActionInteraction.phase === "sending"
                }
                smartNextActionState={smartActionInteraction}
                canAccessAdmin={canAccessAdmin}
              />
            ))          )}
          <div ref={messagesEndRef} />
        </div>

        {/* V2V-PATCH: status panel por fase */}
        {v2vPhase && (
          <div style={{
            padding: "6px 14px", margin: "4px 0",
            borderRadius: "6px", fontSize: "12px", fontWeight: 500,
            background: v2vPhase === 'error' ? "rgba(192,57,43,0.15)" : "rgba(10,126,140,0.12)",
            color: v2vPhase === 'error' ? "#e74c3c" : "#0A7E8C",
            border: `1px solid ${v2vPhase === 'error' ? "rgba(192,57,43,0.3)" : "rgba(10,126,140,0.25)"}`,
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span>{
              v2vPhase === 'recording' ? "🔴 Gravando..." :
              v2vPhase === 'stt'       ? "⚙️ Transcrevendo fala..." :
              v2vPhase === 'chat'      ? "🤖 Gerando resposta..." :
              v2vPhase === 'tts'       ? "🔊 Sintetizando voz..." :
              v2vPhase === 'playing'   ? "🔈 Reproduzindo..." :
              v2vPhase === 'connecting'? "🎙️ Conectando..." :
              v2vPhase === 'listening' ? "🎙️ Ouvindo... 📝 Transcrição ativa" :
              v2vPhase === 'responding'? "🔊 Orkio respondendo..." :
              v2vPhase === 'cooldown'  ? `🕒 ${v2vError || "Voz em cooldown. O chat por texto continua disponível."}` :
              v2vPhase === 'error'     ? `❌ ${v2vError || "Erro no V2V"}` :
              "⏳ Aguardando..."
            }</span>
            {v2vPhase === 'error' && walletBlockedDetail?.code === "WALLET_INSUFFICIENT_BALANCE" && (
              <button
                type="button"
                onClick={() => nav("/wallet")}
                style={{
                  marginLeft: "auto",
                  border: 0,
                  borderRadius: "999px",
                  padding: "7px 12px",
                  cursor: "pointer",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #f59e0b, #fb7185)",
                  color: "#111827",
                }}
              >
                Recarregar wallet
              </button>
            )}
            {v2vPhase === 'error' && (
              <button type="button" onClick={() => { setV2vPhase(null); setV2vError(null); setWalletBlockedDetail(null); }}
                style={{ marginLeft: walletBlockedDetail?.code === "WALLET_INSUFFICIENT_BALANCE" ? 0 : "auto", background: "none", border: "none", cursor: "pointer", color: "#e74c3c", fontSize: "14px" }}>
                ✕
              </button>
            )}
          </div>
        )}
        {shouldShowRealtimeCounter() ? (
          <div
            style={{
              margin: "4px 0",
              padding: "8px 12px",
              borderRadius: "12px",
              border: "1px solid rgba(96,165,250,0.24)",
              background: "rgba(15,23,42,0.62)",
              color: "#dbeafe",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <span>{getRealtimePremiumStatusLabel()}</span>
            {rtcPremiumStatusDetail ? <span style={{ opacity: 0.82 }}>{rtcPremiumStatusDetail}</span> : null}
            {getRealtimeCounterLabel() ? (
              <span style={{ marginLeft: "auto", opacity: 0.95 }}>{getRealtimeCounterLabel()}</span>
            ) : null}
            {realtimeMode ? <span style={{ opacity: 0.8 }}>🔆 Tela ativa</span> : null}
          </div>
        ) : null}
        {uploadStatus ? <div style={styles.uploadStatus}>{uploadStatus}</div> : null}

        {shouldShowRealtimeCounter() ? (
          <div
            data-orkio-realtime-counter="ao61a-hf4"
            style={{
              position: "fixed",
              top: "calc(env(safe-area-inset-top, 0px) + 12px)",
              right: 12,
              zIndex: 2147483000,
              minWidth: 148,
              maxWidth: "min(320px, calc(100vw - 24px))",
              borderRadius: 16,
              border: "1px solid rgba(147,197,253,0.45)",
              background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.94))",
              color: "#eff6ff",
              boxShadow: "0 18px 50px rgba(2,6,23,0.35)",
              padding: "10px 12px",
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 12,
              lineHeight: 1.2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <strong style={{ fontSize: 12 }}>{getRealtimeFixedCounterTitle()}</strong>
              <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.02em" }}>{getRealtimeCounterLabel() || "⏳ --:--"}</span>
            </div>
            <div style={{ opacity: 0.84, fontSize: 11 }}>
              {getRealtimeFixedCounterSubtitle() || "O chat por texto continua disponível."}
            </div>
            {realtimeMode ? <div style={{ opacity: 0.82, fontSize: 11 }}>🔆 Tela ativa</div> : null}
          </div>
        ) : null}

        {patchApprovalModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => !patchApprovalBusy && setPatchApprovalModal(null)}
          >
            <div
              style={{
                width: "min(480px, 100%)",
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
                color: "#e5e7eb",
                boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
                padding: 18,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>Aprovar patch governado</div>
              <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.5, marginBottom: 12 }}>
                Esta aprovação não passa pelo chat. Sua senha confirma a autorização humana para o pending proposal desta thread.
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
                audit_receipt_id: {patchApprovalModal.audit_receipt_id || "n/d"}
              </div>
              <input
                type="password"
                autoFocus
                value={patchApprovalPassword}
                onChange={(e) => setPatchApprovalPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !patchApprovalBusy) submitPatchApproval(); }}
                placeholder="Digite sua senha"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  padding: "12px 14px",
                  outline: "none",
                  marginBottom: 10,
                }}
              />
              {patchApprovalError && (
                <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 10 }}>{patchApprovalError}</div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  disabled={patchApprovalBusy}
                  onClick={() => setPatchApprovalModal(null)}
                  style={{ border: 0, borderRadius: 999, padding: "9px 13px", cursor: "pointer", background: "rgba(255,255,255,0.08)", color: "#e5e7eb" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={patchApprovalBusy}
                  onClick={submitPatchApproval}
                  style={{ border: 0, borderRadius: 999, padding: "9px 14px", cursor: "pointer", background: "linear-gradient(135deg, #10b981, #22c55e)", color: "#052e16", fontWeight: 900 }}
                >
                  {patchApprovalBusy ? "Validando..." : "Confirmar aprovação"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Composer */}
        <div style={{ ...styles.composerContainer, padding: isMobile ? "10px 12px calc(10px + env(safe-area-inset-bottom, 0px))" : styles.composerContainer.padding }}>
          {canAccessAdmin && showOrionSquad && (orionSquadHealth || orionSquadPreview) ? (
            <div
              style={{
                marginBottom: "8px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid rgba(89,165,255,0.25)",
                background: "rgba(89,165,255,0.08)",
                fontSize: "12px",
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.86)",
              }}
            >
              <div><strong>Orion Squad:</strong> {orionSquadHealth?.ok === false ? "offline" : "online"}</div>
              {orionSquadHealth?.agents_loaded ? <div><strong>Agents loaded:</strong> {orionSquadHealth.agents_loaded}</div> : null}
              {orionSquadPreview?.primary_specialist ? <div><strong>Primary specialist:</strong> {orionSquadPreview.primary_specialist}</div> : null}
              {orionSquadPreview?.secondary_specialist ? <div><strong>Secondary specialist:</strong> {orionSquadPreview.secondary_specialist}</div> : null}
            </div>
          ) : null}


{executionTrace.length ? (
  <div
    style={{
      marginBottom: "8px",
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.035)",
      overflow: "hidden",
    }}
  >
    <button
      type="button"
      onClick={() => setExecutionTraceExpanded((prev) => {
        const next = !prev;
        try { window.localStorage?.setItem("orkio_execution_trace_open", next ? "1" : "0"); } catch {}
        return next;
      })}
      style={{
        width: "100%",
        border: 0,
        background: "transparent",
        color: "#fff",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.01em" }}>
          {executionTraceExpanded ? "Execution trace" : "Ver execução"}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", marginTop: 2 }}>
          {sending
            ? "Orkio está executando etapas desta solicitação."
            : executionTraceExpanded
            ? "Última execução registrada no console."
            : "Execução recolhida automaticamente. Abra apenas se quiser revisar."}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {lastTraceId ? (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.44)", fontFamily: "monospace" }}>
            {lastTraceId}
          </span>
        ) : null}
        <span style={{ fontSize: 16, opacity: 0.8 }}>{executionTraceExpanded ? "▾" : "▸"}</span>
      </div>
    </button>

    {!executionTraceExpanded ? (
      <div style={{ padding: "0 14px 14px", display: "grid", gap: 8 }}>
        <div style={{ color: "rgba(255,255,255,0.66)", fontSize: 12, lineHeight: 1.45 }}>
          {(() => {
            // AO45_TRACE_LITE_HONESTY
            const last = executionTrace[executionTrace.length - 1] || {};
            const isLite =
              last?.execution_depth === "lite" ||
              last?.trace_lite === true ||
              last?.dispatch_runtime_executed === false ||
              last?.badges?.includes?.("readonly specialist audit");

            const countLabel = isLite
              ? `${Math.min(executionTrace.length, 3)} sinal(is) registrados`
              : `${executionTrace.length} etapa(s) registradas`;

            return `${isLite ? "Trace Lite. " : ""}${countLabel}. ${
              executionTrace.some((step) => step.kind === "done")
                ? "Fluxo encerrado com segurança."
                : "Execução em andamento."
            }`;
          })()}
        </div>
        {executionTrace[executionTrace.length - 1]?.badges?.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {executionTrace[executionTrace.length - 1].badges.map((badge) => (
              <span
                key={badge}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.22)",
                  color: "rgba(187,247,208,0.92)",
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    ) : null}

    {executionTraceExpanded ? (
      <div style={{ padding: "0 14px 14px", display: "grid", gap: 8 }}>
        {executionTrace.map((step) => {
          const tone = traceStepTone(step.kind);
          return (
            <div
              key={step.id}
              style={{
                borderRadius: 12,
                border: `1px solid ${tone.border}`,
                background: tone.background,
                padding: "10px 12px",
                display: "grid",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 14 }}>{tone.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: tone.color, minWidth: 0 }}>
                  {step.label}
                </span>
                {step.agentName ? (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.7)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {step.agentName}
                  </span>
                ) : null}
              </div>
              {step.badges?.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {step.badges.map((badge) => (
                    <span
                      key={`${step.id}-${badge}`}
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: "rgba(34,197,94,0.10)",
                        border: "1px solid rgba(34,197,94,0.20)",
                        color: "rgba(187,247,208,0.92)",
                      }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}
              {(step.detail || step.ts) ? (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", lineHeight: 1.4 }}>
                  {step.detail || ""}
                  {step.ts ? (
                    <span style={{ color: "rgba(255,255,255,0.38)", marginLeft: step.detail ? 8 : 0 }}>
                      {new Date(step.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    ) : null}
  </div>
) : null}
          {showRuntimeHints && runtimeHints ? (
            <div
              style={{
                marginBottom: "8px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                fontSize: "12px",
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.78)",
              }}
            >
              {runtimeHints?.planner?.primary_objective ? <div><strong>Focus:</strong> {runtimeHints.planner.primary_objective}</div> : null}
              {runtimeHints?.resume_hint ? <div><strong>Continuity:</strong> {runtimeHints.resume_hint}</div> : null}
              {runtimeHints?.trial?.recommended_action ? <div><strong>Next:</strong> {runtimeHints.trial.recommended_action}</div> : null}
              {runtimeHints?.routing?.mode ? <div><strong>Route:</strong> {runtimeHints.routing.mode}</div> : null}
              {runtimeHints?.trial?.stage ? <div><strong>Stage:</strong> {runtimeHints.trial.stage}</div> : null}
              {(runtimeHints?.planner?.confidence ?? null) !== null ? <div><strong>Confidence:</strong> {runtimeHints.planner.confidence}</div> : null}
              {(runtimeHints?.trial?.activation_probability ?? null) !== null ? <div><strong>Activation probability:</strong> {runtimeHints.trial.activation_probability}</div> : null}
              {(runtimeHints?.memory?.strong_resume_ready ?? null) !== null ? <div><strong>Resume readiness:</strong> {runtimeHints.memory.strong_resume_ready ? "ready" : "warming"}</div> : null}
              {runtimeHints?.routing?.execution_cursor?.current_node ? <div><strong>Current node:</strong> {runtimeHints.routing.execution_cursor.current_node}</div> : null}
              {(runtimeHints?.routing?.routing_confidence ?? null) !== null ? <div><strong>Routing confidence:</strong> {runtimeHints.routing.routing_confidence}</div> : null}
              {runtimeHints?.capabilities?.multiagent?.available_agents?.length ? <div><strong>Agents:</strong> {runtimeHints.capabilities.multiagent.available_agents.join(", ")}</div> : null}
              {runtimeHints?.capabilities?.github ? <div><strong>GitHub:</strong> {formatGithubRuntimeStatus(runtimeHints.capabilities)}</div> : null}
              {lastTraceId ? <div><strong>Trace:</strong> {lastTraceId}</div> : null}
            </div>
          ) : null}
          {pendingApprovedPatchExecution ? (
            <div style={{
              margin: "8px 14px",
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(59,130,246,0.45)",
              background: "rgba(59,130,246,0.12)",
              color: "#dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}>
              <div style={{ fontWeight: 800 }}>
                Execução governada aprovada pendente. O chat comum está bloqueado até executar ou cancelar.
              </div>
              <button
                type="button"
                data-patch-execute-button="true"
                onClick={() => executeApprovedPatchFromMessage(pendingApprovedPatchExecution.message)}
                style={{
                  border: "1px solid rgba(59,130,246,0.65)",
                  borderRadius: 999,
                  padding: "9px 13px",
                  background: "rgba(59,130,246,0.22)",
                  color: "#eff6ff",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Executar patch aprovado
              </button>
            </div>
          ) : null}
          <div style={{ ...styles.composer, gap: isMobile ? "8px" : styles.composer.gap }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onPickFile}
              accept=".pdf,.docx,.doc,.txt,.md"
              style={{ display: "none" }}
            />

            {!isMobile ? (
              <button
                type="button"
                style={styles.attachBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress || !!pendingApprovedPatchExecution}
                title="Anexar arquivo (PDF, DOCX, TXT)"
              >
                <IconPaperclip />
              </button>
            ) : null}

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pendingApprovedPatchExecution ? "Execução aprovada pendente — use o botão governado acima." : "Escreva sua mensagem..."}
              style={styles.textarea}
              rows={1}
              disabled={sending || !!pendingApprovedPatchExecution}
            />

            {SUMMIT_VOICE_MODE === "stt_tts" ? (
              <button
                type="button"
                style={{ ...styles.micBtn, opacity: speechSupported ? 1 : 0.6 }}
                onClick={toggleMic}
                title={micEnabled ? "Parar entrada por voz" : "Iniciar entrada por voz"}
              >
                🎙️
              </button>
            ) : (
              <>
                <button
                  type="button"
                  style={{
                    ...styles.micBtn,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    position: "relative",
                    opacity: 1,
                    cursor: "pointer",
                  }}
                  onClick={toggleRealtimeMode}
                  disabled={false}
                  title={realtimeMode ? "Encerrar voz em tempo real" : "Iniciar voz em tempo real"}
                >
                  <span style={{ fontSize: "16px" }}>⚡</span>
                  {false && realtimeMode && <span style={{ position: "absolute", top: "-2px", right: "-2px", width: "8px", height: "8px", borderRadius: "50%", background: "#50a0ff", animation: "pulse 1.5s infinite" }} />}
                </button>
                {REALTIME_ENTRYPOINT_ENABLED && SUMMIT_VOICE_MODE === "realtime" && (isRealtimeTimeboxLimitedUser() || rtcBackendTimeboxLimited || rtcCooldownRemaining > 0) && (realtimeMode || rtcCooldownRemaining > 0) ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      height: "32px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {realtimeMode ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          height: "32px",
                          padding: "0 8px",
                          borderRadius: "999px",
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.05)",
                          fontSize: "12px",
                          lineHeight: "1",
                          opacity: 0.95,
                        }}
                        title="Tentando manter a tela ligada durante a voz"
                      >
                        <span aria-hidden="true">🔆</span>
                        <span>Tela ativa</span>
                      </span>
                    ) : null}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        minWidth: "64px",
                        height: "32px",
                        padding: "0 8px",
                        borderRadius: "999px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                        fontSize: "12px",
                        lineHeight: "1",
                        whiteSpace: "nowrap",
                        opacity: 0.95,
                      }}
                      title={realtimeMode ? "Tempo restante da sessão de voz" : "Voz disponível novamente em breve"}
                    >
                      <span aria-hidden="true">{realtimeMode ? "⏳" : "🕒"}</span>
                      <span>{realtimeMode ? formatRealtimeCountdown(rtcTimeboxRemaining ?? REALTIME_PUBLIC_BETA_TIMEBOX_SECONDS) : formatRealtimeCountdown(rtcCooldownRemaining)}</span>
                    </span>
                  </span>
                ) : null}
              </>
            )}

            {REALTIME_ENTRYPOINT_ENABLED && !isMobile && realtimeMode && SUMMIT_VOICE_MODE === "realtime" ? (
              <button
                type="button"
                style={{
                  ...styles.sendBtn,
                  opacity: rtcReadyToRespond ? 1 : 0.5,
                  cursor: rtcReadyToRespond ? "pointer" : "not-allowed",
                }}
                onClick={() => rtcReadyToRespond && triggerRealtimeResponse("manual")}
                disabled={!rtcReadyToRespond}
                title={rtcReadyToRespond ? "Responder agora (tempo real)" : "Aguardando a fala terminar"}
              >
                ▶️
              </button>
            ) : null}

            <button
              type="button"
              style={{ ...styles.micBtn, opacity: 1, cursor: "pointer" }}
              onClick={handleFounderHandoff}
              disabled={false}
              title={DISABLED_FEATURE_NOTICE}
            >
              🤝
            </button>

            <button type="button" style={styles.sendBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => sendMessage()} disabled={sending || !!pendingApprovedPatchExecution} title="Enviar">
              <IconSend />
            </button>
          </div>
          {disabledFeatureNotice ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(125,211,252,0.26)",
                background: "rgba(14,165,233,0.10)",
                color: "rgba(240,249,255,0.94)",
                boxShadow: "0 14px 34px rgba(0,0,0,0.18)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: "0.02em", marginBottom: 3 }}>
                {disabledFeatureNotice.icon} {disabledFeatureNotice.title}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(226,232,240,0.88)" }}>
                {disabledFeatureNotice.message}
              </div>
            </div>
          ) : handoffNotice ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.78)" }}>{handoffNotice}</div>
          ) : null}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
              Respostas geradas por IA podem conter imprecisões. Sempre valide informações importantes antes de tomar decisões.
            </div>
            <div style={{ display: isMobile ? "none" : "flex", gap: 8 }}>
              <button
                onClick={downloadRealtimeAta}
                style={{ ...styles.btn, padding: "6px 10px", fontSize: "12px", opacity: rtcSessionIdRef.current ? 1 : 0.6 }}
                title="Baixar relatório executivo da sessão"
                disabled={!rtcSessionIdRef.current}
              >
                ⬇️ Relatório
              </button>
            </div>
          </div>

          {/* Voice Mode controls — PATCH0100_14 enhanced */}
          {voiceMode && SUMMIT_VOICE_MODE === "stt_tts" && !isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", fontSize: "12px", color: "rgba(255,255,255,0.7)", flexWrap: "wrap" }}>
              {lastAgentInfo?.avatar_url && (
                <img src={lastAgentInfo.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} onError={(e) => { e.target.style.display = 'none'; }} />
              )}
              {lastAgentInfo?.agent_name && <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{lastAgentInfo.agent_name}</span>}
              <span>🔊 Voz:</span>
              <select
                value={ttsVoice}
                onChange={(e) => changeTtsVoice(e.target.value)}
                style={{ ...styles.select, padding: "4px 8px", fontSize: "11px" }}
              >
                <option value="auto">Auto (voz do agente)</option>
                {ORKIO_VOICES.map(v => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
</select>
              {ttsPlaying && (
                <button
                  onClick={stopTts}
                  style={{ ...styles.btn, padding: "4px 8px", fontSize: "11px" }}
                >
                  ⏹ Parar
                </button>
              )}
              <span style={{ opacity: 0.6 }}>
                {micEnabled ? "🔴 Ouvindo..." : ttsPlaying ? "🔊 Falando..." : "⏸ Aguardando"}
              </span>
              {!!(rtcSessionIdRef.current || rtcAuditEvents?.length) && (
                <button
                  onClick={downloadRealtimeAta}
                  style={{ ...styles.btn, padding: "4px 8px", fontSize: "11px" }}
                  title="Baixar relatório executivo da sessão"
                >
                  ⬇️ Relatório
                </button>
              )}
            </div>
          )}

          {/* PATCH0100_27_2B: Realtime Audit (finals + punctuação assíncrona) */}
          {SHOW_REALTIME_AUDIT && !isMobile && (rtcAuditEvents?.length > 0 || rtcPunctStatus) && (
            <div style={styles.realtimeAudit}>
              <div style={styles.realtimeAuditHeader}>
                <div style={styles.realtimeAuditTitle}>🧾 Realtime (auditável)</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={styles.realtimeAuditPill}>
                    {rtcPunctStatus === 'pending' ? 'Pontuando…' : rtcPunctStatus === 'done' ? 'Pontuação OK' : rtcPunctStatus === 'timeout' ? 'Pontuação pendente' : 'Registro local'}
                  </div>
                  <button
                    onClick={downloadRealtimeAta}
                    style={{ ...styles.btn, padding: "4px 8px", fontSize: "11px" }}
                    title="Baixar ata da sessão"
                  >
                    ⬇️ Baixar ata
                  </button>
                </div>
              </div>
              {rtcAuditEvents.map((ev, idx) => {
                const who = ev?.role === 'user' ? 'Você' : (ev?.agent_name || 'Assistente');
                const when = ev?.created_at ? new Date(ev.created_at).toLocaleTimeString() : '';
                const text = (ev?.transcript_punct || ev?.content || '').toString();
                return (
                  <div key={(ev?.id || idx) + ''} style={styles.realtimeAuditItem}>
                    <div style={styles.realtimeAuditMeta}>
                      <div style={styles.realtimeAuditWho}>{who}</div>
                      <div style={{ opacity: 0.7 }}>{when}</div>
                    </div>
                    <div style={styles.realtimeAuditText}>{text}</div>
                  </div>
                );
              })}
              {summitSessionScore && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>🎯 Summit score</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, opacity: 0.9 }}>
                    <span>Naturalidade: {summitSessionScore?.naturalness_score ?? "-"}</span>
                    <span>Persona: {summitSessionScore?.persona_score ?? "-"}</span>
                    <span>Duplicação: {summitSessionScore?.duplicate_count ?? 0}</span>
                    <span>Truncamento: {summitSessionScore?.truncation_count ?? 0}</span>
                  </div>
                  {!summitSessionScore?.human_review && summitRuntimeModeRef.current === "summit" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <button disabled={summitReviewPending} onClick={() => submitStageReview(5, 5, 5)} style={{ ...styles.btn, padding: "4px 8px", fontSize: "11px" }}>✅ Forte</button>
                      <button disabled={summitReviewPending} onClick={() => submitStageReview(4, 4, 4)} style={{ ...styles.btn, padding: "4px 8px", fontSize: "11px" }}>🟨 Bom</button>
                      <button disabled={summitReviewPending} onClick={() => submitStageReview(2, 2, 2)} style={{ ...styles.btn, padding: "4px 8px", fontSize: "11px" }}>🛠 Ajustar</button>
                    </div>
                  )}
                </div>
              )}
              {rtcAuditEvents.length === 0 && <div style={{ opacity: 0.8 }}>Sem eventos finais ainda.</div>}
            </div>
          )}


          {destMode === "multi" ? (
            <div style={{...styles.hint, display: isMobile ? "none" : styles.hint.display}}>
              Multi: selecione os agentes abaixo (será usado no próximo envio).
              <div style={styles.checkGrid}>
                {agents.map(a => (
                  <label key={a.id} style={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={destMulti.includes(a.id)}
                      onChange={(e) => {
                        setDestMulti((prev) => {
                          const base = Array.isArray(prev) ? prev.map((x) => String(x || "")) : [];
                          if (e.target.checked) return Array.from(new Set([...base, String(a.id)]));
                          return base.filter((x) => String(x) !== String(a.id));
                        });
                      }}
                    />
                    <span>{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>


      {showHandoffModal ? (
        <div style={styles.modalBack} onClick={() => { if (!handoffBusy) setShowHandoffModal(false); }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Talk to founder</div>
            <div style={styles.hint}>
              You are about to share this conversation with the Orkio founder for follow-up.
            </div>
            <div style={{ ...styles.hint, marginTop: 8 }}>
              Orkio will share a concise summary of your context so the next step can be strategic, not repetitive.
            </div>
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", fontSize: 13, lineHeight: 1.45 }}>
              {handoffDraft || "Your latest strategic context will be shared with the founder."}
            </div>
            <div style={{ ...styles.hint, marginTop: 10 }}>
              By continuing, you explicitly authorize Orkio to share this conversation summary with the founder for direct follow-up.
            </div>
            <div style={styles.modalActions}>
              <button style={styles.btn} onClick={() => setShowHandoffModal(false)} disabled={handoffBusy}>Cancel</button>
              <button type="button" style={{ ...styles.btn, ...styles.btnPrimary, opacity: handoffBusy ? 0.7 : 1 }} onClick={confirmFounderHandoff} disabled={handoffBusy}>
                {handoffBusy ? "Sending..." : "Confirm and share"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Upload Modal */}
      {uploadOpen ? (
        <div style={styles.modalBack} onClick={() => { if (!uploadProgress) setUploadOpen(false); }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Upload: {uploadFileObj?.name || "arquivo"}</div>
            <div style={styles.hint}>Escolha como este documento será usado.</div>

            <div style={styles.radioRow}>
              <input type="radio" checked={uploadScope === "thread"} onChange={() => setUploadScope("thread")} />
              <span>Somente nesta conversa (contexto do thread)</span>
            </div>

            {!publicBetaOrkioOnly ? (
              <>
                <div style={styles.radioRow}>
                  <input type="radio" checked={uploadScope === "agents"} onChange={() => setUploadScope("agents")} />
                  <span>Vincular a agente(s) específico(s)</span>
                </div>

                {uploadScope === "agents" ? (
                  <div style={styles.checkGrid}>
                    {visibleAgents.map(a => (
                      <label key={a.id} style={styles.checkItem}>
                        <input
                          type="checkbox"
                          checked={uploadAgentIds.includes(a.id)}
                          onChange={(e) => {
                            setUploadAgentIds(prev => e.target.checked ? [...prev, a.id] : prev.filter(x => x !== a.id));
                          }}
                        />
                        <span>{a.name}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            <div style={styles.radioRow}>
              <input type="radio" checked={uploadScope === "institutional"} onChange={() => setUploadScope("institutional")} />
              <span>Institucional (global do tenant → todos os agentes)</span>
            </div>
            <div style={styles.hint}>
              {canAccessAdmin
                ? "Como admin, o documento vira institucional imediatamente."
                : "Como usuário, isso vira uma SOLICITAÇÃO para o admin aprovar/reprovar. Enquanto isso, ele fica disponível nesta conversa."}
            </div>

            <div style={styles.modalActions}>
              <button style={styles.btn} onClick={() => { if (!uploadProgress) setUploadOpen(false); }}>Cancelar</button>
              <button type="button" style={{ ...styles.btn, ...styles.btnPrimary, opacity: uploadProgress ? 0.7 : 1 }} onClick={confirmUpload} disabled={uploadProgress}>
                {uploadProgress ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    
{capacityOpen ? (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
  }}>
    <div style={{
      background: "#0f0f10", color: "#fff", padding: 24, borderRadius: 12,
      maxWidth: 520, width: "92%", boxShadow: "0 10px 40px rgba(0,0,0,0.6)"
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
        Estamos operando no limite seguro da plataforma
      </div>
      <div style={{ opacity: 0.9, lineHeight: 1.4, marginBottom: 14 }}>
        Muitas pessoas estão acessando ao mesmo tempo. Para manter a estabilidade durante o evento,
        alguns acessos estão temporariamente limitados.
      </div>
      <div style={{ opacity: 0.9, marginBottom: 16 }}>
        Você poderá tentar novamente em <b>{capacitySeconds}s</b>, ou manualmente quando desejar.
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={{ padding: "10px 14px", borderRadius: 10 }} onClick={() => {
          const pending = capacityPendingRef.current;
          closeCapacityModal();
          if (pending?.msg) sendMessage(pending.msg);
        }}>
          Tentar agora
        </button>
        <button style={{ padding: "10px 14px", borderRadius: 10, opacity: 0.9 }} onClick={closeCapacityModal}>
          Voltar
        </button>
      </div>
    </div>
  </div>
) : null}

</div>
    </>
  );
}
