# ThetaV0 (characterization lock)

**Status:** C1 landed. Observational scaffolding ≠ scientific closure. **M6 HARD-GATED.**

ThetaV0 (`schemaVersion: "theta.v0"`) is the captain/Architect-frozen parameter stamp carried on every research lock and evidence export **before** any E1 sweep engine.

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

## Sweep policy (later — not C1)

First sweep axes = **ladder factors only**: condition / controller / org / α / schedule. Continuous gains are recorded in θ for completeness but are **not** first-axis knobs. No multi-system / meta-dynamics / UI theater.

Architect may refine the field table; any delta lands as an explicit follow-up, not a silent omission of env knobs or `schemaVersion`.
