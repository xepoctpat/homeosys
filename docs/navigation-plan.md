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
- **Engineering stamp (observational):** eng through **M5 organization scaffolding** is present; **evidence ladder M2–M5 shipped** with Reviewer **CONDITIONAL PASS** @ `0ac0d88` (`npm run evidence`, `evidence/m2`…`m5`, fixed `EVIDENCE_SEED_KEYS`, N=10). **Evidence-first work is in progress** — eng scaffolding ≠ scientific closure; Steps 3–5 / M2–M5 remain observational. **M6 hard-gated**. **Write guard:** smoke defaults to `evidence/_smoke/` or refuses committed paths; `--write` for canonical `evidence/{m2..m5}` (P3 PASS @ `63fa427`).

## Long-horizon milestones

| ID | Focus | Exit (summary) |
|----|--------|----------------|
| M1 | Validation/baseline | Deterministic replay + seeded B3/S23; fixed-rule no-env protocol used (partially shipped: Study packs + seedKey `503b05d`) |
| M2 | Homeostasis | Baseline vs env-no-control vs feedback; **K predeclared**; time-in-K / recovery **distributions** |
| M3 | Ultrastability | Nonstationary schedule; episode log (rule changes, failed trials, mortality, stable-episode length) vs M2 |
| M4 | Setpoint vs viability | Density-error vs safe-interval; same disturbance family (controller modes shipped `56e3730`; observational multi-seed exports via evidence ladder — not a closed claim) |
| M5 | Hierarchy/autonomy | Central vs local vs coordinated; intervention/delay/bandwidth/ablation; VSM = hypothesis only — **eng scaffolding + observational multi-seed exports shipped; ablation / scientific completion still open** |
| M6 | Autopoiesis | **Gated** — after M1–M5; needs component + resource + boundary state; operational closure criteria predeclared |
| M7 | Complex adaptive | **Gated after M5 metrics** — may run parallel to gated M6; autopoiesis not a prerequisite; predeclared CAS observables; no single power-law “criticality” |

## Near-term engineering order

1. Declare **K** + essential variables `z_i` + run aggregators (time-in-K, distance outside K, recovery) — **done** `f5e3323`
2. First-class **DisturbanceSchedule** `w(t)` shared across study packs — **done** `951caf6` (harden follow-up `43225f9`)
3. **UltraEpisodeLog** schema + UI counts — **done** `5f38933`
4. **ResearchMode** shell (lock seed+condition+schedule, N repeats, export, replay) — keep exploratory default — **done** `00e1dc9`
5. **M4 controller modes** (SetpointError vs ViabilityBand) — **done** `56e3730` (modes only; not a closed evidence claim)
6. **M5 eng scaffolding** (Central/Local/Coordinated + interventionRate) — shipped on research track; **not** a closed evidence claim
7. **Evidence ladder M2–M5** — observational exports shipped @ `0ac0d88` (CONDITIONAL PASS); **≠ scientific closure**. Evidence-first analysis in progress. **Write guard shipped** @ `63fa427` (smoke → `_smoke` / refuse; `--write` for canonical). Next eng: optional ablation polish or M6 gate prep — **do not start M6 autopoiesis**

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
| 2026-09-25 | Developer | Evidence ladder M2–M5 (`evidence-matrix` + `npm run evidence`) | Observational N=10 exports shipped; eng ≠ scientific closure; M6 gated |
| 2026-09-25 | Reviewer | Evidence ladder M2–M5 CONDITIONAL PASS | Noted @ `0ac0d88` (observational only; ≠ scientific closure; M6 gated) |
| 2026-09-25 | Editor | Evidence README + navigation stamp polish | Assigned → Done (this commit) |
| 2026-09-25 | Developer | Harden P3 smoke write-guard (`evidence/_smoke` default; `--write` for canonical) | Done `63fa427` |
| 2026-09-25 | Editor | Drop stale smoke-rewrites-evidence bullets; align READMEs with write-guard | Done (this commit) |
