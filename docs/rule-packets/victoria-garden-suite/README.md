# SR-39 Victoria garden-suite candidate packet

Issue: [#87](https://github.com/QuinnPaterson96/ShovelReady/issues/87). Packet schema `sr-39.packet.v1`; source and rule content reuse the existing `sr-04.v1-provisional` types. This is a four-check **candidate ingestion packet**, with no accepted rule revision, evaluator binding, dataset publication, or real-site finding.

## Capture and current scope

The source is the City's [Zoning Bylaw 2018, No. 18-072](https://www.victoria.ca/media/file/zoning-bylaw-2018), downloaded again on September 25, 2026. The bytes matched the September 24 source manifest: 4,600,202 bytes, SHA-256 `6c9e35a8de4eeeb8d0c4e0dda05d8b3908c0d76a2353c9cb23001d3ebcb9da33`, 133 PDF pages. The local original is withheld under the [source rights audit](../../pilot-inputs/acquisition-evidence.md); `packet.json` retains the private capture locator, source URL, hash, capture timestamp, short evidence snippets, and page/clause locators. No model extraction was run. The mapping is attributed agent manual extraction from this pinned City PDF.

The PDF's amendment list reaches No. 26-060 (July 30, 2026), including No. 25-038 moving many residential lots into the 2018 bylaw, while its publishing note still says consolidated through No. 22-048. The City's [2018 zoning page](https://www.victoria.ca/building-business/permits-development-construction/zoning/zoning-regulation-bylaw-2018) says it was amended in September 2025. Part 1.1(2)-(6) requires the geographic map, zone and any site-specific provisions to be resolved for a particular lot. Part 4.1 lists Residential as a GRD-1 permitted use, and Part 2.2 includes Garden Suite within Residential and defines its relationship to a single-detached dwelling or duplex. These are source observations, not an independently reviewed applicability determination. The source's exact effective interval, amendment completeness, parcel zone, use facts and special provisions remain unresolved.

This packet scopes an **ordinary new garden suite in a confirmed GRD-1 lot within the Zoning Bylaw 2018 area**. It does not borrow historical Pilot Schedule M or plus-site conditions. It is not a complete list of applicable conditions. For example, Part 3.1(28)(a), (c), (e)-(g), Part 3.1(30), (35), Part 4.1 density/coverage/setback/site-specific rows, and Part 5 need separate review as applicable. A source PDF URL or a current GIS designation is not proof of a lot's full legal applicability.

## Four bounded mappings

| Proposed logical rule | City locator (one-based PDF page) | Candidate scalar | Required measurement / dependency |
|---|---|---|---|
| `victoria-zb2018-garden-suite-suite-count` | Part 3.1(28)(b), p27 | count ≤ 1 | Legal Lot and actual existing garden-suite count; Part 2.1 Lot |
| `victoria-zb2018-garden-suite-floor-area` | Part 3.1(28)(d), p27 | Floor Area ≤ 56 m² | Part 2.1 Floor Area and controlled drawing calculation; marketing interior or footprint area cannot stand in |
| `victoria-zb2018-garden-suite-building-separation` | Part 3.1(28)(h), p28 | separation ≥ 2.4 m | Principal Building identity and reviewed measurement faces; a roofline is insufficient |
| `victoria-zb2018-garden-suite-rear-yard-occupancy` | Part 3.1(28)(i), p28 | occupancy ≤ 0.25 | Numerator: suite occupied rear-yard area; denominator: legally defined rear-yard area, **not parcel area**; rear yard and projections require review |

The four original units, operators, measurement definitions, proposed logical/revision IDs, source snapshot ID, evidence locators and unresolved cross-references are in [packet.json](packet.json). Every `RuleContent` has `runtime_support=unresolved`, `applicability.status=unresolved` and `approval=unknown`. The excerpt snippets are intentionally short because the original bylaw is withheld. The full source clause and context must be consulted by an authorized independent reviewer.

## Validation and manual replay

There is no verified licensed structured legal-rule API. The City's licensed ArcGIS zoning layer provides designations, not the clauses, legal definitions or final applicability. The bounded fallback is manual clause mapping with a pinned official PDF, no arbitrary URL fetch, and no silent fallback when capture fails. `validate.py` makes no network request or database write:

```powershell
python -m uv run --locked python docs/rule-packets/victoria-garden-suite/validate.py
python -m uv run --locked python docs/rule-packets/victoria-garden-suite/validate.py --pdf C:/path/to/authorized/zoning-bylaw-2018.pdf
python -m uv run --locked pytest -q tests/test_sr39_packet.py
```

The first command returns `source_unavailable` and exit 2 after typed packet checks. With the matching PDF and `pdftotext` available, the second verifies SHA-256, cited one-based PDF page and exact normalized short snippet for all four candidates; success returns `source_span_verified` and exit 0. Wrong bytes return `capture_mismatch`; missing/corrupt/unreadable capture or tool returns `capture_failed`; a missing span returns `source_span_mismatch`; invalid schema, values, ratio denominator or premature support returns `invalid_packet`. Neither success state verifies legal meaning, complete coverage, current applicability or reviewer approval. An API error or absent source does not become an invented rule.

Example downstream review input, **illustrative only**: a controlled design may supply `garden_suite_floor_area=54.0 m2` with `measurement_definition="Part 2.1 Floor Area"`, drawing revision, method, source/user field origin and reviewer evidence. It could then be compared with the mapped 56 m² bound only after this rule, definition and pathway are accepted. A `54.0 m2` advertised interior area is a distinct unreviewed source value and must be preserved if a user supplies an override. For occupancy, `garden_suite_area=40 m2` and `parcel_area=400 m2` cannot make a 10% pass: the rear-yard area and legally applicable numerator remain unknown. The correct state is unresolved, not zero, unlimited permission or failure.

## Review and integration handoff

| Gate | State and next action |
|---|---|
| Extracted/cited | Four short spans matched the pinned official PDF on September 25, 2026; independently inspect complete clauses, definitions and context. |
| Technically validated | Existing `SourceSnapshot`, `RuleContent` and `Quantity` types parse; local source-span replay and offline tests pass. This verifies mapping structure and short spans only. |
| Independently source-reviewed | **Pending.** Assign qualified reviewer, resolve contradictory consolidation note and any later amendments, 2018 map/GRD-1 selection, site-specific provisions, use definition and measurement bases. Record attributed decision and disagreements. |
| Published | **No.** No `AcceptedRuleRevision`, active release or evaluation report exists. Publication needs separate controlled review and release gates. |

SR-41/#89 can consume `packet.json` as a read-only candidate evidence display: source URL/hash/capture date, proposed rule IDs, threshold with original and normalized unit, ratio basis, clause/page, cross-references, unresolved reasons and state. It must disable execution, positive fit, acceptance and publication for this packet. Integration may need a domain-local candidate packet reader and a distinct `source_span_verified` versus independent review state; no shared contract was changed here. The integrator owns central docs and final shell/status. This task changes no API, frontend, evaluator, persistence or publication behavior.

The next concrete review action is to obtain authorized durable access to the exact PDF and a reviewer decision on these four clauses plus Part 1.1, Part 2.1/2.2 and Part 4.1 applicability. Then gather a controlled design revision and surveyed site measurements. A reviewer may accept fewer than four checks; unresolved ones stay in the packet. No provider outreach was performed.
