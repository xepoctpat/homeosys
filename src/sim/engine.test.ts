import assert from "node:assert/strict";
import test from "node:test";
import { classicGenome } from "./genome.ts";
import { SimEngine, computeDisturbanceW } from "./engine.ts";
import {
  DEFAULT_SETTINGS,
  STUDY_CONDITIONS,
  type DisturbanceSchedule,
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

function forceDensity(engine: SimEngine, density: number): void {
  engine.alive.fill(0);
  engine.kind.fill(0);
  engine.tenure.fill(0);
  const n = engine.cols * engine.rows;
  const target = Math.max(0, Math.min(n, Math.round(density * n)));
  for (let i = 0; i < target; i++) engine.alive[i] = 1;
}

test("density inside provisional K marks inK and zero outside distance", () => {
  const engine = new SimEngine();
  engine.allocate(50, 40);
  // Wide provisional interval so any post-step density stays inside.
  engine.applySettings({
    ...packSettings("baseline"),
    densityMin: 0,
    densityMax: 1,
  });
  engine.seed("classic", 42);
  engine.step();
  const snap = engine.snapshot();
  assert.equal(snap.inK, true);
  assert.equal(snap.cumulativeDistanceOutsideK, 0);
  assert.equal(snap.densityMin, 0);
  assert.equal(snap.densityMax, 1);
  assert.equal(snap.z.density, snap.density);
  assert.equal(snap.z.meanEnergy, snap.meanEnergy);
});

test("density outside K marks inK false and accumulates distance", () => {
  const engine = new SimEngine();
  engine.allocate(50, 40);
  engine.applySettings({
    ...packSettings("baseline"),
    densityMin: 0.02,
    densityMax: 0.4,
  });
  engine.seed("classic", 7);
  // Empty field stays empty under baseline B3/S23 → density 0, below K.
  forceDensity(engine, 0);
  engine.step();
  const afterOne = engine.snapshot();
  assert.equal(afterOne.density, 0);
  assert.equal(afterOne.inK, false);
  assert.equal(afterOne.cumulativeDistanceOutsideK, 0.02);

  forceDensity(engine, 0);
  engine.step();
  const afterTwo = engine.snapshot();
  assert.equal(afterTwo.inK, false);
  assert.equal(afterTwo.cumulativeDistanceOutsideK, 0.04);
});

test("timeInKFraction matches counted steps after N generations", () => {
  const engine = new SimEngine();
  engine.allocate(40, 30);
  engine.applySettings({
    ...packSettings("baseline"),
    densityMin: 0,
    densityMax: 1,
  });
  engine.seed("classic", 99);

  const insideSteps = 10;
  const outsideSteps = 10;
  for (let i = 0; i < insideSteps; i++) engine.step();

  engine.applySettings({ densityMin: 0.9, densityMax: 1 });
  for (let i = 0; i < outsideSteps; i++) {
    forceDensity(engine, 0);
    engine.step();
  }

  const snap = engine.snapshot();
  const N = insideSteps + outsideSteps;
  assert.equal(snap.stepsObserved, N);
  assert.equal(snap.stepsInK, insideSteps);
  assert.equal(snap.timeInKFraction, insideSteps / N);
});

test("reseed resets viable-region aggregators", () => {
  const engine = new SimEngine();
  engine.allocate(40, 30);
  engine.applySettings({
    ...packSettings("baseline"),
    densityMin: 0.02,
    densityMax: 0.4,
  });
  engine.seed("classic", 11);
  for (let i = 0; i < 8; i++) {
    forceDensity(engine, 0);
    engine.step();
  }
  const before = engine.snapshot();
  assert.ok(before.stepsObserved > 0);
  assert.ok(before.cumulativeDistanceOutsideK > 0);

  engine.seed("classic", 11);
  const after = engine.snapshot();
  assert.equal(after.stepsObserved, 0);
  assert.equal(after.stepsInK, 0);
  assert.equal(after.cumulativeDistanceOutsideK, 0);
  assert.equal(after.timeInKFraction, 0);
  assert.equal(after.recoveries, 0);
  assert.equal(after.lastExitGeneration, null);
  assert.equal(after.lastEnterGeneration, null);
  assert.equal(after.settlingTime, null);
});

test("same seedKey and settings yield identical inK series and aggregators", () => {
  const settings: SimSettings = {
    ...packSettings("baseline"),
    densityMin: 0.02,
    densityMax: 0.4,
  };
  const seedKey = 0xc0ffee;
  const steps = 30;

  function run() {
    const engine = new SimEngine();
    engine.allocate(48, 36);
    engine.applySettings(settings);
    engine.seed("classic", seedKey);
    const series: boolean[] = [];
    for (let i = 0; i < steps; i++) {
      engine.step();
      series.push(engine.snapshot().inK);
    }
    const snap = engine.snapshot();
    return {
      series,
      stepsInK: snap.stepsInK,
      stepsObserved: snap.stepsObserved,
      timeInKFraction: snap.timeInKFraction,
      cumulativeDistanceOutsideK: snap.cumulativeDistanceOutsideK,
      recoveries: snap.recoveries,
      lastExitGeneration: snap.lastExitGeneration,
      lastEnterGeneration: snap.lastEnterGeneration,
    };
  }

  const a = run();
  const b = run();
  assert.deepEqual(a.series, b.series);
  assert.equal(a.stepsInK, b.stepsInK);
  assert.equal(a.stepsObserved, b.stepsObserved);
  assert.equal(a.timeInKFraction, b.timeInKFraction);
  assert.equal(a.cumulativeDistanceOutsideK, b.cumulativeDistanceOutsideK);
  assert.equal(a.recoveries, b.recoveries);
  assert.equal(a.lastExitGeneration, b.lastExitGeneration);
  assert.equal(a.lastEnterGeneration, b.lastEnterGeneration);
});

test("PROVISIONAL_K defaults are explicit and not tied to setpoint", () => {
  assert.equal(DEFAULT_SETTINGS.densityMin, 0.02);
  assert.equal(DEFAULT_SETTINGS.densityMax, 0.4);
  assert.notEqual(DEFAULT_SETTINGS.densityMin, DEFAULT_SETTINGS.setpoint);
  assert.notEqual(DEFAULT_SETTINGS.densityMax, DEFAULT_SETTINGS.setpoint);
  // Study packs must not redefine K — they remain loop/env packs only.
  for (const pack of STUDY_CONDITIONS) {
    assert.equal("densityMin" in pack.settings, false);
    assert.equal("densityMax" in pack.settings, false);
  }
});

test("exit then re-entry increments recoveries and sets settlingTime", () => {
  const engine = new SimEngine();
  engine.allocate(40, 30);
  engine.applySettings({
    ...packSettings("baseline"),
    densityMin: 0,
    densityMax: 1,
  });
  engine.seed("classic", 3);
  // Start inside K.
  engine.step();
  assert.equal(engine.snapshot().inK, true);

  // Leave K.
  engine.applySettings({ densityMin: 0.9, densityMax: 1 });
  forceDensity(engine, 0);
  engine.step();
  const exited = engine.snapshot();
  assert.equal(exited.inK, false);
  assert.equal(exited.lastExitGeneration, exited.generation);

  // Re-enter K.
  engine.applySettings({ densityMin: 0, densityMax: 1 });
  engine.step();
  const entered = engine.snapshot();
  assert.equal(entered.inK, true);
  assert.equal(entered.recoveries, 1);
  assert.equal(entered.lastEnterGeneration, entered.generation);
  assert.equal(entered.settlingTime, 0);

  engine.step();
  assert.equal(engine.snapshot().settlingTime, 1);
});


test("same seed+settings+schedule yield identical w(t) series", () => {
  const disturbance: DisturbanceSchedule = {
    id: "pulse",
    startGen: 5,
    duration: 10,
    amplitude: 0.6,
  };
  const settings: SimSettings = {
    ...packSettings("baseline"),
    disturbance,
    environment: false,
  };
  const seedKey = 0xdecafbad;
  const steps = 40;

  function run() {
    const engine = new SimEngine();
    engine.allocate(32, 24);
    engine.applySettings(settings);
    engine.seed("classic", seedKey);
    const series: number[] = [];
    for (let i = 0; i < steps; i++) {
      engine.step();
      series.push(engine.snapshot().w);
    }
    return series;
  }

  assert.deepEqual(run(), run());
});

test("pulse schedule is off before start, on during window, off after", () => {
  const disturbance: DisturbanceSchedule = {
    id: "pulse",
    startGen: 10,
    duration: 5,
    amplitude: 0.7,
  };
  // Pure function check
  for (let t = 0; t < 10; t++) assert.equal(computeDisturbanceW(t, disturbance), 0);
  for (let t = 10; t < 15; t++) assert.equal(computeDisturbanceW(t, disturbance), 0.7);
  for (let t = 15; t < 25; t++) assert.equal(computeDisturbanceW(t, disturbance), 0);

  const engine = new SimEngine();
  engine.allocate(24, 24);
  engine.applySettings({
    ...packSettings("baseline"),
    disturbance,
  });
  engine.seed("classic", 99);
  for (let t = 0; t < 25; t++) {
    const before = engine.generation;
    assert.equal(before, t);
    engine.step();
    const snap = engine.snapshot();
    // w was computed for generation t before increment
    if (t < 10 || t >= 15) assert.equal(snap.w, 0, `t=${t}`);
    else assert.equal(snap.w, 0.7, `t=${t}`);
  }
});

test("sustained schedule stays on after start (open-ended when duration 0)", () => {
  const open: DisturbanceSchedule = {
    id: "sustained",
    startGen: 3,
    duration: 0,
    amplitude: 0.4,
  };
  assert.equal(computeDisturbanceW(2, open), 0);
  assert.equal(computeDisturbanceW(3, open), 0.4);
  assert.equal(computeDisturbanceW(300, open), 0.4);

  const finite: DisturbanceSchedule = {
    id: "sustained",
    startGen: 2,
    duration: 4,
    amplitude: 0.5,
  };
  assert.equal(computeDisturbanceW(1, finite), 0);
  assert.equal(computeDisturbanceW(2, finite), 0.5);
  assert.equal(computeDisturbanceW(5, finite), 0.5);
  assert.equal(computeDisturbanceW(6, finite), 0);
});

test("study pack apply does not change schedule id or params", () => {
  const disturbance: DisturbanceSchedule = {
    id: "pulse",
    startGen: 12,
    duration: 8,
    amplitude: 0.33,
  };
  let settings: SimSettings = {
    ...DEFAULT_SETTINGS,
    disturbance,
    generationLimit: 100,
    measurementInterval: 5,
  };
  for (const pack of STUDY_CONDITIONS) {
    settings = { ...settings, ...pack.settings };
    assert.equal(settings.disturbance.id, "pulse");
    assert.equal(settings.disturbance.startGen, 12);
    assert.equal(settings.disturbance.duration, 8);
    assert.equal(settings.disturbance.amplitude, 0.33);
    assert.equal("disturbance" in pack.settings, false);
    assert.equal("generationLimit" in pack.settings, false);
    assert.equal("measurementInterval" in pack.settings, false);
  }
});

test("generationLimit stops stepping and sets limitReached", () => {
  const engine = new SimEngine();
  engine.allocate(24, 24);
  engine.applySettings({
    ...packSettings("baseline"),
    generationLimit: 5,
  });
  engine.seed("classic", 1);
  for (let i = 0; i < 5; i++) {
    assert.equal(engine.limitReached(), false);
    engine.step();
  }
  assert.equal(engine.generation, 5);
  assert.equal(engine.limitReached(), true);
  assert.equal(engine.snapshot().limitReached, true);
  engine.step(); // no-op
  assert.equal(engine.generation, 5);
});

test("measurementInterval increments measureCount on expected generations", () => {
  const engine = new SimEngine();
  engine.allocate(24, 24);
  engine.applySettings({
    ...packSettings("baseline"),
    measurementInterval: 5,
  });
  engine.seed("classic", 2);
  assert.equal(engine.snapshot().measureCount, 0);

  const hits: number[] = [];
  for (let i = 0; i < 20; i++) {
    engine.step();
    const snap = engine.snapshot();
    if (snap.shouldMeasure) hits.push(snap.generation);
  }
  assert.deepEqual(hits, [5, 10, 15, 20]);
  assert.equal(engine.snapshot().measureCount, 4);
});
