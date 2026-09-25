# Evidence ladder (M2–M5)

Headless **observational** batches for the Homeosys measured-control ladder.

**Stamp (observational):** ladder exports shipped with Reviewer **CONDITIONAL PASS**
@ `0ac0d88`. This documents reproducible protocol + export wiring — **not**
scientific closure of M2–M5.

## Critical caveats

**Write guard (P3 PASS @ `63fa427`):** `npm run evidence` / smoke defaults to `evidence/_smoke/` (gitignored) or refuses committed paths; use `--write` (or `--commit-artifacts`) to refresh canonical `evidence/{m2..m5}`.

- **Engineering scaffolding ≠ scientific closure.** These arms do **not** close
  M2–M5 (or Steps 3–5) as scientific claims. Prefer distributions and
  predeclared metrics over cherry-picked trajectories.
- **M6 remains hard-gated.** Do not add autopoiesis engineering or claims here.
- **Protocol-calibrated observational K** (`PROTOCOL_CALIBRATED_K` / `densityMin`–`densityMax`):
  frozen bounds from M2 **baseline + envNoControl** per-generation density
  distributions (positive densities only; p05/p95 → floor/ceil 3dp →
  `[0.016, 0.221]`). Homeostatic/ultrastable arms were **not** used to set
  bounds. See `src/sim/calibrated-k.ts`. **Not** scientific closure of viability.
- **No life / cognition / consciousness claims.** Pattern persistence ≠ organism.
  User-facing copy must not market “Game of Life”; technical prose may name
  Conway’s Game of Life only as the cellular-automaton **substrate algorithm**.
- Results are **observational summaries** across a fixed seed list.

## Arms

| Milestone | Arms | Shared factor | Contrast |
|-----------|------|---------------|----------|
| **M2** homeostasis | `m2-baseline`, `m2-env-no-control`, `m2-homeostatic` (+ `-72x54`) | pulse@40/30 a=0.55, limit=200, SetpointError+Central, homeostat | studyCondition baseline vs envNoControl vs homeostatic |
| **M3** ultrastability | `m3-homeostatic`, `m3-ultrastable` (+ `-72x54`) | sustained@30/120 a=0.55, limit=200 | studyCondition homeostatic vs ultrastable; UltraEpisodeLog aggregates in each summary |
| **M4** controller | `m4-setpoint`, `m4-viability` (+ `-72x54`) | `abControllerProtocols` shared schedule | controllerMode SetpointError vs ViabilityBand |
| **M5** organization | `m5-central`, `m5-local`, `m5-coordinated`, `m5-coord-ablated` (+ `-72x54`) | `abcOrganizationProtocols` shared schedule; ablated = Coordinated α=0 | organizationMode Central \| Local \| Coordinated (+ coupling ablation α=0). VSM = hypothesis only |

Each contrast family is run on **two grids**: `48×36` (canonical arm ids) and `72×54` (arm id suffix `-72x54`).

All arms use study packs from `STUDY_CONDITIONS` via `settingsFromProtocol` /
`runOne`. World knobs (cols/rows/worldPreset/schedule/limit) are locked in
`src/sim/evidence-matrix.ts`.

## Seed strategy

**Fixed `EVIDENCE_SEED_KEYS` list** (length 20) in `evidence-matrix.ts`.
Run index `i` uses `EVIDENCE_SEED_KEYS[i]`. This is deterministic and explicit —
not `Date` / `Math.random`, and not silent `seedKey+runIndex` mixing; extend the
list explicitly when broader N is required.

Default N = 20 (`EVIDENCE_DEFAULT_N`). Smoke / CI may pass `--n 2`.

**Note:** Committed `evidence/{m2..m5}` snapshots are observational; smoke/default
CLI writes only `evidence/_smoke/` unless `--write` is passed.

## Reproduce

From the research worktree (`/workspace/repos/homeosys-research` or a clone of
`homeosys` at the shipped SHA):

```bash
npm run evidence                 # smoke → evidence/_smoke/ (gitignored)
npm run evidence -- --n 2
npm run evidence -- --milestones m2,m4 --n 10
npm run evidence -- --write      # refresh committed evidence/{m2..m5}
```

Smoke artifacts land under `evidence/_smoke/`. Committed ladder artifacts (`evidence/m2/` … `evidence/m5/`) only with `--write`:

- `*.jsonl` — first line is `# {protocol metadata JSON}`; following lines are
  `ResearchRunSummary` objects (includes UltraEpisodeLog aggregate fields).
- `*.csv` — flat summaries (optional; disable with `--no-csv`).
- per-folder `README.md` snippets + top-level `evidence/README.md`.

## Out of scope

- Not M6 autopoiesis work (hard-gated).
- Not marketing “Game of Life” product framing.
- Not scientific closure of M2–M5.
