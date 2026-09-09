# Local agents and skills

Homeostat keeps its first agent layer inside the repository. This makes the
simulation usable without accounts, connector access, a signaling relay, or a
remote GitHub workflow.

## Contracts

- `src/lib/agents/types.ts` defines the local agent and skill contracts.
- `src/lib/agents/registry.ts` is the explicit local registry.
- `src/lib/agents/simulation-triage.ts` is a pure observer agent. It reads a
  `Metrics` snapshot and returns deterministic findings; it does not mutate the
  engine or schedule work.

The first skill, `simulation-observer`, accepts only simulation metrics. The
first agent, `simulation-triage`, can report collapse, sparse or crowded
conditions, low energy, and active feedback loops. Its suggested actions are
descriptive rather than automatic so the game remains player-directed.

The `operator-observer` agent is a separate read-only diagnostic layer. It
receives a bounded local trace of UI actions and runtime errors, then reports
possible control friction or app failures. It never receives a `SimEngine`
reference and cannot step, seed, paint, clear, or change simulation settings.
The trace is held in memory for the current page session only.

## Extension rules

Add a local skill when it has a stable input/output contract and can run
without network access. Add an agent to `LOCAL_AGENTS` only after its behavior
is deterministic and covered by a focused test. Keep agent code separate from
the render loop and `SimEngine`; agents may observe snapshots but must not
mutate simulation state.

Operator diagnostics should use `OperatorEvent` values and remain bounded.
Capture only app-relevant actions and runtime failures; do not persist the
trace or include personal data. Findings should suggest investigation rather
than issue commands back into the app.
The canonical plan lives in the docs directory, especially
`docs/checkpoints/` and `docs/local-agents.md`. Do not keep a separate live
plan window in the app when the repo already records the work in docs; the
source of truth stays doc-first and the app remains focused on the simulation.

Authentication, connector data, P2P rooms, and GitHub Actions are optional
integration layers. They must not become prerequisites for local agent
discovery or simulation triage.
