import fs from "node:fs";
import path from "node:path";

const lockPath = path.resolve("package-lock.json");
const packagePath = path.resolve("package.json");

function fail(message) {
  console.error(`LOCKFILE_VERIFY=FAIL\n${message}`);
  process.exit(1);
}

if (!fs.existsSync(lockPath)) {
  fail(
    "package-lock.json is missing. Run the authorized lockfile " +
      "materialization workflow; do not regenerate it silently during build.",
  );
}

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));

if (lock.lockfileVersion !== 3) {
  fail(`lockfileVersion must be 3, received ${lock.lockfileVersion}`);
}
if (lock.name !== pkg.name || lock.version !== pkg.version) {
  fail("package identity differs between package.json and package-lock.json");
}
const root = lock.packages?.[""];
if (!root) fail("lockfile root package entry is missing.");
if (root.name !== pkg.name || root.version !== pkg.version) {
  fail("lockfile root package identity mismatch.");
}

for (const [location, entry] of Object.entries(lock.packages || {})) {
  if (!entry || typeof entry !== "object") continue;
  const resolved = entry.resolved;
  if (typeof resolved === "string") {
    if (!resolved.startsWith("https://registry.npmjs.org/")) {
      fail(`non-approved resolved URL at ${location}: ${resolved}`);
    }
  }
  if (
    location !== "" &&
    typeof entry.version === "string" &&
    !entry.integrity
  ) {
    fail(`integrity is missing at ${location}`);
  }
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      lockfileVersion: lock.lockfileVersion,
      packageCount: Object.keys(lock.packages || {}).length,
      registry: "https://registry.npmjs.org/",
    },
    null,
    2,
  ),
);
