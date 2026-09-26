# Wave-thirteen integration and next steps

Integration base: main `8463ea9`. Component heads reviewed: #123 `127297f`,
#126 `cffdbbf`, #127 `9d08af1`, #129 `3c729ec`, #130 `82a89c8`.
All five hosted checks passed on each component head before composition.

## Results

- SR-52/#120: bounded ST/STREET and AVE/AVENUE normalization preserves original
  address evidence and reports the comparison method. Collisions return every
  retained candidate; no fuzzy geocoder or automatic parcel selection was added.
- SR-53/#121: explicit offline JSON intake stages candidates in new directories,
  rejects malformed/detached/inconsistent inputs and emits actionable gaps.
  Neither active catalogue nor accepted publication is changed.
- SR-54/#122: agent-only rehearsal preserved exact outputs and screenshots. It
  found reconfirmation friction after editing a site note and lengthy copied
  records. These are usability findings, not human validation or legal failures.
  The address spelling observation is addressed by SR-52; copied-record noise is
  now assigned to SR-57/#131. Preserve the original baseline findings as history.
- SR-55/#124: Model 300 and Jay technical packets have catalogue-shaped unreviewed
  candidates. Drawings remain uncontrolled; Jay area/configuration conflicts stay
  explicit. No roof datum or regulatory area is invented.
- SR-56/#125: both suppliers have plausible manufacturer-advertised regional
  routes, but no confirmed complete Victoria installation allocation. Precise
  unsent enquiries replace another broad research pass.

## Combined verification

On the composed branch, `python -m uv run --locked pytest -q
 tests/test_model_research_intake.py tests/test_model_catalogue.py
 tests/test_site_preparations.py` passed 42 tests. Focused Ruff passed.
`python -m uv run --locked python scripts/test_postgres.py --postgres-bin
 "C:/Program Files/PostgreSQL/17/bin"` passed 467 tests and 28 subtests in an
owned disposable PostgreSQL instance, then stopped it. One native lifecycle opt-in
was skipped locally; the hosted native lifecycle job remains required.

Actual cross-component replay: called `research_intake.stage` on both files in
`docs/research/prefab-technical/candidate-*.json`, each into a new temporary
staging directory. Jay returned `valid_unreviewed` with 17 gaps; Model 300 returned
`valid_unreviewed` with 12. SHA-256 of both active catalogue copies was unchanged
before/after. Temporary outputs were removed by TemporaryDirectory; source
candidates remain committed for replay. Counts are software diagnostics, not
readiness scores. Sources were reviewed as attributed worker observations; this
integration does not independently certify their legal meaning or private bytes.

No frontend source changed in this batch. Component browser evidence covers the
prior pinned application; it is not claimed as a browser run of this integration.
Final composed CI is required before merge. Exact final-head evidence is in the
integration PR. Source acceptance and user validation remain separate.

## Next round, in priority order

1. Finish SR-57/#131, already dispatched: readable primary provenance and short
   human-facing enquiries, complete technical export, desktop/mobile review.
   Give that worker W13-3 from the rehearsal; do not duplicate its UI ownership.
2. Address W13-1 with a small explicit pending-reconfirmation notice and recovery
   action when note edits invalidate a selection. Preserve invalidation; do not
   silently restore reviewed status. Plan this after #131 to avoid shared frontend
   edits. Compare the same note-edit case before and after.
3. Review candidate evidence retention and field definitions before any catalogue
   expansion. Private-capture hashes without a retrievable artifact location do
   not make source review reproducible. Locate the original private artifacts or
   record a capture gap, rather than treating hashes as retained evidence. Decide
   separately whether Jay adds useful preparation variety despite unknown height
   and area; no candidate may become an accepted fit through selector inclusion.
4. Seek controlled model and site inputs through the prepared unsent requests when
   outreach is authorized. Narrow public research has reached its stopping point.
   Select one supplied placement and the smallest supported reviewed check subset.
5. Run the existing human walkthrough kit with actual participants (#16), measuring
   comprehension, successful next action and net time saved. Another agent run
   can verify software changes but cannot establish demand or human usability.

No new infrastructure, universal schema, automatic catalogue publication or broad
manufacturer survey is justified by this batch. Next-round tasks are proposed,
not dispatched here; #131 remains the active implementation assignment.

## Explicit remaining gaps

| Gap | Practical impact | Next action / owner |
|---|---|---|
| Technical identifiers dominate copies; #131 pending | Hard to use provider enquiry | Existing SR-57 worker; verify against W13-3 |
| Note edit invalidates confirmation and can omit site from summary | User may miss recovery step | Follow-up UI task after #131, W13-1 |
| Five retained address rows only | Arbitrary homeowner address search unsupported | Expand only with licensed evidence and collision tests; site-preparation scope |
| Model revision, roof datum/projections, Jay area basis unresolved | No defensible real height/placement assessment | #124, manufacturer controlled drawings/configuration |
| Private source bytes not portable in the research packet | Hashes alone cannot reproduce source review | #124, artifact custodian locates private captures or records capture gap |
| Local install/route, cost inclusion and responsibility not confirmed | No assured turnkey referral | #125, written supplier scope; unsent drafts ready |
| Survey, principal building, placement and current accepted rules missing | No accepted real-site evaluation | #104 and SR-05/06/10/11/13 |
| Saanich geometry / Langford rights unresolved | Regional expansion blocked | #112 / #103 |
| No human pilot or referral economics measured | Business value remains a hypothesis | #16 / #18 |
