import test from "node:test";
import assert from "node:assert/strict";

import {
  computeEvolutionSignals,
  scoreLabel,
  signalStatusLabel,
} from "../src/lib/evolutionSignals.mjs";

const healthy = { status: "ok" };

test("sample zero becomes insufficient evidence instead of a neutral score", () => {
  const signal = computeEvolutionSignals({
    items: [{ id: "p1", status: "pending_approval", execution_enabled: false }],
    executions: [],
    agents: [],
    health: healthy,
    capabilities: {},
    lastRefresh: "now",
  });

  const reliability = signal.fronts.find((item) => item.key === "operational_reliability");
  const evidence = signal.fronts.find((item) => item.key === "evidence");

  assert.equal(reliability.sample_count, 0);
  assert.equal(reliability.score, null);
  assert.equal(reliability.confidence, 0);
  assert.equal(reliability.signal_status, "insufficient_evidence");

  assert.equal(evidence.sample_count, 0);
  assert.equal(evidence.score, null);
  assert.equal(evidence.confidence, 0);
  assert.equal(evidence.signal_status, "insufficient_evidence");
});

test("configuration-only agents do not receive a measured knowledge score", () => {
  const signal = computeEvolutionSignals({
    items: [],
    executions: [],
    agents: [{ id: "orion", name: "Orion", capabilities: ["audit", "architecture"] }],
    health: healthy,
    capabilities: { audit: true },
    lastRefresh: "now",
  });

  assert.equal(signal.agentSignals.length, 1);
  assert.equal(signal.agentSignals[0].score, null);
  assert.equal(signal.agentSignals[0].sample_count, 0);
  assert.equal(signal.agentSignals[0].signal_status, "configuration_only");

  const knowledge = signal.fronts.find((item) => item.key === "agent_knowledge");
  assert.equal(knowledge.score, null);
  assert.equal(knowledge.signal_status, "insufficient_evidence");
});

test("explicit evaluated agent signal can produce a measured score", () => {
  const signal = computeEvolutionSignals({
    items: [],
    executions: [],
    agents: [{
      id: "orion",
      name: "Orion",
      evaluation_score: 84,
      evaluation_sample_count: 12,
    }],
    health: healthy,
    capabilities: { audit: true },
    lastRefresh: "now",
  });

  assert.equal(signal.agentSignals[0].score, 84);
  assert.equal(signal.agentSignals[0].sample_count, 12);

  const knowledge = signal.fronts.find((item) => item.key === "agent_knowledge");
  assert.equal(knowledge.score, 84);
  assert.equal(knowledge.sample_count, 12);
});

test("overall ignores metrics without evidence", () => {
  const signal = computeEvolutionSignals({
    items: [{ id: "p1", status: "rejected", execution_enabled: false }],
    executions: [],
    agents: [],
    health: healthy,
    capabilities: {},
    lastRefresh: "now",
  });

  const measured = signal.fronts.filter((item) => item.score !== null && Number.isFinite(Number(item.score)));
  const expected = Math.round(
    measured.reduce((sum, item) => sum + Number(item.score), 0) / measured.length,
  );
  assert.equal(signal.overall, expected);
});

test("source failure lowers reliability and never creates NaN", () => {
  const signal = computeEvolutionSignals({
    items: [],
    executions: [],
    agents: [],
    health: null,
    capabilities: null,
    lastRefresh: "now",
    sourceErrors: "health:timeout capabilities:timeout executions:timeout",
  });

  assert.equal(signal.reliability, "insufficient_evidence");
  assert.equal(Number.isNaN(signal.overall), false);
  signal.fronts.forEach((item) => {
    assert.equal(Number.isNaN(item.confidence), false);
    if (item.score !== null) {
      assert.ok(item.score >= 0 && item.score <= 100);
    }
  });
});

test("display helpers use honest labels", () => {
  assert.equal(scoreLabel(null), "—");
  assert.equal(scoreLabel(undefined), "—");
  assert.equal(scoreLabel(88), "88");
  assert.equal(signalStatusLabel("insufficient_evidence"), "Evidência insuficiente");
});
