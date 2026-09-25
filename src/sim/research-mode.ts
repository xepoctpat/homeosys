import { SimEngine } from "./engine.ts";
import {
  DEFAULT_SETTINGS,
  DEFAULT_COORD_COUPLING_ALPHA,
  STUDY_CONDITIONS,
  normalizeControllerMode,
  normalizeDisturbance,
  SCHEDULE_IDS,
  normalizeOrganizationMode,
  normalizeSimSettings,
  type ControllerMode,
  type DisturbanceSchedule,
  type Metrics,
  type OrganizationMode,
  type PresetId,
  type SimSettings,
  type StudyConditionId,
  type UltraEpisodeOutcome,
} from "./types.ts";
import {
  THETA_SCHEMA_VERSION,
  assertExportHasFullTheta,
  assertThetaV0,
  defaultRuleString,
  genomeFromString,
  makeProtocolId,
  resolveThetaKnobsFromPack,
  settingsFromTheta,
  type ThetaV0,
} from "./theta-v0.ts";

/** Default batch repeat count. */
export const RESEARCH_DEFAULT_REPEATS = 10;
/** Inclusive clamp for N repeats. */
export const RESEARCH_REPEATS_MIN = 1;
export const RESEARCH_REPEATS_MAX = 100;

/**
 * Locked research protocol snapshot.
 * Captures seed, study condition, disturbance schedule, and run horizons so a
 * later session can re-apply the same lock for offline compare / replay.
 * ResearchMode does not merge World vs Loops — it only freezes these fields.
 */
export interface ResearchProtocol {
  seedKey: number;
  studyCondition: StudyConditionId;
  schedule: DisturbanceSchedule;
  /** Must be > 0 for batch runs (unlimited/0 is rejected). */
  generationLimit: number;
  measurementInterval: number;
  cols: number;
  rows: number;
  /** World pattern preset used for seeding (not a loop flag). */
  worldPreset: PresetId;
  repeats: number;
  /** Fast homeostasis policy mode (M4 A/B factor). */
  controllerMode: ControllerMode;
  /** Organization / autonomy mode (M5 A/B/C factor). Scaffolding — not a VSM claim. */
  organizationMode: OrganizationMode;
  /**
   * Coordinated coupling α (default 0.3). Set 0 for M5 coupling ablation.
   * Ignored unless organizationMode=Coordinated. VSM remains a hypothesis only.
   */
  coordCouplingAlpha: number;

  /** Stable protocol snapshot id (content-derived unless overridden). */
  protocolId: string;
  /** Evidence arm id when locked from the ladder; otherwise null. */
  armId: string | null;

  /** Env knobs stamped into the lock (Architect freeze — complete θ). */
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

  /** Genome string (B/S) at lock time. */
  rule: string;

  densityMin: number;
  densityMax: number;
}

/** Per-generation sample at a measurement tick (optional, cheap JSONL). */
export interface ResearchSeriesPoint {
  generation: number;
  density: number;
  inK: boolean;
  timeInKFraction: number;
  cumulativeDistanceOutsideK: number;
  recoveries: number;
  meanAbsDensityError: number;
  interventionRate: number;
  coordinationBandwidthProxy: number;
  w: number;
  rule: string;
  ultraProbeCount: number;
  ultraKeptCount: number;
  ultraRevertedCount: number;
}

