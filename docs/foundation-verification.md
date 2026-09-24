# SR-02 and SR-03 foundation verification

Status: verified implementation merged via PR #20, 2026-09-24. This is an application scaffold,
not a working zoning release. Exact local results below were run in the isolated foundation
checkout on Windows with Python 3.12.3 and Node 22.14.0. GitHub Actions results are recorded
below for the pull-request run.

## Decisions and limits

- Backend startup is DB-free. `/health` proves process liveness only; no schema creation,
  remote resource, ingestion, or zoning result is implied. A built Vite app is served from `/`.
  `SHOVELREADY_ENV=production` fails until deployment configuration is designed.
- The legacy `/zones/upload`, its flat `ScoutingZone` ORM and schema, and its helper DB module
  were retired. The parser shadows `is_ratio`, disagrees with the ORM coverage field, flattens
  incompatible alternatives, and discards evidence. Repairing that upload in place would
  compete with SR-04 contracts and risk false candidate labels. Original exploration remains
  available in Git history; the source extraction prompt is retained.
- The nested Vite starter and outer CRA/Tailwind fragments became one `frontend/` Vite project.
  The page states the current limitations. No upload or scoring UI is exposed.
- The old tests target missing cards/events/users models, import `tests/db_setup.py`, and
  execute `TRUNCATE`, `drop_all`, and historical remote defaults. They were read/audited but
  never run. Their files and the unsafe active defaults were removed from the runnable tree.
  `tests/database_safety.py` now refuses any absent or non-loopback database target unless
  it has an explicit test environment, disposable acknowledgement, and a unique test DB name.
  The current suite has no DB tests or cleanup. The guard checks configuration; it does not
  prove ownership of a running database. Future DB fixtures must provision a fresh disposable
  instance and call the guard before connecting or cleanup.
- The historic embedded database credential may still exist in Git history. Revoke/rotate it
  with its owner; removing it from active files is not revocation. No value was reused or
  reproduced. No project cloud resources were configured.
- SR-04 should provide versioned Pydantic boundaries for source, design, rule and result
  payloads with evidence/uncertainty and explicit unresolved states. It can add API adapters
  after the contracts are reviewed. Avoid reviving the untyped upload or relying on the
  retired flat ORM. SR-08 will add persistence and disposable Postgres migration tests;
  SR-13 will add fixture ingestion-to-result and full application smoke checks. CI has
  explicit jobs for the checks that exist now.

## Checks actually executed locally

| Command | Result |
|---|---|
| `python -m uv lock` | Resolved 24 packages and wrote `uv.lock`. |
| `python -m uv sync --locked` | Installed 23 packages in a new isolated `.venv`. |
| `python -m uv run --locked ruff check app tests` | All checks passed. |
| `python -m uv run --locked pytest -q` | 23 passed, 1 Starlette `httpx` deprecation warning. No DB connection or live model call. |
| `python -m uv run --locked pytest -q tests/fixtures/known_failure.py` | Expected failure, exit 1: `CI failure probe`. The normal suite excludes this file. |
| `npm ci` in `frontend/` | Installed from `package-lock.json`. |
| `npm run typecheck` in `frontend/` | Passed. |
| `npm run build` in `frontend/` | Passed, Vite 7.3.6, 29 modules transformed. |
| `npm audit` in `frontend/` after lockfile update | Found 0 vulnerabilities. |
| Uvicorn subprocess on `127.0.0.1:18080`; HTTP GET `/health` and `/` | `/health` 200 with `{"status":"ok"}`; `/` 200 containing ShovelReady. Subprocess stopped afterward. |
| `git diff --check` | Passed. |

`docker info` could not connect to the local Docker Desktop engine. The container image
smoke check therefore ran in GitHub Actions, not locally. No migrations, ingestion-to-result
fixture, or data publication exists; those checks are not represented as passed.

## CI and protection

`.github/workflows/ci.yml` runs on pull requests and `main` pushes with repository read
permission and no deployment or model secrets. `backend` uses a locked uv install, Ruff,
and focused offline pytest. `frontend` uses `npm ci`, type-check and Vite build.
`container-startup` builds the image, starts it, checks `/health`, and fetches `/`.
Required check names for `main`: `backend`, `frontend`, `container-startup`.
GitHub `main` branch protection now requires those exact checks with strict up-to-date
validation and admin enforcement. The protection does not require a review; this is a
single-owner repository. Force pushes and branch deletion are disabled.

- [PR #20](https://github.com/QuinnPaterson96/ShovelReady/pull/20) triggered
  [CI run 36041803349](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36041803349)
  at commit `7011764`: completed with **success**. The `backend`, `frontend`, and
  `container-startup` jobs each concluded **success**. GitHub also reported its
  GitGuardian check as passing; this PR does not configure that external check.
- `gh api repos/QuinnPaterson96/ShovelReady/branches/main/protection` confirmed
  required contexts `backend`, `frontend`, `container-startup`, `strict: true`,
  `enforce_admins: true`.
- PR #20 and the subsequent contracts/input PRs #21/#19 are merged.
  [Combined main CI run 36044657657](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36044657657)
  completed successfully. The integrated suite contains 37 foundation/contract tests plus
  two standalone acquisition tests. The earlier 23-test record above describes foundation alone.
  Contract lint/test discovery and direct locked Pydantic were added during integration.
