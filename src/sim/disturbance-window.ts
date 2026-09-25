import type { DisturbanceSchedule } from "@/sim/types";

/** Plain-language active-window status from schedule knobs + live gen/w. Observational only. */
export function disturbanceWindowCopy(
  disturbance: DisturbanceSchedule,
  generation: number | null | undefined,
  w: number | null | undefined,
): string {
  const { id, startGen, duration } = disturbance;
  const genOk = typeof generation === "number" && Number.isFinite(generation);
  const wOk = typeof w === "number" && Number.isFinite(w);
  const wNow = wOk ? `; w=${(w as number).toFixed(2)} now` : "";

  if (id === "none") {
    return "None: idle (no disturbance schedule).";
  }

  if (id === "pulse") {
    const end = startGen + duration;
    let state: string;
    if (!genOk) state = "gen unknown";
    else if ((generation as number) >= startGen && (generation as number) < end) state = "active";
    else state = "idle (outside window)";
    return `Pulse: provisional defaults startGen=${startGen} duration=${duration}; active while gen ∈ [${startGen}, ${end}); ${state}${wNow}`;
  }

  // sustained
  if (duration === 0) {
    let state: string;
    if (!genOk) state = "gen unknown";
    else if ((generation as number) >= startGen) state = "active";
    else state = "idle (outside window)";
    return `Sustained: open-ended (duration=0) from startGen=${startGen}; ${state}${wNow}`;
  }

  const end = startGen + duration;
  let state: string;
  if (!genOk) state = "gen unknown";
  else if ((generation as number) >= startGen && (generation as number) < end) state = "active";
  else state = "idle (outside window)";
  return `Sustained: startGen=${startGen} duration=${duration}; active while gen ∈ [${startGen}, ${end}); ${state}${wNow}`;
}
