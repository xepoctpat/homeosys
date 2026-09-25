/**
 * C3 — M2-scoped characterization sweep over ladder factors ONLY.
 *
 * Axes: studyCondition | controllerMode | organizationMode | coordCouplingAlpha | schedule.
 * Continuous gains (homeoGain, climate, seasonRate, noise, …) are refused.
 *
 * Builds a cartesian product of allowlisted discrete levels × EVIDENCE_GRIDS into evidence arms,
 * runs via runEvidenceArm / runBatch, exports via exportArmJsonl/Csv (C2 θ stamp).
 *
 * Observational ≠ scientific closure. M6 HARD-GATED. No E1 eng platform.
 */
import {
  EVIDENCE_COLS,
  EVIDENCE_GRIDS,
  EVIDENCE_MEASUREMENT_INTERVAL,
  EVIDENCE_ROWS,
  EVIDENCE_WORLD_PRESET,
  M2_GENERATION_LIMIT,
  M2_SCHEDULE,
  M3_SCHEDULE,
  exportArmCsv,
  exportArmJsonl,
  runEvidenceArm,
  type EvidenceArm,
  type EvidenceArmResult,
  type EvidenceGrid,
  type EvidenceGridId,
} from "./evidence-matrix.ts";
import { validateProtocol, type EngineFactory, type ResearchProtocol } from "./research-mode.ts";
import type {
  ControllerMode,
  DisturbanceSchedule,
  DisturbanceScheduleId,
  OrganizationMode,
  StudyConditionId,
} from "./types.ts";
import { DEFAULT_COORD_COUPLING_ALPHA } from "./types.ts";

/** Allowlisted M2 ladder-factor sweep axes (captain lock — not continuous gains). */
export const M2_LADDER_SWEEP_AXES = [
  "studyCondition",
  "controllerMode",
  "organizationMode",
  "coordCouplingAlpha",
  "schedule",
] as const;

export type M2LadderSweepAxis = (typeof M2_LADDER_SWEEP_AXES)[number];

const ALLOWED_SET = new Set<string>(M2_LADDER_SWEEP_AXES);

/**
 * Continuous / free-float knobs that must NEVER be sweep axes.
 * (Recorded in ThetaV0 for completeness; not first-axis factors.)
 */
export const M2_SWEEP_REFUSED_AXES = [
  "homeoGain",
  "climate",
  "seasonRate",
  "seasonAmp",
  "noise",
  "energyRichness",
  "metabolicHeat",
  "setpoint",
  "densityMin",
  "densityMax",
  "generationLimit",
  "measurementInterval",
  "cols",
  "rows",
] as const;

/** M2-first studyCondition levels (ultrastable stays M3 unless explicitly opted in). */
export const M2_SWEEP_STUDY_CONDITIONS = [
  "baseline",
  "envNoControl",
  "homeostatic",
] as const satisfies readonly StudyConditionId[];

export const M2_SWEEP_CONTROLLER_MODES = [
  "SetpointError",
  "ViabilityBand",
] as const satisfies readonly ControllerMode[];

export const M2_SWEEP_ORGANIZATION_MODES = [
  "Central",
  "Local",
  "Coordinated",
] as const satisfies readonly OrganizationMode[];

/** Discrete α allowlist only — NOT a continuous float grid. */
export const M2_SWEEP_COORD_COUPLING_ALPHAS = [0, 0.3] as const;

/**
 * Named schedule objects keyed by DisturbanceScheduleId.
 * pulse = M2_SCHEDULE; sustained = M3_SCHEDULE; none = id-only (w=0).
 */
export const M2_SWEEP_SCHEDULE_BY_ID: Record<DisturbanceScheduleId, DisturbanceSchedule> = {
  none: {
    id: "none",
    startGen: M2_SCHEDULE.startGen,
    duration: M2_SCHEDULE.duration,
    amplitude: M2_SCHEDULE.amplitude,
  },
  pulse: { ...M2_SCHEDULE },
  sustained: { ...M3_SCHEDULE },
};

