/**
 * C3 — M2 ladder-factor sweep allowlist + smoke.
 * Observational ≠ closure. M6 gated.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  armProtocolMeta,
  exportArmCsv,
  exportArmJsonl,
} from "./evidence-matrix.ts";
import { EVIDENCE_COLS, EVIDENCE_GRIDS, EVIDENCE_ROWS } from "./evidence-matrix.ts";
import {
  M2_LADDER_SWEEP_AXES,
  M2_SWEEP_COORD_COUPLING_ALPHAS,
  M2_SWEEP_CONTROLLER_MODES,
  M2_SWEEP_ORGANIZATION_MODES,
  M2_SWEEP_REFUSED_AXES,
  M2_SWEEP_ANATOMY_SCHEDULE_IDS,
  M2_SWEEP_SCHEDULE_BY_ID,
  M2_SWEEP_SCHEDULE_IDS,
  M2_SWEEP_STUDY_CONDITIONS,
  assertM2SweepSpec,
  buildM2LadderSweepArms,
  buildM2SweepFactorCells,
  isAllowedM2SweepAxis,
  resolveM2SweepGrids,
  runM2LadderSweep,
} from "./m2-ladder-sweep.ts";
import { THETA_SCHEMA_VERSION, assertExportHasFullTheta } from "./theta-v0.ts";

test("allowlist accepts the five ladder axes only", () => {
  assert.deepEqual([...M2_LADDER_SWEEP_AXES], [
    "studyCondition",
    "controllerMode",
    "organizationMode",
    "coordCouplingAlpha",
    "schedule",
  ]);
  for (const axis of M2_LADDER_SWEEP_AXES) {
    assert.equal(isAllowedM2SweepAxis(axis), true);
  }
  assert.equal(isAllowedM2SweepAxis("homeoGain"), false);
  assert.equal(isAllowedM2SweepAxis("climate"), false);
  assert.ok(M2_SWEEP_STUDY_CONDITIONS.includes("baseline"));
  assert.ok(M2_SWEEP_STUDY_CONDITIONS.includes("envNoControl"));
  assert.ok(M2_SWEEP_STUDY_CONDITIONS.includes("homeostatic"));
  assert.ok(!M2_SWEEP_STUDY_CONDITIONS.includes("ultrastable" as never));
  assert.deepEqual([...M2_SWEEP_CONTROLLER_MODES], ["SetpointError", "ViabilityBand"]);
  assert.deepEqual([...M2_SWEEP_ORGANIZATION_MODES], ["Central", "Local", "Coordinated"]);
  assert.deepEqual([...M2_SWEEP_COORD_COUPLING_ALPHAS], [0, 0.3]);
  assert.deepEqual([...M2_SWEEP_SCHEDULE_IDS], ["none", "pulse", "sustained"]);
});

test("assertM2SweepSpec refuses continuous-gain axis names", () => {
  for (const bad of ["homeoGain", "climate", "seasonRate", "noise", ...M2_SWEEP_REFUSED_AXES]) {
    assert.throws(
      () => assertM2SweepSpec({ expandAxes: [bad] }),
      /refuses continuous|not an allowlisted|ladder sweep refuses/i,
    );
    assert.throws(
      () => buildM2LadderSweepArms({ expandAxes: [bad] }),
      /refuses continuous|ladder sweep refuses/i,
    );
  }
  assert.throws(
    () => assertM2SweepSpec({ expandAxes: ["studyCondition", "homeoGain"] }),
    /homeoGain/,
  );
  // Valid specs do not throw
  assertM2SweepSpec({ expandAxes: ["studyCondition"] });
  assertM2SweepSpec({ expandAxes: [...M2_LADDER_SWEEP_AXES] });
});

test("default smoke expands studyCondition only (3 cells)", () => {
  const cells = buildM2SweepFactorCells();
  assert.equal(cells.length, 3);
  assert.deepEqual(
    cells.map((c) => c.studyCondition).sort(),
    ["baseline", "envNoControl", "homeostatic"],
  );
  for (const c of cells) {
    assert.equal(c.controllerMode, "SetpointError");
    assert.equal(c.organizationMode, "Central");
    assert.equal(c.scheduleId, "pulse");
  }
});

test("α expand forces Coordinated; non-Coordinated cells dedupe α", () => {
  const alphaOnly = buildM2SweepFactorCells({ expandAxes: ["coordCouplingAlpha"] });
  assert.equal(alphaOnly.length, 2);
  for (const c of alphaOnly) {
    assert.equal(c.organizationMode, "Coordinated");
  }
  assert.deepEqual(
    alphaOnly.map((c) => c.coordCouplingAlpha).sort(),
    [0, 0.3],
  );

  const orgAndAlpha = buildM2SweepFactorCells({
    expandAxes: ["organizationMode", "coordCouplingAlpha"],
  });
  // Central, Local (α collapsed), Coordinated×{0,0.3} => 4
  assert.equal(orgAndAlpha.length, 4);
  const central = orgAndAlpha.filter((c) => c.organizationMode === "Central");
  assert.equal(central.length, 1);
  assert.equal(central[0].coordCouplingAlpha, 0.3);
});

test("generated protocols/exports include full ThetaV0 + schemaVersion", () => {
  // Dual-grid default: 3 studyConditions × 2 grids
  const arms = buildM2LadderSweepArms({ expandAxes: ["studyCondition"] });
  assert.equal(arms.length, 3 * EVIDENCE_GRIDS.length);
  for (const arm of arms) {
    assert.equal(arm.protocolTemplate.schedule.id, "pulse");
    assert.ok(arm.protocolTemplate.protocolId);
    assert.match(arm.id, /__g=(48x36|72x54)__/);
  }
  // Cheap single-grid smoke via cols/rows
  const single = buildM2LadderSweepArms({
    expandAxes: ["studyCondition"],
    cols: EVIDENCE_COLS,
    rows: EVIDENCE_ROWS,
  });
  assert.equal(single.length, 3);
  const ran = runM2LadderSweep({
    expandAxes: ["studyCondition"],
    cols: EVIDENCE_COLS,
    rows: EVIDENCE_ROWS,
    n: 1,
    collectSeries: false,
  });
  assert.ok(ran.length >= 1);
  const armResult = ran[0];
  const meta = armProtocolMeta(armResult);
  assertExportHasFullTheta(meta);
  assert.equal(meta.schemaVersion, THETA_SCHEMA_VERSION);
  assertExportHasFullTheta(meta.theta);
  assert.equal(meta.theta.schemaVersion, THETA_SCHEMA_VERSION);

  const jsonl = exportArmJsonl(armResult);
  const header = jsonl.split("\n")[0];
  assert.ok(header.startsWith("# "));
  const parsedMeta = JSON.parse(header.slice(2));
  assertExportHasFullTheta(parsedMeta);
  assert.equal(parsedMeta.schemaVersion, THETA_SCHEMA_VERSION);

  const dataRow = JSON.parse(jsonl.split("\n")[1]);
  assertExportHasFullTheta(dataRow);
  assert.equal(dataRow.theta.schemaVersion, THETA_SCHEMA_VERSION);

  const csv = exportArmCsv(armResult);
  assert.ok(csv.includes("schemaVersion"));
  assert.ok(csv.includes("thetaJson"));
  assert.ok(csv.includes(THETA_SCHEMA_VERSION));
});

test("smoke run of small sweep produces ≥1 arm/result with stamped θ", () => {
  const results = runM2LadderSweep({
    expandAxes: ["studyCondition", "controllerMode"],
    cols: EVIDENCE_COLS,
    rows: EVIDENCE_ROWS,
    n: 1,
    collectSeries: false,
  });
  assert.ok(results.length >= 1);
  assert.equal(results.length, 3 * 2); // study × controller (single grid)
  for (const arm of results) {
    assert.equal(arm.results.length, 1);
    assertExportHasFullTheta(arm.results[0]);
    assert.equal(arm.results[0].theta.schemaVersion, THETA_SCHEMA_VERSION);
    assert.equal(arm.results[0].theta.studyCondition, arm.arm.protocolTemplate.studyCondition);
    assert.equal(arm.results[0].theta.controllerMode, arm.arm.protocolTemplate.controllerMode);
  }
});

test("thick org×α×sched×ctrl cells = 24; × dual grids = 48 arms", () => {
  const axes = [
    "organizationMode",
    "coordCouplingAlpha",
    "schedule",
    "controllerMode",
  ] as const;
  // studyCondition stays default homeostatic
  const cells = buildM2SweepFactorCells({ expandAxes: [...axes] });
  // Central×1α×3sched×2ctrl + Local×1×3×2 + Coordinated×2α×3×2 = 6+6+12 = 24
  assert.equal(cells.length, 24);
  const byOrg = {
    Central: cells.filter((c) => c.organizationMode === "Central").length,
    Local: cells.filter((c) => c.organizationMode === "Local").length,
    Coordinated: cells.filter((c) => c.organizationMode === "Coordinated").length,
  };
  assert.deepEqual(byOrg, { Central: 6, Local: 6, Coordinated: 12 });
  for (const c of cells) {
    assert.equal(c.studyCondition, "homeostatic");
  }

  const arms = buildM2LadderSweepArms({ expandAxes: [...axes] });
  assert.equal(resolveM2SweepGrids({}).length, 2);
  assert.deepEqual(
    resolveM2SweepGrids({}).map((g) => g.id),
    ["48x36", "72x54"],
  );
  assert.equal(arms.length, 24 * 2); // 48
  const g48 = arms.filter((a) => a.id.includes("__g=48x36__"));
  const g72 = arms.filter((a) => a.id.includes("__g=72x54__"));
  assert.equal(g48.length, 24);
  assert.equal(g72.length, 24);
  assert.equal(g48[0].protocolTemplate.cols, 48);
  assert.equal(g48[0].protocolTemplate.rows, 36);
  assert.equal(g72[0].protocolTemplate.cols, 72);
  assert.equal(g72[0].protocolTemplate.rows, 54);

  // Single-grid override via cols/rows
  const single = buildM2LadderSweepArms({
    expandAxes: [...axes],
    cols: EVIDENCE_COLS,
    rows: EVIDENCE_ROWS,
  });
  assert.equal(single.length, 24);
  assert.ok(single.every((a) => a.id.includes("__g=48x36__")));
});

test("refuse continuous axes still throws (CLI exits 2)", () => {
  assert.throws(
    () => buildM2LadderSweepArms({ expandAxes: ["homeoGain"] }),
    /refuses continuous|ladder sweep refuses/i,
  );
  assert.throws(
    () => buildM2LadderSweepArms({ expandAxes: ["organizationMode", "climate"] }),
    /climate/,
  );
});


test("ladder default schedule levels stay 3 (anatomy ids not auto-expanded)", () => {
  assert.deepEqual([...M2_SWEEP_SCHEDULE_IDS], ["none", "pulse", "sustained"]);
  assert.deepEqual([...M2_SWEEP_ANATOMY_SCHEDULE_IDS], ["sustainedShort", "pulseLong"]);
  assert.ok(M2_SWEEP_SCHEDULE_BY_ID.sustainedShort);
  assert.ok(M2_SWEEP_SCHEDULE_BY_ID.pulseLong);
  assert.equal(M2_SWEEP_SCHEDULE_BY_ID.sustainedShort.startGen, 30);
  assert.equal(M2_SWEEP_SCHEDULE_BY_ID.sustainedShort.duration, 30);
  assert.equal(M2_SWEEP_SCHEDULE_BY_ID.pulseLong.startGen, 40);
  assert.equal(M2_SWEEP_SCHEDULE_BY_ID.pulseLong.duration, 120);
});

test("anatomy schedule levels × controllerMode × dual grid → 8 arms", () => {
  const cells = buildM2SweepFactorCells({
    expandAxes: ["controllerMode", "schedule"],
    levels: { schedule: [...M2_SWEEP_ANATOMY_SCHEDULE_IDS] },
  });
  // 2 ctrl × 2 anatomy sched = 4 factor cells (org/α/study fixed)
  assert.equal(cells.length, 4);
  for (const c of cells) {
    assert.equal(c.studyCondition, "homeostatic");
    assert.equal(c.organizationMode, "Central");
    assert.ok(
      M2_SWEEP_ANATOMY_SCHEDULE_IDS.includes(
        c.scheduleId as (typeof M2_SWEEP_ANATOMY_SCHEDULE_IDS)[number],
      ),
    );
  }
  const arms = buildM2LadderSweepArms({
    expandAxes: ["controllerMode", "schedule"],
    levels: { schedule: [...M2_SWEEP_ANATOMY_SCHEDULE_IDS] },
  });
  assert.equal(arms.length, 8); // 4 × 2 grids
  assert.equal(arms.filter((a) => a.id.includes("__g=48x36__")).length, 4);
  assert.equal(arms.filter((a) => a.id.includes("__g=72x54__")).length, 4);
  for (const arm of arms) {
    const sid = arm.protocolTemplate.schedule.id;
    assert.ok(sid === "sustainedShort" || sid === "pulseLong");
    assert.equal(
      arm.protocolTemplate.schedule.duration,
      M2_SWEEP_SCHEDULE_BY_ID[sid].duration,
    );
  }
});
