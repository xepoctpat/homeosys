import assert from "node:assert/strict";
import test from "node:test";
import {
  captureProtocol,
  clampRepeats,
  exportCsv,
  exportJsonl,
  RESEARCH_DEFAULT_REPEATS,
  RESEARCH_REPEATS_MAX,
  RESEARCH_REPEATS_MIN,
  runBatch,
  settingsFromProtocol,
  summarizeRun,
  validateProtocol,
  type ResearchProtocol,
} from "./research-mode.ts";
import { DEFAULT_SETTINGS, type SimSettings } from "./types.ts";

function baseProtocol(over: Partial<ResearchProtocol> = {}): ResearchProtocol {
  return {
    seedKey: 0xc0ffee,
    studyCondition: "homeostatic",
    schedule: { id: "pulse", startGen: 10, duration: 5, amplitude: 0.4 },
    generationLimit: 30,
    measurementInterval: 10,
    cols: 48,
    rows: 36,
    worldPreset: "classic",
    repeats: 3,
    ...over,
  };
}

test("clampRepeats defaults and clamps 1–100", () => {
  assert.equal(clampRepeats(Number.NaN), RESEARCH_DEFAULT_REPEATS);
  assert.equal(clampRepeats(0), RESEARCH_REPEATS_MIN);
  assert.equal(clampRepeats(-5), RESEARCH_REPEATS_MIN);
  assert.equal(clampRepeats(101), RESEARCH_REPEATS_MAX);
  assert.equal(clampRepeats(10), 10);
});

test("validateProtocol rejects generationLimit=0", () => {
  const result = validateProtocol(baseProtocol({ generationLimit: 0 }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /generationLimit must be > 0/);
  }
});

test("validateProtocol rejects missing study condition", () => {
  const result = validateProtocol({
    ...baseProtocol(),
    studyCondition: null as unknown as ResearchProtocol["studyCondition"],
  });
  assert.equal(result.ok, false);
});

test("validateProtocol accepts a complete lock snapshot", () => {
  const result = validateProtocol(baseProtocol());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.protocol.studyCondition, "homeostatic");
    assert.equal(result.protocol.schedule.id, "pulse");
    assert.equal(result.protocol.generationLimit, 30);
    assert.equal(result.protocol.repeats, 3);
  }
});

test("protocol lock freezes seed/condition/schedule fields used by the batch", () => {
  const settings: SimSettings = {
    ...DEFAULT_SETTINGS,
    disturbance: { id: "sustained", startGen: 20, duration: 40, amplitude: 0.7 },
    generationLimit: 50,
    measurementInterval: 5,
  };
  const captured = captureProtocol({
    seedKey: 42,
    studyCondition: "baseline",
    settings,
    cols: 64,
    rows: 48,
    worldPreset: "classic",
    repeats: 4,
  });
  assert.equal(captured.ok, true);
  if (!captured.ok) return;

  // Mutate live settings after capture — protocol must stay frozen.
  settings.disturbance.id = "none";
  settings.disturbance.amplitude = 0;
  settings.generationLimit = 0;

  const built = settingsFromProtocol(captured.protocol);
  assert.equal(captured.protocol.seedKey, 42);
  assert.equal(captured.protocol.studyCondition, "baseline");
  assert.equal(captured.protocol.schedule.id, "sustained");
  assert.equal(captured.protocol.schedule.startGen, 20);
  assert.equal(captured.protocol.schedule.duration, 40);
  assert.equal(captured.protocol.schedule.amplitude, 0.7);
  assert.equal(built.disturbance.id, "sustained");
  assert.equal(built.generationLimit, 50);
  assert.equal(built.cybernetics, false); // baseline pack
  assert.equal(built.environment, false);
});

test("N repeats → N result rows; same protocol → deterministic identical summaries", () => {
  const protocol = baseProtocol({
    repeats: 4,
    generationLimit: 25,
    measurementInterval: 0,
    studyCondition: "baseline",
    schedule: { id: "none", startGen: 0, duration: 0, amplitude: 0 },
    seedKey: 0xdecaf,
  });

  const a = runBatch(protocol, undefined, { collectSeries: false });
  const b = runBatch(protocol, undefined, { collectSeries: false });

  assert.equal(a.length, 4);
  assert.equal(b.length, 4);

  for (let i = 0; i < 4; i++) {
    assert.equal(a[i].runIndex, i);
    assert.equal(a[i].seedKey, protocol.seedKey);
    assert.equal(a[i].studyCondition, "baseline");
    assert.equal(a[i].scheduleId, "none");
    assert.equal(a[i].generationLimit, 25);
    // Same locked seed across repeats ⇒ identical terminal summaries.
    assert.equal(a[i].generation, a[0].generation);
    assert.equal(a[i].density, a[0].density);
    assert.equal(a[i].timeInKFraction, a[0].timeInKFraction);
    assert.equal(a[i].cumulativeDistanceOutsideK, a[0].cumulativeDistanceOutsideK);
    assert.equal(a[i].recoveries, a[0].recoveries);
    assert.equal(a[i].rule, a[0].rule);
    assert.equal(a[i].w, a[0].w);
    assert.deepEqual(
      {
        generation: a[i].generation,
        density: a[i].density,
        inK: a[i].inK,
        timeInKFraction: a[i].timeInKFraction,
        cumulativeDistanceOutsideK: a[i].cumulativeDistanceOutsideK,
        recoveries: a[i].recoveries,
        rule: a[i].rule,
        w: a[i].w,
      },
      {
        generation: b[i].generation,
        density: b[i].density,
        inK: b[i].inK,
        timeInKFraction: b[i].timeInKFraction,
        cumulativeDistanceOutsideK: b[i].cumulativeDistanceOutsideK,
        recoveries: b[i].recoveries,
        rule: b[i].rule,
        w: b[i].w,
      },
    );
  }
});