export const M2_SWEEP_SCHEDULE_IDS = [
  "none",
  "pulse",
  "sustained",
] as const satisfies readonly DisturbanceScheduleId[];

/** Defaults when an axis is not expanded (M2 canonical). */
export const M2_SWEEP_DEFAULTS = {
  studyCondition: "homeostatic" as StudyConditionId,
  controllerMode: "SetpointError" as ControllerMode,
  organizationMode: "Central" as OrganizationMode,
  /** Default α; ignored unless organizationMode=Coordinated. */
  coordCouplingAlpha: DEFAULT_COORD_COUPLING_ALPHA as number,
  schedule: "pulse" as DisturbanceScheduleId,
};

export const M2_SWEEP_LEVELS = {
  studyCondition: M2_SWEEP_STUDY_CONDITIONS,
  controllerMode: M2_SWEEP_CONTROLLER_MODES,
  organizationMode: M2_SWEEP_ORGANIZATION_MODES,
  coordCouplingAlpha: M2_SWEEP_COORD_COUPLING_ALPHAS,
  schedule: M2_SWEEP_SCHEDULE_IDS,
} as const;

export function isAllowedM2SweepAxis(name: string): name is M2LadderSweepAxis {
  return ALLOWED_SET.has(name);
}

export interface M2SweepSpec {
  /**
   * Axes to expand into a cartesian product. Others fixed to M2_SWEEP_DEFAULTS.
   * Default smoke: studyCondition only.
   */
  expandAxes?: readonly string[];
  /** Optional per-axis level overrides (must stay within allowlisted discrete sets). */
  levels?: {
    studyCondition?: readonly StudyConditionId[];
    controllerMode?: readonly ControllerMode[];
    organizationMode?: readonly OrganizationMode[];
    coordCouplingAlpha?: readonly number[];
    schedule?: readonly DisturbanceScheduleId[];
  };
  /**
   * Grids to run (default: EVIDENCE_GRIDS = 48×36 + 72×54).
   * Single-grid override: pass one entry, or set cols/rows without grids
   * (cheap smoke; synthesizes id from dims).
   */
  grids?: readonly EvidenceGrid[];
  /** Single-grid override (ignored when `grids` is set). */
  cols?: number;
  rows?: number;
  generationLimit?: number;
}

/** Resolve grids for a sweep: explicit grids > cols/rows single > EVIDENCE_GRIDS dual. */
export function resolveM2SweepGrids(spec: M2SweepSpec = {}): EvidenceGrid[] {
  if (spec.grids && spec.grids.length > 0) {
    return [...spec.grids];
  }
  if (spec.cols != null || spec.rows != null) {
    const cols = spec.cols ?? EVIDENCE_COLS;
    const rows = spec.rows ?? EVIDENCE_ROWS;
    const known = EVIDENCE_GRIDS.find((g) => g.cols === cols && g.rows === rows);
    const id = (known?.id ?? (`${cols}x${rows}` as EvidenceGridId));
    return [{ id, cols, rows }];
  }
  return [...EVIDENCE_GRIDS];
}

export type M2SweepFactorCell = {
  studyCondition: StudyConditionId;
  controllerMode: ControllerMode;
  organizationMode: OrganizationMode;
  coordCouplingAlpha: number;
  scheduleId: DisturbanceScheduleId;
};

function refuseMessage(name: string): string {
  return (
    `M2 ladder sweep refuses continuous/non-ladder axis "${name}". ` +
    `Allowed: ${M2_LADDER_SWEEP_AXES.join(", ")}. ` +
    `Gains/env floats are stamped in ThetaV0 but are not sweep axes.`
  );
}

/**
 * Validate a sweep spec. Throws if any expandAxes entry is not an allowlisted ladder axis
 * (including continuous-gain names like homeoGain / climate).
 */
