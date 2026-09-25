/**
 * Observational evidence ladder arms (M2–M5).
 *
 * Uses ResearchMode helpers only. Eng scaffolding ≠ scientific closure.
 * Provisional K unchanged. No life / autopoiesis claims.
 */
import {
  AB_CONTROLLER_GENERATION_LIMIT,
  AB_CONTROLLER_SCHEDULE,
  ABC_ORGANIZATION_GENERATION_LIMIT,
  ABC_ORGANIZATION_SCHEDULE,
  abControllerProtocols,
  abcOrganizationProtocols,
  exportCsv,
  exportJsonl,
  runBatch,
  validateProtocol,
  thetaFromProtocol,
  type EngineFactory,
  type ResearchProtocol,
  type ResearchRunSummary,
} from "./research-mode.ts";
import { THETA_SCHEMA_VERSION, type ThetaV0 } from "./theta-v0.ts";
import type { DisturbanceSchedule, PresetId, StudyConditionId } from "./types.ts";

/** Default N for published evidence arms (prefix of EVIDENCE_SEED_KEYS). */
export const EVIDENCE_DEFAULT_N = 20;

/**
 * Deterministic seed strategy: fixed explicit seedKey list.
 * Each arm run i uses EVIDENCE_SEED_KEYS[i]. Re-runs with the same list are bit-identical
 * given the same protocol knobs. Do not derive from Date/Math.random or silent seedKey+i.
 * Extend this list explicitly when broader N is required.
 */
export const EVIDENCE_SEED_KEYS: readonly number[] = [
  0x0a01_0001, 0x0a01_0002, 0x0a01_0003, 0x0a01_0004, 0x0a01_0005, 0x0a01_0006, 0x0a01_0007,
  0x0a01_0008, 0x0a01_0009, 0x0a01_000a, 0x0a01_000b, 0x0a01_000c, 0x0a01_000d, 0x0a01_000e,
  0x0a01_000f, 0x0a01_0010, 0x0a01_0011, 0x0a01_0012, 0x0a01_0013, 0x0a01_0014,
];

/** Shared world preset across M2–M5 arms (study packs own loop flags). */
export const EVIDENCE_WORLD_PRESET: PresetId = "homeostat";

/** Primary (canonical) grid — retained arm ids without suffix. */
export const EVIDENCE_COLS = 48;
export const EVIDENCE_ROWS = 36;

/** Second grid size for multi-grid observational arms (1.5× linear). */
export const EVIDENCE_COLS_G2 = 72;
export const EVIDENCE_ROWS_G2 = 54;

export type EvidenceGridId = "48x36" | "72x54";

export interface EvidenceGrid {
  id: EvidenceGridId;
  cols: number;
  rows: number;
}

/** ≥2 explicit grids in the evidence matrix. */
export const EVIDENCE_GRIDS: readonly EvidenceGrid[] = [
  { id: "48x36", cols: EVIDENCE_COLS, rows: EVIDENCE_ROWS },
  { id: "72x54", cols: EVIDENCE_COLS_G2, rows: EVIDENCE_ROWS_G2 },
];
/** Series off by default for compact JSONL artifacts; CLI may enable. */
export const EVIDENCE_MEASUREMENT_INTERVAL = 0;

/** M2 / shared pulse family (aligned with M4/M5 A/B schedules). */
export const M2_SCHEDULE: DisturbanceSchedule = {
  id: "pulse",
  startGen: 40,
  duration: 30,
  amplitude: 0.55,
};
export const M2_GENERATION_LIMIT = 200;

/**
 * M3 nonstationary family: sustained disturbance over a long window
 * (pulse-train substitute within existing schedule ids: none|pulse|sustained).
 */
export const M3_SCHEDULE: DisturbanceSchedule = {
  id: "sustained",
  startGen: 30,
  duration: 120,
  amplitude: 0.55,
};
export const M3_GENERATION_LIMIT = 200;

export type EvidenceMilestone = "m2" | "m3" | "m4" | "m5";

