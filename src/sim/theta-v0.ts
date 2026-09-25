/**
 * ThetaV0 — characterization parameter / protocol stamp (captain + Architect freeze).
 *
 * Formal model (roadmap): x(t+1) = F(x(t), u(t), theta(t), w(t)).
 * This schema stamps the locked theta (incl. env knobs + schedule + seed) on evidence
 * exports before E1 sweeps.
 *
 * Observational != scientific closure. M6 HARD-GATED. No sweep driver / UI theater in C1.
 * First sweep axes (later) = ladder factors only (condition/controller/org/alpha/schedule),
 * NOT continuous gains — gains are recorded in theta for completeness.
 *
 * Field names are the AUTHORITATIVE Architect freeze and match codebase identifiers.
 * Packs may seed defaults at lock time; stamped theta must be complete so
 * settingsFromProtocol / settingsFromTheta do not silently re-merge DEFAULT_SETTINGS+pack
 * for missing knobs at run time.
 */
import { classicGenome, genomeToString } from "./genome.ts";
import type { Genome } from "./types.ts";
import {
  DEFAULT_COORD_COUPLING_ALPHA,
  DEFAULT_SETTINGS,
  PROTOCOL_CALIBRATED_K,
  STUDY_CONDITIONS,
  normalizeControllerMode,
  normalizeDisturbance,
  normalizeOrganizationMode,
  normalizeSimSettings,
  type ControllerMode,
  type DisturbanceSchedule,
  type OrganizationMode,
  type PresetId,
  type SimSettings,
  type StudyConditionId,
} from "./types.ts";

export const THETA_SCHEMA_VERSION = "theta.v0" as const;

/** Nested schedule stamp (Architect: schedule.{id,startGen,duration,amplitude}). */
export interface ThetaV0Schedule {
  id: DisturbanceSchedule["id"];
  startGen: number;
  duration: number;
  amplitude: number;
}

/**
 * Characterization / export stamp theta (Architect freeze names).
 * Seed + schedule live INSIDE theta for this schema (full locked snapshot).
 */
export interface ThetaV0 {
  schemaVersion: typeof THETA_SCHEMA_VERSION;
  /** Stable id for the locked protocol snapshot (content-derived unless overridden). */
  protocolId: string;
  /** EvidenceArmId when from ladder; otherwise null. */
  armId: string | null;

  worldPreset: PresetId;
  cols: number;
  rows: number;
  schedule: ThetaV0Schedule;

  environment: boolean;
  climate: number;
  seasonRate: number;
  seasonAmp: number;
  energyRichness: number;
  metabolicHeat: number;
  noise: number;

  studyCondition: StudyConditionId;
  cybernetics: boolean;
  homeoGain: number;
  autoSetpoint: boolean;
  setpoint: number;
  controllerMode: ControllerMode;
  organizationMode: OrganizationMode;
  coordCouplingAlpha: number;
  ultraEnabled: boolean;
  varietyEnabled: boolean;
  autoEnabled: boolean;
  observerEnabled: boolean;

  /** Genome string (B-star / S-star) at lock/export. */
  rule: string;

  densityMin: number;
  densityMax: number;
  generationLimit: number;
  measurementInterval: number;
  seedKey: number;
  repeats: number;
}

/** Every required ThetaV0 key — export stamp tests fail if any is missing. */
export const THETA_V0_KEYS: readonly (keyof ThetaV0)[] = [
  "schemaVersion",
  "protocolId",
  "armId",
  "worldPreset",
  "cols",
  "rows",
  "schedule",
  "environment",
  "climate",
  "seasonRate",
  "seasonAmp",
  "energyRichness",
  "metabolicHeat",
  "noise",
  "studyCondition",
  "cybernetics",
  "homeoGain",
  "autoSetpoint",
  "setpoint",
  "controllerMode",
  "organizationMode",
  "coordCouplingAlpha",
  "ultraEnabled",
  "varietyEnabled",
  "autoEnabled",
  "observerEnabled",
  "rule",
  "densityMin",
  "densityMax",
  "generationLimit",
  "measurementInterval",
  "seedKey",
  "repeats",
] as const;

export type ThetaValidation =
  | { ok: true; theta: ThetaV0 }
  | { ok: false; error: string };

