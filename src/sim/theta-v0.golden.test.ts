/**
 * C1/C2 golden-replay + export-stamp acceptance — ThetaV0 characterization lock.
 * Golden cases live-recompute (no frozen fixture blobs) — same lock → same metrics.
 * Observational ≠ scientific closure. M6 HARD-GATED. No sweep driver / C3 yet.
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
  exportArmCsv,
  exportArmJsonl,
  runEvidenceArm,
} from "./evidence-matrix.ts";
import {
  exportCsv,
  exportJsonl,
  protocolFromTheta,
  runBatch,
  settingsFromProtocol,
  thetaFromProtocol,
  validateProtocol,
} from "./research-mode.ts";
import {
  THETA_SCHEMA_VERSION,
  THETA_V0_KEYS,
  assertExportHasFullTheta,
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

/** Minimal RFC4180-ish CSV line split (handles quoted thetaJson). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsvTheta(csv: string): { header: string[]; thetas: unknown[]; schemaVersions: string[] } {
  const lines = csv.trim().split("\n");
  const header = parseCsvLine(lines[0]);
  const schemaIdx = header.indexOf("schemaVersion");
  const thetaIdx = header.indexOf("thetaJson");
  assert.ok(schemaIdx >= 0, "CSV missing schemaVersion column");
  assert.ok(thetaIdx >= 0, "CSV missing thetaJson column");
  const thetas: unknown[] = [];
  const schemaVersions: string[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    schemaVersions.push(cells[schemaIdx]);
    thetas.push(JSON.parse(cells[thetaIdx]));
  }
  return { header, thetas, schemaVersions };
}

test("C2 export stamp: research-mode JSONL + CSV carry full ThetaV0", () => {
  const protocol = lockM2Homeostatic();
  const results = runBatch(protocol, undefined, { collectSeries: false });
  assert.equal(results.length, 1);

  const jsonl = exportJsonl(results);
  const row = JSON.parse(jsonl.trim().split("\n")[0]);
  assertExportHasFullTheta(row);
  for (const key of THETA_V0_KEYS) {
    assert.ok(key in row.theta, `JSONL row theta missing: ${key}`);
  }

  const csv = exportCsv(results);
  const parsed = parseCsvTheta(csv);
  assert.equal(parsed.schemaVersions[0], THETA_SCHEMA_VERSION);
  const stamped = assertExportHasFullTheta(parsed.thetas[0]);
  assert.equal(stamped.schemaVersion, THETA_SCHEMA_VERSION);
  assert.equal(stamped.environment, true);
  assert.ok("climate" in stamped);
  assert.ok("seasonRate" in stamped);
});

test("C2 export stamp: arm JSONL meta+rows and arm CSV carry full ThetaV0", () => {
  const arms = buildEvidenceArms().filter((a) => a.id === "m2-homeostatic");
  assert.equal(arms.length, 1);
  const ran = runEvidenceArm(arms[0], { n: 1, collectSeries: false });

  const jsonl = exportArmJsonl(ran);
  const lines = jsonl.trim().split("\n");
  assert.ok(lines[0].startsWith("# "));
  const meta = JSON.parse(lines[0].slice(2));
  assertExportHasFullTheta(meta);
  assert.equal(meta.schemaVersion, THETA_SCHEMA_VERSION);
  const dataRow = JSON.parse(lines[1]);
  assertExportHasFullTheta(dataRow);

  const csv = exportArmCsv(ran);
  const parsed = parseCsvTheta(csv);
  assert.equal(parsed.thetas.length, 1);
  assert.equal(parsed.schemaVersions[0], THETA_SCHEMA_VERSION);
  assertExportHasFullTheta(parsed.thetas[0]);
});

test("C2 fail-closed: truncated/missing θ rejected by assertExportHasFullTheta", () => {
  const protocol = lockM2Homeostatic();
  const full = thetaFromProtocol(protocol);

  assert.throws(() => assertExportHasFullTheta(undefined), /export stamp/);
  assert.throws(() => assertExportHasFullTheta({}), /incomplete|missing/);

  const missingEnv = { ...full } as Record<string, unknown>;
  delete missingEnv.environment;
  assert.throws(() => assertExportHasFullTheta(missingEnv), /environment/);

  const missingSchema = { ...full } as Record<string, unknown>;
  delete missingSchema.schemaVersion;
  assert.throws(() => assertExportHasFullTheta(missingSchema), /schemaVersion/);

  const badMeta = { schemaVersion: "theta.v0", theta: missingEnv };
  assert.throws(() => assertExportHasFullTheta(badMeta), /environment/);

  const badTopSchema = { schemaVersion: "theta.v999", theta: full };
  assert.throws(() => assertExportHasFullTheta(badTopSchema), /schemaVersion/);

  // Deleting a field from a JSONL-shaped row fails
  const [row] = runBatch(protocol, undefined, { collectSeries: false });
  const truncated = JSON.parse(JSON.stringify(row)) as { theta: Record<string, unknown> };
  delete truncated.theta.noise;
  assert.throws(() => assertExportHasFullTheta(truncated), /noise/);

  // CSV path: exporter throws when summary lacks theta
  const noTheta = { ...row } as { theta?: unknown };
  delete noTheta.theta;
  assert.throws(() => exportCsv([noTheta as typeof row]), /export stamp|incomplete/);
  assert.throws(() => exportJsonl([noTheta as typeof row]), /export stamp|incomplete/);
});

test("C2 fail-closed: deleting any THETA_V0_KEYS field from arm JSONL row fails", () => {
  const arms = buildEvidenceArms().filter((a) => a.id === "m2-homeostatic");
  const ran = runEvidenceArm(arms[0], { n: 1, collectSeries: false });
  const jsonl = exportArmJsonl(ran);
  const row = JSON.parse(jsonl.trim().split("\n")[1]);
  assertExportHasFullTheta(row);
  for (const key of THETA_V0_KEYS) {
    const clone = JSON.parse(JSON.stringify(row)) as { theta: Record<string, unknown> };
    delete clone.theta[key];
    assert.throws(
      () => assertExportHasFullTheta(clone),
      new RegExp(key),
      `expected delete of ${key} to fail`,
    );
  }
});
