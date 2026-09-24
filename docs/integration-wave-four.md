# Wave-four integration evidence

September 24, 2026. PRs [#40](https://github.com/QuinnPaterson96/ShovelReady/pull/40),
[#41](https://github.com/QuinnPaterson96/ShovelReady/pull/41),
[#42](https://github.com/QuinnPaterson96/ShovelReady/pull/42) and
[#43](https://github.com/QuinnPaterson96/ShovelReady/pull/43) are merged.

- PR #40 supplies the concise PR template, AGENTS handoff rule and integration checklist.
- PR #41 adds hosted Windows verification of the real native database lifecycle. After
  successful review/CI, `native-local-database-windows` was added to required checks,
  preserving the existing three checks, strict up-to-date behavior and protection.
- PR #42 adds the owned foreground demo launcher and app/frontend/data identity. Review
  reproduced relative config resolution against the wrong process working directory;
  commit `0626045` switches to PowerShell path resolution and adds a wrapper regression.
- PR #43 provides ten provisional case packets (seven Victoria, one Saanich, two
  Vancouver), zero accepted references. Review spot-checked Stannard plan bytes/hash and
  table/stamps, the Kingsley recommendation and Vancouver's conditional appeal decision.
  The Stannard stamp fact now cites its plan; inventory revision is
  `2026-09-24.integration-1`. Other cases were reviewed as metadata, not a full source audit.

## Checks and exact scope

From the clean integration checkout at `cdaada6` (combined implementation plus launcher
fix), Windows Python 3.12.3, Node 22.14 and native PostgreSQL 17.2:

```powershell
$env:SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN='C:/Program Files/PostgreSQL/17/bin'
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin'
python -m uv run --locked ruff check app tests contract_tests migrations scripts docs/pilot-inputs/intake.py docs/pilot-inputs/test_intake.py docs/usability/check_fixtures.py
python -m uv run --locked python docs/pilot-inputs/test_acquire.py
python -m uv run --locked python docs/pilot-inputs/test_intake.py
python -m uv run --locked python docs/usability/check_fixtures.py
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

Results: **220 backend tests and 28 contract subtests passed**, including the native
lifecycle, with no skips; lint passed; acquisition 2, intake 10 and preview 3 passed;
frontend 4 tests, typecheck and production build passed. Temporary clusters stopped.
The existing Starlette/httpx deprecation warning remains. The launcher wrapper regression
stubs Python dispatch to verify path/caller-location handling, not database behavior.
The author-recorded real launch/browser evidence remains at its documented earlier
commit in [local development](local-development.md); integration did not rerun that
entire interactive session or claim to.

At research head `5748519`, these additional checks passed:

```powershell
python docs/research/public-cases/verify_inventory.py
python -m uv run --locked ruff check docs/research/public-cases/verify_inventory.py
```

The later combined whitespace review found one extra blank line at the end of the CI
handoff; the integration documentation update removes it. It was not a runtime defect.

Required checks passed on final heads before each merge. Hosted evidence:
[PR #40](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36072338176),
[PR #41](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36073802058),
[PR #42](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36073982622),
[PR #43](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36074188936).
Code merging and provisional metadata verification do not establish accepted zoning
interpretations, a current prefab fit, source redistribution rights or customer validation.

## Next integration boundary

SR-24 makes provisional research evidence inspectable in the app. SR-25 narrows one
historical case to a reviewable packet. SR-26 rehearses an already available licensed
case through an isolated virtual participant. They run independently; the virtual run
does not wait for or validate the new public-case view. Independent review, accepted
publication and the complete real source-to-screening path remain open.
