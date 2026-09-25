import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEvidenceArms,
  EVIDENCE_DEFAULT_N,
  EVIDENCE_SEED_KEYS,
  exportArmJsonl,
  resolveSeedKeys,
  runEvidenceArm,
  runEvidenceMatrix,
  validateEvidenceMatrix,
} from "./evidence-matrix.ts";

test("validateEvidenceMatrix accepts all M2–M5 arms", () => {
  const v = validateEvidenceMatrix();
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.equal(v.arms.length, 9);
  assert.equal(EVIDENCE_SEED_KEYS.length, EVIDENCE_DEFAULT_N);
});

test("M2 arms share schedule/limit/world and contrast studyCondition", () => {
  const arms = buildEvidenceArms().filter((a) => a.milestone === "m2");
  assert.equal(arms.length, 2);
  assert.equal(arms[0].protocolTemplate.schedule.id, arms[1].protocolTemplate.schedule.id);
  assert.equal(arms[0].protocolTemplate.generationLimit, arms[1].protocolTemplate.generationLimit);
  assert.equal(arms[0].protocolTemplate.cols, arms[1].protocolTemplate.cols);
  assert.equal(arms[0].protocolTemplate.rows, arms[1].protocolTemplate.rows);
  assert.equal(arms[0].protocolTemplate.worldPreset, arms[1].protocolTemplate.worldPreset);
  assert.equal(arms[0].protocolTemplate.controllerMode, "SetpointError");
  assert.equal(arms[0].protocolTemplate.organizationMode, "Central");
  assert.notEqual(arms[0].protocolTemplate.studyCondition, arms[1].protocolTemplate.studyCondition);
});

test("M3 arms share sustained schedule and expose ultra fields after smoke run", () => {
  const arms = buildEvidenceArms().filter((a) => a.milestone === "m3");
  assert.equal(arms.length, 2);
  assert.equal(arms[0].protocolTemplate.schedule.id, "sustained");
  assert.equal(arms[1].protocolTemplate.schedule.id, "sustained");
  const ultra = arms.find((a) => a.id === "m3-ultrastable");
  assert.ok(ultra);
  const ran = runEvidenceArm(ultra!, { n: 1, collectSeries: false });
  assert.equal(ran.results.length, 1);
  const row = ran.results[0];
  assert.equal(typeof row.ultraProbeCount, "number");
  assert.equal(typeof row.ultraKeptCount, "number");
  assert.equal(typeof row.ultraRevertedCount, "number");
  assert.ok("lastUltraOutcome" in row);
  assert.ok("lastUltraGeneration" in row);
  assert.equal(typeof row.stableEpisodeLength, "number");
  assert.ok("lastUltraMinPop" in row);
  assert.ok("lastUltraDeltaPop" in row);
});

test("M4 reuses abControllerProtocols contrast; M5 reuses abcOrganizationProtocols", () => {
  const m4 = buildEvidenceArms().filter((a) => a.milestone === "m4");
  assert.deepEqual(
    m4.map((a) => a.protocolTemplate.controllerMode).sort(),
    ["SetpointError", "ViabilityBand"],
  );
  assert.equal(m4[0].protocolTemplate.schedule.id, m4[1].protocolTemplate.schedule.id);
  const m5 = buildEvidenceArms().filter((a) => a.milestone === "m5");
  assert.deepEqual(
    m5.map((a) => a.protocolTemplate.organizationMode).sort(),
    ["Central", "Coordinated", "Local"],
  );
});

test("resolveSeedKeys is a fixed prefix of EVIDENCE_SEED_KEYS", () => {
  assert.deepEqual(resolveSeedKeys(2), [...EVIDENCE_SEED_KEYS.slice(0, 2)]);
  assert.throws(() => resolveSeedKeys(0));
  assert.throws(() => resolveSeedKeys(EVIDENCE_SEED_KEYS.length + 1));
});

test("smoke batch runs ≥1 arm and JSONL carries metadata header", () => {
  const matrix = runEvidenceMatrix({ milestones: ["m2"], n: 1, collectSeries: false });
  assert.ok(matrix.length >= 1);
  const jsonl = exportArmJsonl(matrix[0]);
  const lines = jsonl.trim().split("\n");
  assert.ok(lines[0].startsWith("# "));
  const meta = JSON.parse(lines[0].slice(2));
  assert.equal(meta.seedStrategy, "fixed-seedKey-list");
  assert.equal(meta.n, 1);
  assert.equal(meta.armId, matrix[0].arm.id);
  const row = JSON.parse(lines[1]);
  assert.equal(row.runIndex, 0);
  assert.equal(row.seedKey, EVIDENCE_SEED_KEYS[0]);
  assert.equal(typeof row.timeInKFraction, "number");
});
