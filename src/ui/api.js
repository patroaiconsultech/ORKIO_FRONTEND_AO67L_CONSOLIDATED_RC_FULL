/* PATCH_32_REV_D_TEAM_PANEL_PRESTAGING */
/* PATCH_32_REV_F_MANUAL_BUTTON_LOCK_PERSISTENCE */
/* PATCH_32_REV_G_MANUAL_LOCK_CONTRACT_PROPAGATION */
/* PATCH_32_REV_H_MANUAL_LOCK_STAGING_PROOF */
/* PATCH_32_REV_I_MANUAL_LOCK_STAGING_PROOF_SILENCE */
/* PATCH_32_REV_J_MANUAL_LOCK_STAGING_PROOF_PRODUCTION_GUARD */
// PATCH_32_REV_C_PROFILE_ADDRESS_MERGE
import {
  getTenant as readTenant,
  getToken as readToken,
} from "../lib/auth.js";

function normalizeBaseUrl(v) {
  let s = String(v || "").trim();

  // AO-01 hardening:
  // Some Railway/Vite deployments may inject the API host without protocol
  // or with a leading slash, causing the browser to call:
  // https://www.patroai.com/api-patchd-governance-ready-production.up.railway.app/...
  // instead of:
  // https://api-patchd-governance-ready-production.up.railway.app/...
  if (!s) return "/api";

  // Remove accidental wrapping quotes from runtime/build env values.
  s = s.replace(/^["']+|["']+$/g, "").trim();

  // Repair values like /api-patchd-governance-ready-production.up.railway.app
  // or api-patchd-governance-ready-production.up.railway.app
  const withoutLeadingSlash = s.replace(/^\/+/, "");
  if (
    !/^https?:\/\//i.test(s) &&
    /(^|\.)railway\.app(\/)?/i.test(withoutLeadingSlash)
  ) {
    s = `https://${withoutLeadingSlash}`;
  }

  // Repair values that accidentally lost only one slash: https:/host
  s = s.replace(/^https:\/([^/])/i, "https://$1");
  s = s.replace(/^http:\/([^/])/i, "http://$1");

  return s.replace(/\/+$/, "");
}

function readRuntimeEnvValue(key) {
  try {
    if (typeof window !== "undefined" && window.__ORKIO_ENV__) {
      return window.__ORKIO_ENV__[key];
    }
  } catch {}
  return undefined;
}

function normalizePath(path) {
  let p = String(path || "").trim();
  if (!p) return "/";
  if (!p.startsWith("/")) p = `/${p}`;

  if (p.startsWith("/api/")) return p;
  if (p === "/api") return p;
  return p;
}

const API_BASE = normalizeBaseUrl(
  readRuntimeEnvValue("VITE_API_BASE_URL") ||
  readRuntimeEnvValue("API_BASE_URL") ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.API_BASE_URL ||
  "/api"
);

export function joinApi(path = "") {
  const p = normalizePath(path);

  if (/^https?:\/\//i.test(p)) {
    return p;
  }

  if (API_BASE.endsWith("/api") && p.startsWith("/api/")) {
    return `${API_BASE}${p.slice(4)}`;
  }

  if (API_BASE === "/api" && p.startsWith("/api/")) {
    return p;
  }

  return `${API_BASE}${p}`;
}

export function headers({ token, org, json = true, extra = {}, allowPublicOrg = false } = {}) {
  const resolvedToken = token ?? readToken();
  const rawResolvedOrg = org ?? readTenant();
  const normalizedOrg = String(rawResolvedOrg || "").trim();
  const isPublicOrg = normalizedOrg.toLowerCase() === "public";

  const out = {
    ...extra,
  };

  if (json) out["Content-Type"] = "application/json";
  if (resolvedToken) out["Authorization"] = `Bearer ${resolvedToken}`;

  // EFATA777_V4:
  // A logged-in/admin AppConsole must not be forced into org=public by stale
  // localStorage/tenant state. Public routes may still explicitly allow it.
  if (normalizedOrg && (!isPublicOrg || allowPublicOrg || !resolvedToken)) {
    out["X-Org-Slug"] = normalizedOrg;
  }

  return out;
}

function enrichResult(data, response) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return { ...data, data, response };
  }
  return { data, response };
}

function sanitizeApiLogValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) return "[email-redacted]";
    if (/^(bearer\s+)?eyJ[A-Za-z0-9_-]+\./i.test(value)) return "[token-redacted]";
    if (/^sk-[A-Za-z0-9_-]{12,}/i.test(value)) return "[secret-redacted]";
    return value.length > 240 ? `${value.slice(0, 240)}...` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 8).map((item) => sanitizeApiLogValue(item));
  if (typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      const k = String(key || "");
      if (/password|senha|token|authorization|cookie|secret|access_token|refresh_token|jwt/i.test(k)) {
        out[k] = "[redacted]";
      } else if (/email/i.test(k)) {
        out[k] = item ? "[email-redacted]" : item;
      } else if (/content|message|document|payload|body/i.test(k) && typeof item === "string" && item.length > 180) {
        out[k] = `${item.slice(0, 180)}...`;
      } else {
        out[k] = sanitizeApiLogValue(item);
      }
    }
    return out;
  }
  return value;
}

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";
  if (response.status === 204) return null;

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