export function assertM2SweepSpec(spec: M2SweepSpec = {}): asserts spec is M2SweepSpec & {
  expandAxes?: readonly M2LadderSweepAxis[];
} {
  const axes = spec.expandAxes ?? ["studyCondition"];
  for (const name of axes) {
    if (!isAllowedM2SweepAxis(name)) {
      throw new Error(refuseMessage(name));
    }
  }
  if (spec.levels?.coordCouplingAlpha) {
    for (const a of spec.levels.coordCouplingAlpha) {
      if (!(M2_SWEEP_COORD_COUPLING_ALPHAS as readonly number[]).includes(a)) {
        throw new Error(
          `coordCouplingAlpha level ${a} not in discrete allowlist {${M2_SWEEP_COORD_COUPLING_ALPHAS.join(", ")}}`,
        );
      }
    }
  }
}

function levelsFor<K extends M2LadderSweepAxis>(
  axis: K,
  spec: M2SweepSpec,
  expanded: ReadonlySet<M2LadderSweepAxis>,
): readonly (typeof M2_SWEEP_LEVELS)[K][number][] {
  if (!expanded.has(axis)) {
    const d = M2_SWEEP_DEFAULTS[axis === "schedule" ? "schedule" : axis];
    return [d as (typeof M2_SWEEP_LEVELS)[K][number]];
  }
  const override = spec.levels?.[axis];
  if (override && override.length > 0) {
    return override as readonly (typeof M2_SWEEP_LEVELS)[K][number][];
  }
  return M2_SWEEP_LEVELS[axis] as readonly (typeof M2_SWEEP_LEVELS)[K][number][];
}

/**
 * α is only meaningful when organizationMode=Coordinated.
 * Non-Coordinated cells collapse to a single default α (deduped).
 * When α is expanded and org is not, force Coordinated.
 */
function normalizeAlphaOrgCell(cell: {
  organizationMode: OrganizationMode;
  coordCouplingAlpha: number;
  alphaExpanded: boolean;
  orgExpanded: boolean;
}): { organizationMode: OrganizationMode; coordCouplingAlpha: number } {
  if (cell.alphaExpanded && !cell.orgExpanded) {
    return { organizationMode: "Coordinated", coordCouplingAlpha: cell.coordCouplingAlpha };
  }
  if (cell.organizationMode !== "Coordinated") {
    return {
      organizationMode: cell.organizationMode,
      coordCouplingAlpha: M2_SWEEP_DEFAULTS.coordCouplingAlpha,
    };
  }
  return {
    organizationMode: "Coordinated",
    coordCouplingAlpha: cell.coordCouplingAlpha,
  };
}

function cellKey(c: M2SweepFactorCell): string {
  return [
    c.studyCondition,
    c.controllerMode,
    c.organizationMode,
    String(c.coordCouplingAlpha),
    c.scheduleId,
  ].join("|");
}

/** Discrete factor cells for the requested expandAxes (cartesian, α-aware). */
export function buildM2SweepFactorCells(spec: M2SweepSpec = {}): M2SweepFactorCell[] {
  assertM2SweepSpec(spec);
  const expandAxes = (spec.expandAxes ?? ["studyCondition"]) as readonly M2LadderSweepAxis[];
  const expanded = new Set<M2LadderSweepAxis>(expandAxes);
  const alphaExpanded = expanded.has("coordCouplingAlpha");
  const orgExpanded = expanded.has("organizationMode");

  const studyConditions = levelsFor("studyCondition", spec, expanded);
  const controllerModes = levelsFor("controllerMode", spec, expanded);
  const organizationModes = levelsFor("organizationMode", spec, expanded);
  const alphas = levelsFor("coordCouplingAlpha", spec, expanded);
  const schedules = levelsFor("schedule", spec, expanded);

  const seen = new Set<string>();
  const out: M2SweepFactorCell[] = [];

  for (const studyCondition of studyConditions) {
    for (const controllerMode of controllerModes) {
      for (const organizationMode of organizationModes) {
        for (const coordCouplingAlpha of alphas) {
          for (const scheduleId of schedules) {
            const norm = normalizeAlphaOrgCell({
              organizationMode,
              coordCouplingAlpha: Number(coordCouplingAlpha),
              alphaExpanded,
              orgExpanded,
            });
            const cell: M2SweepFactorCell = {
              studyCondition,
              controllerMode,
              organizationMode: norm.organizationMode,
              coordCouplingAlpha: norm.coordCouplingAlpha,
              scheduleId,
            };
            const k = cellKey(cell);
            if (seen.has(k)) continue;
            seen.add(k);
            out.push(cell);
          }
        }
      }
    }
  }
  return out;
}

