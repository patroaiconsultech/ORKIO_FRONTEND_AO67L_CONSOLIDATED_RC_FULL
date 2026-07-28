import test from "node:test";
import assert from "node:assert/strict";
import {
  TEAM_EXECUTION_CONTRACT_VERSION,
  isTeamExecutionRequest,
  isTraceOnlyTeamChildEvent,
  normalizeTeamExecutionRequest,
  shouldAppendStreamEventToAssistant,
} from "../src/lib/teamExecutionContract.mjs";

test("Team payload removes conflicting singular Orkio destination", () => {
  const payload = normalizeTeamExecutionRequest({
    dest_mode: "team",
    agent_id: "orkio-uuid",
    target_agent_slug: "orkio",
    target_agent_slugs: ["orkio", "orion", "chris", "laura"],
    visible_agent: "Team",
    multi_agent_turn: true,
  });
  assert.equal(payload.agent_id, null);
  assert.equal(payload.target_agent_slug, null);
  assert.equal(payload.target_kind, "team");
  assert.equal(payload.target_team_slug, "team");
  assert.equal(payload.orchestrator_slug, "orkio");
  assert.equal(payload.turn_owner, "team");
  assert.equal(payload.ownership_locked, true);
  assert.equal(payload.team_execution_version, TEAM_EXECUTION_CONTRACT_VERSION);
  assert.deepEqual(payload.target_agent_slugs, ["orkio", "chris", "orion", "laura"]);
});

test("API sanitizer is wired to canonicalize Team before removing nulls", async () => {
  const apiSource = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/ui/api.js", import.meta.url), "utf8")
  );
  assert.match(apiSource, /normalizeTeamExecutionRequest\(payload \|\| \{\}\)/);
  assert.match(apiSource, /target_kind/);
  assert.match(apiSource, /team_execution_version/);

  const payload = normalizeTeamExecutionRequest({
    thread_id: "thread-1",
    message: "@Team, respondam todos com OI",
    dest_mode: "team",
    agent_id: "orkio-uuid",
    target_agent_slug: "orkio",
    target_agent_slugs: ["orkio", "orion", "chris", "laura"],
    visible_agent: "Team",
    multi_agent_turn: true,
  });
  assert.equal(payload.agent_id, null);
  assert.equal(payload.target_agent_slug, null);
  assert.equal(payload.target_kind, "team");
  assert.equal(payload.response_control, "team_execution_engine");
});

test("single agent request is not rewritten as Team", () => {
  const original = {
    dest_mode: "single",
    agent_id: "orion-uuid",
    target_agent_slug: "orion",
    target_agent_slugs: ["orion"],
    visible_agent: "Orion",
  };
  assert.equal(isTeamExecutionRequest(original), false);
  assert.deepEqual(normalizeTeamExecutionRequest(original), original);
});


test("Team room with one explicit speaker remains a direct turn", () => {
  const direct = {
    dest_mode: "team",
    agent_id: "chris-uuid",
    target_agent_slug: "chris",
    target_agent_slugs: ["chris"],
    visible_agent: "Chris",
    multi_agent_turn: false,
  };
  assert.equal(isTeamExecutionRequest(direct), false);
  assert.deepEqual(normalizeTeamExecutionRequest(direct), direct);
});

test("Team child trace events never contaminate the final assistant bubble", () => {
  const child = {
    team_child: true,
    presentation_mode: "trace_only",
    agent_id: "chris",
    content: "Contribuição de Chris",
  };
  assert.equal(isTraceOnlyTeamChildEvent(child), true);
  assert.equal(shouldAppendStreamEventToAssistant("agent_chunk", child), false);
  assert.equal(shouldAppendStreamEventToAssistant("agent_done", child), false);
  assert.equal(
    shouldAppendStreamEventToAssistant("chunk", { agent_id: "team", content: "Síntese final" }),
    true
  );
});

test("AppConsole consumes Team plan and consolidation as execution trace", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/routes/AppConsole.jsx", import.meta.url), "utf8")
  );
  assert.match(source, /normalizeTeamExecutionRequest/);
  assert.match(source, /team_plan/);
  assert.match(source, /consolidation/);
  assert.match(source, /isTraceOnlyTeamChildEvent/);
});