function cleanChatRequestPayload(payload = {}) {
  const out = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const clean = value.map((item) => String(item || "").trim()).filter(Boolean);
      if (clean.length) out[key] = clean;
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed && key !== "message") continue;
      out[key] = key === "message" ? trimmed : value;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export async function apiFetch(path, options = {}) {
  const normalizedRequestPath = normalizePath(path);
  const url = joinApi(normalizedRequestPath);
  const allowPublicOrg = Boolean(
    options.allowPublicOrg === true ||
    normalizedRequestPath.startsWith("/api/public/") ||
    normalizedRequestPath.startsWith("/api/billing/public/")
  );

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const config = {
    method: options.method || "GET",
    headers: headers({
      token: options.token,
      org: options.org,
      json: !isFormData,
      extra: options.headers || {},
      allowPublicOrg,
    }),
    credentials: options.credentials || "same-origin",
    signal: options.signal,
  };

  if (options.body !== undefined && options.body !== null) {
    if (isFormData) {
      config.body = options.body;
    } else if (typeof options.body === "string" || options.body instanceof Blob) {
      config.body = options.body;
    } else {
      config.body = JSON.stringify(options.body);
    }
  }

  console.log("API_FETCH_REQUEST", {
    url,
    method: config.method,
    hasBody: !!config.body,
    org: options.org ? "[org-present]" : "",
    credentials: config.credentials,
    requestId: config.headers?.["X-Request-Id"] || config.headers?.["x-request-id"] || null,
  });
  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    const wrapped = err instanceof Error ? err : new Error(String(err || "Network request failed"));
    wrapped.code = wrapped?.name === "AbortError" ? "FETCH_ABORTED" : "NETWORK_FETCH_FAILED";
    wrapped.url = url;
    wrapped.method = config.method;
    wrapped.wasAborted = !!options.signal?.aborted;
    // ORKIO_AO60C_PWA_REALTIME_DIAGNOSTIC_GUARD
    wrapped.userMessage = (
      wrapped.code === "FETCH_ABORTED"
        ? "A conexão foi interrompida antes de concluir."
        : "Não consegui conectar com a API agora. Verifique a conexão, aguarde alguns segundos e tente novamente."
    );
    wrapped.diagnostic = {
      code: wrapped.code,
      url,
      method: config.method,
      wasAborted: !!options.signal?.aborted,
      originalMessage: wrapped.message || null,
    };
    throw wrapped;
  }
  const payload = await parseResponseBody(response);
  console.log("API_FETCH_RESPONSE", {
    url,
    status: response.status,
    ok: response.ok,
    requestId: response.headers?.get?.("x-request-id") || config.headers?.["X-Request-Id"] || null,
    payload: sanitizeApiLogValue(payload),
  });

  if (response.status === 401) {
    const pathText = String(path || "");
    const nonFatalAuthProbe =
      options.skipAuthRedirect ||
      pathText.includes("/api/auth/heartbeat") ||
      pathText.includes("/api/admin/llm-models");

    const detail =
      (payload && typeof payload === "object" && (payload.detail || payload.message)) ||
      "Session expired";
    const err = new Error(detail);
    err.status = 401;
    err.code = "AUTH_SESSION_EXPIRED";
    err.isAuthError = true;
    err.data = payload;
    err.nonFatalAuthProbe = nonFatalAuthProbe;
    // EFATA777 v8: apiFetch never clears session or redirects by itself.
    // Screens must confirm /api/me before deciding that the session expired.
    throw err;
  }

  if (!response.ok) {
    const detail =
      (payload && typeof payload === "object" && (payload.detail || payload.message)) ||
      (typeof payload === "string" ? payload : `API error ${response.status}`);
    const err = new Error(detail);
    err.status = response.status;
    err.data = payload;
    if (response.status === 403) {
      err.code = "AUTH_FORBIDDEN";
      err.isAuthError = true;
    }
    if (response.status === 422) {
      err.code = "API_VALIDATION_ERROR";
      err.isValidationError = true;
    }
    if (response.status === 422) {
      err.code = "CHAT_STREAM_VALIDATION_ERROR";
      err.isValidationError = true;
    }
    if (response.status === 429) {
      err.code = "RATE_LIMITED";
      err.isRateLimited = true;
      err.retryAfter = response.headers?.get?.("retry-after") || null;
    }
    if ([502, 503, 504].includes(response.status)) {
      err.code = "TEMPORARY_SERVICE_UNAVAILABLE";
      err.isTemporaryUnavailable = true;
      err.userMessage = "Servico temporariamente indisponivel. Tente novamente em instantes.";
    }
    throw err;
  }

  return enrichResult(payload, response);
}

/* =========================
 * AUTH
 * ========================= */

export const getMe = (opts = {}) => apiFetch("/api/me", opts);

