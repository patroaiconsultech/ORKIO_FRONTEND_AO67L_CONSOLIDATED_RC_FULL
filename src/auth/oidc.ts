import {
  clearToken,
  getToken,
  setToken,
  TOKEN_STORAGE_KEY,
} from "../api";
import { publicEnv } from "../config/runtime";

const TRANSACTION_STORAGE_KEY = "orkio_oidc_transaction";
const ID_TOKEN_STORAGE_KEY = "orkio_oidc_id_token";

export class OidcError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message || code);
    this.name = "OidcError";
    this.code = code;
  }
}

export type OidcConfig = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  endSessionEndpoint: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scope: string;
  audience: string;
};

type OidcTransaction = {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  returnTo: string;
  createdAt: number;
};

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
};

function env(name: string): string {
  return publicEnv(name as import("../../public-config.js").PublicConfigKey);
}

function currentOrigin(): string {
  return window.location.origin;
}

export function getOidcConfig(): OidcConfig {
  return {
    authorizationEndpoint: env("VITE_OIDC_AUTHORIZATION_ENDPOINT"),
    tokenEndpoint: env("VITE_OIDC_TOKEN_ENDPOINT"),
    endSessionEndpoint: env("VITE_OIDC_END_SESSION_ENDPOINT"),
    clientId: env("VITE_OIDC_CLIENT_ID"),
    redirectUri:
      env("VITE_OIDC_REDIRECT_URI") || `${currentOrigin()}/auth/callback`,
    postLogoutRedirectUri:
      env("VITE_OIDC_POST_LOGOUT_REDIRECT_URI") || currentOrigin(),
    scope: env("VITE_OIDC_SCOPE") || "openid profile email",
    audience: env("VITE_OIDC_AUDIENCE"),
  };
}

export function isOidcConfigured(): boolean {
  const config = getOidcConfig();
  return Boolean(
    config.authorizationEndpoint &&
      config.tokenEndpoint &&
      config.clientId &&
      config.redirectUri,
  );
}

function requireConfig(): OidcConfig {
  const config = getOidcConfig();
  if (!isOidcConfigured()) {
    throw new OidcError(
      "OIDC_NOT_CONFIGURED",
      "O provedor de identidade ainda não está configurado.",
    );
  }
  for (const value of [
    config.authorizationEndpoint,
    config.tokenEndpoint,
    config.redirectUri,
  ]) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new OidcError("OIDC_URL_INVALID");
    }
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      throw new OidcError("OIDC_HTTPS_REQUIRED");
    }
  }
  return config;
}

function randomBase64Url(bytes = 32): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return base64Url(values);
}

function base64Url(values: Uint8Array): string {
  let binary = "";
  for (const value of values) binary += String.fromCharCode(value);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return base64Url(new Uint8Array(digest));
}

function safeReturnTo(value: string): string {
  try {
    const parsed = new URL(value, currentOrigin());
    if (parsed.origin !== currentOrigin()) return "/app";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/app";
  }
}

function saveTransaction(transaction: OidcTransaction): void {
  sessionStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(transaction));
}

