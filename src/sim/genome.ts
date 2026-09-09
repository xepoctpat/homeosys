import type { Genome } from "./types.ts";

export function classicGenome(): Genome {
  const birth = Array.from({ length: 9 }, () => false);
  const survive = Array.from({ length: 9 }, () => false);
  birth[3] = true;
  survive[2] = true;
  survive[3] = true;
  return { birth, survive };
}

export function cloneGenome(g: Genome): Genome {
  return { birth: g.birth.slice(), survive: g.survive.slice() };
}

export function genomeEquals(a: Genome, b: Genome): boolean {
  for (let i = 0; i < 9; i++) {
    if (a.birth[i] !== b.birth[i] || a.survive[i] !== b.survive[i]) return false;
  }
  return true;
}

export function genomeToString(g: Genome): string {
  let b = "";
  let s = "";
  for (let i = 0; i < 9; i++) {
    if (g.birth[i]) b += String(i);
    if (g.survive[i]) s += String(i);
  }
  return `B${b || "∅"}/S${s || "∅"}`;
}

/** Flip a bit near classic Life so mutations stay in a playable neighborhood. */
export function mutateGenome(g: Genome, rand: () => number): Genome {
  const next = cloneGenome(g);
  const lane = rand() < 0.5 ? next.birth : next.survive;
  const weights = [0.02, 0.18, 0.22, 0.22, 0.18, 0.1, 0.05, 0.02, 0.01];
  let r = rand();
  let idx = 3;
  for (let i = 0; i < 9; i++) {
    r -= weights[i];
    if (r <= 0) {
      idx = i;
      break;
    }
  }
  lane[idx] = !lane[idx];
  const anyBirth = next.birth.some(Boolean);
  const anySurvive = next.survive.some(Boolean);
  if (!anyBirth) next.birth[3] = true;
  if (!anySurvive) next.survive[2] = true;
  return next;
}
