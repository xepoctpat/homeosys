# ThetaV0 (characterization lock)

**Status:** C1+C2+C3 landed. Observational scaffolding ≠ scientific closure. **M6 HARD-GATED.**

ThetaV0 (`schemaVersion: "theta.v0"`) is the captain/Architect-frozen parameter stamp carried on every research lock and evidence export. C3 M2 ladder-factor sweeps reuse the same stamp; **E1 eng platform not started**.

## Formal model

`x(t+1) = F(x(t), u(t), θ(t), w(t))` — see `docs/research-roadmap.md`.

- **θ** = locked rule/parameter state (this schema)
- **w** = disturbance schedule (nested inside θ for the export stamp)
- **seedKey** = initial condition (also stamped inside θ for replay)

## Field freeze

Identity: `schemaVersion`, `protocolId`, `armId` (null off-ladder).

World / disturbance: `worldPreset`, `cols`, `rows`, `schedule.{id,startGen,duration,amplitude}`, plus env knobs `environment`, `climate`, `seasonRate`, `seasonAmp`, `energyRichness`, `metabolicHeat`, `noise`.

Loop / controller: `studyCondition`, `cybernetics`, `homeoGain`, `autoSetpoint`, `setpoint`, `controllerMode`, `organizationMode`, `coordCouplingAlpha`, `ultraEnabled`, `varietyEnabled`, `autoEnabled`, `observerEnabled`.

Rule: `rule` (B*/S* genome string at lock).

K + run: `densityMin`, `densityMax` (default `PROTOCOL_CALIBRATED_K`), `generationLimit`, `measurementInterval`, `seedKey`, `repeats`.

## API

- `thetaFromProtocol` / `protocolFromTheta` / `settingsFromTheta`
- `validateProtocol` stamps complete knobs (packs seed defaults; run path does not silently re-merge packs)
- Evidence JSONL meta + every run row carry full ThetaV0
- CSV rows carry `schemaVersion` + `thetaJson` (= `JSON.stringify(theta)`) so flat CSV keeps complete θ
- `assertExportHasFullTheta` fail-closes exporters/tests if θ truncated or missing

## Sweep policy (C3 landed — M2 ladder factors only)

**C3** = M2-scoped characterization sweep over **ladder factors ONLY** (`src/sim/m2-ladder-sweep.ts`):

| Axis | Discrete levels |
|------|-----------------|
| `studyCondition` | `baseline` \| `envNoControl` \| `homeostatic` (M2-first; ultrastable stays M3) |
| `controllerMode` | `SetpointError` \| `ViabilityBand` |
| `organizationMode` | `Central` \| `Local` \| `Coordinated` |
| `coordCouplingAlpha` | `{0, 0.3}` only (meaningful when Coordinated; α-sweep forces Coordinated) |
| `schedule` | ladder default `none` \| `pulse` \| `sustained`; anatomy micro-sweep also `sustainedShort` \| `pulseLong` (occupancy/CA characterization; observational ≠ closure) |

Continuous gains (`homeoGain`, `climate`, `seasonRate`, `noise`, …) are **refused** as sweep axes (`assertM2SweepSpec` / `isAllowedM2SweepAxis`) — still stamped in ThetaV0 for completeness. Default smoke expands `studyCondition` only; full matrix via `--sweep-axes` / `expandAxes`. CLI: `npm run evidence -- --sweep-m2` → `evidence/_smoke/m2-sweep/` (write-guard unchanged).

**Eng dual-grid expand @ `c1a979c`:** code runs 48×36+72×54 arms in one sweep; default/full matrix still ladder-factor discrete axes only. **Eng schedule anatomy @ `f466e06`:** `sustainedShort`+`pulseLong` / `--sweep-schedule-levels` (Reviewer PASS nits). **Shared-disk smoke** (gitignored; not committed; not closure): `evidence/_smoke/m2-thick-20260925-212913/` (48-arm homeostatic thick) + `evidence/_smoke/m2-thick-sc-20260925-222647/` (144-arm sc×thick; 144/144 ok) + `evidence/_smoke/m2-sched-anat-20260925-225009/` (schedule-anatomy). **Characterization PARK** after schedule-anatomy (captain deferred; Coordinator park). Verdict **duration-not-family** under homeostatic×Central×VB banked (also CSVB homeostatic-only). **E1 not started.** **M6 HARD-GATED.** Observational ≠ closure.

**Schedule anatomy ids** (`sustainedShort`, `pulseLong`) exist for duration-vs-family micro-sweeps (`M2_SWEEP_ANATOMY_SCHEDULE_IDS` / `--sweep-schedule-levels`); ladder default `M2_SWEEP_SCHEDULE_IDS` stays `none|pulse|sustained` only. Occupancy/CA language; observational ≠ closure.

**Observational ≠ scientific closure. M6 HARD-GATED. No E1 eng platform / multi-system / UI theater.**

Architect may refine the field table; any delta lands as an explicit follow-up, not a silent omission of env knobs or `schemaVersion`. Soft nit deferred: nullish numeric θ coerce vs refuse.
