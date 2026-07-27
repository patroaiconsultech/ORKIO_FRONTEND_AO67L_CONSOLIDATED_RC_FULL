import assert from "node:assert/strict";
import test from "node:test";

import {
  AGENT_UNAVAILABLE_NOT_PERSISTED,
  agentUnavailableMessage,
  filterSelectableAgents,
  findAgentAvailabilityBySlug,
  isAgentSelectable,
  normalizeAgentAvailability,
} from "../src/lib/executableAgentAvailability.mjs";


test("persisted Laura is selectable", () => {
  const laura = {
    id: "db-laura",
    agent_key: "laura",
    display_name: "Laura",
    persisted: true,
    executable: true,
    available: true,
    selection_kind: "agent",
  };

  const state = normalizeAgentAvailability(laura);
  assert.equal(state.slug, "laura");
  assert.equal(state.selectable, true);
  assert.equal(isAgentSelectable(laura), true);
});


test("roster-only Laura is explicitly unavailable", () => {
  const laura = {
    id: "roster::laura",
    agent_key: "laura",
    persisted: false,
    source_status: "roster_only",
    executable: false,
    available: false,
    reason_unavailable: AGENT_UNAVAILABLE_NOT_PERSISTED,
  };

  const state = findAgentAvailabilityBySlug([laura], "Laura");
  assert.equal(state.slug, "laura");
  assert.equal(state.selectable, false);
  assert.equal(state.reason_unavailable, AGENT_UNAVAILABLE_NOT_PERSISTED);
  assert.match(agentUnavailableMessage(state), /ainda não disponível/i);
});


test("Team remains a room selection, not an executable Agent.id", () => {
  const team = {
    id: "roster::team",
    agent_key: "team",
    persisted: false,
    executable: false,
    available: false,
    selection_kind: "room",
  };

  const state = normalizeAgentAvailability(team);
  assert.equal(state.selection_kind, "room");
  assert.equal(state.executable, false);
  assert.equal(state.selectable, true);
});


test("destination list excludes unavailable specialists but keeps rooms", () => {
  const agents = [
    {
      id: "db-orkio",
      agent_key: "orkio",
      persisted: true,
      executable: true,
      available: true,
    },
    {
      id: "roster::laura",
      agent_key: "laura",
      persisted: false,
      executable: false,
      available: false,
    },
    {
      id: "roster::team",
      agent_key: "team",
      selection_kind: "room",
      persisted: false,
      executable: false,
      available: false,
    },
  ];

  const filtered = filterSelectableAgents(agents);
  assert.deepEqual(
    filtered.map((item) => item.agent_key),
    ["orkio", "team"]
  );
});


test("AppConsole consumes availability contract before selection", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile(
    new URL("../src/routes/AppConsole.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /filterSelectableAgents\(list\)/);
  assert.match(source, /findAgentAvailabilityBySlug\(agents, agentSlug\)/);
  assert.match(source, /disabled=\{unavailable\}/);
  assert.match(source, /agentUnavailableMessage\(availability\)/);
});