export const forgotPassword = ({ email, tenant, org, token } = {}) =>
  apiFetch("/api/auth/forgot-password", {
    method: "POST",
    org: org || tenant,
    token,
    body: { email, tenant: tenant || org || readTenant() },
  });

export const resetPassword = ({ token: resetToken, password, password_confirm, tenant, org } = {}) =>
  apiFetch("/api/auth/reset-password", {
    method: "POST",
    org: org || tenant,
    body: {
      token: resetToken,
      password,
      password_confirm,
      tenant: tenant || org || readTenant(),
    },
  });

export const validateInvestorAccessCode = ({ code, email = null, tenant = null, org = null } = {}) =>
  apiFetch("/api/auth/validate-access-code", {
    method: "POST",
    org: org || tenant,
    body: {
      code,
      email,
      tenant: tenant || org || readTenant(),
      org: org || tenant || readTenant(),
    },
  });

export const heartbeat = ({ token, org } = {}) =>
  apiFetch("/api/auth/heartbeat", {
    method: "POST",
    token,
    org,
    skipAuthRedirect: true,
  });

/* =========================
 * ADMIN
 * ========================= */

export const getAdminUsers = (opts = {}) => apiFetch("/api/admin/users", opts);

export const approveUser = (userId, opts = {}) =>
  apiFetch(`/api/admin/users/${userId}/approve`, {
    method: "POST",
    ...opts,
  });

export const rejectUser = (userId, opts = {}) =>
  apiFetch(`/api/admin/users/${userId}/reject`, {
    method: "POST",
    ...opts,
  });

export const deleteUser = (userId, opts = {}) =>
  apiFetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
    ...opts,
  });

/* =========================
 * ONBOARDING / PROFILE
 * ========================= */

export const submitOnboarding = (payload, opts = {}) =>
  apiFetch("/api/user/onboarding", {
    method: "POST",
    body: payload,
    ...opts,
  });

/* =========================
 * PUBLIC CHAT
 * ========================= */

export async function publicChat(
  { lead_id, message, thread_id = null } = {},
  opts = {}
) {
  const res = await apiFetch("/api/public/chat", {
    method: "POST",
    skipAuthRedirect: true,
    ...opts,
    body: {
      lead_id,
      message,
      thread_id,
    },
  });

  const payload = res?.data ?? res;
  return {
    ok: true,
    thread_id: payload?.thread_id || thread_id || null,
    reply:
      payload?.reply ||
      payload?.message ||
      payload?.content ||
      payload?.answer ||
      "",
    raw: payload,
  };
}

/* =========================
 * FILES
 * ========================= */

export async function uploadFile(
  file,
  {
    token,
    org,
    threadId = null,
    agentId = null,
    agentIds = null,
    intent = null,
    institutionalRequest = false,
    linkAllAgents = false,
    linkAgent = true,
  } = {}
) {
  const fd = new FormData();
  fd.append("file", file);

  if (threadId) fd.append("thread_id", threadId);
  if (agentId) fd.append("agent_id", agentId);

  if (Array.isArray(agentIds) && agentIds.length) {
    fd.append("agent_ids", agentIds.join(","));
  } else if (typeof agentIds === "string" && agentIds.trim()) {
    fd.append("agent_ids", agentIds.trim());
  }

  if (intent) fd.append("intent", intent);
  fd.append("institutional_request", institutionalRequest ? "true" : "false");
  fd.append("link_all_agents", linkAllAgents ? "true" : "false");
  fd.append("link_agent", linkAgent ? "true" : "false");

  return apiFetch("/api/files/upload", {
    method: "POST",
    token,
    org,
    body: fd,
  });
}

/* =========================
 * CHAT
 * ========================= */

export const chat = ({
  token,
  org,
  tenant,
  thread_id,
  message,
  agent_id,
  agent_ids = null,
  dest_mode = null,
  visible_agent = null,
  target_agent_slug = null,
  manual_target_slug = null,
  target_agent_slugs = null,
  requested_agent_names = null,
  multi_agent_turn = null,
  response_control = null,
  manual_agent_lock = null,
  manual_agent_source = null,
  manual_authority_version = null,
  manual_sticky_state_version = null,
  manual_lock_persistence_version = null,
  manual_lock_staging_proof_version = null,
  manual_lock_staging_proof_production_guard_version = null,
  auto_handoff_enabled = null,
  manual_team_panel_required = null,
  manual_team_panel_order = null,
  team_panel_version = null,
  manual_team_conversation_active = null,
  manual_team_focus_slug = null,
  manual_team_turn_queue = null,
  manual_team_turn_index = null,
  team_conversation_mode = null,
  team_conversation_orchestrator_version = null,
  team_conversation_staging_verification_version = null,
  top_k,
  trace_id,
  client_message_id,
  signal,
} = {}) =>
  apiFetch("/api/chat", {
    method: "POST",
    token,
    org: org || tenant,
    // METATRON_CHAT_SSE_CORS_EDGE_PATCH:
    // Direct chat is only a diagnostic fallback; never send cookies cross-origin.
    credentials: "omit",
    signal,
    body: cleanChatRequestPayload({
      thread_id,
      message,
      agent_id,
      agent_ids,
      dest_mode,
      visible_agent,
      target_agent_slug,
        manual_target_slug,
      target_agent_slugs,
      requested_agent_names,
      multi_agent_turn,
      response_control,
      manual_agent_lock,
      manual_agent_source,
      manual_authority_version,
      manual_sticky_state_version,
      manual_lock_persistence_version,
      manual_lock_staging_proof_version,
      manual_lock_staging_proof_production_guard_version,
      auto_handoff_enabled,
      manual_team_panel_required,
      manual_team_panel_order,
      team_panel_version,
      manual_team_conversation_active,
      manual_team_focus_slug,
      manual_team_turn_queue,
      manual_team_turn_index,
      team_conversation_mode,
      team_conversation_orchestrator_version,
      team_conversation_staging_verification_version,
      top_k,
      trace_id,
      client_message_id,
      tenant: tenant || org || readTenant(),
    }),
  });

