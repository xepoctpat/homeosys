/**
 * C1 golden-replay acceptance — ThetaV0 characterization lock.
 * Observational ≠ scientific closure. M6 HARD-GATED. No sweep driver.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  EVIDENCE_SEED_KEYS,
  M2_SCHEDULE,
  M2_GENERATION_LIMIT,
  EVIDENCE_COLS,
  EVIDENCE_ROWS,
  EVIDENCE_WORLD_PRESET,
  buildEvidenceArms,
  exportArmJsonl,
  runEvidenceArm,
} from "./evidence-matrix.ts";
import {
  protocolFromTheta,
  runBatch,
  settingsFromProtocol,
  thetaFromProtocol,
  validateProtocol,
} from "./research-mode.ts";
import {
  THETA_SCHEMA_VERSION,
  THETA_V0_KEYS,
  assertThetaV0,
  serializeThetaV0,
  settingsFromTheta,
} from "./theta-v0.ts";
import { normalizeSimSettings } from "./types.ts";

function lockM2Homeostatic() {
  const validated = validateProtocol({
    seedKey: EVIDENCE_SEED_KEYS[0],
    studyCondition: "homeostatic",
    schedule: { ...M2_SCHEDULE },
    generationLimit: M2_GENERATION_LIMIT,
    measurementInterval: 20,
    cols: EVIDENCE_COLS,
    rows: EVIDENCE_ROWS,
    worldPreset: EVIDENCE_WORLD_PRESET,
    repeats: 1,
    controllerMode: "SetpointError",
    organizationMode: "Central",
    armId: "m2-homeostatic",
  });
  assert.equal(validated.ok, true);
  if (!validated.ok) throw new Error(validated.error);
  return validated.protocol;
}

test("C1 round-trip: lock → ThetaV0 → settingsFromTheta deep-equals expected SimSettings", () => {
  const protocol = lockM2Homeostatic();
  const expected = settingsFromProtocol(protocol);
  const theta = thetaFromProtocol(protocol);
  assert.equal(theta.schemaVersion, THETA_SCHEMA_VERSION);
  assert.equal(theta.armId, "m2-homeostatic");
  assert.equal(theta.environment, true);
  assert.equal(theta.cybernetics, true);
  assert.equal(theta.ultraEnabled, false);
  assert.equal(theta.schedule.id, M2_SCHEDULE.id);
  assert.equal(theta.schedule.startGen, M2_SCHEDULE.startGen);
  assert.equal(theta.seedKey, EVIDENCE_SEED_KEYS[0]);

  const fromTheta = settingsFromTheta(theta);
  assert.deepEqual(fromTheta, normalizeSimSettings(expected));

  const roundTripProtocol = protocolFromTheta(theta);
  assert.deepEqual(settingsFromProtocol(roundTripProtocol), expected);
});

test("C1 determinism: same ThetaV0 → identical ResearchRunSummary metrics+series", () => {
  const protocol = lockM2Homeostatic();
  const theta = thetaFromProtocol(protocol);
  const a = runBatch(protocolFromTheta(theta), undefined, { collectSeries: true });
  const b = runBatch(protocolFromTheta(theta), undefined, { collectSeries: true });
  assert.equal(a.length, 1);
  assert.equal(b.length, 1);
  assert.deepEqual(a[0].series, b[0].series);
  // Strip theta object identity then compare terminals.
  const strip = (row: (typeof a)[0]) => {
    const { theta: _t, ...rest } = row;
    return rest;
  };
  assert.deepEqual(strip(a[0]), strip(b[0]));
  assert.equal(serializeThetaV0(a[0].theta), serializeThetaV0(b[0].theta));
});

test("C1 export stamp: every JSONL run row includes full ThetaV0 (missing field fails)", () => {
  const arms = buildEvidenceArms().filter((a) => a.id === "m2-homeostatic");
  assert.equal(arms.length, 1);
  const ran = runEvidenceArm(arms[0], { n: 1, collectSeries: false });
  const jsonl = exportArmJsonl(ran);
  const lines = jsonl.trim().split("\n");
  assert.ok(lines[0].startsWith("# "));
  const meta = JSON.parse(lines[0].slice(2));
  assert.equal(meta.schemaVersion, THETA_SCHEMA_VERSION);
  const metaTheta = assertThetaV0(meta.theta);
  assert.equal(metaTheta.ok, true);

  const row = JSON.parse(lines[1]);
  assert.ok(row.theta, "run row missing theta");
  for (const key of THETA_V0_KEYS) {
    assert.ok(key in row.theta, `run row theta missing field: ${key}`);
  }
  assert.equal(row.theta.schemaVersion, THETA_SCHEMA_VERSION);
  const stamped = assertThetaV0(row.theta);
  assert.equal(stamped.ok, true);
});

test("C1 replay from export: parse stamped theta → run once → metrics match", () => {
  const protocol = lockM2Homeostatic();
  const [original] = runBatch(protocol, undefined, { collectSeries: true });
  const jsonl = JSON.stringify(original);
  const parsed = JSON.parse(jsonl);
  const stamped = assertThetaV0(parsed.theta);
  assert.equal(stamped.ok, true);
  if (!stamped.ok) return;

  const [replay] = runBatch(protocolFromTheta(stamped.theta), undefined, {
    collectSeries: true,
  });
  assert.equal(replay.generation, original.generation);
  assert.equal(replay.density, original.density);
  assert.equal(replay.timeInKFraction, original.timeInKFraction);
  assert.equal(replay.cumulativeDistanceOutsideK, original.cumulativeDistanceOutsideK);
  assert.equal(replay.recoveries, original.recoveries);
  assert.equal(replay.meanAbsDensityError, original.meanAbsDensityError);
  assert.equal(replay.rule, original.rule);
  assert.deepEqual(replay.series, original.series);
});

test("C1 guard: mutating a theta env knob breaks equality", () => {
  const protocol = lockM2Homeostatic();
  const theta = thetaFromProtocol(protocol);
  const [a] = runBatch(protocolFromTheta(theta), undefined, { collectSeries: false });
  const mutated = { ...theta, climate: theta.climate + 0.25 };
  const [b] = runBatch(protocolFromTheta(mutated), undefined, { collectSeries: false });
  assert.notEqual(a.density, b.density);
});
