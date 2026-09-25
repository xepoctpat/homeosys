# Evidence ladder (M2–M5)

Headless observational batches for the Homeosys measured-control ladder.

## Critical caveats

- **Engineering scaffolding ≠ scientific closure.** Shipping these arms documents
  reproducible protocol + export wiring; it does **not** close Steps 3–5 as
  scientific claims.
- **Provisional K** (`PROVISIONAL_K` / `densityMin`–`densityMax`) is unchanged.
  Bounds are lab defaults, not calibrated.
- **No life / autopoiesis / cognition claims.** Pattern persistence ≠ organism.
  M6 remains gated — do not add autopoiesis engineering here.
- Results are **observational summaries** across a fixed seed list. Prefer
  distributions and predeclared metrics over cherry-picked trajectories.

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

## Reproduce

From the research worktree (`/workspace/repos/homeosys-research` or a clone of
`homeosys` at the shipped SHA):

```bash
npm run evidence
# or with smoke N:
npm run evidence -- --n 2
# subset:
npm run evidence -- --milestones m2,m4 --n 10
```

Artifacts land under `evidence/m2/` … `evidence/m5/`:

- `*.jsonl` — first line is `# {protocol metadata JSON}`; following lines are
  `ResearchRunSummary` objects (includes UltraEpisodeLog aggregate fields).
- `*.csv` — flat summaries (optional; disable with `--no-csv`).
- per-folder `README.md` snippets + top-level `evidence/README.md`.

Typecheck / tests:

```bash
npm run typecheck
npm test
# matrix unit + smoke (included in npm test once wired):
tsx --test src/sim/evidence-matrix.test.ts
```

## What this is not

- Not a claim that homeostasis / ultrastability / VSM hierarchy are “proven.”
- Not M6 autopoiesis work (hard-gated).
- Not a substitute for multi-seed analysis beyond the committed seed list.
