import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const oidc = fs.readFileSync("src/auth/oidc.ts", "utf8");
const callback = fs.readFileSync("src/routes/AuthCallback.tsx", "utf8");
const console_ = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const invite = fs.readFileSync("src/routes/InviteAccept.tsx", "utf8");
const app = fs.readFileSync("src/App.tsx", "utf8");
const landing = fs.readFileSync("src/routes/Landing.tsx", "utf8");

test("OIDC uses Authorization Code with PKCE S256", () => {
  assert.match(oidc, /response_type", "code"/);
  assert.match(oidc, /code_challenge_method", "S256"/);
  assert.match(oidc, /code_verifier/);
  assert.match(oidc, /crypto\.subtle\.digest/);
});

test("OIDC SPA never contains a client secret", () => {
  assert.doesNotMatch(oidc, /CLIENT_SECRET|client_secret/);
});

test("OIDC validates state and nonce", () => {
  assert.match(oidc, /OIDC_STATE_MISMATCH/);
  assert.match(oidc, /OIDC_NONCE_MISMATCH/);
  assert.match(oidc, /claims\.nonce !== transaction\.nonce/);
});

test("OIDC return path is same-origin only", () => {
  assert.match(oidc, /parsed\.origin !== currentOrigin\(\)/);
  assert.match(oidc, /return "\/app"/);
});

test("OIDC token exchange is form encoded", () => {
  assert.match(oidc, /application\/x-www-form-urlencoded/);
  assert.match(oidc, /grant_type: "authorization_code"/);
});

test("OIDC callback route exists", () => {
  assert.match(app, /path="\/auth\/callback"/);
  assert.match(callback, /completeLogin\(\)/);
});

test("access token expiry is enforced", () => {
  assert.match(api, /TOKEN_EXPIRY_STORAGE_KEY/);
  assert.match(api, /Date\.now\(\) >= expiresAt/);
  assert.match(api, /clearToken\(\)/);
});

test("401 clears auth and emits auth-required event", () => {
  assert.match(api, /AUTH_REQUIRED_EVENT/);
  assert.match(api, /window\.dispatchEvent/);
  assert.match(api, /if \(response\.status === 401\) clearToken\(\)/);
});

test("stream configuration failure still reaches terminal finally", () => {
  const start = api.indexOf("export async function streamMessage");
  const stream = api.slice(start);
  assert.ok(stream.indexOf("try {") < stream.indexOf("ensureConfigured();"));
  assert.match(stream, /finally \{\s*finish\(\{ status: "closed" \}\);/);
});

test("console always releases sending state in finally", () => {
  const start = console_.indexOf("async function handleSend");
  const block = console_.slice(start, console_.indexOf("async function handleFile", start));
  assert.match(block, /finally \{/);
  assert.match(block, /setSending\(false\)/);
  assert.match(block, /abortRef\.current = null/);
});

test("console blocks product actions before authentication", () => {
  assert.match(console_, /requireAuthenticated/);
  assert.match(console_, /disabled=\{!authenticated \|\| !configured\}/);
  assert.match(console_, /Autentique-se para usar conversas/);
});

test("landing starts login when OIDC is configured", () => {
  assert.match(landing, /isOidcConfigured/);
  assert.match(landing, /beginLogin\("\/app"\)/);
});

test("invite preserves target through authentication", () => {
  assert.match(invite, /beginLogin\(`\/invite\/\$\{encodeURIComponent\(token\)\}`\)/);
});

test("auth storage uses sessionStorage and never localStorage", () => {
  assert.match(oidc, /sessionStorage/);
  assert.doesNotMatch(oidc, /localStorage/);
  assert.doesNotMatch(api, /localStorage/);
});
