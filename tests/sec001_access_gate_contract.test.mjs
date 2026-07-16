import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repo, relativePath), "utf8");
}

test("beta gate is server-side and contains no client secret allowlist", () => {
  const source = read("src/routes/BetaAccessGate.jsx");

  assert.match(source, /\/api\/access-grants\/validate/);
  assert.match(source, /\/api\/access-grants\/status/);
  assert.match(source, /credentials:\s*"include"/);
  assert.doesNotMatch(source, /PUBLIC_CODES/);
  assert.doesNotMatch(source, /VITE_[A-Z0-9_]*(CODE|SECRET|TOKEN|KEY)/);
  assert.doesNotMatch(source, /internal\s*===\s*"1"/);
  assert.doesNotMatch(source, /localStorage\.setItem\([^)]*code/i);
});

test("auth page does not recognize retired plaintext codes", () => {
  const files = [
    "src/routes/AuthPage.jsx",
    "src/routes/BetaAccessGate.jsx",
    "main.py",
  ];
  const retiredHashes = new Set([
    "4871d5c295f600e2bf4bfbc2bc850163ba4624337230479375f274387912e172",
    "4e58339d184b8f19068ec1828ac738a57a104500c878315a9adc0bbe6039f278",
    "24b6ab8d69e8c79401a7d9344fdbc519cd45a8c4e549c83bf058bb84901c5fef",
  ]);
  for (const relativePath of files) {
    const source = read(relativePath);
    const tokens = source.match(/[A-Za-z0-9_-]{8,128}/g) || [];
    const matched = tokens.some((token) =>
      retiredHashes.has(
        crypto.createHash("sha256").update(token.toUpperCase()).digest("hex")
      )
    );
    assert.equal(matched, false, relativePath);
  }
  assert.equal(read("src/routes/AuthPage.jsx").toLowerCase().includes("readstoredaccesscode"), false);
});

test("frontend source contains no sensitive VITE access-code variables", () => {
  const files = [
    "src/routes/BetaAccessGate.jsx",
    "src/routes/AuthPage.jsx",
    "server.cjs",
  ];
  const source = files.map(read).join("\n");

  for (const variable of [
    "VITE_ORKIO_INTERNAL_GATE_CODE",
    "VITE_ORKIO_BETA_ACCESS_CODES",
    "VITE_PATROAI_PRIVATE_ACCESS_CODES",
    "VITE_PATROAI_INTERNAL_GATE_CODE",
  ]) {
    assert.equal(source.includes(variable), false, variable);
  }
});


test("runtime proxy keeps browser API calls same-origin when enabled", () => {
  const source = read("server.cjs");
  assert.match(source, /const USE_API_PROXY/);
  assert.match(source, /USE_API_PROXY \? "\/api" : PUBLIC_API_BASE_URL/);
  assert.match(source, /API_BASE_URL:\s*BROWSER_API_BASE_URL/);
  assert.match(source, /VITE_API_BASE_URL:\s*BROWSER_API_BASE_URL/);
});
