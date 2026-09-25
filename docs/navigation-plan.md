# Homeosys navigation plan

**Settled:** 2026-09-25 (Coordinator + Strategist, System Architect, Developer, Reviewer)  
**North-star document:** `docs/research-roadmap.md` (with Reviewer amendments A–E applied)  
**Repo:** `/workspace/repos/homeosys` · work on `main` · no PRs · `prism` / `prism-clean` locked  
**Mode:** Captain’s quarters — First Mate is the sole status voice to the user; workers report completions to First Mate, not the captain

## Principles (anti-drift)

- Broad platform, narrow evidence.
- Measured control ladder = steps **1→5**; steps **6–7** stay future-hypothesis until gates pass.
- Pattern persistence ≠ autopoiesis; no life / cognition / consciousness claims.
- Exploratory play ≠ controlled evidence (need locked seed, K, schedule).
- StudyConditionPack must not redefine world/disturbance; World must not redefine loops.
- **Current experimental target stamp:** Steps **1–2** until evidence moves it.
- **Engineering stamp (observational):** eng through **M5 organization scaffolding** is present; **evidence ladder M2–M5 shipped** with Reviewer **CONDITIONAL PASS** @ `0ac0d88` (`npm run evidence`, `evidence/m2`…`m5`). **Evidence-harden A–D tip @ `4d8f43c`:** A env-no-control + m2 arm; B calibrated observational K; C dual grid 48×36/72×54 + 20 explicit seeds; D `m5-coord-ablated`. Fixed `EVIDENCE_SEED_KEYS` (N=20). **Evidence-first work is in progress** — eng scaffolding ≠ scientific closure; Steps 3–5 / M2–M5 remain observational. **M6 HARD-GATED**. **Characterization→engine lock (captain ACCEPTED 2026-09-25):** C1–C3 before E1 eng; M2-only characterization first; θ v0 + env knobs in protocol; `schemaVersion` + full θ on evidence exports before sweeps; first sweep axes = ladder factors only (condition/controller/org/α/schedule), not continuous gains; no multi-system/meta-dynamics/UI theater; observational ≠ closure. **C1 landed @ `44cfaf9`** (ThetaV0 + golden replay); **C2 landed @ `2f45281`** (full ThetaV0 + `schemaVersion` on all exports, CSV+JSONL fail-closed); **C3 landed @ `51a88d2`** = M2 ladder-factor sweeps only (`m2-ladder-sweep`; continuous gains refused); **C1–C3 complete pending Reviewer**; **E1 held for captain**. **Write guard:** smoke defaults to `evidence/_smoke/` (gitignored); **subpath refuse** under `evidence/{m2..m5}` without `--write` (P3 PASS tip @ `9f8c290`; initial guard @ `63fa427`). Occupancy/CA UI language; Game of Life is not a product brand.

## Long-horizon milestones

| ID | Focus | Exit (summary) |
|----|--------|----------------|
| M1 | Validation/baseline | Deterministic replay + seeded B3/S23; fixed-rule no-env protocol used (partially shipped: Study packs + seedKey `503b05d`) |
| M2 | Homeostasis | Baseline vs env-no-control vs feedback; **K predeclared** (protocol-calibrated observational bounds from unregulated arms — not closure); time-in-K / recovery **distributions**; observational arms include `m2-env-no-control` |
| M3 | Ultrastability | Nonstationary schedule; episode log (rule changes, failed trials, mortality, stable-episode length) vs M2 |
| M4 | Setpoint vs viability | Density-error vs safe-interval; same disturbance family (controller modes shipped `56e3730`; observational multi-seed exports via evidence ladder — not a closed claim) |
| M5 | Hierarchy/autonomy | Central vs local vs coordinated; intervention/delay/bandwidth/ablation; VSM = hypothesis only — **eng scaffolding + observational multi-seed exports shipped; `m5-coord-ablated` (α=0) observational arm present; scientific completion still open** |
| M6 | Autopoiesis | **Gated** — after M1–M5; needs component + resource + boundary state; operational closure criteria predeclared |
| M7 | Complex adaptive | **Gated after M5 metrics** — may run parallel to gated M6; autopoiesis not a prerequisite; predeclared CAS observables; no single power-law “criticality” |

