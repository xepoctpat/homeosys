import assert from "node:assert/strict";
import test from "node:test";
import { getLocalAgent, LOCAL_AGENTS, LOCAL_SKILLS, triageSimulation } from "./index.ts";
import type { Metrics } from "../../sim/types.ts";

function metrics(overrides: Partial<Metrics> = {}): Metrics {
  return {
    generation: 12,
    population: 120,
    regulators: 4,
    density: 0.12,
    entropy: 0.6,
    meanHeat: 0.5,
    meanEnergy: 0.5,
    viability: 0.7,
    setpoint: 0.16,
    rule: "B3/S23",
    adaptations: 0,
    probing: false,
    loops: [],
    popHistory: [],
    viaHistory: [],
    ...overrides,
  };
}

test("registers the local triage agent and its skill", () => {
  assert.deepEqual(LOCAL_SKILLS.map((skill) => skill.id), ["simulation-observer"]);
  assert.deepEqual(LOCAL_AGENTS.map((agent) => agent.id), ["simulation-triage"]);
  assert.equal(getLocalAgent("simulation-triage").skills[0], "simulation-observer");
});

test("reports collapse before lower-priority conditions", () => {
  const result = triageSimulation({
    metrics: metrics({ population: 0, viability: 0 }),
  });

  assert.equal(result.summary, "Intervention recommended: the field is losing viability.");
  assert.equal(result.findings[0]?.code, "collapse");
  assert.equal(result.findings[0]?.severity, "critical");
});

test("reports stable fields and active feedback without inventing warnings", () => {
  const result = triageSimulation({
    metrics: metrics({
      loops: [{ id: "homeostasis", label: "Homeostasis", active: true, note: "holding" }],
    }),
  });

  assert.equal(result.summary, "The field is within a stable operating range.");
  assert.deepEqual(
    result.findings.map((item) => item.code),
    ["feedback-active"],
  );
});
