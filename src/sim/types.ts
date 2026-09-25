export type PaintMode = "life" | "erase" | "regulator" | "energy";

export type PresetId =
  | "homeostat"
  | "classic"
  | "ice"
  | "hothouse"
  | "ashby"
  | "garden"
  | "dust";

export type LoopId =
  | "homeostasis"
  | "ultrastability"
  | "variety"
  | "metabolism"
  | "season"
  | "autopoiesis"
  | "observer";

export interface Genome {
  birth: boolean[];
  survive: boolean[];
}

export interface LoopFlag {
  id: LoopId;
  label: string;
  active: boolean;
  note: string;
}

/** Provisional viable region K for essential variable density.
 * Explicit lab defaults — not calibrated and not derived from the homeostasis setpoint.
 * meanEnergy floor is intentionally omitted to keep K a single clean density interval.
 */
export interface ViableRegion {
  densityMin: number;
  densityMax: number;
}

/** Conservative arbitrary density interval for labs. Labeled provisional everywhere it surfaces. */
export const PROVISIONAL_K: ViableRegion = {
  densityMin: 0.02,
  densityMax: 0.4,
};

/** Named disturbance schedule id — world/disturbance layer, never a loop flag. */
export type DisturbanceScheduleId = "none" | "pulse" | "sustained";

/**
 * Provisional DisturbanceSchedule knobs — lab defaults, not calibrated.
 * w(t) is computed from these params over generation t; study packs must not redefine them.
 */
export interface DisturbanceSchedule {
  id: DisturbanceScheduleId;
  /** Generation when the disturbance window opens. Provisional default. */
  startGen: number;
  /**
   * Window length in generations.
   * pulse: on-duration after startGen.
   * sustained: finite length after startGen; 0 = open-ended from startGen.
   */
  duration: number;
  /** Peak disturbance amplitude in [0, 1]. Provisional default. */
  amplitude: number;
}

/** Conservative provisional schedule defaults for labs. */
export const PROVISIONAL_SCHEDULE: DisturbanceSchedule = {
  id: "none",
  startGen: 50,
  duration: 25,
  amplitude: 0.55,
};

export type UltraEpisodeOutcome = "kept" | "reverted";

/**
 * One ultrastability probe episode.
 * startGeneration: generation at probe start (genome mutated), before that step's increment.
 * resolveGeneration: generation at probe resolve (kept/reverted), before that step's increment.
 * genomeBefore / genomeAfter: genomeToString forms; after keep = candidate, after revert = restored previous.
 * Failed probe (mean+0.02 < baseline) ⇒ outcome "reverted".
 */
export interface UltraEpisodeEvent {
  startGeneration: number;
  resolveGeneration: number;
  genomeBefore: string;
  genomeAfter: string;
  outcome: UltraEpisodeOutcome;
  baselineVia: number;
  probeMeanVia: number;
  popAtStart: number;
  minPopDuringProbe: number;
  popAtEnd: number;
}

export interface Metrics {
  generation: number;
  population: number;
  regulators: number;
  density: number;
  entropy: number;
  meanHeat: number;
  meanEnergy: number;
  /** Legacy composite score; not renamed to imply membership in K. */
  viability: number;
  setpoint: number;
  rule: string;
  adaptations: number;
  probing: boolean;
  /** Resolved ultrastability probe episodes since seed (capped log length). */
  ultraProbeCount: number;
  ultraKeptCount: number;
  ultraRevertedCount: number;
  lastUltraOutcome: UltraEpisodeOutcome | null;
  /** resolveGeneration of the most recent ultra episode; null if none. */
  lastUltraGeneration: number | null;
  /**
   * Generations since last probe resolution (kept or reverted).
   * If none since seed, equals current generation.
   */
  stableEpisodeLength: number;
  /** Min population during most recent resolved probe; null if none. */
  lastUltraMinPop: number | null;
  /** popAtEnd − popAtStart for most recent resolved probe; null if none. */
  lastUltraDeltaPop: number | null;
  seedKey: number;
  loops: LoopFlag[];
  popHistory: number[];
  viaHistory: number[];
  /** Essential variable z: density (required). meanEnergy is reported but not gated by K. */
  z: { density: number; meanEnergy: number };
  /** K bounds used this snapshot (provisional unless the operator overrides settings). */
  densityMin: number;
  densityMax: number;
  inK: boolean;
  timeInKFraction: number;
  cumulativeDistanceOutsideK: number;
  stepsInK: number;
  stepsObserved: number;
  lastExitGeneration: number | null;
  lastEnterGeneration: number | null;
  /** Exits followed by a later re-entry. */
  recoveries: number;
  /** Generations since last re-entry while still in K; null if outside or never re-entered. */
  settlingTime: number | null;
  /** Active disturbance schedule id (replay note). */
  scheduleId: DisturbanceScheduleId;
  /** Current w(t) from the schedule at this generation. */
  w: number;
  scheduleStartGen: number;
  scheduleDuration: number;
  scheduleAmplitude: number;
  /** 0 = unlimited. */
  generationLimit: number;
  /** Record every N generations; 0 = measurement hook disabled. */
  measurementInterval: number;
  measureCount: number;
  /** True on generations where a measurement tick fired. */
  shouldMeasure: boolean;
  /** True when generationLimit > 0 and generation >= generationLimit. */
  limitReached: boolean;
}

