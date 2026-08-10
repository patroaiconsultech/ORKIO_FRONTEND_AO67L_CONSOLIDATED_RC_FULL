import test from "node:test";
import assert from "node:assert/strict";
import {
  collectPublicRuntimeConfig,
  resolvePublicConfigValue,
  validatePublicConfigValue,
} from "../public-config.js";

test("valid HTTPS URL passes and insecure remote HTTP fails", () => {
  assert.deepEqual(
    validatePublicConfigValue("VITE_API_BASE_URL", "https://api.example.test"),
    { ok: true, value: "https://api.example.test" },
  );
  assert.equal(
    validatePublicConfigValue("VITE_API_BASE_URL", "http://api.example.test").ok,
    false,
  );
  assert.equal(
    validatePublicConfigValue("VITE_API_BASE_URL", "http://localhost:8000").ok,
    true,
  );
});

test("URL credentials and malformed URLs fail closed", () => {
  assert.equal(
    validatePublicConfigValue("VITE_OIDC_TOKEN_ENDPOINT", "https://user:pass@example.test/token").ok,
    false,
  );
  assert.equal(
    validatePublicConfigValue("VITE_OIDC_TOKEN_ENDPOINT", "not-a-url").ok,
    false,
  );
});

test("timeout must be a positive safe integer", () => {
  assert.deepEqual(
    validatePublicConfigValue("VITE_STREAM_TIMEOUT_MS", "300000"),
    { ok: true, value: "300000" },
  );
  assert.equal(validatePublicConfigValue("VITE_STREAM_TIMEOUT_MS", "-1").ok, false);
  assert.equal(validatePublicConfigValue("VITE_STREAM_TIMEOUT_MS", "abc").ok, false);
});

test("OIDC scope must contain openid when non-empty", () => {
  assert.equal(
    validatePublicConfigValue("VITE_OIDC_SCOPE", "openid profile email").ok,
    true,
  );
  assert.equal(
    validatePublicConfigValue("VITE_OIDC_SCOPE", "profile email").ok,
    false,
  );
});

test("runtime wins when present, build is fallback only when runtime is absent", () => {
  const runtimeWins = resolvePublicConfigValue(
    "VITE_API_BASE_URL",
    { VITE_API_BASE_URL: "https://runtime.example.test" },
    { VITE_API_BASE_URL: "https://build.example.test" },
  );
  assert.equal(runtimeWins.ok, true);
  assert.equal(runtimeWins.source, "runtime");
  assert.equal(runtimeWins.value, "https://runtime.example.test");

  const buildFallback = resolvePublicConfigValue(
    "VITE_API_BASE_URL",
    {},
    { VITE_API_BASE_URL: "https://build.example.test" },
  );
  assert.equal(buildFallback.ok, true);
  assert.equal(buildFallback.source, "build");
  assert.equal(buildFallback.value, "https://build.example.test");
});

test("invalid runtime value fails closed and never revives stale valid build fallback", () => {
  const resolved = resolvePublicConfigValue(
    "VITE_API_BASE_URL",
    { VITE_API_BASE_URL: "http://remote.example.test" },
    { VITE_API_BASE_URL: "https://old-build.example.test" },
  );
  assert.equal(resolved.source, "runtime");
  assert.equal(resolved.ok, false);
  assert.equal(resolved.value, "");
});

test("explicit empty optional runtime value overrides build fallback", () => {
  const resolved = resolvePublicConfigValue(
    "VITE_OIDC_AUDIENCE",
    { VITE_OIDC_AUDIENCE: "" },
    { VITE_OIDC_AUDIENCE: "old-audience" },
  );
  assert.equal(resolved.source, "runtime");
  assert.equal(resolved.ok, true);
  assert.equal(resolved.value, "");
});

test("runtime collector serializes only allowlisted keys and neutralizes invalid public values", () => {
  const { config, errors } = collectPublicRuntimeConfig({
    VITE_API_BASE_URL: "http://remote.example.test",
    VITE_OIDC_CLIENT_ID: "client-123",
    OPENAI_API_KEY: "must-not-leak",
  });
  assert.deepEqual(Object.keys(config).sort(), ["VITE_API_BASE_URL", "VITE_OIDC_CLIENT_ID"].sort());
  assert.equal(config.VITE_API_BASE_URL, "");
  assert.equal(config.VITE_OIDC_CLIENT_ID, "client-123");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].key, "VITE_API_BASE_URL");
});