export async function chatStream({
  token,
  org,
  tenant,
  thread_id,
  message,
  agent_id,
  agent_ids = null,
  dest_mode = null,
  visible_agent = null,
  target_agent_slug = null,
  manual_target_slug = null,
  target_agent_slugs = null,
  requested_agent_names = null,
  multi_agent_turn = null,
  response_control = null,
  manual_agent_lock = null,
  manual_agent_source = null,
  manual_authority_version = null,
  manual_sticky_state_version = null,
  manual_lock_persistence_version = null,
  manual_lock_staging_proof_version = null,
  manual_lock_staging_proof_production_guard_version = null,
  auto_handoff_enabled = null,
  manual_team_panel_required = null,
  manual_team_panel_order = null,
  team_panel_version = null,
  manual_team_conversation_active = null,
  manual_team_focus_slug = null,
  manual_team_turn_queue = null,
  manual_team_turn_index = null,
  team_conversation_mode = null,
  team_conversation_orchestrator_version = null,
  team_conversation_staging_verification_version = null,
  top_k,
  trace_id,
  client_message_id,
  signal,
} = {}) {
  const streamUrl = joinApi("/api/chat/stream");
  let response;
  try {
    response = await fetch(streamUrl, {
      method: "POST",
      headers: headers({
        token,
        org: org || tenant,
        json: true,
        allowPublicOrg: false,
        extra: {
          Accept: "text/event-stream",
        },
      }),
      // METATRON_CHAT_SSE_CORS_EDGE_PATCH:
      // Cross-origin SSE uses bearer-token auth only. Do not send cookies.
      // This prevents credentialed-CORS/proxy edge cases where preflight succeeds
      // but Chrome keeps the POST in provisional/pending state.
      credentials: "omit",
      signal,
      body: JSON.stringify(cleanChatRequestPayload({
        thread_id,
        message,
        agent_id,
        agent_ids,
        dest_mode,
        visible_agent,
        target_agent_slug,
        manual_target_slug,
        target_agent_slugs,
        requested_agent_names,
        multi_agent_turn,
        response_control,
        manual_agent_lock,
        manual_agent_source,
        manual_authority_version,
        manual_sticky_state_version,
        manual_lock_persistence_version,
        manual_lock_staging_proof_version,
      manual_lock_staging_proof_production_guard_version,
        auto_handoff_enabled,
        manual_team_panel_required,
        manual_team_panel_order,
        team_panel_version,
        top_k,
        trace_id,
        client_message_id,
        tenant: tenant || org || readTenant(),
      })),
    });
  } catch (err) {
    const wrapped = err instanceof Error ? err : new Error(String(err || "Stream request failed"));
    if (wrapped?.name === "AbortError") {
      wrapped.code = "CHAT_STREAM_ABORTED";
    } else {
      wrapped.code = wrapped?.code || "NETWORK_FETCH_FAILED";
    }
    wrapped.url = streamUrl;
    wrapped.method = "POST";
    wrapped.wasAborted = !!signal?.aborted;
    throw wrapped;
  }

  if (response.status === 401) {
    const err = new Error("Stream unauthorized");
    err.status = 401;
    err.code = "CHAT_STREAM_UNAUTHORIZED";
    err.isAuthError = true;
    err.nonFatalAuthProbe = false;
    // EFATA777 v8: chatStream never clears session or redirects by itself.
    // AppConsole must confirm /api/me before logout.
    throw err;
  }

  if (response.status === 403) {
    const err = new Error("Stream forbidden");
    err.status = 403;
    err.code = "AUTH_FORBIDDEN";
    err.isAuthError = true;
    throw err;
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    let payload = null;
    if (contentType.includes("application/json")) {
      payload = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => "");
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = text;
        }
      }
    }
    const detail =
      (payload && typeof payload === "object" && (payload.detail || payload.message)) ||
      (typeof payload === "string" ? payload : `HTTP ${response.status}`);
    const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    err.status = response.status;
    err.data = payload;
    if (response.status === 403) {
      err.code = "AUTH_FORBIDDEN";
      err.isAuthError = true;
    }
    if (response.status === 429) {
      err.code = "RATE_LIMITED";
      err.isRateLimited = true;
      err.retryAfter = response.headers?.get?.("retry-after") || null;
    }
    throw err;
  }

  return response;
}

