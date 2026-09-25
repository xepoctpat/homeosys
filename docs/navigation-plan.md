# Homeosys navigation plan

**Settled:** 2026-09-25 (Coordinator + Strategist, System Architect, Developer, Reviewer)  
**North-star document:** `docs/research-roadmap.md` (with Reviewer amendments A–E applied or queued)  
**Repo:** `/workspace/repos/homeosys` · work on `main` · no PRs · `prism` / `prism-clean` locked  
**Mode:** Captain’s quarters — nudge user only on status or blockers

## Principles (anti-drift)

- Broad platform, narrow evidence.
- Measured control ladder = steps **1→5**; steps **6–7** stay future-hypothesis until gates pass.
- Pattern persistence ≠ autopoiesis; no life / cognition / consciousness claims.
- Exploratory play ≠ controlled evidence (need locked seed, K, schedule).
- StudyConditionPack must not redefine world/disturbance; World must not redefine loops.
- Current experimental target stamp: **Steps 1–2** until evidence moves it.

## Long-horizon milestones

| ID | Focus | Exit (summary) |
|----|--------|----------------|
| M1 | Validation/baseline | Deterministic replay + seeded B3/S23; fixed-rule no-env protocol used (partially shipped: Study packs + seedKey `503b05d`) |
| M2 | Homeostasis | Baseline vs env-no-control vs feedback; **K predeclared**; time-in-K / recovery **distributions** |
| M3 | Ultrastability | Nonstationary schedule; episode log (rule changes, failed trials, mortality, stable-episode length) vs M2 |
| M4 | Setpoint vs viability | Density-error vs safe-interval; same disturbance family |
| M5 | Hierarchy/autonomy | Central vs local vs coordinated; intervention/delay/bandwidth/ablation; VSM = hypothesis only |
| M6 | Autopoiesis | **Gated** — after M1–M5; needs component + resource + boundary state; operational closure criteria predeclared |
| M7 | Complex adaptive | **Gated after M5 metrics** — may run parallel to gated M6; autopoiesis not a prerequisite; predeclared CAS observables; no single power-law “criticality” |

## Near-term engineering order

1. Declare **K** + essential variables `z_i` + run aggregators (time-in-K, distance outside K, recovery) — **next**
2. First-class **DisturbanceSchedule** `w(t)` shared across study packs
3. **UltraEpisodeLog** schema + UI counts
4. **ResearchMode** shell (lock seed+condition+schedule, N repeats, export, replay) — keep exploratory default

## Component ownership (Architect)

- StudyConditionPack — loop flags only  
- Seed/Replay — deterministic seedKey  
- DisturbanceSchedule — w(t)  
- Metrics/K — ViableRegion + aggregators; analysis owns multi-seed distributions  
- UltraEpisodeLog — slow adaptation evidence  
- ResearchMode — batch/export; not the default play UI  

## Doc amendments (Reviewer) — apply to research-roadmap.md + README

A. Hard gates 5→6 and 6→7  
B. Soften app-scope “expose autopoiesis” to hypothesis-only  
C. Move autopoiesis condition out of “at minimum” into deferred  
D. Align README extend-toward with gates  
E. Stamp current target Steps 1–2  

## Active assignment log

| When | Who | What | Status |
|------|-----|------|--------|
| 2026-09-25 | Developer | Step-1 Study packs + seedKey | Done `503b05d` |
| 2026-09-25 | Editor | Roadmap/README amendments A–E | Assigned |
| 2026-09-25 | Developer | K viable-region metrics | Assigned |
