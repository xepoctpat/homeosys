import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEvidenceArms,
  EVIDENCE_DEFAULT_N,
  EVIDENCE_GRIDS,
  EVIDENCE_SEED_KEYS,
  exportArmCsv,
  exportArmJsonl,
  resolveSeedKeys,
  runEvidenceArm,
  runEvidenceMatrix,
  validateEvidenceMatrix,
} from "./evidence-matrix.ts";
import { THETA_SCHEMA_VERSION, assertExportHasFullTheta } from "./theta-v0.ts";

test("validateEvidenceMatrix accepts all M2–M5 arms across grids", () => {
  const v = validateEvidenceMatrix();
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.equal(v.arms.length, 22);
  assert.ok(EVIDENCE_GRIDS.length >= 2);
  assert.equal(EVIDENCE_SEED_KEYS.length, EVIDENCE_DEFAULT_N);
  assert.equal(EVIDENCE_DEFAULT_N, 20);
  const grids = new Set(v.arms.map((a) => `${a.protocolTemplate.cols}x${a.protocolTemplate.rows}`));
  assert.ok(grids.has("48x36"));
  assert.ok(grids.has("72x54"));
});

test("M2 arms share schedule/limit within each grid and contrast studyCondition", () => {
  const arms = buildEvidenceArms().filter((a) => a.milestone === "m2");
  assert.equal(arms.length, 6);
  for (const grid of EVIDENCE_GRIDS) {
    const gArms = arms.filter(
      (a) => a.protocolTemplate.cols === grid.cols && a.protocolTemplate.rows === grid.rows,
    );
    assert.equal(gArms.length, 3);
    for (let i = 1; i < gArms.length; i++) {
      assert.equal(gArms[0].protocolTemplate.schedule.id, gArms[i].protocolTemplate.schedule.id);
      assert.equal(gArms[0].protocolTemplate.generationLimit, gArms[i].protocolTemplate.generationLimit);
      assert.equal(gArms[0].protocolTemplate.worldPreset, gArms[i].protocolTemplate.worldPreset);
    }
    assert.equal(gArms[0].protocolTemplate.controllerMode, "SetpointError");
    assert.equal(gArms[0].protocolTemplate.organizationMode, "Central");
    const conditions = new Set(gArms.map((a) => a.protocolTemplate.studyCondition));
    assert.equal(conditions.size, 3);
  }
  assert.ok(arms.some((a) => a.id === "m2-baseline"));
  assert.ok(arms.some((a) => a.id === "m2-baseline-72x54"));
});

test("M3 arms share sustained schedule and expose ultra fields after smoke run", () => {
  const arms = buildEvidenceArms().filter((a) => a.milestone === "m3");
  assert.equal(arms.length, 4);
  for (const a of arms) assert.equal(a.protocolTemplate.schedule.id, "sustained");
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

test("M4 reuses abControllerProtocols contrast; M5 covers org modes plus coupling ablation", () => {
  const m4 = buildEvidenceArms().filter((a) => a.milestone === "m4");
  assert.equal(m4.length, 4);
  assert.deepEqual(
    [...new Set(m4.map((a) => a.protocolTemplate.controllerMode))].sort(),
    ["SetpointError", "ViabilityBand"],
  );
  const m5 = buildEvidenceArms().filter((a) => a.milestone === "m5");
  assert.equal(m5.length, 8);
  assert.deepEqual(
    [...new Set(m5.map((a) => a.protocolTemplate.organizationMode))].sort(),
    ["Central", "Coordinated", "Local"],
  );
  const ablated = m5.filter((a) => a.id.includes("coord-ablated"));
  assert.equal(ablated.length, 2);
  for (const a of ablated) {
    assert.equal(a.protocolTemplate.organizationMode, "Coordinated");
    assert.equal(a.protocolTemplate.coordCouplingAlpha, 0);
  }
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
  assert.equal(meta.schemaVersion, THETA_SCHEMA_VERSION);
  assertExportHasFullTheta(meta);
  assertExportHasFullTheta(row);
});

test("C2 arm CSV rows include schemaVersion + parseable full thetaJson", () => {
  const arms = buildEvidenceArms().filter((a) => a.id === "m2-baseline");
  assert.equal(arms.length, 1);
  const ran = runEvidenceArm(arms[0], { n: 1, collectSeries: false });
  const csv = exportArmCsv(ran);
  const lines = csv.trim().split("\n");
  const header = lines[0].split(",");
  assert.ok(header.includes("schemaVersion"), "CSV header missing schemaVersion");
  assert.ok(header.includes("thetaJson"), "CSV header missing thetaJson");
  assert.equal(header[header.length - 2], "schemaVersion");
  assert.equal(header[header.length - 1], "thetaJson");

  // RFC4180-ish parse so commas inside quoted thetaJson do not break cells
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  const dataLine = lines[1];
  for (let i = 0; i < dataLine.length; i++) {
    const ch = dataLine[i];
    if (inQuotes) {
      if (ch === '"') {
        if (dataLine[i + 1] === '"') {
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
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);

  assert.equal(cells[header.indexOf("schemaVersion")], THETA_SCHEMA_VERSION);
  const theta = JSON.parse(cells[header.indexOf("thetaJson")]);
  assertExportHasFullTheta(theta);
  assert.equal(theta.schemaVersion, THETA_SCHEMA_VERSION);
});