## Near-term engineering order

1. Declare **K** + essential variables `z_i` + run aggregators (time-in-K, distance outside K, recovery) — **done** `f5e3323`
2. First-class **DisturbanceSchedule** `w(t)` shared across study packs — **done** `951caf6` (harden follow-up `43225f9`)
3. **UltraEpisodeLog** schema + UI counts — **done** `5f38933`
4. **ResearchMode** shell (lock seed+condition+schedule, N repeats, export, replay) — keep exploratory default — **done** `00e1dc9`
5. **M4 controller modes** (SetpointError vs ViabilityBand) — **done** `56e3730` (modes only; not a closed evidence claim)
6. **M5 eng scaffolding** (Central/Local/Coordinated + interventionRate) — shipped on research track; **not** a closed evidence claim
7. **Evidence ladder M2–M5** — observational exports shipped @ `0ac0d88` (CONDITIONAL PASS); **≠ scientific closure**. **Evidence-harden A–D tip @ `4d8f43c`**. **Write guard** smoke → `_smoke`; **subpath refuse** @ `9f8c290`. **Next (captain ACCEPTED):** characterization→engine path — **not** eng theater; **do not start M6 autopoiesis**
8. **Characterization→engine (locked)** — see section below; **C1–C3 done** (@ `44cfaf9` / `2f45281` / `51a88d2`); C3 = M2 ladder-factor sweeps only (continuous gains refused); **path complete pending Reviewer**; **E1 held for captain**

## Characterization → engine lock (captain ACCEPTED 2026-09-25)

Authoritative sequencing lock (anti-drift):

1. **C1–C3 before E1 eng** — characterization complete before engine engineering.
2. **M2-only characterization first** — do not widen to M3–M5 characterization until M2 path is settled.
3. **θ v0 + env knobs in protocol** — protocol carries Θ v0 and environment knobs; **`schemaVersion` + full θ** required on evidence exports **before** sweeps.
4. **First sweep axes = ladder factors only** — condition / controller / org / α / schedule. **Not** continuous controller gains on the first sweep.
5. **M6 HARD-GATED** — no multi-system / meta-dynamics / UI theater. **Observational ≠ closure**.

**Done:** C1 @ `44cfaf9`; **C2 @ `2f45281`**; **C3 @ `51a88d2`** = M2 ladder-factor sweeps (`src/sim/m2-ladder-sweep.ts`, `npm run evidence -- --sweep-m2`). Axes: studyCondition / controllerMode / organizationMode / coordCouplingAlpha∈{0,0.3} / schedule∈{none,pulse,sustained}. Continuous gains refused. **C1–C3 characterization path complete pending Reviewer**; **E1 held for captain**. Observational ≠ closure; **M6 HARD-GATED**.

## Component ownership (Architect)

- StudyConditionPack — loop flags only  
- Seed/Replay — deterministic seedKey  
- DisturbanceSchedule — w(t)  
- Metrics/K — ViableRegion + aggregators; analysis owns multi-seed distributions  
- UltraEpisodeLog — slow adaptation evidence  
- ResearchMode — batch/export; not the default play UI  

## Doc amendments (Reviewer) — apply to research-roadmap.md + README

A. Hard gates 5→6; soften 6→7 so CAS may follow M5 metrics in parallel with gated M6 — applied  
B. Soften app-scope “expose autopoiesis” to hypothesis-only — applied  
C. Move autopoiesis condition out of “at minimum” into deferred — applied  
D. Align README extend-toward with gates — applied  
E. Stamp current target Steps 1–2 — applied  

