import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const dockerfile = fs.readFileSync("Dockerfile", "utf8");
const lockWorkflow = fs.readFileSync(
  ".github/workflows/00-materialize-lockfile.yml",
  "utf8",
);
const verifyWorkflow = fs.readFileSync(
  ".github/workflows/01-verify-build.yml",
  "utf8",
);
const verifier = fs.readFileSync(
  "scripts/verify-lockfile.mjs",
  "utf8",
);

test("toolchain is exact and recorded", () => {
  assert.equal(packageJson.engines.node, "20.20.2");
  assert.equal(packageJson.engines.npm, "10.8.2");
  assert.equal(packageJson.packageManager, "npm@10.8.2");
});

test("lockfile workflow is manual and readonly", () => {
  assert.match(lockWorkflow, /workflow_dispatch/);
  assert.match(lockWorkflow, /contents: read/);
  assert.doesNotMatch(lockWorkflow, /git push|contents: write|create-pull-request/);
});

test("lockfile workflow uploads review evidence", () => {
  assert.match(lockWorkflow, /package-lock\.json/);
  assert.match(lockWorkflow, /LOCKFILE_SHA256SUMS\.txt/);
  assert.match(lockWorkflow, /upload-artifact@043fb46/);
});

test("normal workflow requires package-lock before npm ci", () => {
  const requireIndex = verifyWorkflow.indexOf("test -f package-lock.json");
  const buildIndex = verifyWorkflow.indexOf("scripts/verify-and-build.sh");
  assert.ok(requireIndex >= 0);
  assert.ok(buildIndex > requireIndex);
});

test("Docker build is fail-closed on package-lock", () => {
  assert.match(dockerfile, /COPY package\.json package-lock\.json/);
  assert.match(dockerfile, /verify-lockfile\.mjs/);
  assert.match(dockerfile, /npm ci --ignore-scripts/);
  assert.doesNotMatch(dockerfile, /npm install\s*$/m);
});

test("lock verifier restricts resolved packages to official registry", () => {
  assert.match(verifier, /https:\/\/registry\.npmjs\.org\//);
  assert.match(verifier, /non-approved resolved URL/);
});

test("lock verifier requires integrity and lockfile version 3", () => {
  assert.match(verifier, /lockfileVersion !== 3/);
  assert.match(verifier, /integrity is missing/);
});

test("workflows pin actions to full commits", () => {
  const uses = [...(lockWorkflow + verifyWorkflow).matchAll(/uses:\s+\S+@([0-9a-f]{40})/g)];
  assert.ok(uses.length >= 6);
});

test("no workflow auto-commits generated lockfile", () => {
  for (const workflow of [lockWorkflow, verifyWorkflow]) {
    assert.doesNotMatch(workflow, /git commit|git push|gh pr create/);
  }
});