export type EvidenceArmId =
  | "m2-baseline"
  | "m2-env-no-control"
  | "m2-homeostatic"
  | "m2-baseline-72x54"
  | "m2-env-no-control-72x54"
  | "m2-homeostatic-72x54"
  | "m3-homeostatic"
  | "m3-ultrastable"
  | "m3-homeostatic-72x54"
  | "m3-ultrastable-72x54"
  | "m4-setpoint"
  | "m4-viability"
  | "m4-setpoint-72x54"
  | "m4-viability-72x54"
  | "m5-central"
  | "m5-local"
  | "m5-coordinated"
  | "m5-coord-ablated"
  | "m5-central-72x54"
  | "m5-local-72x54"
  | "m5-coordinated-72x54"
  | "m5-coord-ablated-72x54";

export interface EvidenceArm {
  id: EvidenceArmId;
  milestone: EvidenceMilestone;
  label: string;
  /** Factor under observation (studyCondition / controller / organization). */
  factor: string;
  protocolTemplate: Omit<ResearchProtocol, "seedKey" | "repeats">;
}

export interface EvidenceArmResult {
  arm: EvidenceArm;
  seedKeys: number[];
  results: ResearchRunSummary[];
}

function baseWorld(over: {
  studyCondition: StudyConditionId;
  schedule: DisturbanceSchedule;
  generationLimit: number;
  cols?: number;
  rows?: number;
  controllerMode?: ResearchProtocol["controllerMode"];
  organizationMode?: ResearchProtocol["organizationMode"];
  coordCouplingAlpha?: number;
}): Omit<ResearchProtocol, "seedKey" | "repeats"> {
  const validated = validateProtocol({
    seedKey: EVIDENCE_SEED_KEYS[0],
    studyCondition: over.studyCondition,
    schedule: over.schedule,
    generationLimit: over.generationLimit,
    measurementInterval: EVIDENCE_MEASUREMENT_INTERVAL,
    cols: over.cols ?? EVIDENCE_COLS,
    rows: over.rows ?? EVIDENCE_ROWS,
    worldPreset: EVIDENCE_WORLD_PRESET,
    repeats: 1,
    controllerMode: over.controllerMode ?? "SetpointError",
    organizationMode: over.organizationMode ?? "Central",
    coordCouplingAlpha: over.coordCouplingAlpha,
  });
  if (!validated.ok) throw new Error(validated.error);
  const { seedKey: _s, repeats: _r, ...rest } = validated.protocol;
  return rest;
}

