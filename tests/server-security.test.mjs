import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const server = fs.readFileSync("server.mjs", "utf8");

test("server serves manifest and service worker with correct controls", () => {
  assert.match(server, /application\/manifest\+json/);
  assert.match(server, /Service-Worker-Allowed/);
  assert.match(server, /pathname === "\/sw\.js"/);
  assert.match(server, /Cache-Control", "no-store"/);
});

test("server emits baseline security headers", () => {
  for (const header of [
    "Content-Security-Policy",
    "Referrer-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Permissions-Policy",
  ]) {
    assert.match(server, new RegExp(header));
  }
});

test("server keeps SPA fallback and blocks path traversal", () => {
  assert.match(server, /index\.html/);
  assert.match(server, /file\.startsWith/);
  assert.match(server, /decodeURIComponent/);
});
