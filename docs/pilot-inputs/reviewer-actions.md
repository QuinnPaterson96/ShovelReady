# Intake and reviewer handoff

September 24, 2026. This packet adds file-based intake to the PR #19 captures. It is
preparation for SR-01/05/06, not completion of those issues. No outreach, professional
review, live extraction, publication or site evaluation occurred.

## Owner actions, in dependency order

| Owner (unassigned unless stated) | Exact action and return artifact | Gate affected |
|---|---|---|
| Project owner | Name an independent technical reviewer, with review scope and availability. No agent annotation counts as their approval. | SR-01 reviewer; SR-06 oracle |
| Project owner / source-rights owner | Resolve City bylaw and manufacturer retention/snippet/redistribution rights using the unsent questions in acquisition-evidence.md and manufacturer-inputs.md question 8. Record grant, grantor, allowed audience/uses and attribution; arrange authorized durable storage for the pinned hashes. Local possession alone does not satisfy this. | SR-05 reproducible full bundle; SR-07 source access |
| Project owner / manufacturer input supplier | Return answers and controlled artifacts for existing manufacturer-inputs.md questions 1–7: fixed revision/options, drawing index, wall/roof/projection dimensions, tolerances, datum/foundation, area reconciliation and use/certification evidence. Retain original bytes and revision identity. If unsuitable, consider another documented small model before reversing Victoria. | SR-01 fixed design; SR-05 measurements |
| Site fact supplier / survey professional | For each VIC-059/080/086, return the eight fact sets in site-fixtures.md, including original evidence, measurement date, author, CRS/units/datum and revision. Supply placement anchor/rotation/polygons against the fixed design; do not derive legal yards from raw GIS. | SR-05 complete site inputs; SR-06 cases |
| Independent technical reviewer | Confirm current governing instrument, map coverage, complete amendment chain, site-specific provisions and transitions separately for each site. Reconcile contradictory consolidation front matter and blank adoption fields on 25-038. Preserve Schedule M as historical comparison only. | SR-01/05 current applicability |
| Independent technical reviewer | For every corpus clause, verify the locator against authorized pinned bytes; supply exact excerpt plus surrounding definitions, tables/footnotes and references; record interpretation, rationale, named reviewer/date, disagreement and resolution. Author provisional versus accepted revisions separately. | SR-06 reviewed source corpus; SR-07 benchmark |
| Independent technical reviewer | Independently justify expected checks at each supplied placement, naming rules, measurement bases and supported/omitted scope. Preserve missing facts and failed original placements. A candidate/exclusion is recorded only if evidence supports it; there is no requirement to manufacture a positive case. | SR-06 reference outcomes; SR-10 evaluator oracle |

VIC-059 specifically needs both rooflines identified and mixed feature-year labels
resolved. VIC-080 needs PGA, principal use/count and frontage confirmed. VIC-086 needs
independent facts despite sharing zoning response bytes with VIC-080. These actions and
common missing facts are also machine-readable in corpus.json. Reviewer identity/date
remain null, disagreement status is `not_solicited`, and expected fit/placement are null.

## Split and evidence handling for SR-07

The 25 entries transcribe the existing provisional queue; they are not new legal
interpretations. Groups A/U/R/F/S/D/X are development; H (items 13–15, Average Grade,
Height and the garden-suite height limit) is reserved for held-out work. Dependency
groups are provisional review-routing links, not a claim of dependency completeness.
Shared development definitions stay on the development side. The validator rejects
declared cross-split dependencies and splitting a group.

This is a reservation, **not a leak-proof extraction dataset**. The same PDF and even
the same page contain clauses in both splits. SR-07 must assemble authorized clause
context windows: never send the whole PDF, page 27, this combined corpus, the queue,
or intake-packet.json to a development prompt. Exclude H text, diagram, annotations
and height/grade examples from tuning. The holdout can test isolated height/grade
interpretation, not an independent end-to-end site decision with shared applicability.
If review finds an H dependency on development content, regroup before any tuning,
record the change, and reassess what independence can actually be claimed. There is
no benchmark score, reference acceptance, reviewer time or source-support claim yet.

Each annotation pins the actual `zoning-2018` hash and uses one-based PDF locators from
the prior inspection. `exact_excerpt=null` deliberately prevents constructing shared
`Evidence`: that contract requires actual excerpt and context. Rights resolution and
review must precede that conversion. The approximate 20–30-clause target is met only
as a queue (25), not as accepted reference examples. Regression categories remain in
clause-review-queue.md; synthetic failure mutations in test_intake.py are technical
tests and are never real-site legal outcomes.

## SR-09 handoff and contract gaps