/** One batch-run terminal summary suitable for compare / replay. */
export interface ResearchRunSummary {
  runIndex: number;
  seedKey: number;
  studyCondition: StudyConditionId;
  controllerMode: ControllerMode;
  organizationMode: OrganizationMode;
  coordCouplingAlpha: number;
  scheduleId: DisturbanceSchedule["id"];
  scheduleStartGen: number;
  scheduleDuration: number;
  scheduleAmplitude: number;
  generationLimit: number;
  measurementInterval: number;
  worldPreset: PresetId;
  cols: number;
  rows: number;
  generation: number;
  density: number;
  inK: boolean;
  timeInKFraction: number;
  cumulativeDistanceOutsideK: number;
  recoveries: number;
  meanAbsDensityError: number;
  interventionRate: number;
  coordinationBandwidthProxy: number;
  ultraProbeCount: number;
  ultraKeptCount: number;
  ultraRevertedCount: number;
  lastUltraOutcome: UltraEpisodeOutcome | null;
  lastUltraGeneration: number | null;
  stableEpisodeLength: number;
  lastUltraMinPop: number | null;
  lastUltraDeltaPop: number | null;
  rule: string;
  w: number;
  /** Full ThetaV0 stamp (schemaVersion=theta.v0) for replay / export. */
  theta: ThetaV0;
  /** Optional measurement-tick time series when interval > 0. */
  series?: ResearchSeriesPoint[];
}

export type ProtocolValidation =
  | { ok: true; protocol: ResearchProtocol }
  | { ok: false; error: string };

export function clampRepeats(n: number): number {
  if (!Number.isFinite(n)) return RESEARCH_DEFAULT_REPEATS;
  return Math.max(RESEARCH_REPEATS_MIN, Math.min(RESEARCH_REPEATS_MAX, Math.round(n)));
}

/**
 * Build SimSettings from a locked protocol.
 * Uses ONLY stamped protocol knobs (no silent DEFAULT_SETTINGS+pack re-merge).
 * Packs seed defaults at validateProtocol/lock time; the stamp must already be complete.
 */
export function settingsFromProtocol(protocol: ResearchProtocol): SimSettings {
  return settingsFromTheta(thetaFromProtocol(protocol));
}

/** Build Architect-freeze ThetaV0 from a locked (complete) ResearchProtocol. */
export function thetaFromProtocol(protocol: ResearchProtocol): ThetaV0 {
  const schedule = {
    id: protocol.schedule.id,
    startGen: protocol.schedule.startGen,
    duration: protocol.schedule.duration,
    amplitude: protocol.schedule.amplitude,
  };
  const base = {
    schemaVersion: THETA_SCHEMA_VERSION,
    protocolId: protocol.protocolId,
    armId: protocol.armId,
    worldPreset: protocol.worldPreset,
    cols: protocol.cols,
    rows: protocol.rows,
    schedule,
    environment: protocol.environment,
    climate: protocol.climate,
    seasonRate: protocol.seasonRate,
    seasonAmp: protocol.seasonAmp,
    energyRichness: protocol.energyRichness,
    metabolicHeat: protocol.metabolicHeat,
    noise: protocol.noise,
    studyCondition: protocol.studyCondition,
    cybernetics: protocol.cybernetics,
    homeoGain: protocol.homeoGain,
    autoSetpoint: protocol.autoSetpoint,
    setpoint: protocol.setpoint,
    controllerMode: protocol.controllerMode,
    organizationMode: protocol.organizationMode,
    coordCouplingAlpha: protocol.coordCouplingAlpha,
    ultraEnabled: protocol.ultraEnabled,
    varietyEnabled: protocol.varietyEnabled,
    autoEnabled: protocol.autoEnabled,
    observerEnabled: protocol.observerEnabled,
    rule: protocol.rule,
    densityMin: protocol.densityMin,
    densityMax: protocol.densityMax,
    generationLimit: protocol.generationLimit,
    measurementInterval: protocol.measurementInterval,
    seedKey: protocol.seedKey,
    repeats: protocol.repeats,
  } satisfies ThetaV0;
  const protocolId =
    typeof protocol.protocolId === "string" && protocol.protocolId.length > 0
      ? protocol.protocolId
      : makeProtocolId(base);
  const validated = assertThetaV0({ ...base, protocolId });
  if (!validated.ok) throw new Error(validated.error);
  return validated.theta;
}

