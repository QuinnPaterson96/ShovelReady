# SR-43 Saanich garden-suite candidate transfer

Issue [#91](https://github.com/QuinnPaterson96/ShovelReady/issues/91). Baseline `6c14d9f` (main with Civic Atlas). Scope: **one new detached Garden Suite on a lot whose principal building is an existing single family dwelling**, using §5.35 and Schedule H. This is an unreviewed document extraction and contract experiment, not a permit conclusion, accepted rule revision, screening result or dataset release.

## Source capture and currency

On 2026-09-25 the [official bylaw index](https://www.saanich.ca/EN/main/local-government/bylaws.html) linked [Zoning Bylaw 8200](https://www.saanich.ca/assets/Local~Government/Documents/Planning/zone8200.pdf). We downloaded its 32,746,793-byte PDF temporarily, extracted layout text locally, and selected the short spans in `candidates.json` by manual reading. SHA-256 of those downloaded bytes is in the packet; **the PDF is not retained in this repository**, so this is a capture observation rather than a durable `SourceSnapshot.artifact`. The index has no explicit PDF publication date. The consolidated PDF has amendment marginalia including B. 10299 2026 at §5.35. The exact operative date of that amendment and the consolidation cutoff were not established, so `effective_from` is null. Re-fetch and reconcile amendments before source acceptance.

The [official garden-suite guidance](https://www.saanich.ca/EN/main/local-government/development-applications/garden-suites.html) independently repeats the 400 m², 12 m, single-family-building and sewer/urban-containment criteria, and warns of coverage, rights-of-way, servicing, permit and possible covenant constraints. The [SSMUH page](https://www.saanich.ca/EN/main/local-government/development-applications/ssmuh.html) says its amendment took effect June 30, 2024 and removed the former owner-occupancy rule; both a secondary suite and garden suite may be permitted. The [official amendment table](https://www.saanich.ca/assets/Local~Government/Documents/Planning/Zoning%20Bylaw%208200%20Amendments.pdf) lists B. 10185 as adopted December 8, 2025, updating the Garden Suite definition, §5 and Schedule H. The 2020 [proposed amendment](https://www.saanich.ca/assets/Community/Documents/Planning/Garden~Suite~-~August~2020~Council/garden-suite-20200813-attachment-a.pdf) and older [guide](https://www.saanich.ca/assets/Local~Government/Documents/Garden~Suites/gs-guideA.pdf) are historical and cannot replace the linked consolidation. The Data Catalogue's open-data licence applies to its listed datasets; it was not established as a redistribution licence for the bylaw PDF. Only short, attributed excerpts are committed.

No official machine-readable bylaw rule API or structured bylaw dataset was found in the reviewed bylaw/garden-suite pages. Manual extraction is therefore the explicit fallback. We did not fetch parcel data, collect owner details, or contact anyone.

## Packet and replay

`candidates.json` is the machine-readable versioned input. Each of five candidate checks records logical and proposed revision identity, locator, zero-based PDF page, printed page, source excerpt/context, manual field origins and unreviewed status. Four thresholds map to existing `RuleContent` / `ScalarBound` / `Quantity` models; roof-dependent height stays `UnresolvedSemantics`. **All five have unresolved applicability and runtime support.** Scalar shape validation does not make any check executable. The output preserves the source URL, capture date and field origins; it creates neither `RuleCandidate` (which requires an actual extraction trace) nor `AcceptedRuleRevision`.

Run from the repository root:

```powershell
python -m uv run --locked python -m tools.municipality_transfer.saanich_rules docs/municipality-transfer/saanich/rules/candidates.json > $env:TEMP/saanich-mapped.json
python -m uv run --locked pytest tests/test_saanich_rule_transfer.py -q
python -m uv run --locked ruff check tools/municipality_transfer/saanich_rules.py tests/test_saanich_rule_transfer.py
```

The mapped examples are: §5.35(b)(iii) lot area ≥400 m², §5.35(b)(iv) defined Lot Width ≥12 m, Schedule H §1(a) Gross Floor Area (R) ≤93 m², and Schedule H §2(a) landscaped Open Site Space Requirement (GS) / lot area ≥0.45. Schedule H §3(c) is unresolved: the 6.5 m ceiling changes to 5.5 m for flat/shallow roofs, while §3(a-b) switches setback branches at 4.2 m. No candidate checks a real lot or design. The area/width and ratio definitions are legal measurements, not generic GIS or manufacturer fields.

## Transfer findings and exact blockers

Compared with Victoria [#87](https://github.com/QuinnPaterson96/ShovelReady/issues/87) and the current Victoria `pilot-inputs` corpus, this Saanich pathway has a municipal Garden Suite use definition and a dedicated Schedule H; permission is gated by a zone's permitted-use list, sewer **or** urban-containment geography, existing principal use, parcel/strata relationship and suite count. Victoria's provisional GRD-1 pathway and Part 3.1(28) cannot be reused as Saanich conditions. Saanich's Open Site Space Requirement (GS) is a landscaped-area ratio with impervious-surface exclusions, not Victoria's distinct open-space measure. `Lot Width` is defined geometrically and cannot be replaced by a parcel bounding box. `Gross Floor Area (R)` includes/excludes specific components, so a prefab catalogue area is insufficient. The height/setback branch needs coherent roof/height alternatives; a single optimistic scalar would misstate it.

The existing `RuleContent` and `Quantity` contracts preserve exact scalar units and ratio bases, evidence, unresolved references and pathway ID. They do not compute bylaw-defined width, surface area or GFA, establish source effectiveness, or evaluate geographic `OR` and roof/setback branches. `RuleCandidate.trace` requires a model/prompt artifact and is unsuitable for pretending this manual extraction was a model run. An integration adapter would need a versioned **manual-capture** provenance boundary and explicit source snapshot retention rights. The evaluator must remain disabled for these candidates until independent review, reviewed measurements, exact dependencies and accepted release membership exist. These are proposals for integration ownership, with no shared contract or runtime changes here.

## Independent review checklist

1. Re-fetch the linked bylaw, compare bytes and all amendments after B. 10185, verify B. 10299 adoption/effective date and any later garden-suite change; record official evidence or keep date unknown.
2. Check every excerpt, page, cross-reference, defined measurement, operator and inclusivity against the PDF and amendment text. Adjudicate the `Lot Width`, Gross Floor Area (R), Open Site Space Requirement (GS), Height and Grade interpretations.
3. For a selected zone and lot, verify zone-schedule Garden Suite permission, principal-building use, sewer/urban-containment observations and release, one-suite limit, parcel/strata relation, overlays, rights-of-way, private covenants, servicing and permits. An unavailable observation stays unknown.
4. Review Schedule H §3 roof/height/setback branch as one coherent pathway; review all applicable §5/§7 and zone regulations, exceptions and approval conditions. Do not infer a pass from the four scalar candidates.
5. Record named reviewer, timestamp, source bytes/retention permission, disagreements and corrections; only then consider immutable accepted revisions and a separate release publication review.

## Measured local effort and evidence

One agent, roughly 20 minutes wall-clock (estimated, not instrumented): one 32.7 MB PDF download, five manually selected checks, one mapping command and three focused tests on September 25 Vancouver time. This is agent effort, not independent human source-review or correction time. Source checks were read-only; no model call, database, API publication, fit test or design selection occurred. Focused offline replay validated five candidates, including one unresolved case. Tests exercise quantity basis and promotion/identity rejection; they cannot prove legal interpretation. Revisit this transfer after #87's reviewed Victoria packet and #88's model catalogue are available; no model catalogue is duplicated here.