export interface SimSettings {
  environment: boolean;
  cybernetics: boolean;
  climate: number;
  seasonRate: number;
  seasonAmp: number;
  energyRichness: number;
  metabolicHeat: number;
  noise: number;
  homeoGain: number;
  autoSetpoint: boolean;
  setpoint: number;
  ultraEnabled: boolean;
  varietyEnabled: boolean;
  autoEnabled: boolean;
  observerEnabled: boolean;
  /** Provisional K density lower bound (not derived from setpoint). */
  densityMin: number;
  /** Provisional K density upper bound (not derived from setpoint). */
  densityMax: number;
  /**
   * Named disturbance schedule w(t). World/disturbance only — study packs must not set this.
   * Additive dedicated channel; does not flip cybernetics/ultra/homeo loop flags.
   */
  disturbance: DisturbanceSchedule;
  /** Stop stepping when generation >= limit; 0 = unlimited. Provisional default 0. */
  generationLimit: number;
  /** Measurement tick every N generations; 0 = disabled. Provisional default 10. */
  measurementInterval: number;
}

export const LOOP_META: { id: LoopId; label: string }[] = [
  { id: "homeostasis", label: "Homeostasis" },
  { id: "ultrastability", label: "Ultrastability" },
  { id: "variety", label: "Variety" },
  { id: "metabolism", label: "Metabolism" },
  { id: "season", label: "Season" },
  { id: "autopoiesis", label: "Autopoiesis" },
  { id: "observer", label: "Observer" },
];

export const DEFAULT_SETTINGS: SimSettings = {
  environment: true,
  cybernetics: true,
  climate: 0.45,
  seasonRate: 0.35,
  seasonAmp: 0.4,
  energyRichness: 0.55,
  metabolicHeat: 0.5,
  noise: 0.12,
  homeoGain: 0.55,
  autoSetpoint: true,
  setpoint: 0.16,
  ultraEnabled: true,
  varietyEnabled: true,
  autoEnabled: true,
  observerEnabled: true,
  densityMin: PROVISIONAL_K.densityMin,
  densityMax: PROVISIONAL_K.densityMax,
  disturbance: { ...PROVISIONAL_SCHEDULE },
  generationLimit: 0,
  measurementInterval: 10,
};

export const PRESETS: {
  id: PresetId;
  name: string;
  blurb: string;
  settings: Partial<SimSettings>;
}[] = [
  {
    id: "homeostat",
    name: "Homeostat",
    blurb: "Full feedback. The field keeps itself alive.",
    settings: { ...DEFAULT_SETTINGS },
  },
  {
    id: "classic",
    name: "Classic",
    blurb: "B3/S23. No climate, no controller.",
    settings: {
      environment: false,
      cybernetics: false,
    },
  },
  {
    id: "ice",
    name: "Ice line",
    blurb: "A moving temperate band. Life follows the thaw.",
    settings: {
      environment: true,
      cybernetics: true,
      climate: 0.85,
      seasonAmp: 0.7,
      seasonRate: 0.28,
      energyRichness: 0.4,
      metabolicHeat: 0.35,
    },
  },
  {
    id: "hothouse",
    name: "Hothouse",
    blurb: "Hot, rich, fast. Negative feedback has to work.",
    settings: {
      environment: true,
      cybernetics: true,
      climate: 0.15,
      seasonAmp: 0.15,
      energyRichness: 0.9,
      metabolicHeat: 0.85,
      homeoGain: 0.7,
    },
  },
  {
    id: "ashby",
    name: "Ashby",
    blurb: "Ultrastable. Rules flip until the field holds.",
    settings: {
      environment: true,
      cybernetics: true,
      ultraEnabled: true,
      varietyEnabled: true,
      noise: 0.22,
      homeoGain: 0.4,
    },
  },
  {
    id: "garden",
    name: "Garden",
    blurb: "Energy wells and long-lived organisms.",
    settings: {
      environment: true,
      cybernetics: true,
      energyRichness: 0.8,
      autoEnabled: true,
      climate: 0.25,
      metabolicHeat: 0.3,
    },
  },
  {
    id: "dust",
    name: "Dust",
    blurb: "Sparse. The observer has to restart life.",
    settings: {
      environment: true,
      cybernetics: true,
      energyRichness: 0.28,
      climate: 0.55,
      noise: 0.08,
      homeoGain: 0.8,
      setpoint: 0.08,
    },
  },
];

export type StudyConditionId = "baseline" | "homeostatic" | "ultrastable";

export const STUDY_CONDITIONS: {
  id: StudyConditionId;
  name: string;
  blurb: string;
  settings: Partial<SimSettings>;
}[] = [
  {
    id: "baseline",
    name: "Baseline",
    blurb: "Fixed B3/S23. Environment and feedback off. Observe unregulated dynamics.",
    settings: {
      environment: false,
      cybernetics: false,
      ultraEnabled: false,
      varietyEnabled: false,
      autoEnabled: false,
      observerEnabled: false,
      noise: 0,
    },
  },
  {
    id: "homeostatic",
    name: "Homeostatic",
    blurb: "Feedback on, ultrastability off. Observe regulation under the current world.",
    settings: {
      environment: true,
      cybernetics: true,
      ultraEnabled: false,
      varietyEnabled: true,
      autoEnabled: true,
      observerEnabled: true,
    },
  },
  {
    id: "ultrastable",
    name: "Ultrastable",
    blurb: "Feedback plus slower rule changes when regulation repeatedly fails.",
    settings: {
      environment: true,
      cybernetics: true,
      ultraEnabled: true,
      varietyEnabled: true,
      autoEnabled: true,
      observerEnabled: true,
    },
  },
];
