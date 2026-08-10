export const PUBLIC_CONFIG_KEYS = Object.freeze([
  "VITE_API_BASE_URL",
  "VITE_STREAM_TIMEOUT_MS",
  "VITE_OIDC_AUTHORIZATION_ENDPOINT",
  "VITE_OIDC_TOKEN_ENDPOINT",
  "VITE_OIDC_END_SESSION_ENDPOINT",
  "VITE_OIDC_CLIENT_ID",
  "VITE_OIDC_REDIRECT_URI",
  "VITE_OIDC_POST_LOGOUT_REDIRECT_URI",
  "VITE_OIDC_SCOPE",
  "VITE_OIDC_AUDIENCE",
]);

const PUBLIC_CONFIG_KEY_SET = new Set(PUBLIC_CONFIG_KEYS);

const URL_KEYS = new Set([
  "VITE_API_BASE_URL",
  "VITE_OIDC_AUTHORIZATION_ENDPOINT",
  "VITE_OIDC_TOKEN_ENDPOINT",
  "VITE_OIDC_END_SESSION_ENDPOINT",
  "VITE_OIDC_REDIRECT_URI",
  "VITE_OIDC_POST_LOGOUT_REDIRECT_URI",
]);

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function clean(raw) {
  return String(raw ?? "").trim();
}

function localDevelopmentHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function validWebUrl(value) {
  if (!value) return { ok: true, value: "" };
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, value: "", reason: "URL_INVALID" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, value: "", reason: "URL_CREDENTIALS_FORBIDDEN" };
  }
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && localDevelopmentHost(parsed.hostname))) {
    return { ok: false, value: "", reason: "HTTPS_REQUIRED" };
  }
  return { ok: true, value };
}

function validTimeout(value) {
  if (!value) return { ok: true, value: "" };
  if (!/^\d+$/.test(value)) return { ok: false, value: "", reason: "TIMEOUT_NOT_INTEGER" };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { ok: false, value: "", reason: "TIMEOUT_OUT_OF_RANGE" };
  }
  return { ok: true, value: String(parsed) };
}

function validOpaque(value, maxLength = 2048) {
  if (!value) return { ok: true, value: "" };
  if (value.length > maxLength) return { ok: false, value: "", reason: "VALUE_TOO_LONG" };
  if (/[\u0000-\u001F\u007F]/.test(value)) {
    return { ok: false, value: "", reason: "CONTROL_CHARACTER_FORBIDDEN" };
  }
  return { ok: true, value };
}

function validScope(value) {
  if (!value) return { ok: true, value: "" };
  const opaque = validOpaque(value, 4096);
  if (!opaque.ok) return opaque;
  const scopes = value.split(/\s+/).filter(Boolean);
  if (!scopes.includes("openid")) {
    return { ok: false, value: "", reason: "OIDC_SCOPE_REQUIRES_OPENID" };
  }
  return { ok: true, value: scopes.join(" ") };
}

export function validatePublicConfigValue(key, raw) {
  if (!PUBLIC_CONFIG_KEY_SET.has(key)) {
    return { ok: false, value: "", reason: "KEY_NOT_ALLOWLISTED" };
  }
  const value = clean(raw);
  if (URL_KEYS.has(key)) return validWebUrl(value);
  if (key === "VITE_STREAM_TIMEOUT_MS") return validTimeout(value);
  if (key === "VITE_OIDC_SCOPE") return validScope(value);
  if (key === "VITE_OIDC_CLIENT_ID") return validOpaque(value, 512);
  if (key === "VITE_OIDC_AUDIENCE") return validOpaque(value, 2048);
  return { ok: false, value: "", reason: "VALIDATOR_MISSING" };
}

export function resolvePublicConfigValue(key, runtimeConfig = {}, buildConfig = {}) {
  const source = own(runtimeConfig, key) ? "runtime" : "build";
  const raw = source === "runtime" ? runtimeConfig[key] : buildConfig[key];
  const validated = validatePublicConfigValue(key, raw);
  return { ...validated, source };
}

export function collectPublicRuntimeConfig(env = {}) {
  const config = {};
  const errors = [];
  for (const key of PUBLIC_CONFIG_KEYS) {
    if (!own(env, key)) continue;
    const validated = validatePublicConfigValue(key, env[key]);
    if (validated.ok) {
      config[key] = validated.value;
    } else {
      // Presence is intentional: invalid runtime config must fail closed,
      // not silently revive a stale build-time fallback.
      config[key] = "";
      errors.push({ key, reason: validated.reason });
    }
  }
  return {
    config: Object.freeze(config),
    errors: Object.freeze(errors),
  };
}

export function runtimeEnvScript(config) {
  const serialized = JSON.stringify(config)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `window.__ORKIO_ENV__ = Object.freeze(${serialized});\n`;
}
