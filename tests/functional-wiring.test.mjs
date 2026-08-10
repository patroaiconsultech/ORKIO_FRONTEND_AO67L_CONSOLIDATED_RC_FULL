import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api = fs.readFileSync("src/api.ts", "utf8");
const console_ = fs.readFileSync("src/routes/AppConsole.tsx", "utf8");
const app = fs.readFileSync("src/App.tsx", "utf8");
const invite = fs.readFileSync("src/routes/InviteAccept.tsx", "utf8");

// --------------------------------------------------------------------------
// Cliente de API
// --------------------------------------------------------------------------

test("api exposes json, form and stream helpers", () => {
  assert.match(api, /export async function apiJson/);
  assert.match(api, /export async function apiForm/);
  assert.match(api, /export async function streamMessage/);
});

test("form upload never sets Content-Type manually", () => {
  const form = api.slice(api.indexOf("export async function apiForm"));
  const body = form.slice(0, form.indexOf("\n}"));
  assert.match(body, /headers\.delete\("Content-Type"\)/);
  assert.doesNotMatch(body, /headers\.set\("Content-Type"/);
});

test("json helper only sets Content-Type when a body exists", () => {
  assert.match(
    api,
    /if \(init\.body !== undefined && init\.body !== null\)\s*\n?\s*headers\.set\("Content-Type", "application\/json"\)/,
  );
});

test("api errors carry status and code", () => {
  assert.match(api, /export class ApiError extends Error/);
  assert.match(api, /readonly status: number/);
  assert.match(api, /readonly code: string/);
});

test("401 clears the stored token", () => {
  assert.match(api, /if \(response\.status === 401\) clearToken\(\)/);
});

test("token can be written, read and cleared", () => {
  assert.match(api, /export function setToken/);
  assert.match(api, /export function getToken/);
  assert.match(api, /export function clearToken/);
  assert.match(api, /sessionStorage\.setItem\(TOKEN_STORAGE_KEY/);
});

test("missing api base url is reported explicitly", () => {
  assert.match(api, /API_BASE_URL_NOT_CONFIGURED/);
  assert.match(api, /export function isApiBaseConfigured/);
});

test("stream parses status, chunk, error and done", () => {
  for (const event of ["status", "chunk", "error", "done"]) {
    assert.match(api, new RegExp(`event === "${event}"`));
  }
});

test("stream always reaches a terminal state", () => {
  assert.match(api, /let terminated = false/);
  assert.match(api, /handlers\.onDone\?\.\(data\)/);
  assert.match(api, /finish\(\{ status: "failed" \}\)/);
  assert.match(api, /finish\(\{ status: "closed" \}\)/);
});


test("stream target uses explicit technical namespace", () => {
  assert.match(api, /export function technicalAgentTarget/);
  assert.match(api, /normalized\.startsWith\("id:"\)/);
  assert.match(api, /return `id:\$\{normalized\}`/);
  assert.match(console_, /selectedAgent \? technicalAgentTarget\(selectedAgent\.slug\) : "Josué"/);
});

test("stream uses fetch with Authorization instead of EventSource", () => {
  assert.doesNotMatch(api, /new EventSource/);
  assert.match(api, /getReader\(\)/);
  assert.match(api, /Accept", "text\/event-stream/);
});

test("path parameters are encoded", () => {
  assert.match(api, /encodeURIComponent\(threadId\)/);
});

// --------------------------------------------------------------------------
// Console
// --------------------------------------------------------------------------

test("new conversation button is wired", () => {
  assert.match(console_, /onClick=\{handleNewThread\}/);
  assert.match(console_, /async function handleNewThread/);
});

test("send button is wired and guarded", () => {
  assert.match(console_, /onClick=\{handleSend\}/);
  assert.match(console_, /disabled=\{[\s\S]*sending[\s\S]*!message\.trim\(\)[\s\S]*\}/);
});

test("file input is wired", () => {
  assert.match(console_, /onChange=\{handleFile\}/);
  assert.match(console_, /uploadAttachment\(threadId, file\)/);
});

test("thread list is rendered and selectable", () => {
  assert.match(console_, /listThreads/);
  assert.match(console_, /onClick=\{\(\) => selectThread\(thread\.id\)\}/);
});

test("voice button explains why it is disabled", () => {
  assert.match(console_, /title="Voz ainda não habilitada"/);
  assert.match(console_, /aria-label="Voz"/);
});

test("invite has error handling", () => {
  assert.match(console_, /setInviteError/);
  assert.match(console_, /catch \(err\)/);
});

test("errors are surfaced with role alert", () => {
  assert.match(console_, /role="alert"/);
  assert.match(console_, /function describe/);
});

test("known backend error codes are translated", () => {
  for (const code of [
    "LLM_NOT_CONFIGURED",
    "PRINCIPAL_NOT_PROVISIONED",
    "INVITE_ROLE_REQUIRED",
    "ARTIFACTS_DISABLED",
    "THREAD_READ_ONLY",
  ]) {
    assert.match(console_, new RegExp(code));
  }
});

test("console does not use window.alert", () => {
  assert.doesNotMatch(console_, /window\.alert/);
});

test("streaming text is announced politely", () => {
  assert.match(console_, /aria-live="polite"/);
});

// --------------------------------------------------------------------------
// Rota de convite
// --------------------------------------------------------------------------

test("invite route exists", () => {
  assert.match(app, /path="\/invite\/:token" element={<InviteAccept/);
});

test("invite route requires authentication before accepting", () => {
  assert.match(invite, /getToken\(\)/);
  assert.match(invite, /Autentique-se para aceitar este convite/);
});

test("invite route redirects to the thread on success", () => {
  assert.match(invite, /navigate\(`\/app\?thread=\$\{encodeURIComponent\(result\.thread_id\)\}`/);
});

// --------------------------------------------------------------------------
// Segurança
// --------------------------------------------------------------------------

test("no secrets are present in the new sources", () => {
  for (const source of [api, console_, invite]) {
    assert.doesNotMatch(
      source,
      /PRIVATE_KEY|OPENAI_API_KEY|DATABASE_URL|CLIENT_SECRET|sk-proj/,
    );
  }
});

test("token is never placed in a URL", () => {
  assert.doesNotMatch(api, /\?token=\$\{/);
  assert.doesNotMatch(api, /access_token=\$\{/);
});
