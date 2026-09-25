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
| `schedule` | named ids `none` \| `pulse` \| `sustained` (not a continuous float grid) |

Continuous gains (`homeoGain`, `climate`, `seasonRate`, `noise`, …) are **refused** as sweep axes (`assertM2SweepSpec` / `isAllowedM2SweepAxis`) — still stamped in ThetaV0 for completeness. Default smoke expands `studyCondition` only; full matrix via `--sweep-axes` / `expandAxes`. CLI: `npm run evidence -- --sweep-m2` → `evidence/_smoke/m2-sweep/` (write-guard unchanged).

**Dual-grid expand @ `c1a979c`:** runs 48×36+72×54 arms in one sweep; default/full matrix still ladder-factor discrete axes only; smoke 48-arm N=20 under `_smoke` not committed. **E1 not started.** **M6 HARD-GATED.** Observational ≠ closure.

**Observational ≠ scientific closure. M6 HARD-GATED. No E1 eng platform / multi-system / UI theater.**

Architect may refine the field table; any delta lands as an explicit follow-up, not a silent omission of env knobs or `schemaVersion`. Soft nit deferred: nullish numeric θ coerce vs refuse.
