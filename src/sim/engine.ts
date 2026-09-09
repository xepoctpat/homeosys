import {
  classicGenome,
  cloneGenome,
  genomeToString,
  mutateGenome,
} from "./genome.ts";
import {
  DEFAULT_SETTINGS,
  LOOP_META,
  type Genome,
  type LoopFlag,
  type LoopId,
  type Metrics,
  type PaintMode,
  type PresetId,
  type SimSettings,
} from "./types.ts";

const TEST_WINDOW = 36;
const HISTORY = 96;
const WELL_COUNT = 5;

interface Pulse {
  x: number;
  y: number;
  age: number;
  life: number;
  kind: LoopId;
}

interface Probe {
  previous: Genome;
  remaining: number;
  baseline: number;
  acc: number;
  samples: number;
}

interface Well {
  x: number;
  y: number;
  r: number;
  amp: number;
  phase: number;
}

function hash(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 982451653);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, seed: number): number {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    v += a * valueNoise(x * f, y * f, seed + i * 19);
    a *= 0.5;
    f *= 2;
  }
  return v;
}

function wrap(v: number, max: number): number {
  if (v < 0) return v + max;
  if (v >= max) return v - max;
  return v;
}

export class SimEngine {
  cols = 0;
  rows = 0;
  alive = new Uint8Array(0);
  nextAlive = new Uint8Array(0);
  kind = new Uint8Array(0);
  nextKind = new Uint8Array(0);
  tenure = new Uint8Array(0);
  heat = new Float32Array(0);
  nextHeat = new Float32Array(0);
  energy = new Float32Array(0);
  nextEnergy = new Float32Array(0);
  shown = new Float32Array(0);
  genome: Genome = classicGenome();
  settings: SimSettings = { ...DEFAULT_SETTINGS };
  generation = 0;
  adaptations = 0;
  seedKey = 1;
  pulses: Pulse[] = [];
  lastLoops: Record<LoopId, { active: boolean; note: string }> = {
    homeostasis: { active: false, note: "" },
    ultrastability: { active: false, note: "" },
    variety: { active: false, note: "" },
    metabolism: { active: false, note: "" },
    season: { active: false, note: "" },
    autopoiesis: { active: false, note: "" },
    observer: { active: false, note: "" },
  };

  private wells: Well[] = [];
  private setpoint = 0.16;
  private integral = 0;
  private freezeStreak = 0;
  private collapseStreak = 0;
  private probe: Probe | null = null;
  private popHistory: number[] = [];
  private viaHistory: number[] = [];
  private lastPop = 0;
  private lastReg = 0;
  private lastEntropy = 0;
  private lastHeat = 0.5;
  private lastEnergy = 0.4;
  private lastViability = 0;
  private lastChanged = 0;
  private randState = 1;

  allocate(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    const n = cols * rows;
    this.alive = new Uint8Array(n);
    this.nextAlive = new Uint8Array(n);
    this.kind = new Uint8Array(n);
    this.nextKind = new Uint8Array(n);
    this.tenure = new Uint8Array(n);
    this.heat = new Float32Array(n);
    this.nextHeat = new Float32Array(n);
    this.energy = new Float32Array(n);
    this.nextEnergy = new Float32Array(n);
    this.shown = new Float32Array(n);
  }

  fitTo(cssWidth: number, cssHeight: number, cellPx = 6.5): void {
    const cols = Math.max(48, Math.min(220, Math.floor(cssWidth / cellPx)));
    const rows = Math.max(36, Math.min(180, Math.floor(cssHeight / cellPx)));
    if (cols === this.cols && rows === this.rows) return;
    this.allocate(cols, rows);
  }

  private rand(): number {
    this.randState = (Math.imul(this.randState, 1664525) + 1013904223) >>> 0;
    return this.randState / 4294967296;
  }

  private idx(x: number, y: number): number {
    return y * this.cols + x;
  }

