# Sourced model price and timing — #254

Implemented October 6, 2026 from origin/main `18a7302b07189bea319598c3a6d604f28574d43b`.
This is an unreviewed commercial snapshot for preliminary enquiry preparation,
not an estimator, a quotation, a property schedule or accepted regulatory data.

## Contract and release decision

Extend the existing `sr-40.catalogue.v1` contract additively: optional multiple
`prices` / `timings`, defaulting to empty tuples. Older snapshots remain readable;
no database or migration is involved. Each claim retains model/provider scope,
configuration, region, original wording, qualifications and a validated source ID.
Source records carry URL, locator, capture date, revision and optional update date.
No unknown revision is replaced by a capture hash.

Price amounts use finite nonnegative Decimal strings with a minimum and optional
maximum. A null maximum means a single stated amount; `starting` describes a
starting price, not a bounded quote. Basis is starting/fixed/estimated. Currency is
explicit (CAD, USD, EUR, GBP, AUD, NZD currently supported) or null/unknown; other
codes are rejected until deliberately supported. Inclusions, exclusions and tax
treatment remain independent. Missing amount is unknown; zero requires an explicit
source-backed entry. The UI groups decimal strings without float conversion.

Timing separates production lead time, delivery transit, on-site installation and
contract-to-delivery. The last avoids relabelling the FAQ's combined interval as
factory production. Duration/range has hours/days/weeks/months, estimate/claim basis,
clock start and prerequisites. Duration and unit must occur together. Null duration
is unknown, not immediate. No unit conversion, date arithmetic or cross-entry
aggregation is performed. Configuration alternatives are never combined.

`build_snapshot` still validates and exports both bundled copies. Snapshot identity
changes to `sr-40.2026-10-06.provider-pages.v2`. September dimension sources retain
their original capture dates; October commercial sources are separate records.
The evidence-checklist fixture updates its catalogue identity only. Research intake
continues to stage candidates and refuse writes to the active snapshot.

## Manufacturer findings

Read live primary pages October 6, 2026; these are manually transcribed, unreviewed
claims. No manufacturer contact or enquiry was sent.

- [Model 300](https://www.auxbox.ca/model-300): CAD 187,000 starting price. Inspected
  Layout & Specs accordions (Materials, Dimensions, Upgrades, Site Prep, Delivery +
  Installation). The page describes a bathroom and kitchen; upgrades are separate.
  Permitting, foundation, site services, shipping and installation cost extra.
  North America delivery is a service claim, not a regional price schedule.
- [FAQs](https://www.auxbox.ca/faqs), “How long does it take?”: rough 12–18 weeks
  from purchase contract to delivery; depends on model, production schedule and
  permits, and can be shorter/longer. Preserved as a provider-wide estimate.
  The footer's singular `/faq` link currently returns 404; the plural page works.
- [How it works](https://www.auxbox.ca/how-it-works), steps 1–6: provider-wide
  one-day delivery/crane placement claim, following site qualification, design,
  permits where needed, and foundation/services preparation. Its separate
  one-day foundation claim is not added to installation or interpreted as a whole
  project timeline. Installation clock-start event is not specified.
- Followed the linked [2021 installation planner](https://www.auxbox.ca/s/DIY_Installation_Planner.pdf)
  and [planning-services page](https://www.auxbox.ca/deposit). Planner cover limits
  scope to auxffice/106/146; its detailed dimensions/conditions were not transferred
  to Model 300. Process planning-retainer prices are outside this model-price slice.

Source update/revision dates, tax treatment, fixed configuration and regional price
applicability are not supplied in this reviewed scope. Production-only duration and
transit duration are not separately quantified. New source records explicitly carry
`capture_gap` / null digest: page observations and excerpts are retained here, but
archival page bytes and independent source review are still absent.

## Verification

From this worktree, using the existing Python 3.12 environment at
`C:/Users/quinn/.codex/worktrees/builder-demo-qa/ShovelReady/.venv/Scripts/python.exe`:

- `-m pytest -q tests/test_model_catalogue.py tests/test_model_research_intake.py`:
  33 passed. Protects old-record loading, populated source scope/dates, round trips,
  null values, source references, finite/nonnegative/ordered ranges, currency and
  duration-unit boundaries. Expected real claims come from the pages above;
  invalid-range expectations come from ordering and unit/currency definitions.
- `-m ruff check app/model_catalogue tests/test_model_catalogue.py`: passed.
- `-m app.model_catalogue.build_snapshot --check`: passed; both copies match.
- `npm test --prefix frontend`: 120 passed. Extended existing builder integration
  coverage through real catalogue, display, enquiry preview/plain text/Markdown and
  email with/without site details; old records display unknown, not free/instant.
- `npm run build --prefix frontend`: TypeScript/Vite passed; existing >500 kB
  chunk advisory remains. `git diff --check`: passed.

Built app served via `-m uvicorn app.main:app --host 127.0.0.1 --port 8254`, without
a database or model service. Browser inspected default desktop (1265 × 712) and
390 × 844. Price, exclusions, tax uncertainty, scope, capture date and cost/timeline
distinctions remain visible. Native disclosure opened with Enter and closed with
Space; focus ring visible. Expanded mobile details: document scroll/client widths
both 375 px excluding scrollbar. Saved-example journey produced the populated
unsent enquiry; preview and read-only copy field contain price, dependencies and
FAQ source. Viewport override reset. No email application opened, message sent,
database tests, source publication, deployment, or human usability study.

Screenshots: [desktop](verification/254/desktop.jpg),
[mobile summary](verification/254/mobile-summary.jpg),
[mobile details](verification/254/mobile-details.jpg).

## Integration ownership and remaining gaps

Owned: `app/model_catalogue/*`, `frontend/src/model_catalogue/*`, focused enquiry
content, catalogue tests/docs. Shared files: `BuilderDemo.tsx` (import, one card,
one enquiry section only), `builder-demo.test.tsx`, `enquiry.tsx`, `main.tsx` (one CSS
import). The evidence-checklist example changes only catalogue identity.
Recommended integration: merge #253 placement/results first, then apply this
focused addition; resolve host conflicts by retaining both sets of wiring and
rerun frontend tests/build and snapshot drift check. No placement or results
component changes are required by #254.

Missing manufacturer data (owner: project owner/provider follow-up): obtain current
configuration quote, tax and region applicability, standalone production/transit
durations, installation clock start and property-specific prerequisites. Their
absence prevents total cost or completion forecasts, but does not block this demo.
Obtain controlled revision and archival capture before treating claims as reviewed.

Implementation limitations (owner: integrator): full commercial evidence can exceed
the existing 1800-character email-URL guard; the existing full-text copy/Markdown
and paste-into-draft route remains available, without truncation. No new email
delivery, estimator or freshness service is implemented. Later catalogue refreshes
must use explicit ingestion/export and source review. Independent source/legal
review, controlled site/design inputs and accepted publication remain blockers to
accepted real evaluation; this feature does not close those gates. Human review of
comprehension and usefulness remains pending with the project owner.
