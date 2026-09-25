# Wave-five integration and QA task dispatch

September 24, 2026. This review covers PRs #48, #49 and #50; planning PR #56 is
also merged. Software verification, historical-source inspection, accepted data and
real-user validation remain different evidence categories.

## Reviewed and merged

| PR | Reviewed final head | Result |
|---|---|---|
| [#49](https://github.com/QuinnPaterson96/ShovelReady/pull/49) | `3b27b13ce3955c64db9cf4c46103a635b89afdd1` | Database-free public-case API and separate evidence view; safe typed projection, unknowns and original units preserved |
| [#50](https://github.com/QuinnPaterson96/ShovelReady/pull/50) | `4f6a5948e7f390ee4212338da1245f7b86b513a1` | Provisional historical Stannard packet, two transcription candidates and ranked review queue |
| [#48](https://github.com/QuinnPaterson96/ShovelReady/pull/48) | `6ee6924c7a9b171eb9ddf4088f8e01f6dcee9c7d` | One uncoached VIC-080 browser participant, preserved note and attributed omissions; no established consequential app defect |

Each branch was brought up to date by merging main, then merged only after all four
required checks passed at the listed head. No force push or branch-protection bypass.
Final runs: [viewer](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36077416593),
[research](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36077499326),
[rehearsal](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36077591146).

The review found no blocking runtime defect. Boundary checks reject malformed metadata,
broken references, unsupported acceptance and unsafe links; the UI preserves explicit
unknowns and clears stale evidence after failure. It does not infer spatial joins or
normalize legal measurements. SR-24/SR-25/SR-26 finish their bounded objectives, while
SR-06/SR-10/SR-11/SR-12/SR-13/SR-16 retain their broader evidence requirements.

## Selected research reconciliation

Fresh official R2-65 and DDP01047 final-approved PDF bytes matched the research
manifest's hashes (89,610 bytes/two pages and 36,261,112 bytes/ten pages). Integration
visually checked R2-65 p1 and DDP01047 A0.0/A0.1. This corroborates the role-substitution
text, the later drawing/received/approval dates, the applicant's discontinued-kit/custom
design assertion and A0.1's inconsistent area/FSR labels. It is a narrow transcription
check, not independent legal review or confirmation of construction/permit conditions.

Inventory `2026-09-24.integration-2` adds those two source metadata records (23 sources,
ten cases), revision-specific notes and remaining conflicts. Original C1 measurements,
all other cases, provisional review status, unknown effective dates, unknown prefab
verification, null issued/as-built fields and benchmark ineligibility are preserved.
The old inventory remains available in Git. No PDF bytes or renders are committed.

Indexed-only Council records and the July 9 tracker event remain in the separate
research memo with their access limitations; they are not silently promoted to verified
app facts. Historical enactment/definition chains, measurement endpoints, conditions,
executed permits, controlled inputs and reuse permissions remain open review items.
The current evaluator still cannot accept this packet by stripping its conditions.

## Verification

Combined code tree `dd9a7c4` includes the three original PR heads and merged planning
PR #56. From `C:/Users/quinn/src/ShovelReady-review-20260924`:

```powershell
$env:SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN='C:/Program Files/PostgreSQL/17/bin'
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin'
python -m uv run --locked ruff check app tests contract_tests migrations scripts docs/pilot-inputs/intake.py docs/pilot-inputs/test_intake.py docs/usability/check_fixtures.py docs/research/stannard-reference/verify_packet.py
python docs/research/public-cases/verify_inventory.py
python docs/research/stannard-reference/verify_packet.py
python -m uv run --locked python docs/pilot-inputs/test_acquire.py
python -m uv run --locked python docs/pilot-inputs/test_intake.py
python -m uv run --locked python docs/usability/check_fixtures.py
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

Results: 252 backend tests plus 28 contract subtests, zero skips; seven frontend tests,
typecheck/build, lint, both research validators, acquisition 2, intake 10 and preview 3
checks passed. Native lifecycle was enabled. The new disposable PostgreSQL cluster
under `C:/Temp/shovelready-postgres-zw0mjsaz` stopped successfully. The existing
Starlette/httpx deprecation warning remains. No shared/default database was used.

The integration follow-up adds both offline research validators to existing backend CI
and probes `/api/reference-cases` in the existing container job. The latter checks
version, inventory kind, ten cases, selected case membership and provisional statuses,
so a missing packaged JSON file can no longer hide behind a passing health endpoint.
After the inventory reconciliation, 32 focused public-case backend tests, all seven frontend tests, both research validators and research lint passed again. Strict UTF-8/local-link checks covered 16 changed files and 121 local links; the workflow YAML and embedded Python probe parsed, and a byte-content comparison confirmed all other cases and original Stannard measurements were unchanged. No live models or new CI services are added. Hosted CI is the container execution
evidence; no local Docker success is claimed.

The SR-24 author recorded built-browser checks with/without a database, existing modes
and reload failure on its delivered code. The SR-26 participant used the older frozen
baseline, not this new mode; its findings must not be represented as validation of the
new public-case view. Neither report supplies real-user satisfaction or legal accuracy.

## Dispatched tasks and remaining gates

- SR-27 / issue #51: implementation of shared QA records and protocol in its own worktree.
- SR-28 / issue #52: case/control selection and materialization preparation; implementation
  waits for integrated SR-27 records and agreement with SR-29.
- SR-29 / issue #53: runner/lifecycle preparation; implementation waits for SR-27.
- SR-30 / issue #54: grading/calibration preparation; implementation waits for SR-27.
- SR-31 / issue #55: readiness checklist only; live sessions wait for reviewed SR-26 and
  integrated SR-28/SR-29/SR-30, with the existing bounded pilot budget.

All five tasks were created and their active progress checked. Preparation notes may
finish before prerequisites. They do not authorize duplicate schemas, automatic source
acceptance, unbounded participant dispatch or a recurring automation. Central docs and
workflow edits remain under integration ownership. The next implementation handoff is
SR-27's reviewed shared format, followed by the three parallel implementation tracks.