  private neighbors(x: number, y: number): number {
    const { cols, rows, alive } = this;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = wrap(y + dy, rows);
      const row = yy * cols;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const xx = wrap(x + dx, cols);
        n += alive[row + xx];
      }
    }
    return n;
  }

  private stampPulse(x: number, y: number, kind: LoopId, life = 0.9): void {
    this.pulses.push({ x, y, age: 0, life, kind });
    if (this.pulses.length > 12) this.pulses.shift();
  }

  private stampCluster(cx: number, cy: number, r: number): number {
    let planted = 0;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        if (this.rand() < 0.35) continue;
        const x = wrap(cx + dx, this.cols);
        const y = wrap(cy + dy, this.rows);
        const i = this.idx(x, y);
        this.energy[i] = Math.min(1, this.energy[i] + 0.5);
        if (this.alive[i] === 0) {
          this.alive[i] = 1;
          this.shown[i] = Math.max(this.shown[i], 0.7);
          planted++;
        }
      }
    }
    return planted;
  }

  private note(id: LoopId, active: boolean, text: string): void {
    this.lastLoops[id] = { active, note: text };
  }

  private resetNotes(): void {
    (Object.keys(this.lastLoops) as LoopId[]).forEach((id) => {
      this.lastLoops[id] = { active: false, note: "" };
    });
  }

  private nextSeedKey(seedKey?: number): number {
    if (seedKey !== undefined) return seedKey >>> 0;
    const fresh = ((Math.random() * 0xffffffff) >>> 0) ^ ((Date.now() * 1664525) >>> 0);
    this.seedKey = fresh;
    return fresh;
  }

  seed(preset: PresetId = "homeostat", seedKey?: number): void {
    if (this.cols === 0 || this.rows === 0) return;
    this.seedKey = this.nextSeedKey(seedKey);
    this.randState = (this.seedKey * 1103515245 + 12345) >>> 0;
    this.generation = 0;
    this.adaptations = 0;
    this.integral = 0;
    this.freezeStreak = 0;
    this.collapseStreak = 0;
    this.probe = null;
    this.genome = classicGenome();
    this.setpoint = this.settings.setpoint;
    this.popHistory = [];
    this.viaHistory = [];
    this.pulses = [];
    this.alive.fill(0);
    this.kind.fill(0);
    this.tenure.fill(0);
    this.shown.fill(0);

    const { cols, rows } = this;
    const n = cols * rows;

    this.wells = [];
    for (let i = 0; i < WELL_COUNT; i++) {
      this.wells.push({
        x: this.rand() * cols,
        y: this.rand() * rows,
        r: 6 + this.rand() * Math.min(cols, rows) * 0.12,
        amp: 0.35 + this.rand() * 0.5,
        phase: this.rand() * Math.PI * 2,
      });
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = this.idx(x, y);
        const lat = y / rows;
        this.heat[i] = 0.35 + (1 - lat) * 0.2 + (this.rand() - 0.5) * 0.04;
        let e = 0.15;
        for (const w of this.wells) {
          const dx = x - w.x;
          const dy = y - w.y;
          e += w.amp * Math.exp(-(dx * dx + dy * dy) / (2 * w.r * w.r));
        }
        this.energy[i] = Math.min(1, e);
      }
    }

    if (preset === "classic") {
      this.paintNoise(0.28, 1.6);
    } else if (preset === "dust") {
      this.paintNoise(0.07, 2.4);
      this.placeRegulators(2);
    } else if (preset === "garden") {
      this.paintBlobs(0.42, 1.1);
      this.placeRegulators(6);
    } else if (preset === "ice") {
      this.paintBand(0.38, 0.55, 0.34);
      this.placeRegulators(3);
    } else if (preset === "hothouse") {
      this.paintNoise(0.36, 1.3);
      this.placeRegulators(4);
    } else if (preset === "ashby") {
      this.paintNoise(0.22, 1.8);
      this.placeRegulators(5);
    } else {
      this.paintBlobs(0.34, 1.4);
      this.placeRegulators(4);
    }

    this.lastPop = 0;
    for (let i = 0; i < n; i++) this.lastPop += this.alive[i];
    this.refreshBaselineMetrics();
  }

  private refreshBaselineMetrics(): void {
    const n = this.alive.length;
    if (n === 0) return;
    let population = 0;
    let regulators = 0;
    let heat = 0;
    let energy = 0;
    for (let i = 0; i < n; i++) {
      population += this.alive[i];
      if (this.alive[i] && this.kind[i]) regulators++;
      heat += this.heat[i];
      energy += this.energy[i];
    }
    const density = population / n;
    const p = Math.max(0.0001, Math.min(0.9999, density));
    const entropy = population === 0 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
    const meanEnergy = population === 0 ? 0 : energy / n;
    const meanHeat = population === 0 ? 0 : heat / n;
    const stab = 1;
    this.lastPop = population;
    this.lastReg = regulators;
    this.lastEntropy = entropy;
    this.lastHeat = meanHeat;
    this.lastEnergy = meanEnergy;
    this.lastViability =
      population === 0
        ? 0
        : 0.28 *
            (1 -
              Math.min(
                1,
                Math.abs(density - this.setpoint) / Math.max(0.08, this.setpoint),
              )) +
            0.24 * entropy +
            0.2 * (1 - stab) +
            0.16 * meanEnergy +
            0.12 * (population > 0 ? 1 : 0);
  }

  private paintNoise(density: number, scale: number): void {
    const { cols, rows, seedKey } = this;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const n = fbm(x / (cols / scale), y / (rows / scale), seedKey);
        if (n > 1 - density) {
          const i = this.idx(x, y);
          this.alive[i] = 1;
          this.shown[i] = 1;
        }
      }
    }
  }

  private paintBlobs(density: number, scale: number): void {
    const { cols, rows, seedKey } = this;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const n = fbm(x / (cols / scale), y / (rows / scale), seedKey + 7);
        if (n > 1 - density && this.rand() < 0.85) {
          const i = this.idx(x, y);
          this.alive[i] = 1;
          this.shown[i] = 1;
        }
      }
    }
  }

  private paintBand(lo: number, hi: number, density: number): void {
    const { cols, rows } = this;
    for (let y = 0; y < rows; y++) {
      const t = y / rows;
      if (t < lo || t > hi) continue;
      for (let x = 0; x < cols; x++) {
        if (this.rand() < density) {
          const i = this.idx(x, y);
          this.alive[i] = 1;
          this.shown[i] = 1;
        }
      }
    }
  }

  private placeRegulators(count: number): void {
    const { cols, rows } = this;
    for (let k = 0; k < count; k++) {
      const well = this.wells[k % this.wells.length];
      const x = wrap(Math.floor(well.x + (this.rand() - 0.5) * 6), cols);
      const y = wrap(Math.floor(well.y + (this.rand() - 0.5) * 6), rows);
      const i = this.idx(x, y);
      this.alive[i] = 1;
      this.kind[i] = 1;
      this.shown[i] = 1;
      this.tenure[i] = 12;
    }
  }

  clear(): void {
    this.alive.fill(0);
    this.kind.fill(0);
    this.tenure.fill(0);
    this.heat.fill(0);
    this.energy.fill(0);
    this.nextHeat.fill(0);
    this.nextEnergy.fill(0);
    this.shown.fill(0);
    this.generation = 0;
    this.pulses = [];
    this.refreshBaselineMetrics();
  }

  paint(cx: number, cy: number, mode: PaintMode, radius: number): void {
    const r = Math.max(0, radius);
    const r2 = r * r;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const x = wrap(cx + dx, this.cols);
        const y = wrap(cy + dy, this.rows);
        const i = this.idx(x, y);
        if (mode === "erase") {
          this.alive[i] = 0;
          this.kind[i] = 0;
          this.tenure[i] = 0;
        } else if (mode === "energy") {
          this.energy[i] = Math.min(1, this.energy[i] + 0.35);
        } else if (mode === "regulator") {
          this.alive[i] = 1;
          this.kind[i] = 1;
          this.shown[i] = Math.max(this.shown[i], 0.8);
        } else {
          this.alive[i] = 1;
          this.kind[i] = 0;
          this.shown[i] = Math.max(this.shown[i], 0.8);
        }
      }
    }
    this.refreshBaselineMetrics();
  }

  applySettings(partial: Partial<SimSettings>): void {
    this.settings = { ...this.settings, ...partial };
    if (!this.settings.autoSetpoint) this.setpoint = this.settings.setpoint;
  }

  advanceDisplay(dt: number, reduced = false): void {
    const k = reduced ? 1 : 1 - Math.exp(-10 * dt);
    const decay = reduced ? 1 : 1 - Math.exp(-3.2 * dt);
    const { alive, shown } = this;
    for (let i = 0; i < shown.length; i++) {
      if (alive[i]) shown[i] += (1 - shown[i]) * k;
      else shown[i] *= 1 - decay;
    }
    for (let p = this.pulses.length - 1; p >= 0; p--) {
      this.pulses[p].age += dt;
      if (this.pulses[p].age > this.pulses[p].life) this.pulses.splice(p, 1);
    }
  }

  step(): void {
    if (this.cols === 0) return;
    this.resetNotes();
    const { cols, rows, settings } = this;
    const n = cols * rows;
    const envOn = settings.environment;
    const cybOn = settings.cybernetics;

    const seasonPhase = this.generation * (0.004 + settings.seasonRate * 0.012);
    const season = Math.sin(seasonPhase);
    const ambient = 0.5 + season * settings.seasonAmp * 0.35;
    if (envOn) {
      this.note("season", Math.abs(season) > 0.65, season > 0 ? "warm season" : "cold season");
    }

    let pop = 0;
    let regs = 0;
    let heatSum = 0;
    let energySum = 0;
    let tenureSum = 0;
    let changed = 0;
    const hist = new Uint16Array(9);

    const birth = this.genome.birth;
    const survive = this.genome.survive;

    for (let y = 0; y < rows; y++) {
      const lat = y / Math.max(1, rows - 1);
      const climate = envOn ? (lat - 0.5) * settings.climate * 0.7 : 0;
      const rowAmbient = ambient - climate;
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const was = this.alive[i];
        const nb = this.neighbors(x, y);
        hist[nb]++;

        let e = this.energy[i];
        let h = this.heat[i];
        if (envOn) {
          let well = 0;
          for (const w of this.wells) {
            const dx = x - w.x;
            const dy = y - w.y;
            const pulse = 0.75 + 0.25 * Math.sin(seasonPhase + w.phase);
            well += w.amp * pulse * Math.exp(-(dx * dx + dy * dy) / (2 * w.r * w.r));
          }
          const regen = (0.008 + settings.energyRichness * 0.02) * (0.35 + well);
          e = e + regen - (was ? 0.028 : 0.006);
          if (this.kind[i] && was) e += 0.01;
          e = e < 0 ? 0 : e > 1 ? 1 : e;

          const emit = was ? 0.012 * settings.metabolicHeat : 0;
          const cool = 0.08;
          h = h + (rowAmbient - h) * cool + emit;
          h = h < 0 ? 0 : h > 1 ? 1 : h;
        }

        let live = was;
        const energyGate = !envOn || e > 0.07;
        const heatShift = envOn ? Math.round((h - 0.5) * 2) : 0;
        const nEff = Math.max(0, Math.min(8, nb + heatShift));

        if (was) {
          live = survive[nEff] ? 1 : 0;
          if (envOn && h > 0.86 && this.rand() < 0.18) live = 0;
          if (envOn && e < 0.05) live = 0;
          if (this.kind[i] && nb >= 1 && nb <= 6 && e > 0.08) live = 1;
        } else {
          live = birth[nEff] && energyGate ? 1 : 0;
          if (envOn && h < 0.18 && this.rand() < 0.5) live = 0;
        }

        if (settings.noise > 0 && this.rand() < settings.noise * 0.002) {
          live = live ? 0 : 1;
        }

        this.nextAlive[i] = live;
        this.nextKind[i] = live && this.kind[i] ? 1 : 0;
        this.nextHeat[i] = h;
        this.nextEnergy[i] = e;
        if (live) {
          pop++;
          if (this.kind[i]) regs++;
          this.tenure[i] = this.tenure[i] < 255 ? this.tenure[i] + 1 : 255;
          tenureSum += this.tenure[i];
        } else {
          this.tenure[i] = 0;
        }
        if (live !== was) changed++;
        heatSum += h;
        energySum += e;
      }
    }

    if (envOn) {
      for (let y = 0; y < rows; y++) {
        const up = wrap(y - 1, rows) * cols;
        const dn = wrap(y + 1, rows) * cols;
        const row = y * cols;
        for (let x = 0; x < cols; x++) {
          const i = row + x;
          const l = row + wrap(x - 1, cols);
          const r = row + wrap(x + 1, cols);
          const h =
            this.nextHeat[i] * 0.6 +
            (this.nextHeat[l] + this.nextHeat[r] + this.nextHeat[up + x] + this.nextHeat[dn + x]) *
              0.1;
          const e =
            this.nextEnergy[i] * 0.72 +
            (this.nextEnergy[l] +
              this.nextEnergy[r] +
              this.nextEnergy[up + x] +
              this.nextEnergy[dn + x]) *
              0.07;
          this.heat[i] = h;
          this.energy[i] = e;
        }
      }
    } else {
      this.heat.set(this.nextHeat);
      this.energy.set(this.nextEnergy);
    }

    const tmpA = this.alive;
    this.alive = this.nextAlive;
    this.nextAlive = tmpA;
    const tmpK = this.kind;
    this.kind = this.nextKind;
    this.nextKind = tmpK;

    const density = pop / n;
    const meanHeat = heatSum / n;
    const meanEnergy = energySum / n;
    const meanTenure = pop > 0 ? tenureSum / pop : 0;

    let entropy = 0;
    for (let k = 0; k < 9; k++) {
      if (!hist[k]) continue;
      const p = hist[k] / n;
      entropy -= p * Math.log2(p);
    }
    entropy /= Math.log2(9);

    const freeze = changed / n;
    if (freeze < 0.008) this.freezeStreak++;
    else this.freezeStreak = 0;
    if (density < 0.01) this.collapseStreak++;
    else this.collapseStreak = 0;

    const target = this.setpoint;
    const err = target - density;
    const stab = 1 - Math.min(1, freeze / 0.08);
    const diversity = entropy;
    const via =
      0.28 * (1 - Math.min(1, Math.abs(density - target) / Math.max(0.08, target))) +
      0.24 * diversity +
      0.2 * (1 - stab) +
      0.16 * meanEnergy +
      0.12 * (pop > 0 ? 1 : 0);

    if (cybOn) {
      this.runHomeostasis(err, density, settings.homeoGain);
      if (settings.varietyEnabled) this.runVariety(diversity, n);
      if (settings.ultraEnabled) this.runUltrastability(stab, via);
      if (settings.autoEnabled) this.runAutopoiesis(meanTenure, pop);
      if (settings.observerEnabled) this.runObserver(density, via);
      this.runMetabolism(meanHeat, density);
    }

    if (this.probe) {
      this.probe.remaining--;
      this.probe.acc += via;
      this.probe.samples++;
      this.note("ultrastability", true, "probing new genome");
      if (this.probe.remaining <= 0) {
        const mean = this.probe.acc / Math.max(1, this.probe.samples);
        if (mean + 0.02 >= this.probe.baseline) {
          this.adaptations++;
          this.note("ultrastability", true, `kept ${genomeToString(this.genome)}`);
          this.stampPulse(Math.floor(cols / 2), Math.floor(rows / 2), "ultrastability", 1.2);
        } else {
          this.genome = this.probe.previous;
          this.note("ultrastability", true, "reverted genome");
        }
        this.probe = null;
      }
    }

    this.generation++;
    this.lastPop = 0;
    for (let i = 0; i < this.alive.length; i++) this.lastPop += this.alive[i];
    this.lastReg = 0;
    for (let i = 0; i < this.kind.length; i++) if (this.alive[i] && this.kind[i]) this.lastReg++;
    this.lastEntropy = entropy;
    this.lastHeat = meanHeat;
    this.lastEnergy = meanEnergy;
    this.lastViability = via;
    this.lastChanged = changed;
    this.popHistory.push(this.lastPop);
    this.viaHistory.push(via);
    if (this.popHistory.length > HISTORY) {
      this.popHistory.shift();
      this.viaHistory.shift();
    }
  }

  private runHomeostasis(err: number, density: number, gain: number): void {
    this.integral = Math.max(-0.4, Math.min(0.4, this.integral + err * 0.02));
    const u = gain * (err * 1.4 + this.integral * 0.6);
    if (u > 0.01) {
      const seeds = Math.min(28, Math.floor(u * 18) + (density < 0.01 ? 8 : 0));
      let planted = 0;
      for (let s = 0; s < seeds; s++) {
        const x = Math.floor(this.rand() * this.cols);
        const y = Math.floor(this.rand() * this.rows);
        planted += this.stampCluster(x, y, 1 + Math.floor(this.rand() * 2));
      }
      if (planted > 0) {
        this.note("homeostasis", true, `seeded ${planted}`);
        this.stampPulse(
          Math.floor(this.rand() * this.cols),
          Math.floor(this.rand() * this.rows),
          "homeostasis",
        );
      }
    } else if (u < -0.02 && density > this.setpoint * 1.35) {
      const cull = Math.min(120, Math.floor(-u * this.alive.length * 0.01));
      let killed = 0;
      for (let s = 0; s < cull; s++) {
        const i = Math.floor(this.rand() * this.alive.length);
        if (this.alive[i] && this.kind[i] === 0 && this.tenure[i] < 8) {
          this.alive[i] = 0;
          killed++;
        }
      }
      if (killed > 0) this.note("homeostasis", true, `culled ${killed}`);
    }
  }

  private runVariety(diversity: number, n: number): void {
    if (diversity >= 0.62) return;
    const kicks = Math.floor((0.62 - diversity) * 40);
    for (let s = 0; s < kicks; s++) {
      const i = Math.floor(this.rand() * n);
      this.alive[i] = this.alive[i] ? 0 : 1;
    }
    this.note("variety", true, "requisite variety");
    this.stampPulse(Math.floor(this.cols * this.rand()), Math.floor(this.rows * this.rand()), "variety");
  }

  private runUltrastability(stab: number, via: number): void {
    if (this.probe) return;
    const stuck = this.freezeStreak > 28 || this.collapseStreak > 18 || stab > 0.92;
    if (!stuck) return;
    this.probe = {
      previous: cloneGenome(this.genome),
      remaining: TEST_WINDOW,
      baseline: via,
      acc: 0,
      samples: 0,
    };
    this.genome = mutateGenome(this.genome, () => this.rand());
    this.freezeStreak = 0;
    this.collapseStreak = 0;
    this.note("ultrastability", true, `probe ${genomeToString(this.genome)}`);
    this.stampPulse(Math.floor(this.cols / 2), Math.floor(this.rows / 2), "ultrastability", 1.1);
  }

  private runAutopoiesis(meanTenure: number, pop: number): void {
    if (meanTenure < 10 || pop === 0) return;
    const { cols } = this;
    let protectedCells = 0;
    for (let i = 0; i < this.alive.length; i++) {
      if (this.tenure[i] > 18 && this.alive[i]) {
        this.energy[i] = Math.min(1, this.energy[i] + 0.02);
        protectedCells++;
      }
    }
    if (this.generation % 24 === 0 && this.lastReg < 8) {
      let best = -1;
      let bestT = 0;
      for (let i = 0; i < this.tenure.length; i++) {
        if (this.tenure[i] > bestT) {
          bestT = this.tenure[i];
          best = i;
        }
      }
      if (best >= 0 && bestT > 22) {
        this.kind[best] = 1;
        this.alive[best] = 1;
        this.stampPulse(best % cols, Math.floor(best / cols), "autopoiesis");
      }
    }
    if (protectedCells > 0) {
      this.note("autopoiesis", true, `${protectedCells} held`);
    }
  }

  private runObserver(density: number, via: number): void {
    if (!this.settings.autoSetpoint) {
      this.setpoint = this.settings.setpoint;
      return;
    }
    const sustainable = 0.06 + via * 0.18;
    this.setpoint += (sustainable - this.setpoint) * 0.02;
    this.setpoint = Math.max(0.04, Math.min(0.32, this.setpoint));
    if (Math.abs(density - this.setpoint) > 0.04) {
      this.note("observer", true, `setpoint ${(this.setpoint * 100).toFixed(1)}%`);
    }
  }

  private runMetabolism(meanHeat: number, density: number): void {
    if (meanHeat > 0.72 && density > 0.05) {
      this.note("metabolism", true, "thermal load");
    } else if (meanHeat < 0.28) {
      this.note("metabolism", true, "cold field");
    }
  }

  snapshot(): Metrics {
    const loops: LoopFlag[] = LOOP_META.map((m) => ({
      id: m.id,
      label: m.label,
      active: this.lastLoops[m.id].active,
      note: this.lastLoops[m.id].note,
    }));
    return {
      generation: this.generation,
      population: this.lastPop,
      regulators: this.lastReg,
      density: this.cols ? this.lastPop / (this.cols * this.rows) : 0,
      entropy: this.lastEntropy,
      meanHeat: this.lastHeat,
      meanEnergy: this.lastEnergy,
      viability: this.lastViability,
      setpoint: this.setpoint,
      rule: genomeToString(this.genome),
      adaptations: this.adaptations,
      probing: this.probe !== null,
      loops,
      popHistory: this.popHistory.slice(),
      viaHistory: this.viaHistory.slice(),
    };
  }

  cellAt(x: number, y: number): { alive: number; kind: number; heat: number; energy: number } | null {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
    const i = this.idx(x, y);
    return {
      alive: this.alive[i],
      kind: this.kind[i],
      heat: this.heat[i],
      energy: this.energy[i],
    };
  }
}