/** Named observational arms for the evidence ladder (M2–M5), across EVIDENCE_GRIDS. */
export function buildEvidenceArms(): EvidenceArm[] {
  const strip = (p: ResearchProtocol): Omit<ResearchProtocol, "seedKey" | "repeats"> => {
    const { seedKey: _s, repeats: _r, ...rest } = p;
    return rest;
  };

  const armId = (base: string, grid: EvidenceGrid): EvidenceArmId =>
    (grid.id === "48x36" ? base : `${base}-${grid.id}`) as EvidenceArmId;

  const gridFactor = (grid: EvidenceGrid) => `grid=${grid.id}`;

  const arms: EvidenceArm[] = [];

  for (const grid of EVIDENCE_GRIDS) {
    const geo = { cols: grid.cols, rows: grid.rows };
    const m2Shared = {
      schedule: { ...M2_SCHEDULE },
      generationLimit: M2_GENERATION_LIMIT,
      controllerMode: "SetpointError" as const,
      organizationMode: "Central" as const,
      ...geo,
    };

    arms.push(
      {
        id: armId("m2-baseline", grid),
        milestone: "m2",
        label: `M2 baseline (no feedback) ${grid.id}`,
        factor: `studyCondition=baseline;${gridFactor(grid)}`,
        protocolTemplate: baseWorld({ studyCondition: "baseline", ...m2Shared }),
      },
      {
        id: armId("m2-env-no-control", grid),
        milestone: "m2",
        label: `M2 env-no-control (env on, adaptive control off) ${grid.id}`,
        factor: `studyCondition=envNoControl;${gridFactor(grid)}`,
        protocolTemplate: baseWorld({ studyCondition: "envNoControl", ...m2Shared }),
      },
      {
        id: armId("m2-homeostatic", grid),
        milestone: "m2",
        label: `M2 homeostatic (feedback, ultra off) ${grid.id}`,
        factor: `studyCondition=homeostatic;${gridFactor(grid)}`,
        protocolTemplate: baseWorld({ studyCondition: "homeostatic", ...m2Shared }),
      },
    );

    const m3Shared = {
      schedule: { ...M3_SCHEDULE },
      generationLimit: M3_GENERATION_LIMIT,
      controllerMode: "SetpointError" as const,
      organizationMode: "Central" as const,
      ...geo,
    };
    arms.push(
      {
        id: armId("m3-homeostatic", grid),
        milestone: "m3",
        label: `M3 homeostatic under sustained disturbance ${grid.id}`,
        factor: `studyCondition=homeostatic;${gridFactor(grid)}`,
        protocolTemplate: baseWorld({ studyCondition: "homeostatic", ...m3Shared }),
      },
      {
        id: armId("m3-ultrastable", grid),
        milestone: "m3",
        label: `M3 ultrastable under sustained disturbance ${grid.id}`,
        factor: `studyCondition=ultrastable;${gridFactor(grid)}`,
        protocolTemplate: baseWorld({ studyCondition: "ultrastable", ...m3Shared }),
      },
    );

    const m4Base = {
      ...baseWorld({
        studyCondition: "homeostatic",
        schedule: { ...AB_CONTROLLER_SCHEDULE },
        generationLimit: AB_CONTROLLER_GENERATION_LIMIT,
        controllerMode: "SetpointError",
        organizationMode: "Central",
        ...geo,
      }),
      seedKey: EVIDENCE_SEED_KEYS[0],
      repeats: 1,
    };
    const { setpoint, viability } = abControllerProtocols(m4Base);
    arms.push(
      {
        id: armId("m4-setpoint", grid),
        milestone: "m4",
        label: `M4 SetpointError controller ${grid.id}`,
        factor: `controllerMode=SetpointError;${gridFactor(grid)}`,
        protocolTemplate: strip(setpoint),
      },
      {
        id: armId("m4-viability", grid),
        milestone: "m4",
        label: `M4 ViabilityBand controller ${grid.id}`,
        factor: `controllerMode=ViabilityBand;${gridFactor(grid)}`,
        protocolTemplate: strip(viability),
      },
    );

    const m5Base = {
      ...baseWorld({
        studyCondition: "homeostatic",
        schedule: { ...ABC_ORGANIZATION_SCHEDULE },
        generationLimit: ABC_ORGANIZATION_GENERATION_LIMIT,
        controllerMode: "SetpointError",
        organizationMode: "Central",
        ...geo,
      }),
      seedKey: EVIDENCE_SEED_KEYS[0],
      repeats: 1,
    };
    const { central, local, coordinated } = abcOrganizationProtocols(m5Base);
    // Coupling ablation: Coordinated with α=0 (bandwidth→0). VSM = hypothesis only.
    const ablated = validateProtocol({
      ...m5Base,
      organizationMode: "Coordinated",
      coordCouplingAlpha: 0,
    });
    if (!ablated.ok) throw new Error(ablated.error);
    arms.push(
      {
        id: armId("m5-central", grid),
        milestone: "m5",
        label: `M5 Central organization ${grid.id}`,
        factor: `organizationMode=Central;${gridFactor(grid)}`,
        protocolTemplate: strip(central),
      },
      {
        id: armId("m5-local", grid),
        milestone: "m5",
        label: `M5 Local organization ${grid.id}`,
        factor: `organizationMode=Local;${gridFactor(grid)}`,
        protocolTemplate: strip(local),
      },
      {
        id: armId("m5-coordinated", grid),
        milestone: "m5",
        label: `M5 Coordinated organization ${grid.id}`,
        factor: `organizationMode=Coordinated;coordCouplingAlpha=0.3;${gridFactor(grid)}`,
        protocolTemplate: strip(coordinated),
      },
      {
        id: armId("m5-coord-ablated", grid),
        milestone: "m5",
        label: `M5 Coordinated coupling ablated (α=0) ${grid.id}`,
        factor: `organizationMode=Coordinated;coordCouplingAlpha=0;${gridFactor(grid)}`,
        protocolTemplate: strip(ablated.protocol),
      },
    );
  }

  return arms;
}

