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
