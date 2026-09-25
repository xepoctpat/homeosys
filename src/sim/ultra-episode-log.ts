import type { UltraEpisodeEvent, UltraEpisodeOutcome } from "./types.ts";

/** Cap to avoid unbounded growth across long exploratory runs. */
export const ULTRA_EPISODE_LOG_CAP = 96;

export interface UltraEpisodeAggregates {
  ultraProbeCount: number;
  ultraKeptCount: number;
  ultraRevertedCount: number;
  lastUltraOutcome: UltraEpisodeOutcome | null;
  lastUltraGeneration: number | null;
  /**
   * Generations since last probe *resolution* (kept or reverted).
   * If no probe has resolved since seed, equals the current generation.
   * Does not freeze while a probe is in flight.
   */
  stableEpisodeLength: number;
  /** Min population during the most recently resolved probe; null if none. */
  lastUltraMinPop: number | null;
  /** popAtEnd − popAtStart for the most recently resolved probe; null if none. */
  lastUltraDeltaPop: number | null;
}

export function emptyUltraAggregates(generation = 0): UltraEpisodeAggregates {
  return {
    ultraProbeCount: 0,
    ultraKeptCount: 0,
    ultraRevertedCount: 0,
    lastUltraOutcome: null,
    lastUltraGeneration: null,
    stableEpisodeLength: generation,
    lastUltraMinPop: null,
    lastUltraDeltaPop: null,
  };
}

/**
 * Append-only log of ultrastability probe episodes.
 * Reset on seed/reseed. Does not change keep/revert decision thresholds.
 */
export class UltraEpisodeLog {
  private events: UltraEpisodeEvent[] = [];

  reset(): void {
    this.events = [];
  }

  append(event: UltraEpisodeEvent): void {
    this.events.push(event);
    if (this.events.length > ULTRA_EPISODE_LOG_CAP) {
      this.events.splice(0, this.events.length - ULTRA_EPISODE_LOG_CAP);
    }
  }

  list(): readonly UltraEpisodeEvent[] {
    return this.events;
  }

  aggregates(generation: number): UltraEpisodeAggregates {
    let kept = 0;
    let reverted = 0;
    for (const e of this.events) {
      if (e.outcome === "kept") kept++;
      else reverted++;
    }
    const last = this.events.length > 0 ? this.events[this.events.length - 1] : null;
    return {
      ultraProbeCount: this.events.length,
      ultraKeptCount: kept,
      ultraRevertedCount: reverted,
      lastUltraOutcome: last?.outcome ?? null,
      lastUltraGeneration: last?.resolveGeneration ?? null,
      stableEpisodeLength: last ? generation - last.resolveGeneration : generation,
      lastUltraMinPop: last?.minPopDuringProbe ?? null,
      lastUltraDeltaPop: last ? last.popAtEnd - last.popAtStart : null,
    };
  }
}

export function createUltraEpisodeEvent(parts: {
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
}): UltraEpisodeEvent {
  return { ...parts };
}