/** Rebuild a ResearchProtocol from a stamped ThetaV0 (export replay). */
export function protocolFromTheta(theta: ThetaV0): ResearchProtocol {
  const validated = assertThetaV0(theta);
  if (!validated.ok) throw new Error(validated.error);
  const t = validated.theta;
  return {
    seedKey: t.seedKey,
    studyCondition: t.studyCondition,
    schedule: {
      id: t.schedule.id,
      startGen: t.schedule.startGen,
      duration: t.schedule.duration,
      amplitude: t.schedule.amplitude,
    },
    generationLimit: t.generationLimit,
    measurementInterval: t.measurementInterval,
    cols: t.cols,
    rows: t.rows,
    worldPreset: t.worldPreset,
    repeats: t.repeats,
    controllerMode: t.controllerMode,
    organizationMode: t.organizationMode,
    coordCouplingAlpha: t.coordCouplingAlpha,
    protocolId: t.protocolId,
    armId: t.armId,
    environment: t.environment,
    climate: t.climate,
    seasonRate: t.seasonRate,
    seasonAmp: t.seasonAmp,
    energyRichness: t.energyRichness,
    metabolicHeat: t.metabolicHeat,
    noise: t.noise,
    cybernetics: t.cybernetics,
    homeoGain: t.homeoGain,
    autoSetpoint: t.autoSetpoint,
    setpoint: t.setpoint,
    ultraEnabled: t.ultraEnabled,
    varietyEnabled: t.varietyEnabled,
    autoEnabled: t.autoEnabled,
    observerEnabled: t.observerEnabled,
    rule: t.rule,
    densityMin: t.densityMin,
    densityMax: t.densityMax,
  };
}

/**
 * Validate and normalize a protocol.
 * generationLimit must be > 0 (batch requires a finite horizon).
 */
