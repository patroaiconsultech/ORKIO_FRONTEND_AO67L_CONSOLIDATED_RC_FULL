export type PublicConfigKey =
  | "VITE_API_BASE_URL"
  | "VITE_STREAM_TIMEOUT_MS"
  | "VITE_OIDC_AUTHORIZATION_ENDPOINT"
  | "VITE_OIDC_TOKEN_ENDPOINT"
  | "VITE_OIDC_END_SESSION_ENDPOINT"
  | "VITE_OIDC_CLIENT_ID"
  | "VITE_OIDC_REDIRECT_URI"
  | "VITE_OIDC_POST_LOGOUT_REDIRECT_URI"
  | "VITE_OIDC_SCOPE"
  | "VITE_OIDC_AUDIENCE";

export type PublicConfigValidation = {
  ok: boolean;
  value: string;
  reason?: string;
};

export type PublicConfigResolution = PublicConfigValidation & {
  source: "runtime" | "build";
};

export const PUBLIC_CONFIG_KEYS: readonly PublicConfigKey[];

export function validatePublicConfigValue(
  key: PublicConfigKey,
  raw: unknown,
): PublicConfigValidation;

export function resolvePublicConfigValue(
  key: PublicConfigKey,
  runtimeConfig?: Record<string, unknown>,
  buildConfig?: Record<string, unknown>,
): PublicConfigResolution;

export function collectPublicRuntimeConfig(
  env?: Record<string, unknown>,
): {
  config: Readonly<Record<string, string>>;
  errors: ReadonlyArray<{ key: PublicConfigKey; reason?: string }>;
};

export function runtimeEnvScript(
  config: Readonly<Record<string, string>>,
): string;
