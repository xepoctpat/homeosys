import assert from "node:assert/strict";
import test from "node:test";
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

test("reseeds with fresh random patterns by default", () => {
  const engine = new SimEngine();
  engine.allocate(64, 48);
  engine.seed("homeostat");
  const firstSeed = engine.seedKey;
  const firstPattern = Array.from(engine.alive);

  engine.seed("homeostat");

  assert.notEqual(engine.seedKey, firstSeed);
  assert.notDeepEqual(Array.from(engine.alive), firstPattern);
});

test("clear and paint recalculate population and viability metrics", () => {
  const engine = new SimEngine();
  engine.allocate(32, 24);
  engine.seed("homeostat");

  const before = engine.snapshot();
  assert.ok(before.population > 0);

  engine.clear();
  assert.equal(engine.snapshot().population, 0);
  assert.equal(engine.snapshot().viability, 0);

  engine.paint(5, 5, "life", 1);
  const afterPaint = engine.snapshot();
  assert.ok(afterPaint.population > 0);
  assert.ok(afterPaint.viability > 0);
});
