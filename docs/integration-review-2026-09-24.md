# Integration review: evaluator, local database and observation viewer

September 24, 2026. All three implementation PRs merged through the required checks:

| PR | Implemented | Remaining boundary |
|---|---|---|
| [#31](https://github.com/QuinnPaterson96/ShovelReady/pull/31) | Draft-only deterministic scalar evaluation with exact rule/fact bindings, unit and ratio checks, coherent alternatives and explicit uncertainty | Synthetic reference cases do not establish real zoning accuracy; no accepted-release or HTTP adapter |
| [#32](https://github.com/QuinnPaterson96/ShovelReady/pull/32) | Owned persistent local PostgreSQL, explicit migration/seed commands and restart retention | Native lifecycle verification is opt-in; no cloud deployment or production recovery claim |
| [#33](https://github.com/QuinnPaterson96/ShovelReady/pull/33) | Read-only API/UI for the pinned licensed spatial packet, source inspection and original-CRS geometry | Observations are unreviewed; no screening or accepted dataset |

Review found no remaining merge-blocking production defects. Integration extended the
native database lifecycle test to call the real investigation API after a restart,
without replacing its connection or repository. It checks the exact seeded spatial
payload, all 15 sources and the no-screening status. The local database and API
handoffs now give matching configuration and launch commands.

## Verification actually performed

- Combined backend: **211 tests and 28 contract subtests passed**, with the native
  lifecycle opt-in enabled and no database skips. Tests provisioned isolated scratch
  PostgreSQL clusters; no shared or legacy database was used.
- Backend lint; two acquisition, ten intake and three preview checks passed.
- Frontend: four test groups, TypeScript checking and production build passed.
- Manual browser check: a separate freshly seeded scratch database served the built
  app. All three sample sites loaded; selection, zoom, layer visibility and feature
  details worked. The UI retained source/revision identity and the no-screening
  boundary. The temporary HTTP server and database were stopped afterward.
- Required backend, frontend and container-startup CI passed on the final head of
  each implementation PR before merging. The native local-database lifecycle case
  still skips ordinary CI unless its binary-path opt-in is supplied.

Native lifecycle checks were exercised on Windows, Python 3.12 and PostgreSQL 17.2.
Linux/macOS lifecycle behavior was not verified. The existing Starlette/httpx
deprecation warning remains. Passing these checks is not a source-interpretation
benchmark, a real-user study or evidence of an accepted source-to-screening path.

## Proposed process improvements

These are recommendations for subsequent work, not claims that automation exists.

1. **Put the native lifecycle seam in CI.** Add an appropriate job with explicit
   PostgreSQL binaries for helper/API changes, exercising initialize, migrate, seed,
   restart and API retrieval. Keep databases disposable and make unexpected skips
   visible. The existing CI service-database tests cover a different lifecycle.
2. **Give the demo a stable checkout and visible identity.** Run demonstrations from
   one clean merged checkout. Record or display the application commit and selected
   spatial revision, and use the documented launch command. An old worktree's running
   process can otherwise make a successful merge appear absent from localhost.
3. **Standardize a short PR handoff.** State the base/head commits, interface/config
   changes, exact verification commands and skips, demo command, and remaining parent
   acceptance criteria. Keep the separate ownership and central integration review
   used this round; it avoided conflicting implementations without more infrastructure.
4. **Choose the next integration milestone around one reviewed case.** Obtain a
   bounded real rule/design/site/placement reference, preserve unsupported portions,
   then connect evaluation, evidence and display. Measure whether someone can find
   the decisive source and explain the uncertainty. Do not expand coverage or treat
   an agent's browser rehearsal as customer validation.

The current observation viewer is ready for an internal workflow rehearsal. Independent
source applicability, controlled design dimensions, reviewed site/placement facts,
accepted publication and the full source-to-result fixture remain MVP gates. Parent
SR-07, SR-09, SR-10, SR-12 and SR-13 should not be closed on these partial deliveries.