The portable subset has nine actual Esri feature responses plus three layer metadata
and three licence-linked catalogue records. Intake verifies bytes, lengths, WKID 3157,
polygon-response presence, ring closure and XY/XYZ arity. These are structural checks,
not topology, accuracy, full zoning coverage or site suitability checks. SR-09 should
read the exact artifact bytes through the returned references, retaining all original
attributes, nulls, rings and Z values. All nine feature responses link to their layer
metadata and catalogue. Preserve City licence attribution from acquisition-evidence.md.
Vertical units/datum remain unknown; rooflines are not walls or principal buildings.

Concrete gaps with the current shared contracts (unchanged in this task):

- `SourceSnapshot` requires an artifact but has no availability state. A blocked source
  stays in the intake envelope with `snapshot=null`; no missing object is importable.
  `repo:docs/pilot-inputs/...` resolves from the repository root. `private-capture:objects/...`
  resolves only against an explicitly supplied private root. Neither URI is a public URL.
  Snapshot IDs combine source ID and content hash; equal bytes for site-80-zones and
  site-86-zones retain separate request/source identities. These are capture identities,
  not rule, design or dataset revisions.
- `Geometry` supports one XY ring and site roles only. Roofline responses contain XYZ
  and Esri rings; coercion would lose Z/multiple-ring meaning and invent a building role.
  Intake supplies typed raw artifact/feature references instead. SR-09 owns conversion,
  topology checks and any justified shared-contract proposal.
- `DesignRevision` requires a fixed configuration. The Landing's controlled revision
  and options are unknown, so no design revision is emitted. The 574 sq ft headline also
  has no distinct marketing-area field; do not map it to occupancy or regulatory area.
  Observations and exact conversions remain in manufacturer-inputs.md.
- Missing manual facts have no supplied evidence; fabricating `Provenance.evidence` to
  satisfy a `SiteRevision` would be misleading. The typed site leads retain missing-fact
  actions; no site or placement revision is invented. SR-08 can persist verified
  SourceSnapshot payloads now, and later reviewed input revisions when actually supplied.

Capture time maps to `captured_at`; legal effective dates and printed revision remain
null. Original version evidence stays intact under `capture.version_evidence`, including
contradictory front matter, drawing date and unknown controlled revision. Neither PDF
creation date, catalogue modified time nor capture time becomes legal effect or a
manufacturer revision. Intake status describes byte verification, never acceptance.

## Run and interpretation

From the repository root:

```powershell
python -m uv run --locked python docs/pilot-inputs/intake.py
python -m uv run --locked python docs/pilot-inputs/test_intake.py
python -m uv run --locked python docs/pilot-inputs/test_acquire.py
```

`--output <path>` writes a typed metadata packet (no raw private bytes). The checked-in
intake-packet.json is generated without private access. `--private-root <directory>`
opts into local verification of exact withheld objects; it never copies them and does
not change their rights. `--require-all` makes any blocked artifact fail the command.
Default exit zero means the licensed subset is usable, even with explicitly reported
private blockers; missing/corrupt licensed objects fail. A fresh clone requires no
machine-specific path, network, database, cloud or additional dependency. Do not replace
pinned objects with new URL responses; retain a separate capture and review the change.

The adapter is intentionally bounded to this acquisition notebook. Non-null unverified
effective dates, unknown fields/versions and unsupported rights dispositions fail rather
than being silently normalized. Extending the corpus to actual accepted reviews requires
a deliberate versioned boundary change; do not relax the provisional labels to make a
benchmark run. Shared Python tooling/CI remains SR-08-owned.

## Verification recorded September 24, 2026

- `ruff check docs/pilot-inputs/intake.py docs/pilot-inputs/test_intake.py` passed
  in the locked environment.
- Ten offline intake tests passed: real byte integrity and roundtrip, distinct source
  identities for shared objects, XY/XYZ preservation, missing private input diagnostics,
  corrupt/missing licensed artifacts, restricted private verification, path containment,
  declared split/dependency failures, rejected invented acceptance/fit, stale references,
  unknown versions, malformed/nonfinite geometry and CLI subset/strict exit behavior.
  Adversarial modifications are synthetic technical tests, not source interpretations.
- The two existing acquisition tests and 14 existing shared-contract tests passed.
- Default intake verified 15 source records backed by 14 licensed objects and produced
  nine spatial references, 25 provisional clauses and three blocked site leads. All 11
  private sources remained explicitly blocked in the portable output.
- Explicit local `--private-root ... --require-all` verification passed for all 26
  pinned source records, including all 11 withheld objects. No private bytes or local
  path were copied into the output or Git. This establishes local availability only;
  authorized durable/shared retention is still missing.
- No raw snapshot or acquisition-manifest bytes changed. No database, live model,
  evaluator, API/UI, source recapture or cloud test was performed. Integration review added the intake tests and lint checks to the existing backend CI job.
  A saved-packet regression also verifies that fresh portable intake matches intake-packet.json.