## Active assignment log

| When | Who | What | Status |
|------|-----|------|--------|
| 2026-09-25 | Developer | Step-1 Study packs + seedKey | Done `503b05d` |
| 2026-09-25 | Editor | Roadmap/README amendments A–E + navigation plan | Done (docs track; CAS 6→7 soften follow-up on main) |
| 2026-09-25 | Developer | K viable-region metrics | Done `f5e3323` |
| 2026-09-25 | Developer | DisturbanceSchedule w(t) | Done `951caf6` |
| 2026-09-25 | Developer | UltraEpisodeLog | Done `5f38933` |
| 2026-09-25 | Developer | ResearchMode batch/export | Done `00e1dc9` |
| 2026-09-25 | Developer | M4 SetpointError vs ViabilityBand modes | Done `56e3730` |
| 2026-09-25 | Editor | Must-fix / residual life–framing UI copy | Done `600ebad`, `de9e52d` |
| 2026-09-25 | Reviewer | Conditional passes on copy + ResearchMode / M4 slices | Noted (engineering present; observational evidence ladder now exported) |
| 2026-09-25 | Developer | M5 hierarchy thin slice (modes/metrics/ResearchMode A/B/C) | Eng scaffolding done on research track; scientific completion still open |
| 2026-09-25 | Developer | Evidence ladder M2–M5 (`evidence-matrix` + `npm run evidence`) | Observational exports shipped (now N=20 seeds + dual grids @ `4d8f43c` tip); eng ≠ scientific closure; M6 gated |
| 2026-09-25 | Reviewer | Evidence ladder M2–M5 CONDITIONAL PASS | Noted @ `0ac0d88` (observational only; ≠ scientific closure; M6 gated) |
| 2026-09-25 | Editor | Evidence README + navigation stamp polish | Assigned → Done (this commit) |
| 2026-09-25 | Developer | Harden P3 smoke write-guard (`evidence/_smoke` default; `--write` for canonical) | Done `63fa427` |
| 2026-09-25 | Editor | Drop stale smoke-rewrites-evidence bullets; align READMEs with write-guard | Done (this commit) |
| 2026-09-25 | Developer | Evidence-harden A–D (env-no-control, calibrated K, dual grids+20 seeds, m5-coord-ablated) | Done tip `4d8f43c` (observational ≠ closure) |
| 2026-09-25 | Editor | README + nav checkpoint after evidence-harden A–D | Done `7a24ccf` |
| 2026-09-25 | Developer | Harden write-guard for committed evidence subpaths | Done P3 PASS tip `9f8c290` |
| 2026-09-25 | Editor | Nav/evidence stamp nit: cite subpath refuse @ `9f8c290` | Done `2504db5` |
| 2026-09-25 | Captain | ACCEPTED characterization→engine lock (C1–C3 before E1; M2-first; θ/schema; ladder-factor sweeps; M6 hard-gated) | Locked |
| 2026-09-25 | Developer | C1 ThetaV0 + golden replay | Done `44cfaf9` |
| 2026-09-25 | Editor | Fold characterization→engine lock into navigation-plan + README checkpoint | Done `26a4051` |
| 2026-09-25 | Editor | README + nav checkpoint after C1 landing (C1 done; C2 next) | Done `ccff4a8` |
| 2026-09-25 | Developer | C2 full ThetaV0 + schemaVersion on all evidence exports (CSV+JSONL fail-closed) | Done `2f45281` |
| 2026-09-25 | Editor | README + nav checkpoint after C2 landing (C2 done; C3 next = M2 ladder sweeps) | Done `2e72067` |
| 2026-09-25 | Developer | C3 M2 ladder-factor sweep (allowlist + refuse continuous gains; smoke CLI) | Done `51a88d2` |
| 2026-09-25 | Editor | README + nav checkpoint after C3 landing (C1–C3 pending Reviewer; E1 held) | Done (this commit) |
