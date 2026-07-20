import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(
  resolve(here, "../src/routes/AdminEvolutionCenter.jsx"),
  "utf8",
);
const graphSource = readFileSync(
  resolve(here, "../src/components/admin/EvolutionSignalGraph.jsx"),
  "utf8",
);

test("polling pauses while the admin tab is hidden", () => {
  assert.match(routeSource, /document\.hidden/);
  assert.match(routeSource, /visibilitychange/);
});

test("summary and static signal polling use different intervals", () => {
  assert.match(routeSource, /60_000/);
  assert.match(routeSource, /300_000/);
  assert.match(
    routeSource,
    /refreshSummary\(\{ includeStatic: false, silent: true \}\)/,
  );
  assert.match(routeSource, /loadAgentCapabilitySignals\(\)/);
});

test("selected proposal detail is not refreshed by the minute polling loop", () => {
  const minuteLoop = routeSource.match(
    /window\.setInterval\(\(\) => \{[\s\S]*?\}, 60_000\)/,
  )?.[0] || "";

  assert.ok(minuteLoop);
  assert.doesNotMatch(minuteLoop, /loadDetail/);
  assert.doesNotMatch(minuteLoop, /loadPlan/);
});

test("graph uses explicit coverage labels and no native metric tooltip", () => {
  assert.match(graphSource, /indice confiavel/);
  assert.match(graphSource, /Score bruto/);
  assert.match(graphSource, /Score confiavel/);
  assert.match(graphSource, /frentes sem amostra/);
  assert.match(graphSource, /fontes indisponíveis/);
  assert.doesNotMatch(graphSource, /title=\{`status=/);
  assert.match(graphSource, /MetricInfoPopover/);
});