export function resolveSeedKeys(n: number): number[] {
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`n must be >= 1, got ${n}`);
  }
  if (n > EVIDENCE_SEED_KEYS.length) {
    throw new Error(
      `N=${n} exceeds fixed EVIDENCE_SEED_KEYS length (${EVIDENCE_SEED_KEYS.length}). Extend the list explicitly.`,
    );
  }
  return EVIDENCE_SEED_KEYS.slice(0, Math.round(n)).map((k) => k >>> 0);
}

/**
 * Run one named arm across a deterministic seed list (N ≤ EVIDENCE_SEED_KEYS.length).
 * Does not claim life/autopoiesis; observational summaries only.
 */
export function runEvidenceArm(
  arm: EvidenceArm,
  options: {
    n?: number;
    collectSeries?: boolean;
    engineFactory?: EngineFactory;
  } = {},
): EvidenceArmResult {
  const n = options.n ?? EVIDENCE_DEFAULT_N;
  const seedKeys = resolveSeedKeys(n);
  const results: ResearchRunSummary[] = [];
  for (let i = 0; i < seedKeys.length; i++) {
    // runBatch validates + runs repeats; we lock repeats=1 and vary seedKey
    // from the fixed EVIDENCE_SEED_KEYS list (multi-seed, not same-seed repeats).
    const protocol: ResearchProtocol = {
      ...arm.protocolTemplate,
      seedKey: seedKeys[i],
      repeats: 1,
    };
    const [row] = runBatch(protocol, options.engineFactory, {
      collectSeries: options.collectSeries ?? false,
    });
    results.push({ ...row, runIndex: i });
  }
  return { arm, seedKeys, results };
}

export function runEvidenceMatrix(
  options: {
    milestones?: EvidenceMilestone[];
    n?: number;
    collectSeries?: boolean;
    engineFactory?: EngineFactory;
    onArm?: (done: EvidenceArmResult, index: number, total: number) => void;
  } = {},
): EvidenceArmResult[] {
  const milestones = options.milestones ?? (["m2", "m3", "m4", "m5"] as EvidenceMilestone[]);
  const arms = buildEvidenceArms().filter((a) => milestones.includes(a.milestone));
  const out: EvidenceArmResult[] = [];
  for (let i = 0; i < arms.length; i++) {
    const row = runEvidenceArm(arms[i], options);
    out.push(row);
    options.onArm?.(row, i, arms.length);
  }
  return out;
}

export interface EvidenceProtocolMeta {
  milestone: EvidenceMilestone;
  armId: EvidenceArmId;
  label: string;
  factor: string;
  seedStrategy: "fixed-seedKey-list";
  seedKeys: number[];
  n: number;
  protocol: Omit<ResearchProtocol, "seedKey" | "repeats">;
  schemaVersion: typeof THETA_SCHEMA_VERSION;
  theta: ThetaV0;
  notes: string[];
}

export function armProtocolMeta(armResult: EvidenceArmResult): EvidenceProtocolMeta {
  return {
    milestone: armResult.arm.milestone,
    armId: armResult.arm.id,
    label: armResult.arm.label,
    factor: armResult.arm.factor,
    seedStrategy: "fixed-seedKey-list",
    seedKeys: [...armResult.seedKeys],
    n: armResult.seedKeys.length,
    protocol: armResult.arm.protocolTemplate,
    schemaVersion: THETA_SCHEMA_VERSION,
    theta: thetaFromProtocol({
      ...armResult.arm.protocolTemplate,
      seedKey: armResult.seedKeys[0] ?? 0,
      repeats: armResult.seedKeys.length,
      armId: armResult.arm.id,
    }),
    notes: [
      "Observational only — eng scaffolding ≠ scientific closure.",
      "Protocol-calibrated observational K (densityMin/Max from PROTOCOL_CALIBRATED_K; unregulated M2 baseline+envNoControl percentiles).",
      "No life / autopoiesis / cognition claims.",
      "UltraEpisodeLog aggregates appear on each run summary when present.",
    ],
  };
}

