# Homeostat

A cybernetic cellular automaton for studying feedback, adaptation, viability, and
emergence under controlled disturbance. Heat, energy, season, and feedback loops
shape occupancy on the grid; slower adaptation can rewrite the rules when the
field starts to fail.

**Play it:** [xepoctpat.github.io/homeosys](https://xepoctpat.github.io/homeosys/)

Space runs, N steps, R reseeds. Paint on the field. The World and Loops tabs
change the climate and the regulators.

User-facing copy uses **occupancy / activity / cellular-automaton** language.
“Game of Life” is **not** a product brand here; technical docs may still name
Conway’s Game of Life as the substrate algorithm.

## Run locally

```bash
npm install
npm run dev          # Vite on :8080
npm test
npm run evidence     # observational ladder (see write-guard below)
```

`npm run build` / `npm run build:pages` produce production / Pages bundles.

## Research direction

Homeostat asks:

> Under disturbance, which forms of feedback, adaptation, and organization help
> a spatial dynamical system remain viable, and at what cost?

Study sequence (measured control ladder):

1. Deterministic B3/S23 cellular-automaton + environmental baselines
2. Homeostatic feedback vs env-no-control (essential variables / provisional K)
3. Ultrastability under nonstationary disturbance (episode log)
4. SetpointError vs ViabilityBand control
5. OrganizationMode Central | Local | Coordinated (hierarchy / autonomy)
6. Autopoietic extension — **hard-gated** until M1–M5 are characterized
7. Complex-adaptive analysis after M5 metrics (may run parallel to gated M6)

**Current experimental target:** steps **1–2** until evidence moves it.

“Autopoiesis,” “viable system,” “cognition,” and “life” are bounded research
hypotheses — not claims about persistent patterns.

## Development checkpoint (2026-09-25)

**Engineering scaffolding (through M5):**

- Study condition packs + deterministic seed lock
- Provisional viable-region **K** metrics / aggregators
- First-class **DisturbanceSchedule** `w(t)`
- **UltraEpisodeLog** for ultrastability probes
- **ResearchMode** locked batch protocol + CSV/JSONL export
- Controller modes: **SetpointError** vs **ViabilityBand**
- Organization modes: **Central** | **Local** | **Coordinated**

**Evidence ladder (observational):**

- Ladder exports associated with Reviewer pass track @ `0ac0d88`
- Write-guard tip @ `9f8c290` (initial @ `63fa427`): `npm run evidence` defaults
  to `evidence/_smoke/` (gitignored); **subpath refuse** for committed
  `evidence/{m2..m5}` without `--write`; pass `--write` to refresh canonical
- **Evidence-harden A–D tip @ `4d8f43c`** (still observational; ≠ closure):
  - **A** — env-no-control study condition + `m2-env-no-control` arm (`38b6374`)
  - **B** — protocol-calibrated observational **K** from unregulated M2 densities
    (`4fb9892`; not viability closure)
  - **C** — dual grids `48×36` / `72×54` + fixed **20** explicit seeds (`1412a5e`)
  - **D** — `m5-coord-ablated` (Coordinated α=0 coupling ablation) (`4d8f43c`)
- **Observational evidence ≠ scientific closure of M2–M5**
- **M6 remains HARD-GATED**
- **Characterization→engine lock (captain ACCEPTED):** C1–C3 before E1; M2-only characterization first; θ v0 + env knobs in protocol; `schemaVersion` + full θ on exports before sweeps; first sweep axes = ladder factors only (condition/controller/org/α/schedule), not continuous gains; no multi-system/meta-dynamics/UI theater
- **C1 landed @ `44cfaf9`:** ThetaV0 + golden replay; evidence JSONL embeds `theta.v0` (see [`docs/theta-v0.md`](docs/theta-v0.md)).
- **C2 landed @ `2f45281`:** full ThetaV0 + `schemaVersion` on **all** evidence exports (CSV + JSONL fail-closed via `assertExportHasFullTheta`).
- **C3 landed:** M2 ladder-factor sweep (`src/sim/m2-ladder-sweep.ts`) over condition/controller/org/α/schedule **only**; continuous gains refused; `npm run evidence -- --sweep-m2` → `_smoke`. Still observational ≠ closure; **M6 HARD-GATED**; no E1. See [`docs/theta-v0.md`](docs/theta-v0.md) + [`docs/navigation-plan.md`](docs/navigation-plan.md).

## Docs

| Doc | Role |
|-----|------|
| [`docs/research-roadmap.md`](docs/research-roadmap.md) | North-star research sequence, gates, metrics |
| [`docs/navigation-plan.md`](docs/navigation-plan.md) | Anti-drift navigation + assignment stamp |
| [`docs/theta-v0.md`](docs/theta-v0.md) | ThetaV0 characterization stamp (C1–C3) |
| [`docs/evidence/`](docs/evidence/) | How to reproduce the observational evidence ladder |

Repo: `xepoctpat/homeosys` · work on `main` · no PRs by default · `prism` / `prism-clean` locked.