export function validateProtocol(
  input: Omit<Partial<ResearchProtocol>, "studyCondition"> & {
    seedKey?: number;
    studyCondition?: StudyConditionId | null;
  },
): ProtocolValidation {
  const studyCondition = input.studyCondition;
  if (
    studyCondition !== "baseline" &&
    studyCondition !== "envNoControl" &&
    studyCondition !== "homeostatic" &&
    studyCondition !== "ultrastable"
  ) {
    return {
      ok: false,
      error: "Select a study condition (baseline|envNoControl|homeostatic|ultrastable) before locking.",
    };
  }

  const seedKey = Number(input.seedKey);
  if (!Number.isFinite(seedKey)) {
    return { ok: false, error: "seedKey must be a finite number." };
  }

  const generationLimit = Number(input.generationLimit ?? 0);
  if (!Number.isFinite(generationLimit) || generationLimit <= 0) {
    return {
      ok: false,
      error: "generationLimit must be > 0 for a research batch. Set it in World before Run batch.",
    };
  }

  const scheduleRaw = input.schedule;
  if (
    !scheduleRaw ||
    !SCHEDULE_IDS.includes(scheduleRaw.id as (typeof SCHEDULE_IDS)[number])
  ) {
    return {
      ok: false,
      error: `Disturbance schedule id must be ${SCHEDULE_IDS.join("|")}.`,
    };
  }
  const schedule = normalizeDisturbance(scheduleRaw);

  const cols = Math.max(1, Math.round(Number(input.cols) || 0));
  const rows = Math.max(1, Math.round(Number(input.rows) || 0));
  if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols < 1 || rows < 1) {
    return { ok: false, error: "cols and rows must be positive." };
  }

  const worldPreset = (input.worldPreset ?? "homeostat") as PresetId;
  const measurementInterval = Math.max(0, Math.round(Number(input.measurementInterval) || 0));
  const repeats = clampRepeats(Number(input.repeats ?? RESEARCH_DEFAULT_REPEATS));

  const knobs = resolveThetaKnobsFromPack(studyCondition, {
    environment: input.environment,
    climate: input.climate,
    seasonRate: input.seasonRate,
    seasonAmp: input.seasonAmp,
    energyRichness: input.energyRichness,
    metabolicHeat: input.metabolicHeat,
    noise: input.noise,
    cybernetics: input.cybernetics,
    homeoGain: input.homeoGain,
    autoSetpoint: input.autoSetpoint,
    setpoint: input.setpoint,
    ultraEnabled: input.ultraEnabled,
    varietyEnabled: input.varietyEnabled,
    autoEnabled: input.autoEnabled,
    observerEnabled: input.observerEnabled,
    densityMin: input.densityMin,
    densityMax: input.densityMax,
    controllerMode: input.controllerMode,
    organizationMode: input.organizationMode,
    coordCouplingAlpha: input.coordCouplingAlpha,
    rule: input.rule,
  });

  const draft: ResearchProtocol = {
    seedKey: seedKey >>> 0,
    studyCondition,
    schedule,
    generationLimit: Math.round(generationLimit),
    measurementInterval,
    cols,
    rows,
    worldPreset,
    repeats,
    controllerMode: knobs.controllerMode,
    organizationMode: knobs.organizationMode,
    coordCouplingAlpha: knobs.coordCouplingAlpha,
    protocolId: typeof input.protocolId === "string" ? input.protocolId : "",
    armId: input.armId === undefined ? null : input.armId,
    environment: knobs.environment,
    climate: knobs.climate,
    seasonRate: knobs.seasonRate,
    seasonAmp: knobs.seasonAmp,
    energyRichness: knobs.energyRichness,
    metabolicHeat: knobs.metabolicHeat,
    noise: knobs.noise,
    cybernetics: knobs.cybernetics,
    homeoGain: knobs.homeoGain,
    autoSetpoint: knobs.autoSetpoint,
    setpoint: knobs.setpoint,
    ultraEnabled: knobs.ultraEnabled,
    varietyEnabled: knobs.varietyEnabled,
    autoEnabled: knobs.autoEnabled,
    observerEnabled: knobs.observerEnabled,
    rule: knobs.rule,
    densityMin: knobs.densityMin,
    densityMax: knobs.densityMax,
  };

  if (!draft.protocolId) {
    draft.protocolId = makeProtocolId({
      worldPreset: draft.worldPreset,
      cols: draft.cols,
      rows: draft.rows,
      schedule: {
        id: draft.schedule.id,
        startGen: draft.schedule.startGen,
        duration: draft.schedule.duration,
        amplitude: draft.schedule.amplitude,
      },
      environment: draft.environment,
      climate: draft.climate,
      seasonRate: draft.seasonRate,
      seasonAmp: draft.seasonAmp,
      energyRichness: draft.energyRichness,
      metabolicHeat: draft.metabolicHeat,
      noise: draft.noise,
      studyCondition: draft.studyCondition,
      cybernetics: draft.cybernetics,
      homeoGain: draft.homeoGain,
      autoSetpoint: draft.autoSetpoint,
      setpoint: draft.setpoint,
      controllerMode: draft.controllerMode,
      organizationMode: draft.organizationMode,
      coordCouplingAlpha: draft.coordCouplingAlpha,
      ultraEnabled: draft.ultraEnabled,
      varietyEnabled: draft.varietyEnabled,
      autoEnabled: draft.autoEnabled,
      observerEnabled: draft.observerEnabled,
      rule: draft.rule,
      densityMin: draft.densityMin,
      densityMax: draft.densityMax,
      generationLimit: draft.generationLimit,
      measurementInterval: draft.measurementInterval,
    });
  }

  return { ok: true, protocol: draft };
}

/** Snapshot locked fields from live UI state into a protocol candidate. */
export function captureProtocol(args: {
  seedKey: number;
  studyCondition: StudyConditionId | null;
  settings: SimSettings;
  cols: number;
  rows: number;
  worldPreset: PresetId;
  repeats: number;
  rule?: string;
  armId?: string | null;
  protocolId?: string;
}): ProtocolValidation {
  // Study packs own loop/env flags at lock time. Live World settings may still carry
  // exploratory knobs; do not let them override pack-owned θ fields. Modes, schedule,
  // horizons, K, and α come from the live lock surface; packs seed the rest.
  return validateProtocol({
    seedKey: args.seedKey,
    studyCondition: args.studyCondition,
    schedule: args.settings.disturbance,
    generationLimit: args.settings.generationLimit,
    measurementInterval: args.settings.measurementInterval,
    cols: args.cols,
    rows: args.rows,
    worldPreset: args.worldPreset,
    repeats: args.repeats,
    controllerMode: args.settings.controllerMode,
    organizationMode: args.settings.organizationMode,
    coordCouplingAlpha: args.settings.coordCouplingAlpha,
    densityMin: args.settings.densityMin,
    densityMax: args.settings.densityMax,
    rule: args.rule ?? defaultRuleString(),
    armId: args.armId ?? null,
    protocolId: args.protocolId,
  });
}