/** JSONL with a leading `#` metadata header line (JSON object) then one summary per line. */
export function exportArmJsonl(armResult: EvidenceArmResult): string {
  const meta = armProtocolMeta(armResult);
  const header = `# ${JSON.stringify(meta)}`;
  return `${header}\n${exportJsonl(armResult.results)}`;
}

export function exportArmCsv(armResult: EvidenceArmResult): string {
  return exportCsv(armResult.results);
}

export function validateEvidenceMatrix(): { ok: true; arms: EvidenceArm[] } | { ok: false; error: string } {
  try {
    const arms = buildEvidenceArms();
    // 10 contrast families × ≥2 grids
    if (arms.length < 22) return { ok: false, error: `expected ≥22 arms, got ${arms.length}` };
    if (EVIDENCE_GRIDS.length < 2) return { ok: false, error: "expected ≥2 evidence grids" };
    const ids = new Set(arms.map((a) => a.id));
    if (ids.size !== arms.length) return { ok: false, error: "duplicate arm ids" };
    for (const a of arms) {
      const v = validateProtocol({
        ...a.protocolTemplate,
        seedKey: EVIDENCE_SEED_KEYS[0],
        repeats: 1,
      });
      if (!v.ok) return { ok: false, error: `${a.id}: ${v.error}` };
    }
    const grids = new Set(arms.map((a) => `${a.protocolTemplate.cols}x${a.protocolTemplate.rows}`));
    if (grids.size < 2) return { ok: false, error: "arms must span ≥2 grid sizes" };

    // Pairing invariants (per grid)
    for (const grid of EVIDENCE_GRIDS) {
      const m2 = arms.filter(
        (a) => a.milestone === "m2" && a.protocolTemplate.cols === grid.cols && a.protocolTemplate.rows === grid.rows,
      );
      if (m2.length !== 3) return { ok: false, error: `M2 must have 3 arms at ${grid.id}` };
      for (let i = 1; i < m2.length; i++) {
        if (m2[0].protocolTemplate.schedule.id !== m2[i].protocolTemplate.schedule.id) {
          return { ok: false, error: `M2 arms must share schedule at ${grid.id}` };
        }
        if (m2[0].protocolTemplate.generationLimit !== m2[i].protocolTemplate.generationLimit) {
          return { ok: false, error: `M2 arms must share generationLimit at ${grid.id}` };
        }
      }
      const m4 = arms.filter(
        (a) => a.milestone === "m4" && a.protocolTemplate.cols === grid.cols && a.protocolTemplate.rows === grid.rows,
      );
      if (m4.length !== 2) return { ok: false, error: `M4 must have 2 arms at ${grid.id}` };
      if (m4[0].protocolTemplate.controllerMode === m4[1].protocolTemplate.controllerMode) {
        return { ok: false, error: `M4 arms must differ in controllerMode at ${grid.id}` };
      }
      const m5 = arms.filter(
        (a) => a.milestone === "m5" && a.protocolTemplate.cols === grid.cols && a.protocolTemplate.rows === grid.rows,
      );
      if (m5.length !== 4) return { ok: false, error: `M5 must have 4 arms at ${grid.id}` };
      const org = new Set(m5.map((a) => a.protocolTemplate.organizationMode));
      if (org.size !== 3) return { ok: false, error: `M5 must cover Central|Local|Coordinated at ${grid.id}` };
      const ablated = m5.find((a) => a.id.includes("coord-ablated"));
      if (!ablated || ablated.protocolTemplate.coordCouplingAlpha !== 0) {
        return { ok: false, error: `M5 coupling ablation arm missing or α≠0 at ${grid.id}` };
      }
      const coordinated = m5.find(
        (a) => a.id === (grid.id === "48x36" ? "m5-coordinated" : `m5-coordinated-${grid.id}`),
      );
      if (!coordinated || coordinated.protocolTemplate.coordCouplingAlpha !== 0.3) {
        return { ok: false, error: `M5 coordinated default α≠0.3 at ${grid.id}` };
      }
    }
    return { ok: true, arms };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
