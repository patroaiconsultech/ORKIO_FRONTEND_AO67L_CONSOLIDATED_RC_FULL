import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const output = path.join(root, "build-evidence");
fs.mkdirSync(output, { recursive: true });

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function sha256File(file) {
  return sha256Buffer(fs.readFileSync(file));
}
function walk(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symlink forbidden: ${absolute}`);
    if (entry.isDirectory()) result.push(...walk(absolute));
    if (entry.isFile()) result.push(absolute);
  }
  return result.sort();
}
function treeEvidence(directory) {
  const files = walk(directory).map((file) => ({
    path: path.relative(directory, file).replaceAll(path.sep, "/"),
    bytes: fs.statSync(file).size,
    sha256: sha256File(file),
  }));
  const canonical = files.map((item) => `${item.sha256}  ${item.path}`).join("\n") + "\n";
  return { files, treeSha256: sha256Buffer(canonical), canonical };
}
function command(command, args = []) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

const dist = treeEvidence(path.join(root, "dist"));
const sourceCandidates = [
  "index.html",
  "package.json",
  "package-lock.json",
  "server.mjs",
  "vite.config.ts",
  "tsconfig.json",
  "public",
  "src",
  "scripts",
  "tests",
];
const sourceFiles = [];
for (const candidate of sourceCandidates) {
  const absolute = path.join(root, candidate);
  if (!fs.existsSync(absolute)) continue;
  if (fs.statSync(absolute).isDirectory()) sourceFiles.push(...walk(absolute));
  else sourceFiles.push(absolute);
}
sourceFiles.sort();
const sourceLines = sourceFiles.map(
  (file) => `${sha256File(file)}  ${path.relative(root, file).replaceAll(path.sep, "/")}`,
);
const sourceCanonical = sourceLines.join("\n") + "\n";

const evidence = {
  schemaVersion: 1,
  release: "2.0.0-alpha.2.2",
  generatedAtUtc: new Date().toISOString(),
  builder: {
    githubRepository: process.env.GITHUB_REPOSITORY || "LOCAL",
    githubRunId: process.env.GITHUB_RUN_ID || "LOCAL",
    githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT || "LOCAL",
    githubSha: process.env.GITHUB_SHA || "LOCAL",
  },
  toolchain: {
    node: process.version,
    npm: command("npm", ["--version"]),
    registry: command("npm", ["config", "get", "registry"]),
  },
  inputs: {
    packageJsonSha256: sha256File(path.join(root, "package.json")),
    packageLockSha256: sha256File(path.join(root, "package-lock.json")),
    sourceTreeSha256: sha256Buffer(sourceCanonical),
  },
  outputs: {
    distTreeSha256: dist.treeSha256,
    distFileCount: dist.files.length,
    distIndexHtmlSha256: sha256File(path.join(root, "dist", "index.html")),
  },
};

fs.writeFileSync(
  path.join(output, "BUILD_PROVENANCE.json"),
  JSON.stringify(evidence, null, 2) + "\n",
);
fs.writeFileSync(path.join(output, "SOURCE_SHA256SUMS.txt"), sourceCanonical);
fs.writeFileSync(path.join(output, "DIST_SHA256SUMS.txt"), dist.canonical);
console.log(JSON.stringify(evidence, null, 2));
