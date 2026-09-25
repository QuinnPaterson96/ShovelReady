# Computed synthetic draft inspector (SR-33)

Implemented against base `4c23ab5d0297a699a1062fac28aff1c3384c9fe2` (merged planning
PR #67). The PR head identifies the delivered implementation. This task owns only
the frontend inspector, App integration/styles, fixture/schema tooling and this
handoff. Backend, shared contracts, migrations and virtual-QA artifacts are unchanged.

## Behavior and boundary

Choose **Computed draft evaluations · synthetic examples** in the existing app's
mode selector. Observation, public-case and authored fictional preview modes remain
available. The new mode fetches the unwrapped `EvaluationReport` from
`GET /api/draft-evaluations/{case_id}` for exactly these aliases:

- `synthetic-direct-pass`
- `synthetic-missing-fact`
- `synthetic-placement-failure`

Only `sr-10.v1`, `bounded-scalar.v1`, `draft_only` and supplied-placement scope are
accepted. AJV validates the Pydantic **serialization** schema, retaining Decimal
strings. Additional checks reject inconsistent alternative/check/trace membership,
duplicate identities, stale input bindings, absent evidence sources, unsupported
conclusive claims and scope/approval contradictions. They do not calculate scalar
outcomes or normalize quantities in JavaScript. Server-side validation and the Python
evaluator remain authoritative; this is not a second legal or numeric evaluator.

Case selection remounts the report panel so previous evidence cannot appear under
a new selection. Cleanup aborts requests and suppresses late success and error
responses even if the transport ignores abort. Reload clears the report first.
Requests time out after 15 seconds. HTTP 503/404/502, other HTTP failures, network
failures, malformed JSON and incompatible reports show errors with no fallback.
Server error bodies and arbitrary network exception text are not displayed.

Outcomes, coverage and exclusions are visible above individually inspectable
alternatives/checks. Approval is supplied synthetic input, separate from arithmetic.
Every diagnostic survives, including secondary missing-fact reasons when another
status takes precedence. Details preserve exact revisions, measurements, original
and normalized quantities/bases, reviews, source hashes/dates and the full report.
All evidence and source locations are inert text. The inspector serves no source
documents and makes no local/private/repository URI into a download link.

## Reproducible fixtures and checks

From the repository root:

```powershell
python -m uv run --locked python frontend/tools/export_draft_evaluations.py
python -m uv run --locked python frontend/tools/export_draft_evaluations.py --check
python -m uv run --locked ruff check frontend/tools/export_draft_evaluations.py
npm ci --prefix frontend
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

Exporter v1 is `frontend/tools/export_draft_evaluations.py` at this PR head. It uses
`EvaluationReport.model_json_schema(mode="serialization")` for schema and TypeScript
types, and `app.evaluation.evaluate` for all ten saved reports. Labelled invented
requests derive from `tests/evaluation_fixtures.py`; only inputs are varied, never
successful conclusions. Fixtures include the three aliases, absent rules/bindings,
an unresolved alternative alongside a candidate, outside coverage, unknown approval,
ratio quantities and hostile evidence text. They are UI test inputs only and are
not imported by the runtime bundle or substituted when the API fails. The check
command detects schema, type and fixture drift; regeneration requires review.
The repository source hash uses its canonical LF text, avoiding Windows checkout
line-ending differences; it does not claim a separately retained municipal document.

Verified locally: 16 frontend tests (all 7 existing tests preserved, 9 new tests),
typecheck, production build, exporter drift check and exporter Ruff check. Tests use
React static rendering and controlled fetch promises, including stale success/error
suppression, failure/retry, safe errors and the exact request paths. This is
**fixture-backed software verification**, not a mounted browser or live API claim.
No database, live-model, source-review, publication or real-user checks ran.

## Combined demo after SR-32 integration

1. Integrate SR-32 and this frontend. Follow SR-32's handoff to create/migrate an
   explicitly owned disposable database and compute/import its pinned synthetic
   cases. Do not use a shared demo database or legacy Styx credentials.
2. In that explicitly configured backend shell set
   `$env:SHOVELREADY_DRAFT_EVALUATIONS_ENABLED='true'`, then run
   `python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000`.
   The database/seed commands belong to SR-32; this task does not invent them.
3. In a second shell run `npm ci --prefix frontend`, then
   `npm run dev --prefix frontend`. Open the Vite URL (normally
   `http://127.0.0.1:5173`) and select the computed draft mode. `/api` proxies to 8000.
   Alternatively build the frontend and use the FastAPI-served app at port 8000.
4. Inspect all three cases: scoped passing arithmetic; missing-fact investigation;
   supplied-placement failure without universal incompatibility. Expand each check,
   revisions, quantities, review and source metadata. Compare them with the HTTP
   report, including exact backend-generated identities; alias strings need not be
   the stored evaluation IDs.
5. Switch cases rapidly, reload, leave/re-enter this mode and confirm no old evidence
   is relabelled. Exercise disabled/unavailable 503, absent-case 404 and invalid-store
   502 using SR-32's isolated setup, plus a stopped API/network failure. Check loading,
   retry, keyboard use and narrow-window layout. Recheck existing modes.

The combined disposable-PostgreSQL → HTTP → browser walkthrough remains pending
SR-32 integration. This bridge supplies no accepted real-site screening, independent
human/source review, published release, permit approval or real-user validation.
Do not close parent SR-12/SR-13 or infer publication from a code merge.
