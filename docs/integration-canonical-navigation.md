# Canonical assessment navigation

Implemented October 8, 2026; base origin/main 7ffa2c4. PR head is the code revision
for local checks unless the PR records a later integration revision.

## Decision and implemented behavior

Primary navigation is Home / Start assessment. Try the demo is a homepage CTA.
The former Prefab models page was already the assessment model selector with
expandable photos, specifications and price/source details, so retaining it as a
second destination would duplicate the journey. Model selection stays early in
that existing host. No assessment engine, provider semantics or intended-use path
was copied. Manual property facts/sketches and editable placement dimensions remain
available; the older custom-design preparation/evidence workflow remains under
Research > Input preparation tools, alongside existing research viewers.

Start assessment opens without saved example inputs on first entry and resumes
in-progress work on later entry. Try the demo explicitly selects aux box Model 300
and the existing saved Victoria Parcel 87/roofline example. The header identifies
Example assessment; property and exported provenance remain labelled. Users can
change model or property. Once a journey is open, loading the demo asks before
replacing model/property/placement/review state, including an unconfirmed address.
Cancellation preserves work. General project preferences remain editable, consistent
with the prior example preset; model/provider-specific and property-dependent values
use the existing switch/reset paths. A model switch retains property and compatible
facts while invalidating old measurements, overrides and provider drafts.

## Compatible entry links

- `#assessment`: canonical empty/resume entry.
- `#assessment?model=hewing-quadra4` (or another supported catalogue ID): a cold link
  preselects that model without example geometry. Unknown IDs use the normal default.
  This is a small validated payload for future builder links, not a tenant platform.
- `#builder` and existing builder/placement step anchors: same canonical host.
- `#examples/model-300`: cold link initializes the labelled saved example.
- `#examples`: Home with Try the demo, replacing the redundant example-choice page.
- `#inputs`: preserved research preparation tools, outside primary navigation.

Initialization is idempotent under React effect replay. Hash/history navigation into
an already opened host resumes its state rather than replaying an old preset. A cold
reload still initializes a linked preset and otherwise loses in-memory inputs;
durable saved assessments are not implemented. Ordinary navigation and browser
Back/Forward retain the mounted state within the open app.

## Verification

- Existing frontend suite, typecheck and production build; final outcomes and CI
  recorded in the PR. No backend/evaluator interface or hosting configuration changed.
- Extended existing mounted App navigation test: cold legacy demo, explicit unknown
  intended use, selected model preserved by Home/Start and Back/Forward, guarded demo
  replacement and cancellation, manual property fallback, example geometry/enquiry
  removal, fresh entry, cold model link, old builder and input preparation links.
  StrictMode exercises initialization replay; HTTP failures remain explicit at the
  external boundary. This does not validate live source accuracy.
- Built frontend served by the real local FastAPI app on port 8019 with no database:
  homepage demo, changed-model navigation/history, replacement cancellation, example
  to empty real-property address entry, cold model-prefilled entry and legacy demo.
  No external enquiry or provider form submitted.
- At 390 x 844: homepage and replacement dialog fit (document 375 px, viewport 390 px),
  no horizontal overflow. Dialog autofocus chooses Keep current assessment; Tab reaches
  Load example assessment; Enter cancels and Escape closes, returning focus to model.
  Navigation focuses the content region and changing property focuses address search.
- Recipient-perspective inspection: saved example changed to C.H. Studio Pod; intended
  use/relationship Unknown and next response Please advise the next step. The retained
  enquiry identifies West Coast Container Homes, pod dwelling-suitability uncertainty
  and saved-example status without stale aux box/Model 300 details. Existing model-switch
  integration verifies selected provider, catalogue, drawings and package exports.
  This is developer inspection, not an actual manufacturer comprehension test.

Local reproduction: `python -m uv sync --locked`, `npm ci --prefix frontend`,
`npm test --prefix frontend`, `npm run build --prefix frontend`, then
`python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8019`.
Open the root URL; the built frontend and stateless APIs use the same server.

## Remaining gaps and next actions

- Demo usability: state is in-memory and lost on reload. Owner/product follow-up:
  decide whether explicit saved assessments are needed before customer reliance.
- Source/evaluation gates: geometry, manufacturer facts and candidate planning rules
  remain unreviewed; no accepted real evaluation/release is established. Owner/source
  reviewers must supply controlled inputs and accept the bounded rules/data separately.
- Human usability/manufacturer comprehension has not been tested. Owner to arrange
  a homeowner/provider walkthrough; developer checks only establish observed software.
- Deployment/version and public entry smoke evidence are recorded in the PR after
  CI-gated merge; this document alone does not establish successful remote deployment.