function seriesPointFromMetrics(m: Metrics): ResearchSeriesPoint {
  return {
    generation: m.generation,
    density: m.density,
    inK: m.inK,
    timeInKFraction: m.timeInKFraction,
    cumulativeDistanceOutsideK: m.cumulativeDistanceOutsideK,
    recoveries: m.recoveries,
    meanAbsDensityError: m.meanAbsDensityError,
    interventionRate: m.interventionRate,
    coordinationBandwidthProxy: m.coordinationBandwidthProxy,
    w: m.w,
    rule: m.rule,
    ultraProbeCount: m.ultraProbeCount,
    ultraKeptCount: m.ultraKeptCount,
    ultraRevertedCount: m.ultraRevertedCount,
  };
}

export function summarizeRun(
  protocol: ResearchProtocol,
  runIndex: number,
  metrics: Metrics,
  series?: ResearchSeriesPoint[],
): ResearchRunSummary {
  return {
    runIndex,
    seedKey: protocol.seedKey,
    studyCondition: protocol.studyCondition,
    controllerMode: protocol.controllerMode,
    organizationMode: protocol.organizationMode,
    coordCouplingAlpha: protocol.coordCouplingAlpha,
    scheduleId: protocol.schedule.id,
    scheduleStartGen: protocol.schedule.startGen,
    scheduleDuration: protocol.schedule.duration,
    scheduleAmplitude: protocol.schedule.amplitude,
    generationLimit: protocol.generationLimit,
    measurementInterval: protocol.measurementInterval,
    worldPreset: protocol.worldPreset,
    cols: protocol.cols,
    rows: protocol.rows,
    generation: metrics.generation,
    density: metrics.density,
    inK: metrics.inK,
    timeInKFraction: metrics.timeInKFraction,
    cumulativeDistanceOutsideK: metrics.cumulativeDistanceOutsideK,
    recoveries: metrics.recoveries,
    meanAbsDensityError: metrics.meanAbsDensityError,
    interventionRate: metrics.interventionRate,
    coordinationBandwidthProxy: metrics.coordinationBandwidthProxy,
    ultraProbeCount: metrics.ultraProbeCount,
    ultraKeptCount: metrics.ultraKeptCount,
    ultraRevertedCount: metrics.ultraRevertedCount,
    lastUltraOutcome: metrics.lastUltraOutcome,
    lastUltraGeneration: metrics.lastUltraGeneration,
    stableEpisodeLength: metrics.stableEpisodeLength,
    lastUltraMinPop: metrics.lastUltraMinPop,
    lastUltraDeltaPop: metrics.lastUltraDeltaPop,
    rule: metrics.rule,
    w: metrics.w,
    theta: thetaFromProtocol(protocol),
    ...(series && series.length > 0 ? { series } : {}),
  };
}

export type EngineFactory = () => SimEngine;

/**
 * Run one locked protocol trial synchronously.
 * Reseeds with the locked seedKey and steps until generationLimit.
 */