export const getOrionSquadHealth = ({ token, org, tenant } = {}) =>
  apiFetch("/api/internal/orion-squad/health", {
    method: "GET",
    token,
    org: org || tenant,
  });

export const getOrionSquadPreview = ({ message, token, org, tenant } = {}) =>
  apiFetch(`/api/internal/orion-squad/preview?message=${encodeURIComponent(message || "")}`, {
    method: "GET",
    token,
    org: org || tenant,
  });

export const getAgentCapabilities = ({ token, org, tenant } = {}) =>
  apiFetch("/api/agents/capabilities", {
    method: "GET",
    token,
    org: org || tenant,
  });

export const getAgentRegistry = ({ token, org, tenant, includeInternal = false } = {}) => {
  const qs = includeInternal ? "?include_internal=true" : "";
  return apiFetch(`/api/agents/registry${qs}`, {
    method: "GET",
    token,
    org: org || tenant,
  });
};

/* =========================
 * AUDIO / STT
 * ========================= */

export async function transcribeAudio(
  blob,
  { token, org, tenant, trace_id = null, language = null, filename = "audio.webm" } = {}
) {
  const fd = new FormData();

  let uploadBlob = blob;
  let uploadName = filename || "audio.webm";

  try {
    const blobType = String(blob?.type || "").toLowerCase();
    if (blobType.startsWith("audio/webm")) {
      uploadBlob = new Blob([blob], { type: "audio/webm" });
      if (!/\.webm$/i.test(uploadName)) uploadName = "audio.webm";
    } else if (blobType.startsWith("audio/mp4")) {
      uploadBlob = new Blob([blob], { type: "audio/mp4" });
      if (!/\.(m4a|mp4)$/i.test(uploadName)) uploadName = "audio.m4a";
    }
  } catch {}

  fd.append("file", uploadBlob, uploadName);
  if (language) fd.append("language", language);

  return apiFetch("/api/audio/transcriptions", {
    method: "POST",
    token,
    org: org || tenant,
    headers: trace_id ? { "X-Trace-Id": trace_id } : {},
    body: fd,
  }).then((res) => res.data || res);
}

/* =========================
 * FOUNDER HANDOFF
 * ========================= */

export const requestFounderHandoff = ({
  token,
  org,
  tenant,
  thread_id,
  interest_type,
  message,
  source,
  consent_contact = true,
} = {}) =>
  apiFetch("/api/founder/handoff", {
    method: "POST",
    token,
    org: org || tenant,
    body: {
      thread_id,
      interest_type,
      message,
      source,
      consent_contact,
    },
  });

/* =========================
 * REALTIME / SUMMIT
 * ========================= */

export const getRealtimeClientSecret = (payload = {}) =>
  startRealtimeSession({
    ...payload,
    mode:
      payload?.mode ||
      import.meta.env.VITE_ORKIO_RUNTIME_MODE ||
      window.__ORKIO_ENV__?.VITE_ORKIO_RUNTIME_MODE ||
      "platform",
  });

export async function startRealtimeSession({
  token,
  org,
  tenant,
  agent_id = null,
  thread_id = null,
  voice = null,
  model = null,
  ttl_seconds = 600,
  mode = "platform",
  response_profile = null,
  language_profile = null,
  language = null,
  dest_mode = null,
  visible_agent = null,
  target_agent_slug = null,
  manual_target_slug = null,
  target_agent_slugs = null,
  requested_agent_names = null,
  agent_ids = null,
  multi_agent_turn = null,
  response_control = null,
  manual_agent_lock = null,
  manual_agent_source = null,
  manual_authority_version = null,
  manual_sticky_state_version = null,
  manual_lock_persistence_version = null,
  manual_lock_staging_proof_version = null,
  manual_lock_staging_proof_production_guard_version = null,
  auto_handoff_enabled = null,
  manual_team_panel_required = null,
  manual_team_panel_order = null,
  team_panel_version = null,
  team_panel_mode = null,
  team_panel_voice_moderator_slug = null,
  manual_team_conversation_active = null,
  manual_team_focus_slug = null,
  manual_team_turn_queue = null,
  manual_team_turn_index = null,
  team_conversation_mode = null,
  team_conversation_orchestrator_version = null,
  team_conversation_staging_verification_version = null,
  preferred_address_names = null,
  profile_address_preference_version = null,
  client_controlled_response = null,
} = {}) {
  const resolvedLanguageProfile = language_profile || language || null;
  const { data } = await apiFetch("/api/realtime/start", {
    method: "POST",
    token,
    org: org || tenant,
    body: {
      agent_id,
      thread_id,
      voice,
      model,
      ttl_seconds,
      mode,
      response_profile,
      language_profile: resolvedLanguageProfile,
      language: resolvedLanguageProfile,
      dest_mode,
      visible_agent,
      target_agent_slug,
        manual_target_slug,
      target_agent_slugs,
      requested_agent_names,
      agent_ids,
      multi_agent_turn,
      response_control,
      manual_agent_lock,
      manual_agent_source,
      manual_authority_version,
      manual_sticky_state_version,
      manual_lock_persistence_version,
      manual_lock_staging_proof_version,
      manual_lock_staging_proof_production_guard_version,
      auto_handoff_enabled,
      manual_team_panel_required,
      manual_team_panel_order,
      team_panel_version,
      team_panel_mode,
      team_panel_voice_moderator_slug,
      manual_team_conversation_active,
      manual_team_focus_slug,
      manual_team_turn_queue,
      manual_team_turn_index,
      team_conversation_mode,
      team_conversation_orchestrator_version,
      team_conversation_staging_verification_version,
      preferred_address_names,
      profile_address_preference_version,
      client_controlled_response,
    },
  });
  return data;
}

