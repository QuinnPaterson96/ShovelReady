# Synthetic investigation preview · SR-19

Local React presentation preparation for [issue #22](https://github.com/QuinnPaterson96/ShovelReady/issues/22).
There is no evaluator, result API, accepted zoning data or verified property/manufacturer
fit. The examples are hand-authored assertions; contract validation is not legal review.

## Run locally

From the repository root (Python 3.12, uv 0.12.17, Node 22.14):

```powershell
uv sync --locked
uv run --locked python docs/usability/check_fixtures.py
uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000
# In another terminal:
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`). The preview also
works without the API; the retained foundation health panel reports its availability.
The health panel only checks liveness. No database credentials are needed.

Choose examples A–F, inspect their evidence, and expand the corrected result under F.
The native selector supports arrow keys; Tab reaches disclosure controls and Enter
opens/closes them. The preview does not save navigation state across reloads.

## Files and boundaries

- [Task script](tasks.md): participant-facing goals for two hypothesized roles.
- [Separate rubric](rubric.md): facilitator expectations; not an evaluator test oracle.
- [Walkthrough and findings](walkthrough.md): actual UI evidence and limitations.
- [Synthetic source](synthetic-source.txt): exact retained fiction, including an inert HTML
  probe. Capture date and unknown legal-effective dates remain distinct. LF is pinned
  for this file so its byte hash is stable across Windows/Linux checkouts.
- `frontend/src/preview/fixtures.json`: six saved scenarios plus one corrected result,
  version `synthetic-preview-v1`. Each result, source and rule revision is validated
  against existing Python models. Repeated rule identities retain identical content;
  scenarios with different released rule sets use distinct release IDs.
- `frontend/src/preview/adapter.ts`: tiny local saved-data boundary. TypeScript infers
  the checked-in JSON shape; it does not define another zoning ontology or validate
  arbitrary API input. SR-12 must introduce an explicit validated API adapter.

The packet intentionally contains result references rather than full design/site/
placement inputs or extraction candidates. It is **not** a complete `BoundaryBundle`,
ingestion corpus or persistence import. The checker validates saved root payloads,
rule/source links, excerpt presence and artifact bytes, plus negative uncertainty and
cross-release checks. It does not compute numeric outcomes or validate input geometry.
The rule `accepted` review fields describe fictional structural review only.

No contract extension was needed for the six scenarios. Source correction and original
provision are both retained in the one fictional source; the correction is represented
as a new rule revision and release, without changing the old result.

## Verification and handoff

```powershell
uv run --locked python docs/usability/check_fixtures.py
uv run --locked ruff check docs/usability/check_fixtures.py
uv run --locked python -m unittest discover -s contract_tests -p test_contracts.py -q
cd frontend
npm run typecheck
npm run build
```

The checks are database-free and use existing dependencies. Shared Python tooling,
CI and contracts are unchanged. The preview checker is an explicit local command,
not automatically included in current CI.

SR-12 can reuse the result presentation after adding a validated API adapter, real
source access, and handling all contract-permitted optional fields/states. The fixture
shape is narrower than the complete contract (for example, these checks all have a rule
reference). Do not point this adapter at arbitrary network JSON or call it API-ready.
SR-10 must independently compute results from reviewed inputs; these assertions are
not a legal or evaluator oracle. SR-16 needs actual or likely users, real enquiries
and observed understanding/workflow value. This rehearsal completes neither ticket.
