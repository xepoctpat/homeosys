import assert from "node:assert/strict";
import { test } from "node:test";
import { SimEngine } from "./engine.ts";
import { buildMetricCells, finiteOr, fixed, fmt } from "./metrics-format.ts";
import {
  DEFAULT_SETTINGS,
  normalizeDisturbance,
  normalizeSimSettings,
  type DisturbanceScheduleId,
} from "./types.ts";

test("normalizeDisturbance fills missing knobs after shallow partial merge", () => {
  const broken = normalizeDisturbance({ id: "pulse" });
  assert.equal(broken.id, "pulse");
  assert.ok(Number.isFinite(broken.startGen));
  assert.ok(Number.isFinite(broken.duration));
  assert.ok(Number.isFinite(broken.amplitude));
  assert.equal(typeof broken.amplitude.toFixed(2), "string");
  assert.equal(typeof broken.amplitude.toLocaleString(), "string");
});

test("normalizeSimSettings repairs localStorage-style shallow disturbance merge", () => {
  const repaired = normalizeSimSettings({
    ...DEFAULT_SETTINGS,
    disturbance: { id: "sustained" },
  });
  assert.equal(repaired.disturbance.id, "sustained");
  assert.ok(Number.isFinite(repaired.disturbance.amplitude));
  assert.ok(Number.isFinite(repaired.disturbance.startGen));
});

test("schedule flip None→Pulse→Sustained→None never throws formatters (UI path)", () => {
  const engine = new SimEngine();
  engine.applySettings(DEFAULT_SETTINGS);
  engine.seed("classic", 7);
  const ids: DisturbanceScheduleId[] = ["none", "pulse", "sustained", "none", "pulse", "none"];
  for (const id of ids) {
    // Simulate the historical UI bug: replace disturbance with { id } only (shallow merge hazard).
    const next = normalizeSimSettings({
      ...DEFAULT_SETTINGS,
      disturbance: { id } as { id: DisturbanceScheduleId },
    });
    engine.applySettings(next);
    for (let i = 0; i < 5; i++) engine.step();
    const snap = engine.snapshot();
    assert.doesNotThrow(() => buildMetricCells(snap));
    const amp = finiteOr(next.disturbance.amplitude, 0);
    assert.doesNotThrow(() => amp.toLocaleString());
    assert.doesNotThrow(() => fixed(next.disturbance.amplitude, 2));
    assert.doesNotThrow(() => fmt(snap.generation));
    assert.equal(normalizeDisturbance({ id }).id, id);
  }
});