function armIdFor(cell: M2SweepFactorCell, grid: EvidenceGrid): string {
  return [
    "m2-sweep",
    `g=${grid.id}`,
    `sc=${cell.studyCondition}`,
    `ctrl=${cell.controllerMode}`,
    `org=${cell.organizationMode}`,
    `a=${cell.coordCouplingAlpha}`,
    `sched=${cell.scheduleId}`,
  ].join("__");
}

function factorString(cell: M2SweepFactorCell, grid: EvidenceGrid): string {
  return [
    `studyCondition=${cell.studyCondition}`,
    `controllerMode=${cell.controllerMode}`,
    `organizationMode=${cell.organizationMode}`,
    `coordCouplingAlpha=${cell.coordCouplingAlpha}`,
    `schedule=${cell.scheduleId}`,
    `grid=${grid.id}`,
  ].join(";");
}

function protocolTemplateFor(
  cell: M2SweepFactorCell,
  spec: M2SweepSpec,
  grid: EvidenceGrid,
): Omit<ResearchProtocol, "seedKey" | "repeats"> {
  const schedule = { ...M2_SWEEP_SCHEDULE_BY_ID[cell.scheduleId] };
  const validated = validateProtocol({
    seedKey: 0,
    studyCondition: cell.studyCondition,
    schedule,
    generationLimit: spec.generationLimit ?? M2_GENERATION_LIMIT,
    measurementInterval: EVIDENCE_MEASUREMENT_INTERVAL,
    cols: grid.cols,
    rows: grid.rows,
    worldPreset: EVIDENCE_WORLD_PRESET,
    repeats: 1,
    controllerMode: cell.controllerMode,
    organizationMode: cell.organizationMode,
    coordCouplingAlpha: cell.coordCouplingAlpha,
    armId: armIdFor(cell, grid),
  });
  if (!validated.ok) throw new Error(validated.error);
  const { seedKey: _s, repeats: _r, ...rest } = validated.protocol;
  return rest;
}

/** Build EvidenceArm list for the M2 ladder-factor sweep (cells × grids). */
export function buildM2LadderSweepArms(spec: M2SweepSpec = {}): EvidenceArm[] {
  const cells = buildM2SweepFactorCells(spec);
  const grids = resolveM2SweepGrids(spec);
  const arms: EvidenceArm[] = [];
  for (const grid of grids) {
    for (const cell of cells) {
      arms.push({
        id: armIdFor(cell, grid),
        milestone: "m2" as const,
        label: `M2 sweep ${factorString(cell, grid)}`,
        factor: factorString(cell, grid),
        protocolTemplate: protocolTemplateFor(cell, spec, grid),
      });
    }
  }
  return arms;
}

/**
 * Run the M2 ladder-factor sweep (small by default: expand studyCondition only).
 * Pass expandAxes: M2_LADDER_SWEEP_AXES for the full discrete matrix.
 */
export function runM2LadderSweep(
  options: M2SweepSpec & {
    n?: number;
    collectSeries?: boolean;
    engineFactory?: EngineFactory;
    onArm?: (done: EvidenceArmResult, index: number, total: number) => void;
  } = {},
): EvidenceArmResult[] {
  const arms = buildM2LadderSweepArms(options);
  const out: EvidenceArmResult[] = [];
  for (let i = 0; i < arms.length; i++) {
    const row = runEvidenceArm(arms[i], {
      n: options.n,
      collectSeries: options.collectSeries,
      engineFactory: options.engineFactory,
    });
    out.push(row);
    options.onArm?.(row, i, arms.length);
  }
  return out;
}

export { exportArmCsv as exportM2SweepArmCsv, exportArmJsonl as exportM2SweepArmJsonl };