export function runOne(
  protocol: ResearchProtocol,
  runIndex: number,
  engineFactory: EngineFactory = () => new SimEngine(),
  options: { collectSeries?: boolean } = {},
): ResearchRunSummary {
  const engine = engineFactory();
  const settings = settingsFromProtocol(protocol);
  engine.allocate(protocol.cols, protocol.rows);
  engine.applySettings(settings);
  engine.seed(protocol.worldPreset, protocol.seedKey);
  // Apply locked rule after seed (seed resets genome to classic).
  const lockedGenome = genomeFromString(protocol.rule);
  if (lockedGenome) engine.genome = lockedGenome;

  const collectSeries = options.collectSeries !== false && protocol.measurementInterval > 0;
  const series: ResearchSeriesPoint[] = [];

  // Seed snapshot may already sit on a measurement tick (gen 0).
  if (collectSeries) {
    const snap0 = engine.snapshot();
    if (snap0.shouldMeasure) series.push(seriesPointFromMetrics(snap0));
  }

  while (!engine.limitReached()) {
    engine.step();
    if (collectSeries) {
      const snap = engine.snapshot();
      if (snap.shouldMeasure) series.push(seriesPointFromMetrics(snap));
    }
  }

  return summarizeRun(protocol, runIndex, engine.snapshot(), collectSeries ? series : undefined);
}

/**
 * Synchronous batch runner for tests and modest N×limit.
 * Each repeat reseeds with the same locked seedKey + locked settings.
 */
export function runBatch(
  protocol: ResearchProtocol,
  engineFactory?: EngineFactory,
  options?: { collectSeries?: boolean },
): ResearchRunSummary[] {
  const validated = validateProtocol(protocol);
  if (!validated.ok) throw new Error(validated.error);
  const p = validated.protocol;
  const results: ResearchRunSummary[] = [];
  for (let i = 0; i < p.repeats; i++) {
    results.push(runOne(p, i, engineFactory, options));
  }
  return results;
}

export type BatchProgress = {
  completed: number;
  total: number;
  last?: ResearchRunSummary;
};

/**
 * Async batch runner that yields between runs so the UI stays responsive.
 * Uses setTimeout(0) so it works in Node tests as well as browsers.
 */