export async function startSummitSession({
  token,
  org,
  tenant,
  agent_id = null,
  thread_id = null,
  voice = null,
  model = null,
  ttl_seconds = 600,
  mode = "summit",
  response_profile = "stage",
  language_profile = "auto",
  dest_mode = null,
  visible_agent = null,
  target_agent_slug = null,
  manual_target_slug = null,
  target_agent_slugs = null,
  requested_agent_names = null,
  agent_ids = null,
  multi_agent_turn = null,
  response_control = null,
  manual_agent_lock = null,
  manual_agent_source = null,
  manual_authority_version = null,
  manual_sticky_state_version = null,
  manual_lock_persistence_version = null,
  manual_lock_staging_proof_version = null,
  manual_lock_staging_proof_production_guard_version = null,
  auto_handoff_enabled = null,
  manual_team_panel_required = null,
  manual_team_panel_order = null,
  team_panel_version = null,
  team_panel_mode = null,
  team_panel_voice_moderator_slug = null,
  manual_team_conversation_active = null,
  manual_team_focus_slug = null,
  manual_team_turn_queue = null,
  manual_team_turn_index = null,
  team_conversation_mode = null,
  team_conversation_orchestrator_version = null,
  team_conversation_staging_verification_version = null,
  preferred_address_names = null,
  profile_address_preference_version = null,
  client_controlled_response = null,
} = {}) {
  const { data } = await apiFetch("/api/realtime/start", {
    method: "POST",
    token,
    org: org || tenant,
    body: {
      agent_id,
      thread_id,
      voice,
      model,
      ttl_seconds,
      mode,
      response_profile,
      language_profile,
      language: language_profile,
      dest_mode,
      visible_agent,
      target_agent_slug,
        manual_target_slug,
      target_agent_slugs,
      requested_agent_names,
      agent_ids,
      multi_agent_turn,
      response_control,
      manual_agent_lock,
      manual_agent_source,
      manual_authority_version,
      manual_sticky_state_version,
      manual_lock_persistence_version,
      manual_lock_staging_proof_version,
      manual_lock_staging_proof_production_guard_version,
      auto_handoff_enabled,
      manual_team_panel_required,
      manual_team_panel_order,
      team_panel_version,
      team_panel_mode,
      team_panel_voice_moderator_slug,
      manual_team_conversation_active,
      manual_team_focus_slug,
      manual_team_turn_queue,
      manual_team_turn_index,
      team_conversation_mode,
      team_conversation_orchestrator_version,
      team_conversation_staging_verification_version,
      preferred_address_names,
      profile_address_preference_version,
      client_controlled_response,
    },
  });
  return data;
}

export const postRealtimeEventsBatch = ({
  token,
  org,
  tenant,
  session_id,
  events,
  agent_id = null,
  dest_mode = null,
  visible_agent = null,
  target_agent_slug = null,
  manual_target_slug = null,
  target_agent_slugs = null,
  requested_agent_names = null,
  multi_agent_turn = null,
  response_control = null,
  manual_agent_lock = null,
  manual_agent_source = null,
  manual_authority_version = null,
  manual_sticky_state_version = null,
  manual_lock_persistence_version = null,
  manual_lock_staging_proof_version = null,
  manual_lock_staging_proof_production_guard_version = null,
  auto_handoff_enabled = null,
  manual_team_panel_required = null,
  manual_team_panel_order = null,
  team_panel_version = null,
  team_panel_mode = null,
  team_panel_voice_moderator_slug = null,
  manual_team_conversation_active = null,
  manual_team_focus_slug = null,
  manual_team_turn_queue = null,
  manual_team_turn_index = null,
  team_conversation_mode = null,
  team_conversation_orchestrator_version = null,
  team_conversation_staging_verification_version = null,
  meeting_state = null,
} = {}) =>
  apiFetch("/api/realtime/events:batch", {
    method: "POST",
    token,
    org: org || tenant,
    body: {
      session_id,
      events: events || [],
      agent_id,
      dest_mode,
      visible_agent,
      target_agent_slug,
        manual_target_slug,
      target_agent_slugs,
      requested_agent_names,
      multi_agent_turn,
      response_control,
      manual_agent_lock,
      manual_agent_source,
      manual_authority_version,
      manual_sticky_state_version,
      manual_lock_persistence_version,
      manual_lock_staging_proof_version,
      manual_lock_staging_proof_production_guard_version,
      auto_handoff_enabled,
      manual_team_panel_required,
      manual_team_panel_order,
      team_panel_version,
      team_panel_mode,
      team_panel_voice_moderator_slug,
      manual_team_conversation_active,
      manual_team_focus_slug,
      manual_team_turn_queue,
      manual_team_turn_index,
      team_conversation_mode,
      team_conversation_orchestrator_version,
      team_conversation_staging_verification_version,
      meeting_state,
    },
  });

