import type { Metrics } from "@/sim/types";

/** Safe numeric formatters — never throw on undefined/NaN/non-number. */
export function fmt(n: unknown): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  try {
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  } catch {
    return "—";
  }
}

export function pct(n: unknown): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  try {
    return `${(n * 100).toFixed(1)}%`;
  } catch {
    return "—";
  }
}

export function fixed(n: unknown, digits: number): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  try {
    return n.toFixed(digits);
  } catch {
    return "—";
  }
}

/** Coerce unknown to a finite number, else fallback (for sliders / schedule knobs). */
export function finiteOr(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

export type MetricCell = {
  label: string;
  value: string;
  hideOnSmall?: boolean;
  title?: string;
};

/** Build metric cells from a (possibly partial) snapshot without throwing. */
export function buildMetricCells(
  metrics: Partial<Metrics> | null | undefined,
): MetricCell[] {
  if (!metrics) {
    return [
      { label: "Gen", value: "—" },
      { label: "Pop", value: "—" },
      { label: "Density", value: "—" },
      { label: "In K", value: "—" },
      { label: "Time in K", value: "—" },
      {
        label: "Outside Σ",
        value: "—",
        hideOnSmall: true,
        title: "Cumulative density distance outside provisional K",
      },
      {
        label: "Recoveries",
        value: "—",
        hideOnSmall: true,
        title: "K exits followed by a later re-entry (observational)",
      },
      {
        label: "K dens",
        value: "—",
        hideOnSmall: true,
        title: "Provisional K density interval (not calibrated)",
      },
      { label: "Viability", value: "—" },
      { label: "Setpoint", value: "—", hideOnSmall: true },
      {
        label: "|ρ−sp|",
        value: "—",
        hideOnSmall: true,
        title: "Mean |density − setpoint| over observed steps",
      },
      {
        label: "Controller",
        value: "—",
        hideOnSmall: true,
        title: "Fast homeostasis policy mode (SetpointError | ViabilityBand)",
      },
      {
        label: "Organization",
        value: "—",
        hideOnSmall: true,
        title: "Organization mode (Central | Local | Coordinated) — M5 scaffolding, not a VSM claim",
      },
      {
        label: "Intervention",
        value: "—",
        hideOnSmall: true,
        title: "Mean fraction of cells touched by homeostasis per generation",
      },
      {
        label: "Coord BW",
        value: "—",
        hideOnSmall: true,
        title: "Coordination bandwidth proxy (0 for Central/Local)",
      },
      { label: "Rule", value: "—" },
      { label: "Seed", value: "—", hideOnSmall: true },
      {
        label: "Schedule",
        value: "—",
        hideOnSmall: true,
        title: "Active disturbance schedule id",
      },
      {
        label: "w",
        value: "—",
        hideOnSmall: true,
        title: "Current disturbance w(t)",
      },
      {
        label: "Ultra probes",
        value: "—",
        hideOnSmall: true,
        title: "Resolved ultrastability probe episodes since seed",
      },
      {
        label: "Ultra kept",
        value: "—",
        hideOnSmall: true,
        title: "Probes whose candidate genome was kept",
      },
      {
        label: "Ultra revert",
        value: "—",
        hideOnSmall: true,
        title: "Probes whose candidate genome was reverted",
      },
      {
        label: "Episode",
        value: "—",
        hideOnSmall: true,
        title: "Generations since last probe resolution (or since seed if none)",
      },
    ];
  }

  const dMin = metrics.densityMin;
  const dMax = metrics.densityMax;
  const kDens =
    typeof dMin === "number" &&
    Number.isFinite(dMin) &&
    typeof dMax === "number" &&
    Number.isFinite(dMax)
      ? `${(dMin * 100).toFixed(0)}–${(dMax * 100).toFixed(0)}% provisional`
      : "—";

  const inKVal =
    typeof metrics.inK === "boolean" ? (metrics.inK ? "yes" : "no") : "—";

  const seedVal =
    typeof metrics.seedKey === "number" && Number.isFinite(metrics.seedKey)
      ? String(metrics.seedKey >>> 0)
      : "—";

  return [
    { label: "Gen", value: fmt(metrics.generation) },
    { label: "Pop", value: fmt(metrics.population) },
    { label: "Density", value: pct(metrics.density) },
    { label: "In K", value: inKVal },
    { label: "Time in K", value: pct(metrics.timeInKFraction) },
    {
      label: "Outside Σ",
      value: fixed(metrics.cumulativeDistanceOutsideK, 3),
      hideOnSmall: true,
      title: "Cumulative density distance outside provisional K",
    },
    {
      label: "Recoveries",
      value: fmt(metrics.recoveries),
      hideOnSmall: true,
      title: "K exits followed by a later re-entry (observational)",
    },
    {
      label: "K dens",
      value: kDens,
      hideOnSmall: true,
      title: "Provisional K density interval (not calibrated)",
    },
    { label: "Viability", value: fixed(metrics.viability, 2) },
    { label: "Setpoint", value: pct(metrics.setpoint), hideOnSmall: true },
    {
      label: "|ρ−sp|",
      value: fixed(metrics.meanAbsDensityError, 3),
      hideOnSmall: true,
      title: "Mean |density − setpoint| over observed steps",
    },
    {
      label: "Controller",
      value: typeof metrics.controllerMode === "string" ? metrics.controllerMode : "—",
      hideOnSmall: true,
      title: "Fast homeostasis policy mode (SetpointError | ViabilityBand)",
    },
    {
      label: "Organization",
      value: typeof metrics.organizationMode === "string" ? metrics.organizationMode : "—",
      hideOnSmall: true,
      title: "Organization mode (Central | Local | Coordinated) — M5 scaffolding, not a VSM claim",
    },
    {
      label: "Intervention",
      value: fixed(metrics.interventionRate, 4),
      hideOnSmall: true,
      title: "Mean fraction of cells touched by homeostasis per generation",
    },
    {
      label: "Coord BW",
      value: fixed(metrics.coordinationBandwidthProxy, 3),
      hideOnSmall: true,
      title: "Coordination bandwidth proxy (0 for Central/Local)",
    },
    { label: "Rule", value: typeof metrics.rule === "string" ? metrics.rule : "—" },
    { label: "Seed", value: seedVal, hideOnSmall: true },
    {
      label: "Schedule",
      value: typeof metrics.scheduleId === "string" ? metrics.scheduleId : "—",
      hideOnSmall: true,
      title: "Active disturbance schedule id",
    },
    {
      label: "w",
      value: fixed(metrics.w, 2),
      hideOnSmall: true,
      title: "Current disturbance w(t)",
    },
    {
      label: "Ultra probes",
      value: fmt(metrics.ultraProbeCount),
      hideOnSmall: true,
      title: "Resolved ultrastability probe episodes since seed",
    },
    {
      label: "Ultra kept",
      value: fmt(metrics.ultraKeptCount),
      hideOnSmall: true,
      title: "Probes whose candidate genome was kept",
    },
    {
      label: "Ultra revert",
      value: fmt(metrics.ultraRevertedCount),
      hideOnSmall: true,
      title: "Probes whose candidate genome was reverted",
    },
    {
      label: "Episode",
      value: fmt(metrics.stableEpisodeLength),
      hideOnSmall: true,
      title: "Generations since last probe resolution (or since seed if none)",
    },
  ];
}
