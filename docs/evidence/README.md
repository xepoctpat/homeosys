# Evidence ladder (M2–M5)

Headless **observational** batches for the Homeosys measured-control ladder.

**Stamp (observational):** ladder exports shipped with Reviewer **CONDITIONAL PASS**
@ `0ac0d88`. This documents reproducible protocol + export wiring — **not**
scientific closure of M2–M5.

## Critical caveats

**Write guard:** `npm run evidence` / smoke defaults to `evidence/_smoke/` (gitignored); use `--write` (or `--commit-artifacts`) to refresh committed `evidence/{m2..m5}`.

- **Engineering scaffolding ≠ scientific closure.** These arms do **not** close
  M2–M5 (or Steps 3–5) as scientific claims. Prefer distributions and
  predeclared metrics over cherry-picked trajectories.
- **M6 remains hard-gated.** Do not add autopoiesis engineering or claims here.
- **Provisional K** (`PROVISIONAL_K` / `densityMin`–`densityMax`) is unchanged.
  Bounds are lab defaults, not calibrated.
- **No life / cognition / consciousness claims.** Pattern persistence ≠ organism.
  User-facing copy must not market “Game of Life”; technical prose may name
  Conway’s Game of Life only as the cellular-automaton **substrate algorithm**.
- Results are **observational summaries** across a fixed seed list.

## Arms

| Milestone | Arms | Shared factor | Contrast |
|-----------|------|---------------|----------|
| **M2** homeostasis | `m2-baseline`, `m2-homeostatic` | pulse@40/30 a=0.55, limit=200, SetpointError+Central, 48×36 homeostat | studyCondition baseline vs homeostatic |
| **M3** ultrastability | `m3-homeostatic`, `m3-ultrastable` | sustained@30/120 a=0.55, limit=200 | studyCondition homeostatic vs ultrastable; UltraEpisodeLog aggregates in each summary |
| **M4** controller | `m4-setpoint`, `m4-viability` | `abControllerProtocols` shared schedule | controllerMode SetpointError vs ViabilityBand |
| **M5** organization | `m5-central`, `m5-local`, `m5-coordinated` | `abcOrganizationProtocols` shared schedule | organizationMode Central \| Local \| Coordinated |

All arms use study packs from `STUDY_CONDITIONS` via `settingsFromProtocol` /
`runOne`. World knobs (cols/rows/worldPreset/schedule/limit) are locked in
`src/sim/evidence-matrix.ts`.

## Seed strategy

**Fixed `EVIDENCE_SEED_KEYS` list** (length 10) in `evidence-matrix.ts`.
Run index `i` uses `EVIDENCE_SEED_KEYS[i]`. This is deterministic and explicit —
not `Date` / `Math.random`, and not silent `seedKey+runIndex` mixing unless the
list is extended on purpose.

Default N = 10 (`EVIDENCE_DEFAULT_N`). Smoke / CI may pass `--n 2`.

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