export const endRealtimeSession = ({
  token,
  org,
  tenant,
  session_id,
  ended_at,
  meta,
} = {}) =>
  apiFetch("/api/realtime/end", {
    method: "POST",
    token,
    org: org || tenant,
    body: { session_id, ended_at, meta },
  });

export async function getRealtimeSession({
  token,
  org,
  tenant,
  session_id,
  finals_only = true,
} = {}) {
  const qs = new URLSearchParams();
  qs.set("finals_only", finals_only ? "true" : "false");

  const { data } = await apiFetch(
    `/api/realtime/sessions/${encodeURIComponent(session_id)}?${qs.toString()}`,
    {
      method: "GET",
      token,
      org: org || tenant,
      skipAuthRedirect: true,
    }
  );
  return data;
}

export const getSummitSessionScore = ({
  token,
  org,
  tenant,
  session_id,
} = {}) =>
  apiFetch(`/api/realtime/sessions/${encodeURIComponent(session_id)}/score`, {
    method: "GET",
    token,
    org: org || tenant,
  });

export const submitSummitSessionReview = ({
  token,
  org,
  tenant,
  session_id,
  clarity,
  naturalness,
  institutional_fit,
} = {}) =>
  apiFetch(`/api/realtime/sessions/${encodeURIComponent(session_id)}/review`, {
    method: "POST",
    token,
    org: org || tenant,
    body: {
      clarity,
      naturalness,
      institutional_fit,
    },
  });

export async function downloadRealtimeAta({
  token,
  org,
  tenant,
  session_id,
} = {}) {
  const response = await fetch(
    joinApi(`/api/realtime/sessions/${encodeURIComponent(session_id)}/ata.txt`),
    {
      method: "GET",
      headers: headers({ token, org: org || tenant, json: false }),
      credentials: "include",
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `HTTP ${response.status}`);
  }

  return await response.blob();
}

export const guardRealtimeTranscript = ({
  token,
  org,
  tenant,
  thread_id,
  message,
} = {}) =>
  apiFetch("/api/realtime/guard", {
    method: "POST",
    token,
    org: org || tenant,
    body: { thread_id, message },
  });

/* =========================
 * FOUNDER ESCALATIONS
 * ========================= */

export const getFounderEscalations = ({ token, org, tenant } = {}) =>
  apiFetch("/api/admin/founder-escalations", {
    method: "GET",
    token,
    org: org || tenant,
  });

export const getFounderEscalation = ({ escalation_id, token, org, tenant } = {}) =>
  apiFetch(`/api/admin/founder-escalations/${encodeURIComponent(escalation_id)}`, {
    method: "GET",
    token,
    org: org || tenant,
  });

export const setFounderEscalationAction = ({
  escalation_id,
  action_type,
  notes = null,
  token,
  org,
  tenant,
} = {}) =>
  apiFetch(`/api/admin/founder-escalations/${encodeURIComponent(escalation_id)}/action`, {
    method: "POST",
    token,
    org: org || tenant,
    body: {
      action_type,
      notes,
    },
  });


export const generateNumerologyProfile = ({ full_name, birth_date, preferred_name = null, context = null, consent = false, token, org } = {}) =>
  apiFetch("/api/numerology/profile", {
    method: "POST",
    token,
    org,
    body: { full_name, birth_date, preferred_name, context, consent },
  });




/* =========================
 * PUBLIC BILLING
 * ========================= */

export const getPublicPlans = (opts = {}) =>
  apiFetch("/api/billing/public/plans", {
    method: "GET",
    skipAuthRedirect: true,
    org: opts.org || "public",
  });

export const getPublicTopups = (opts = {}) =>
  apiFetch("/api/billing/public/topups", {
    method: "GET",
    skipAuthRedirect: true,
    org: opts.org || "public",
  });

export const getPublicUsageRates = (opts = {}) =>
  apiFetch("/api/billing/public/usage-rates", {
    method: "GET",
    skipAuthRedirect: true,
    org: opts.org || "public",
  });

export const createPublicCheckout = ({
  item_code,
  plan_code,
  checkout_kind = "plan",
  full_name,
  name,
  email,
  company,
  currency,
  org,
} = {}) =>
  apiFetch("/api/billing/public/checkout", {
    method: "POST",
    skipAuthRedirect: true,
    org: org || "public",
    body: {
      item_code: item_code || plan_code,
      checkout_kind,
      full_name: full_name || name,
      name: name || full_name,
      email,
      company,
      currency,
    },
  });