test("export JSONL/CSV parses and contains protocol + metrics columns", () => {
  const protocol = baseProtocol({
    repeats: 2,
    generationLimit: 20,
    measurementInterval: 5,
    studyCondition: "ultrastable",
  });
  const results = runBatch(protocol);

  const jsonl = exportJsonl(results);
  const lines = jsonl.trim().split("\n");
  assert.equal(lines.length, 2);
  const parsed = lines.map((line) => JSON.parse(line));
  for (const row of parsed) {
    assert.equal(row.seedKey, protocol.seedKey);
    assert.equal(row.studyCondition, "ultrastable");
    assert.equal(row.scheduleId, "pulse");
    assert.equal(row.scheduleStartGen, 10);
    assert.equal(row.generationLimit, 20);
    assert.equal(row.measurementInterval, 5);
    assert.ok(typeof row.density === "number");
    assert.ok(typeof row.timeInKFraction === "number");
    assert.ok(typeof row.cumulativeDistanceOutsideK === "number");
    assert.ok(typeof row.recoveries === "number");
    assert.ok(typeof row.ultraProbeCount === "number");
    assert.ok(typeof row.rule === "string");
    assert.ok(typeof row.w === "number");
    assert.ok(Array.isArray(row.series));
    assert.ok(row.series.length > 0);
  }

  const csv = exportCsv(results);
  const csvLines = csv.trim().split("\n");
  assert.equal(csvLines.length, 3); // header + 2 rows
  const header = csvLines[0];
  for (const col of [
    "seedKey",
    "studyCondition",
    "scheduleId",
    "scheduleStartGen",
    "scheduleDuration",
    "scheduleAmplitude",
    "generationLimit",
    "measurementInterval",
    "density",
    "inK",
    "timeInKFraction",
    "cumulativeDistanceOutsideK",
    "recoveries",
    "ultraProbeCount",
    "ultraKeptCount",
    "ultraRevertedCount",
    "rule",
    "w",
  ]) {
    assert.ok(header.includes(col), `missing column ${col}`);
  }
});

test("runBatch throws when generationLimit is 0", () => {
  assert.throws(
    () => runBatch(baseProtocol({ generationLimit: 0 })),
    /generationLimit must be > 0/,
  );
});

test("summarizeRun includes locked protocol fields for replay", () => {
  const protocol = baseProtocol();
  const fakeMetrics = {
    generation: 30,
    density: 0.12,
    inK: true,
    timeInKFraction: 0.8,
    cumulativeDistanceOutsideK: 1.2,
    recoveries: 2,
    ultraProbeCount: 0,
    ultraKeptCount: 0,
    ultraRevertedCount: 0,
    rule: "B3/S23",
    w: 0,
  } as Parameters<typeof summarizeRun>[2];
  const row = summarizeRun(protocol, 0, fakeMetrics);
  assert.equal(row.seedKey, protocol.seedKey);
  assert.equal(row.studyCondition, protocol.studyCondition);
  assert.equal(row.scheduleId, protocol.schedule.id);
  assert.equal(row.scheduleStartGen, protocol.schedule.startGen);
  assert.equal(row.generationLimit, protocol.generationLimit);
  assert.equal(row.worldPreset, protocol.worldPreset);
});

test("settingsFromProtocol normalizes schedule via normalizeSimSettings", () => {
  const protocol = baseProtocol({
    schedule: { id: "pulse", startGen: 10, duration: 5, amplitude: 0.4 },
  });
  // Shallow incompleteness must not leak into applied settings.
  const shallow = validateProtocol({
    ...protocol,
    schedule: { id: "sustained" } as ResearchProtocol["schedule"],
  });
  assert.equal(shallow.ok, true);
  if (!shallow.ok) return;
  const built = settingsFromProtocol(shallow.protocol);
  assert.equal(built.disturbance.id, "sustained");
  assert.ok(Number.isFinite(built.disturbance.startGen));
  assert.ok(Number.isFinite(built.disturbance.duration));
  assert.ok(Number.isFinite(built.disturbance.amplitude));
});