function finiteNumber(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function boolOr(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

/** FNV-1a 32-bit hex — stable, no crypto dependency. */
export function stableContentHash(text: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Parse B-star/S-star genome strings (classic Life uses B3/S23).
 * Empty/empty-set digit lists allowed. Returns null if unparseable.
 */
export function genomeFromString(rule: string): Genome | null {
  if (typeof rule !== "string") return null;
  const m = /^B([0-8\u2205]*)\/S([0-8\u2205]*)$/u.exec(rule.trim());
  if (!m) return null;
  const birth = Array.from({ length: 9 }, () => false);
  const survive = Array.from({ length: 9 }, () => false);
  const fill = (digits: string, lane: boolean[]) => {
    if (!digits || digits === "\u2205") return;
    for (const ch of digits) {
      if (ch >= "0" && ch <= "8") lane[Number(ch)] = true;
    }
  };
  fill(m[1], birth);
  fill(m[2], survive);
  return { birth, survive };
}

export function defaultRuleString(): string {
  return genomeToString(classicGenome());
}

type ProtocolIdFields = Omit<
  ThetaV0,
  "schemaVersion" | "protocolId" | "armId" | "seedKey" | "repeats"
>;

/** Canonical JSON for protocolId (excludes identity + per-run seed/repeats). */
function protocolIdPayload(fields: ProtocolIdFields): string {
  return JSON.stringify({
    worldPreset: fields.worldPreset,
    cols: fields.cols,
    rows: fields.rows,
    schedule: fields.schedule,
    environment: fields.environment,
    climate: fields.climate,
    seasonRate: fields.seasonRate,
    seasonAmp: fields.seasonAmp,
    energyRichness: fields.energyRichness,
    metabolicHeat: fields.metabolicHeat,
    noise: fields.noise,
    studyCondition: fields.studyCondition,
    cybernetics: fields.cybernetics,
    homeoGain: fields.homeoGain,
    autoSetpoint: fields.autoSetpoint,
    setpoint: fields.setpoint,
    controllerMode: fields.controllerMode,
    organizationMode: fields.organizationMode,
    coordCouplingAlpha: fields.coordCouplingAlpha,
    ultraEnabled: fields.ultraEnabled,
    varietyEnabled: fields.varietyEnabled,
    autoEnabled: fields.autoEnabled,
    observerEnabled: fields.observerEnabled,
    rule: fields.rule,
    densityMin: fields.densityMin,
    densityMax: fields.densityMax,
    generationLimit: fields.generationLimit,
    measurementInterval: fields.measurementInterval,
  });
}

export function makeProtocolId(fields: ProtocolIdFields): string {
  return `${THETA_SCHEMA_VERSION}-${stableContentHash(protocolIdPayload(fields))}`;
}

/** Env / loop / K / rule knobs resolved from study pack + defaults + explicit overrides. */
export interface ResolvedThetaKnobs {
  environment: boolean;
  climate: number;
  seasonRate: number;
  seasonAmp: number;
  energyRichness: number;
  metabolicHeat: number;
  noise: number;
  cybernetics: boolean;
  homeoGain: number;
  autoSetpoint: boolean;
  setpoint: number;
  ultraEnabled: boolean;
  varietyEnabled: boolean;
  autoEnabled: boolean;
  observerEnabled: boolean;
  densityMin: number;
  densityMax: number;
  controllerMode: ControllerMode;
  organizationMode: OrganizationMode;
  coordCouplingAlpha: number;
  rule: string;
}

export type ThetaKnobOverrides = Partial<ResolvedThetaKnobs>;

/**
 * Pack + DEFAULT_SETTINGS seed for missing knobs. Explicit overrides always win.
 * Used at lock time so stamped theta is complete (run path must not re-merge packs).
 */
export function resolveThetaKnobsFromPack(
  studyCondition: StudyConditionId,
  over: ThetaKnobOverrides = {},
): ResolvedThetaKnobs {
  const pack = STUDY_CONDITIONS.find((c) => c.id === studyCondition);
  // Do NOT spread `over` into the merge — explicit undefined must not wipe pack/defaults.
  // Overrides are applied below via boolOr / finiteNumber (undefined => fallback).
  const merged = normalizeSimSettings({
    ...DEFAULT_SETTINGS,
    ...(pack?.settings ?? {}),
    densityMin:
      over.densityMin ??
      (pack?.settings as Partial<SimSettings> | undefined)?.densityMin ??
      PROTOCOL_CALIBRATED_K.densityMin,
    densityMax:
      over.densityMax ??
      (pack?.settings as Partial<SimSettings> | undefined)?.densityMax ??
      PROTOCOL_CALIBRATED_K.densityMax,
  });
  return {
    environment: boolOr(over.environment, merged.environment),
    climate: finiteNumber(over.climate, merged.climate),
    seasonRate: finiteNumber(over.seasonRate, merged.seasonRate),
    seasonAmp: finiteNumber(over.seasonAmp, merged.seasonAmp),
    energyRichness: finiteNumber(over.energyRichness, merged.energyRichness),
    metabolicHeat: finiteNumber(over.metabolicHeat, merged.metabolicHeat),
    noise: finiteNumber(over.noise, merged.noise),
    cybernetics: boolOr(over.cybernetics, merged.cybernetics),
    homeoGain: finiteNumber(over.homeoGain, merged.homeoGain),
    autoSetpoint: boolOr(over.autoSetpoint, merged.autoSetpoint),
    setpoint: finiteNumber(over.setpoint, merged.setpoint),
    ultraEnabled: boolOr(over.ultraEnabled, merged.ultraEnabled),
    varietyEnabled: boolOr(over.varietyEnabled, merged.varietyEnabled),
    autoEnabled: boolOr(over.autoEnabled, merged.autoEnabled),
    observerEnabled: boolOr(over.observerEnabled, merged.observerEnabled),
    densityMin: finiteNumber(over.densityMin, merged.densityMin),
    densityMax: finiteNumber(over.densityMax, merged.densityMax),
    controllerMode: normalizeControllerMode(over.controllerMode ?? merged.controllerMode),
    organizationMode: normalizeOrganizationMode(over.organizationMode ?? merged.organizationMode),
    coordCouplingAlpha: Math.max(
      0,
      Math.min(
        1,
        finiteNumber(over.coordCouplingAlpha, merged.coordCouplingAlpha ?? DEFAULT_COORD_COUPLING_ALPHA),
      ),
    ),
    rule: typeof over.rule === "string" && over.rule.length > 0 ? over.rule : defaultRuleString(),
  };
}

/** Build SimSettings from a complete ThetaV0 (schedule included; seed/cols/rows stay outside settings). */
export function settingsFromTheta(theta: ThetaV0): SimSettings {
  return normalizeSimSettings({
    environment: theta.environment,
    climate: theta.climate,
    seasonRate: theta.seasonRate,
    seasonAmp: theta.seasonAmp,
    energyRichness: theta.energyRichness,
    metabolicHeat: theta.metabolicHeat,
    noise: theta.noise,
    cybernetics: theta.cybernetics,
    homeoGain: theta.homeoGain,
    autoSetpoint: theta.autoSetpoint,
    setpoint: theta.setpoint,
    controllerMode: theta.controllerMode,
    organizationMode: theta.organizationMode,
    coordCouplingAlpha: theta.coordCouplingAlpha,
    ultraEnabled: theta.ultraEnabled,
    varietyEnabled: theta.varietyEnabled,
    autoEnabled: theta.autoEnabled,
    observerEnabled: theta.observerEnabled,
    densityMin: theta.densityMin,
    densityMax: theta.densityMax,
    disturbance: normalizeDisturbance(theta.schedule),
    generationLimit: theta.generationLimit,
    measurementInterval: theta.measurementInterval,
  });
}

/** Assert / normalize a ThetaV0-shaped object (export replay + stamp checks). */
export function assertThetaV0(raw: unknown): ThetaValidation {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "theta must be an object" };
  }
  const t = raw as Record<string, unknown>;
  for (const key of THETA_V0_KEYS) {
    if (!(key in t)) {
      return { ok: false, error: `theta missing required field: ${key}` };
    }
  }
  if (t.schemaVersion !== THETA_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `schemaVersion must be "${THETA_SCHEMA_VERSION}", got ${String(t.schemaVersion)}`,
    };
  }
  if (typeof t.protocolId !== "string" || t.protocolId.length === 0) {
    return { ok: false, error: "protocolId must be a non-empty string" };
  }
  if (t.armId !== null && typeof t.armId !== "string") {
    return { ok: false, error: "armId must be string | null" };
  }
  const study = t.studyCondition;
  if (
    study !== "baseline" &&
    study !== "envNoControl" &&
    study !== "homeostatic" &&
    study !== "ultrastable"
  ) {
    return { ok: false, error: "studyCondition invalid" };
  }
  const scheduleRaw = t.schedule;
  if (!scheduleRaw || typeof scheduleRaw !== "object") {
    return { ok: false, error: "schedule must be an object" };
  }
  const schedule = normalizeDisturbance(scheduleRaw);
  const cols = Math.max(1, Math.round(finiteNumber(t.cols, 0)));
  const rows = Math.max(1, Math.round(finiteNumber(t.rows, 0)));
  if (cols < 1 || rows < 1) return { ok: false, error: "cols/rows must be positive" };
  const generationLimit = Math.round(finiteNumber(t.generationLimit, 0));
  if (generationLimit <= 0) {
    return { ok: false, error: "generationLimit must be > 0" };
  }
  const seedKey = Number(t.seedKey);
  if (!Number.isFinite(seedKey)) return { ok: false, error: "seedKey must be finite" };
  const repeats = Math.max(1, Math.round(finiteNumber(t.repeats, 1)));
  const rule = typeof t.rule === "string" && t.rule.length > 0 ? t.rule : defaultRuleString();
  if (!genomeFromString(rule)) {
    return { ok: false, error: `rule is not a parseable B/S genome: ${rule}` };
  }

  const theta: ThetaV0 = {
    schemaVersion: THETA_SCHEMA_VERSION,
    protocolId: t.protocolId as string,
    armId: (t.armId as string | null) ?? null,
    worldPreset: (t.worldPreset as PresetId) ?? "homeostat",
    cols,
    rows,
    schedule: {
      id: schedule.id,
      startGen: schedule.startGen,
      duration: schedule.duration,
      amplitude: schedule.amplitude,
    },
    environment: boolOr(t.environment, false),
    climate: finiteNumber(t.climate, DEFAULT_SETTINGS.climate),
    seasonRate: finiteNumber(t.seasonRate, DEFAULT_SETTINGS.seasonRate),
    seasonAmp: finiteNumber(t.seasonAmp, DEFAULT_SETTINGS.seasonAmp),
    energyRichness: finiteNumber(t.energyRichness, DEFAULT_SETTINGS.energyRichness),
    metabolicHeat: finiteNumber(t.metabolicHeat, DEFAULT_SETTINGS.metabolicHeat),
    noise: finiteNumber(t.noise, DEFAULT_SETTINGS.noise),
    studyCondition: study,
    cybernetics: boolOr(t.cybernetics, false),
    homeoGain: finiteNumber(t.homeoGain, DEFAULT_SETTINGS.homeoGain),
    autoSetpoint: boolOr(t.autoSetpoint, false),
    setpoint: finiteNumber(t.setpoint, DEFAULT_SETTINGS.setpoint),
    controllerMode: normalizeControllerMode(t.controllerMode),
    organizationMode: normalizeOrganizationMode(t.organizationMode),
    coordCouplingAlpha: Math.max(
      0,
      Math.min(1, finiteNumber(t.coordCouplingAlpha, DEFAULT_COORD_COUPLING_ALPHA)),
    ),
    ultraEnabled: boolOr(t.ultraEnabled, false),
    varietyEnabled: boolOr(t.varietyEnabled, false),
    autoEnabled: boolOr(t.autoEnabled, false),
    observerEnabled: boolOr(t.observerEnabled, false),
    rule,
    densityMin: finiteNumber(t.densityMin, PROTOCOL_CALIBRATED_K.densityMin),
    densityMax: finiteNumber(t.densityMax, PROTOCOL_CALIBRATED_K.densityMax),
    generationLimit,
    measurementInterval: Math.max(0, Math.round(finiteNumber(t.measurementInterval, 0))),
    seedKey: seedKey >>> 0,
    repeats,
  };
  return { ok: true, theta };
}


