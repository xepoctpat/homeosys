/**
 * Protocol-calibrated observational K (viable density interval).
 *
 * METHOD (predeclared; frozen constants — recompute only when the recipe changes):
 * 1. Pool per-generation densities from M2 study conditions `baseline` and
 *    `envNoControl` only (EVIDENCE_SEED_KEYS × gens 0..200 inclusive, M2 pulse
 *    schedule @40/30 a=0.55, 48×36 homeostat, SetpointError+Central).
 * 2. Exclude `homeostatic` / `ultrastable` arms — do **not** tune K to flatter
 *    regulated metrics.
 * 3. Drop density == 0 samples (extinction is outside K by construction).
 * 4. densityMin = floor_3dp(empirical p05 of remaining);
 *    densityMax = ceil_3dp(empirical p95 of remaining).
 *
 * Label: protocol-calibrated observational — **not** scientific closure of
 * viability / life / autopoiesis. M6 remains hard-gated.
 */

export interface ViableRegionK {
  densityMin: number;
  densityMax: number;
}

/** Frozen recipe id for docs / evidence metadata. */
export const K_CALIBRATION_METHOD =
  "m2-unregulated-positive-p05-p95-floorceil-3dp" as const;

export const K_CALIBRATION_META = {
  method: K_CALIBRATION_METHOD,
  sourceStudyConditions: ["baseline", "envNoControl"] as const,
  excludedStudyConditions: ["homeostatic", "ultrastable"] as const,
  milestone: "m2",
  schedule: { id: "pulse", startGen: 40, duration: 30, amplitude: 0.55 },
  generationLimit: 200,
  cols: 48,
  rows: 36,
  worldPreset: "homeostat",
  /** Length of EVIDENCE_SEED_KEYS used for calibration (N=10). */
  nSeeds: 10,
  /** Empirical anchors from the frozen recipe run (positive densities only). */
  empirical: {
    positiveP05: 0.016637731481481483,
    positiveP95: 0.2204861111111111,
    pooledPositiveN: 2636,
    pooledN: 4020,
  },
  notes: [
    "Observational protocol calibration only — not scientific closure.",
    "Homeostatic/ultrastable densities were not used to set bounds.",
    "density==0 (extinction) excluded from percentiles; treated as outside K.",
  ],
} as const;

/**
 * Protocol-calibrated observational K from unregulated M2 density distributions.
 * Used as DEFAULT_SETTINGS densityMin/densityMax.
 */
export const PROTOCOL_CALIBRATED_K: ViableRegionK = {
  densityMin: 0.016,
  densityMax: 0.221,
};
