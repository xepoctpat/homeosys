import assert from "node:assert/strict";
import test from "node:test";
import { classicGenome } from "./genome.ts";
import { SimEngine } from "./engine.ts";
import {
  DEFAULT_SETTINGS,
  STUDY_CONDITIONS,
  type SimSettings,
} from "./types.ts";

function packSettings(id: "baseline" | "homeostatic" | "ultrastable"): SimSettings {
  const pack = STUDY_CONDITIONS.find((c) => c.id === id);
  assert.ok(pack);
  return { ...DEFAULT_SETTINGS, ...pack.settings };
}

function copyFields(engine: SimEngine) {
  return {
    alive: Array.from(engine.alive),
    heat: Array.from(engine.heat),
    energy: Array.from(engine.energy),
    seedKey: engine.seedKey,
    generation: engine.generation,
  };
}

test("identical cols/rows/settings/seedKey replay the same alive heat and energy", () => {
  const settings = packSettings("homeostatic");
  const seedKey = 0xa5a51234;
  const steps = 40;

  const a = new SimEngine();
  a.allocate(48, 36);
  a.applySettings(settings);
  a.seed("homeostat", seedKey);
  for (let i = 0; i < steps; i++) a.step();

  const b = new SimEngine();
  b.allocate(48, 36);
  b.applySettings(settings);
  b.seed("homeostat", seedKey);
  for (let i = 0; i < steps; i++) b.step();

  const left = copyFields(a);
  const right = copyFields(b);
  assert.equal(left.seedKey, seedKey);
  assert.equal(a.snapshot().seedKey, seedKey);
  assert.deepEqual(left.alive, right.alive);
  assert.deepEqual(left.heat, right.heat);
  assert.deepEqual(left.energy, right.energy);
  assert.equal(left.generation, right.generation);
});

test("baseline B3/S23 blinker oscillates with environment and cybernetics off", () => {
  const engine = new SimEngine();
  engine.allocate(24, 24);
  engine.applySettings(packSettings("baseline"));
  engine.genome = classicGenome();
  engine.clear();

  for (const [x, y] of [
    [10, 10],
    [11, 10],
    [12, 10],
  ] as const) {
    engine.paint(x, y, "life", 0);
  }

  assert.equal(engine.snapshot().rule, "B3/S23");
  assert.equal(engine.settings.environment, false);
  assert.equal(engine.settings.cybernetics, false);
  assert.equal(engine.settings.ultraEnabled, false);

  engine.step();
  assert.equal(engine.alive[9 * 24 + 11], 1);
  assert.equal(engine.alive[10 * 24 + 11], 1);
  assert.equal(engine.alive[11 * 24 + 11], 1);
  assert.equal(engine.alive[10 * 24 + 10], 0);
  assert.equal(engine.alive[10 * 24 + 12], 0);

  engine.step();
  assert.equal(engine.alive[10 * 24 + 10], 1);
  assert.equal(engine.alive[10 * 24 + 11], 1);
  assert.equal(engine.alive[10 * 24 + 12], 1);
  assert.equal(engine.alive[9 * 24 + 11], 0);
  assert.equal(engine.alive[11 * 24 + 11], 0);
});

test("baseline glider advances one cell diagonally every four steps", () => {
  const engine = new SimEngine();
  engine.allocate(32, 32);
  engine.applySettings(packSettings("baseline"));
  engine.genome = classicGenome();
  engine.clear();

  const cells = [
    [5, 4],
    [6, 5],
    [4, 6],
    [5, 6],
    [6, 6],
  ] as const;
  for (const [x, y] of cells) engine.paint(x, y, "life", 0);

  for (let i = 0; i < 4; i++) engine.step();

  const expected = [
    [6, 5],
    [7, 6],
    [5, 7],
    [6, 7],
    [7, 7],
  ] as const;
  for (const [x, y] of expected) {
    assert.equal(engine.alive[y * 32 + x], 1, `expected live cell at ${x},${y}`);
  }
  assert.equal(
    engine.alive.reduce((sum, v) => sum + v, 0),
    5,
  );
});

test("study condition packs match the three-condition table", () => {
  const byId = Object.fromEntries(STUDY_CONDITIONS.map((c) => [c.id, c]));
  assert.equal(byId.baseline.settings.environment, false);
  assert.equal(byId.baseline.settings.cybernetics, false);
  assert.equal(byId.baseline.settings.ultraEnabled, false);

  assert.equal(byId.homeostatic.settings.cybernetics, true);
  assert.equal(byId.homeostatic.settings.ultraEnabled, false);

  assert.equal(byId.ultrastable.settings.cybernetics, true);
  assert.equal(byId.ultrastable.settings.ultraEnabled, true);
});
