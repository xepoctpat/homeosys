import assert from "node:assert/strict";
import test from "node:test";
import {
  getLocalAgent,
  LOCAL_AGENTS,
  LOCAL_SKILLS,
  observeOperator,
  triageSimulation,
} from "./index.ts";
import { SimEngine } from "../../sim/engine.ts";
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
  assert.deepEqual(
    LOCAL_SKILLS.map((skill) => skill.id),
    ["simulation-observer", "operator-observation"],
  );
  assert.deepEqual(
    LOCAL_AGENTS.map((agent) => agent.id),
    ["simulation-triage", "operator-observer"],
  );
  assert.equal(getLocalAgent("simulation-triage").skills[0], "simulation-observer");
});

test("operator observer reports runtime errors without touching simulation state", () => {
  const result = observeOperator({
    kind: "operator",
    events: [
      { kind: "action", action: "step", timestamp: 1 },
      { kind: "runtime-error", detail: "canvas failed", timestamp: 2 },
    ],
  });

  assert.equal(result.agentId, "operator-observer");
  assert.equal(result.findings[0]?.code, "runtime-error");
  assert.equal(result.findings[0]?.severity, "critical");
});

test("operator observer identifies repeated controls as possible UI friction", () => {
  const result = observeOperator({
    kind: "operator",
    events: [1, 2, 3, 4].map((timestamp) => ({
      kind: "action" as const,
      action: "reseed" as const,
      timestamp,
    })),
  });

  assert.equal(result.findings[0]?.code, "repeated-action");
  assert.equal(result.findings[0]?.severity, "warning");
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

test("reseeds with fresh patterns while fixed seeds remain deterministic", () => {
  const a = new SimEngine();
  const b = new SimEngine();
  a.allocate(64, 48);
  b.allocate(64, 48);
  a.seed("homeostat");
  b.seed("homeostat");
  assert.notDeepEqual(Array.from(a.alive), Array.from(b.alive));

  const c = new SimEngine();
  const d = new SimEngine();
  c.allocate(64, 48);
  d.allocate(64, 48);
  c.seed("homeostat", 7);
  d.seed("homeostat", 7);
  assert.deepEqual(Array.from(c.alive), Array.from(d.alive));
});

test("clear and paint recalculate live metrics instead of showing stale population state", () => {
  const engine = new SimEngine();
  engine.allocate(40, 30);
  engine.seed("homeostat");

  engine.clear();
  const cleared = engine.snapshot();
  assert.equal(cleared.population, 0);
  assert.equal(cleared.density, 0);
  assert.equal(cleared.viability, 0);

  engine.seed("homeostat");
  engine.paint(5, 5, "erase", 2);
  const painted = engine.snapshot();
  const livePopulation = engine.alive.reduce((sum, cell) => sum + cell, 0);
  assert.equal(painted.population, livePopulation);
  assert.equal(painted.density, livePopulation / engine.alive.length);
});