export const getPublicCheckoutStatus = ({ checkout_id, email, org } = {}) =>
  apiFetch(`/api/billing/public/checkout-status?checkout_id=${encodeURIComponent(checkout_id || "")}${email ? `&email=${encodeURIComponent(email)}` : ""}`, {
    method: "GET",
    skipAuthRedirect: true,
    org: org || "public",
  });

export const getWalletSummary = ({ token, org, tenant } = {}) =>
  apiFetch("/api/billing/wallet/summary", {
    method: "GET",
    token,
    org: org || tenant,
  });

export const getWalletLedger = ({ limit = 50, token, org, tenant } = {}) =>
  apiFetch(`/api/billing/wallet/ledger?limit=${encodeURIComponent(limit)}`, {
    method: "GET",
    token,
    org: org || tenant,
  });

export const consumeWalletAction = ({ action_key, quantity = 1, note = null, token, org, tenant } = {}) =>
  apiFetch("/api/billing/wallet/consume", {
    method: "POST",
    token,
    org: org || tenant,
    body: { action_key, quantity, note },
  });

export const setWalletAutoRecharge = ({ enabled, pack_code = null, threshold_usd = 3, token, org, tenant } = {}) =>
  apiFetch("/api/billing/wallet/auto-recharge", {
    method: "POST",
    token,
    org: org || tenant,
    body: { enabled, pack_code, threshold_usd },
  });

/* =========================
 * ADMIN AGENTS
 * ========================= */

export const getAdminAgents = (opts = {}) => apiFetch("/api/admin/agents", opts);

export const getAdminLlmModels = (opts = {}) =>
  apiFetch("/api/admin/llm-models", {
    method: "GET",
    skipAuthRedirect: true,
    ...opts,
  });

export const saveAdminAgent = ({ id = null, payload, token, org, tenant } = {}) =>
  apiFetch(id ? `/api/admin/agents/${id}` : "/api/admin/agents", {
    method: id ? "PUT" : "POST",
    token,
    org: org || tenant,
    body: payload,
  });


/* =========================
 * PUBLIC PRECHAT / LEADS
 * ========================= */

export function readPrechatContext() {
  try {
    return JSON.parse(localStorage.getItem("orkio_prechat_context") || "null");
  } catch {
    return null;
  }
}

export function clearPrechatContext() {
  try {
    localStorage.removeItem("orkio_prechat_context");
  } catch {}
}

export async function savePrechatContext(payload = {}, opts = {}) {
  const context = {
    ...payload,
    updated_at: payload.updated_at || new Date().toISOString(),
  };

  try {
    localStorage.setItem("orkio_prechat_context", JSON.stringify(context));
  } catch {}

  try {
    const res = await apiFetch("/api/public/prechat", {
      method: "POST",
      skipAuthRedirect: true,
      ...opts,
      body: context,
    });
    const data = res?.data || res;
    if (data?.prechat_id || data?.session_id) {
      const enriched = {
        ...context,
        prechat_id: data.prechat_id || data.session_id,
        backend_synced: true,
      };
      try {
        localStorage.setItem("orkio_prechat_context", JSON.stringify(enriched));
      } catch {}
      return enriched;
    }
  } catch (err) {
    // Public prechat must never block the landing conversion.
    console.warn("PUBLIC_PRECHAT_SYNC_SKIPPED", err?.message || err);
  }

  return context;
}

export async function submitEnterpriseLead(payload = {}, opts = {}) {
  const body = {
    source: "patroai_public_prechat",
    ...payload,
    created_at: payload.created_at || new Date().toISOString(),
  };

  try {
    return await apiFetch("/api/public/enterprise-lead", {
      method: "POST",
      skipAuthRedirect: true,
      ...opts,
      body,
    });
  } catch (err) {
    console.warn("ENTERPRISE_LEAD_API_FAILED", err?.message || err);
    throw err;
  }
}

export function buildSignupUrlFromPrechat(base = "/auth") {
  const context = readPrechatContext();
  const qs = new URLSearchParams();
  qs.set("mode", "register");
  qs.set("source", "patroai-prechat");
  if (context?.prechat_id) qs.set("prechat_id", context.prechat_id);
  return `${base}?${qs.toString()}`;
}

// RTB09_PUBLIC_STRATEGIC_INTAKE — qualified pre-onboarding.
// This does not create users and does not grant platform access.
export async function submitStrategicIntake(payload) {
  return apiFetch("/api/public/intake", {
    method: "POST",
    body: payload,
  });
}

export async function listStrategicIntakeSubmissions({ status = "", intake_type = "", limit = 100 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (intake_type) params.set("intake_type", intake_type);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return apiFetch(`/api/admin/intake/submissions${qs ? `?${qs}` : ""}`);
}

export async function updateStrategicIntakeSubmission(id, payload) {
  return apiFetch(`/api/admin/intake/submissions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