/**
 * Fail-closed export stamp check for row | meta | bare ThetaV0.
 * Accepts ResearchRunSummary-like `{ theta }`, EvidenceProtocolMeta-like
 * `{ schemaVersion, theta }`, or a bare ThetaV0. Throws if schemaVersion/θ
 * missing or truncated (any THETA_V0_KEYS field absent / invalid).
 */
export function assertExportHasFullTheta(rowOrMeta: unknown): ThetaV0 {
  if (!rowOrMeta || typeof rowOrMeta !== "object") {
    throw new Error("export stamp: expected object with ThetaV0");
  }
  const obj = rowOrMeta as Record<string, unknown>;
  let rawTheta: unknown;
  if ("theta" in obj) {
    if ("schemaVersion" in obj && obj.schemaVersion != null && obj.schemaVersion !== THETA_SCHEMA_VERSION) {
      throw new Error(
        `export stamp schemaVersion must be "${THETA_SCHEMA_VERSION}", got ${String(obj.schemaVersion)}`,
      );
    }
    rawTheta = obj.theta;
  } else {
    rawTheta = obj;
  }
  const validated = assertThetaV0(rawTheta);
  if (!validated.ok) {
    throw new Error(`export stamp incomplete ThetaV0: ${validated.error}`);
  }
  return validated.theta;
}

/** Stable JSON serialization (sorted keys) for hashes / golden compare. */
export function serializeThetaV0(theta: ThetaV0): string {
  const ordered: Record<string, unknown> = {};
  for (const key of THETA_V0_KEYS) {
    ordered[key] = theta[key];
  }
  return JSON.stringify(ordered);
}
