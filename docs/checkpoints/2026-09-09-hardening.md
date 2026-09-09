# Checkpoint: Runtime Hardening and Simulation Polish

## Scope

This checkpoint records the follow-up work completed on `local-ui-review` after
the integrated browser review. The work stayed local and did not require a
remote branch or pull request.

## Changes

- Made the Windows app wrapper launch Vite through Node's JavaScript entrypoint,
  avoiding shell interpolation and npm shim spawning failures.
- Added cross-platform wrapper coverage, including an explicit skip for
  environments where Windows symbolic links are unavailable.
- Made seeded simulations initialize their population, entropy, heat, energy,
  and viability metrics immediately.
- Recalculated metrics after clearing or painting the field and cleared all
  transient heat and energy buffers during a clear.
- Made default reseeding produce a fresh random field instead of repeatedly
  reusing one fixed seed.
- Improved sparse/default field seeding and made zero-population metrics
  well-defined.
- Replaced custom range/toggle controls with the shared Radix slider and switch
  primitives and refined their visual affordances.
- Kept malformed connector JWT payloads on the existing opaque-token fallback
  path while documenting the intentionally empty failure branch for linting.
- Added agent tests covering reseeding and clear/paint metric invariants.

## Review result

The security review found no actionable high-confidence vulnerabilities in the
current authentication, app-data, local-agent, browser, or P2P paths.

## Validation

- `npm test` — 37 tests passed.
- `npm run typecheck` — passed.
- `npm run lint -- --quiet` — passed.
- `npm run build` — passed, with migrations safely skipped when
  `DATABASE_URL` is not configured.
- Local app endpoint responded with HTTP 200 during the final review.

The repository's browser smoke helper currently assumes the Linux App Builder
workspace path and cannot run unchanged in this Windows worktree. The browser
canvas had already confirmed the app rendered and responded to Run and World
controls before this checkpoint; the final server response remained healthy.
