# Wave-ten integration

Planning/review date: September 25, 2026. Starting main:
`6c14d9f4f4dc43c297b341a212dd8174585d1880` (includes Civic Atlas).

| PR | Reviewed source head | Delivered boundary |
|---|---|---|
| #94 | f2a1c5f3e8c999da907ba21e9efa65134aa14c39 | Four Victoria candidate rule mappings |
| #95 | 7edf732321107b8391f373035816df0ab46c2b70 | Three provider models and standalone editable inputs |
| #96 | d51ce358d5981a15cdd169a96afedbea9de53981 | Three-PID Victoria lookup/API and standalone selector |
| #97 | b16b4e5b938849738759a25799aed69dba8c027d | Five Langford candidate rule shapes |
| #98 | 8c7c4ba2940aea517e30e8ef1d766c4b6f937719 | Five Saanich candidate checks, including unresolved height |
| #99 | 8d306ff4d72f29366869dd95bdc4bcf3e4bac457 | Provincial geocoder/parcel captures for three Langford leads |
| #100 | 8bda45ed2b99677be9162832dc45ff7197800815 | Three Saanich address/parcel observations and replay |

These branches were composed without conflicts. Review covered the changed runtime
API/components, mapping/validation tools, packet schemas/manifests, tests and handoffs.
It is not independent legal/source acceptance. No source documents were freshly
acquired or source-span PDF checks repeated during this integration.

## Corrections from review and combined checks

1. Windows checkout converted Saanich capture line endings and failed four replay
   checks. The Git blob matched the manifest hash exactly. Preserve these bytes with
   `.gitattributes -text` and restore the existing blob, without changing hashes or data.
2. Site UI validation accepted incomplete nested candidates which rendering could
   dereference. Export the actual Python Lookup schema, validate it with the existing
   AJV dependency and retain status/cardinality/origin guards. Add malformed-candidate
   regressions and producer/consumer drift checking.
3. Langford replay selected geocoder result zero without considering alternatives.
   All three real captures contain multiple results. They now return ambiguous,
   retaining alternatives for explicit selection. Prior first-point spatial results
   remain testable only as an explicitly simulated selection, not address/PID proof.
4. CI now checks model catalogue and site-schema drift, and lints the new municipal
   tools and Victoria rule validator. No new runtime dependency or migration.

## Verification on composed code

- Native PostgreSQL 17 runner with lifecycle tests enabled: **430 passed, 28 contract
  subtests passed, no skipped tests**. Fresh disposable cluster was stopped afterward.
  Command: `python -m uv run --locked python scripts/test_postgres.py --postgres-bin
  "C:/Program Files/PostgreSQL/17/bin"`, with
  `SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN` set to the same directory.
- `npm test --prefix frontend`: **39 passed**. TypeScript/Vite production build passed.
- Ruff passed for app/tests/contracts/migrations/scripts and new replay/export tools.
- Site schema and model snapshot `--check` passed. Both municipal spatial commands
  and both municipal rule commands replayed offline. Victoria validation without its
  privately retained PDF correctly reported `source_unavailable` with four candidates.
- Existing Starlette/httpx deprecation and Vite chunk-size advisory remain.
- Final-head hosted CI is recorded on the integration PR. Local Docker and mounted
  browser integration were not run here: new components await SR-41 wiring. The
  existing localhost demo was not restarted and must not be treated as this build.

## What remains

SR-38/#86 is partial: no licensed address join was acquired. Other task outputs are
complete only as bounded candidate/catalogue/transfer slices. All rules remain
unaccepted and non-executable; no accepted release or real-site fit is produced.
Source/licence/currentness and controlled design/site evidence remain named gates.
See [next steps](next-steps-after-wave-ten.md) before dispatching more implementation.