export async function runBatchAsync(
  protocol: ResearchProtocol,
  onProgress?: (p: BatchProgress) => void,
  engineFactory?: EngineFactory,
  options?: { collectSeries?: boolean },
): Promise<ResearchRunSummary[]> {
  const validated = validateProtocol(protocol);
  if (!validated.ok) throw new Error(validated.error);
  const p = validated.protocol;
  const results: ResearchRunSummary[] = [];
  for (let i = 0; i < p.repeats; i++) {
    const row = runOne(p, i, engineFactory, options);
    results.push(row);
    onProgress?.({ completed: i + 1, total: p.repeats, last: row });
    if (i + 1 < p.repeats) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  return results;
}

/**
 * Flat metric columns for CSV (no nested series / no raw theta object).
 * C2: schemaVersion + thetaJson appended so every CSV row carries full ThetaV0
 * without exploding nested fields into theta.* columns.
 */
export const RESEARCH_CSV_FLAT_COLUMNS: readonly (keyof ResearchRunSummary)[] = [
  "runIndex",
  "seedKey",
  "studyCondition",
  "controllerMode",
  "organizationMode",
  "coordCouplingAlpha",
  "scheduleId",
  "scheduleStartGen",
  "scheduleDuration",
  "scheduleAmplitude",
  "generationLimit",
  "measurementInterval",
  "worldPreset",
  "cols",
  "rows",
  "generation",
  "density",
  "inK",
  "timeInKFraction",
  "cumulativeDistanceOutsideK",
  "recoveries",
  "meanAbsDensityError",
  "interventionRate",
  "coordinationBandwidthProxy",
  "ultraProbeCount",
  "ultraKeptCount",
  "ultraRevertedCount",
  "lastUltraOutcome",
  "lastUltraGeneration",
  "stableEpisodeLength",
  "lastUltraMinPop",
  "lastUltraDeltaPop",
  "rule",
  "w",
] as const;

/** Stamp columns: schemaVersion + JSON-serialized complete ThetaV0 (incl. env knobs). */
export const RESEARCH_CSV_THETA_COLUMNS = ["schemaVersion", "thetaJson"] as const;

/** Full CSV header: flat metrics + schemaVersion + thetaJson. */
export const RESEARCH_CSV_COLUMNS: readonly string[] = [
  ...RESEARCH_CSV_FLAT_COLUMNS,
  ...RESEARCH_CSV_THETA_COLUMNS,
];

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvCellForColumn(row: ResearchRunSummary, col: string): string {
  if (col === "schemaVersion") {
    return csvEscape(row.theta.schemaVersion);
  }
  if (col === "thetaJson") {
    return csvEscape(JSON.stringify(row.theta));
  }
  return csvEscape(row[col as keyof ResearchRunSummary]);
}

/** Serialize batch summaries as JSONL (one summary object per line, series nested). */
export function exportJsonl(results: ResearchRunSummary[]): string {
  return (
    results
      .map((row) => {
        assertExportHasFullTheta(row);
        return JSON.stringify(row);
      })
      .join("\n") + (results.length ? "\n" : "")
  );
}

/**
 * Serialize batch summaries as CSV (flat metrics + schemaVersion + thetaJson).
 * thetaJson is JSON.stringify(row.theta) so parsers recover complete ThetaV0
 * (incl. env knobs) without theta.* column explosion. Throws if θ missing.
 */
export function exportCsv(results: ResearchRunSummary[]): string {
  const header = RESEARCH_CSV_COLUMNS.join(",");
  const lines = results.map((row) => {
    assertExportHasFullTheta(row);
    return RESEARCH_CSV_COLUMNS.map((col) => csvCellForColumn(row, col)).join(",");
  });
  return [header, ...lines].join("\n") + (results.length ? "\n" : "");
}

/** Filename stem: homeosys-research-{condition}-{schedule}-{timestamp} */
export function researchExportBasename(protocol: ResearchProtocol, timestamp = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${timestamp.getFullYear()}${pad(timestamp.getMonth() + 1)}${pad(timestamp.getDate())}-${pad(timestamp.getHours())}${pad(timestamp.getMinutes())}${pad(timestamp.getSeconds())}`;
  return `homeosys-research-${protocol.studyCondition}-${protocol.controllerMode}-${protocol.organizationMode}-${protocol.schedule.id}-${ts}`;
}

/**
 * Trigger a browser download via Blob + anchor.
 * Lands in the user's browser download folder.
 */
export function downloadTextFile(filename: string, contents: string, mime: string): void {
  if (typeof document === "undefined") {
    throw new Error("downloadTextFile requires a browser document");
  }
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadResearchExport(
  protocol: ResearchProtocol,
  results: ResearchRunSummary[],
  format: "jsonl" | "csv",
): string {
  const base = researchExportBasename(protocol);
  if (format === "jsonl") {
    const name = `${base}.jsonl`;
    downloadTextFile(name, exportJsonl(results), "application/x-ndjson");
    return name;
  }
  const name = `${base}.csv`;
  downloadTextFile(name, exportCsv(results), "text/csv");
  return name;
}

/**
 * Shared A/B disturbance family for SetpointError vs ViabilityBand (M4).
 * Identical schedule / seed / generationLimit — only controllerMode flips.
 * Provisional knobs; not calibrated.
 */
export const AB_CONTROLLER_SCHEDULE: DisturbanceSchedule = {
  id: "pulse",
  startGen: 40,
  duration: 30,
  amplitude: 0.55,
};

/** Shared finite horizon for M4 A/B batches (must be > schedule.startGen). */
export const AB_CONTROLLER_GENERATION_LIMIT = 200;

export const AB_CONTROLLER_COPY =
  "A/B: SetpointError vs ViabilityBand — same seed, pulse@40/30 a=0.55, limit=200. " +
  "Arm shared schedule → Lock → Run batch → Export. Unlock → Arm B (or Flip) → Lock → Run → Export. " +
  "Compare timeInKFraction, cumulativeDistanceOutsideK, recoveries, meanAbsDensityError. Observational only. " +
  "Caveat: Unlock does not switch the arm — re-Arm B (or Flip) before Lock so the next batch is not still on Arm A.";

/** Apply shared A/B world knobs + chosen mode (does not change study pack / seed). */
export function armAbControllerSettings(
  mode: ControllerMode,
): Pick<SimSettings, "controllerMode" | "disturbance" | "generationLimit"> {
  return {
    controllerMode: mode,
    disturbance: { ...AB_CONTROLLER_SCHEDULE },
    generationLimit: AB_CONTROLLER_GENERATION_LIMIT,
  };
}

/** Build two protocols that differ only in controllerMode. */
export function abControllerProtocols(
  base: Omit<ResearchProtocol, "controllerMode">,
): { setpoint: ResearchProtocol; viability: ResearchProtocol } {
  const shared = validateProtocol({ ...base, controllerMode: "SetpointError" });
  if (!shared.ok) throw new Error(shared.error);
  const setpoint: ResearchProtocol = {
    ...shared.protocol,
    controllerMode: "SetpointError",
  };
  const viability: ResearchProtocol = {
    ...shared.protocol,
    controllerMode: "ViabilityBand",
  };
  return { setpoint, viability };
}

/**
 * Shared A/B/C disturbance family for Central vs Local vs Coordinated (M5).
 * Identical schedule / seed / generationLimit / controllerMode — only organizationMode flips.
 * Provisional knobs; not calibrated. Scaffolding for later evidence — not scientific completion.
 */
export const ABC_ORGANIZATION_SCHEDULE: DisturbanceSchedule = {
  id: "pulse",
  startGen: 40,
  duration: 30,
  amplitude: 0.55,
};

/** Shared finite horizon for M5 A/B/C batches (must be > schedule.startGen). */
export const ABC_ORGANIZATION_GENERATION_LIMIT = 200;

export const ABC_ORGANIZATION_COPY =
  "A/B/C (+ ablation): Central vs Local vs Coordinated (α=0.3) vs Coordinated α=0 — same seed, controllerMode, pulse@40/30 a=0.55, limit=200. " +
  "Arm shared schedule → Lock → Run batch → Export. Unlock → Arm next (or Flip) → Lock → Run → Export. " +
  "Compare timeInKFraction, cumulativeDistanceOutsideK, recoveries, meanAbsDensityError, interventionRate, " +
  "coordinationBandwidthProxy. Observational scaffolding only — VSM is a hypothesis, not a claim. " +
  "Caveat: Unlock does not switch the arm — re-Arm (or Flip) before Lock so the next batch is not still on the previous mode.";

/** Apply shared A/B/C world knobs + chosen organization mode (does not change study pack / seed). */
export function armAbcOrganizationSettings(
  mode: OrganizationMode,
): Pick<SimSettings, "organizationMode" | "disturbance" | "generationLimit"> {
  return {
    organizationMode: mode,
    disturbance: { ...ABC_ORGANIZATION_SCHEDULE },
    generationLimit: ABC_ORGANIZATION_GENERATION_LIMIT,
  };
}

/** Build three protocols that differ only in organizationMode. */
export function abcOrganizationProtocols(
  base: Omit<ResearchProtocol, "organizationMode">,
): { central: ResearchProtocol; local: ResearchProtocol; coordinated: ResearchProtocol } {
  const shared = validateProtocol({ ...base, organizationMode: "Central" });
  if (!shared.ok) throw new Error(shared.error);
  const central: ResearchProtocol = { ...shared.protocol, organizationMode: "Central" };
  const local: ResearchProtocol = { ...shared.protocol, organizationMode: "Local" };
  const coordinated: ResearchProtocol = { ...shared.protocol, organizationMode: "Coordinated" };
  return { central, local, coordinated };
}

/** Cycle Central → Local → Coordinated → Central. */
export function nextOrganizationMode(mode: OrganizationMode): OrganizationMode {
  if (mode === "Central") return "Local";
  if (mode === "Local") return "Coordinated";
  return "Central";
}