function loadTransaction(): OidcTransaction {
  const raw = sessionStorage.getItem(TRANSACTION_STORAGE_KEY);
  if (!raw) throw new OidcError("OIDC_TRANSACTION_MISSING");
  let transaction: OidcTransaction;
  try {
    transaction = JSON.parse(raw) as OidcTransaction;
  } catch {
    throw new OidcError("OIDC_TRANSACTION_INVALID");
  }
  if (
    !transaction.state ||
    !transaction.nonce ||
    !transaction.codeVerifier ||
    !transaction.redirectUri ||
    Date.now() - transaction.createdAt > 10 * 60 * 1000
  ) {
    throw new OidcError("OIDC_TRANSACTION_EXPIRED");
  }
  return transaction;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new OidcError("OIDC_ID_TOKEN_INVALID");
  const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  try {
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    throw new OidcError("OIDC_ID_TOKEN_INVALID");
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export async function beginLogin(returnTo?: string): Promise<never> {
  const config = requireConfig();
  const state = randomBase64Url();
  const nonce = randomBase64Url();
  const codeVerifier = randomBase64Url(64);
  const codeChallenge = await sha256(codeVerifier);
  saveTransaction({
    state,
    nonce,
    codeVerifier,
    redirectUri: config.redirectUri,
    returnTo: safeReturnTo(
      returnTo ||
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
    ),
    createdAt: Date.now(),
  });
  const url = new URL(config.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (config.audience) url.searchParams.set("audience", config.audience);
  window.location.assign(url.toString());
  return new Promise<never>(() => undefined);
}

export async function completeLogin(
  search = window.location.search,
): Promise<string> {
  const config = requireConfig();
  const params = new URLSearchParams(search);
  const providerError = params.get("error");
  if (providerError) {
    sessionStorage.removeItem(TRANSACTION_STORAGE_KEY);
    throw new OidcError(
      `OIDC_PROVIDER_${providerError.toUpperCase()}`,
      params.get("error_description") || providerError,
    );
  }
  const transaction = loadTransaction();
  const state = params.get("state");
  const code = params.get("code");
  if (!state || state !== transaction.state) {
    throw new OidcError("OIDC_STATE_MISMATCH");
  }
  if (!code) throw new OidcError("OIDC_CODE_MISSING");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    redirect_uri: transaction.redirectUri,
    code_verifier: transaction.codeVerifier,
  });

  let response: Response;
  try {
    response = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch (error) {
    throw new OidcError(
      "OIDC_TOKEN_ENDPOINT_UNAVAILABLE",
      error instanceof Error ? error.message : undefined,
    );
  }

  let data: TokenResponse;
  try {
    data = (await response.json()) as TokenResponse;
  } catch {
    throw new OidcError("OIDC_TOKEN_RESPONSE_INVALID");
  }
  if (!response.ok || data.error) {
    throw new OidcError(
      `OIDC_TOKEN_${String(data.error || response.status).toUpperCase()}`,
      data.error_description,
    );
  }
  if (!data.access_token || String(data.token_type || "Bearer").toLowerCase() !== "bearer") {
    throw new OidcError("OIDC_ACCESS_TOKEN_MISSING");
  }
  if (!data.id_token) throw new OidcError("OIDC_ID_TOKEN_MISSING");

  const claims = decodeJwtPayload(data.id_token);
  if (claims.nonce !== transaction.nonce) {
    throw new OidcError("OIDC_NONCE_MISMATCH");
  }

  setToken(data.access_token, data.expires_in);
  sessionStorage.setItem(ID_TOKEN_STORAGE_KEY, data.id_token);
  sessionStorage.removeItem(TRANSACTION_STORAGE_KEY);
  return safeReturnTo(transaction.returnTo);
}

export function clearAuthSession(): void {
  clearToken();
  sessionStorage.removeItem(ID_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TRANSACTION_STORAGE_KEY);
}

export function logout(): void {
  const config = getOidcConfig();
  const idToken = sessionStorage.getItem(ID_TOKEN_STORAGE_KEY);
  clearAuthSession();

  if (!config.endSessionEndpoint) {
    window.location.assign(config.postLogoutRedirectUri || "/");
    return;
  }
  const url = new URL(config.endSessionEndpoint);
  url.searchParams.set(
    "post_logout_redirect_uri",
    config.postLogoutRedirectUri,
  );
  if (idToken) url.searchParams.set("id_token_hint", idToken);
  window.location.assign(url.toString());
}

export function authStorageKeys(): readonly string[] {
  return [
    TOKEN_STORAGE_KEY,
    TRANSACTION_STORAGE_KEY,
    ID_TOKEN_STORAGE_KEY,
  ] as const;
}
