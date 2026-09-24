# Prototype input evidence

Acquired September 18, 2026; refreshed September 24, 2026 (UTC timestamps in the manifest). This is a raw acquisition and provisional review packet, **not an accepted dataset release, legal opinion, or completed real-site fit corpus**.

- [Pilot decision](pilot-decision.md): chosen workflow, alternatives, scope and completion blockers.
- [Source manifest](source-manifest.json): exact requests, capture times, SHA-256, byte counts, retained paths, version evidence, CRS/units and reuse disposition.
- [Rights and acquisition evidence](acquisition-evidence.md): dataset-specific licence chain, actual field inventory and data limitations.
- [Design questions](manufacturer-inputs.md): observed Landing marketing facts and precise missing inputs; no outreach sent.
- [Site fixture specifications](site-fixtures.md): three real parcel leads, raw responses and missing supplied/manual facts.
- [Clause review queue](clause-review-queue.md): provisional evidence locators and regression categories, awaiting independent review and authorized source-text retention.

## Reproduce acquisition

From the repository root, using Python 3.12 and its standard library:

```powershell
python docs/pilot-inputs/acquire.py docs/pilot-inputs/requests.json C:/Users/quinn/.codex/pilot-inputs-private/new-capture
python docs/pilot-inputs/test_acquire.py
```

Use an output directory outside the checkout. Raw captures with unresolved redistribution rights must stay there. The captured bundle on this machine is `C:/Users/quinn/.codex/pilot-inputs-private/capture-2026-09-24`; the earlier bundle is `C:/Users/quinn/.codex/pilot-inputs-private/capture`. These are local research copies, not durable shared storage or portable repository dependencies. Do not upload the withheld PDFs, manufacturer HTML, or their full extracted text with this PR.

The command performs public HTTP GETs only. It checks PDF signatures and JSON/service-error responses before retaining bytes under SHA-256 names. Identical content reuses an object; each successful observation appends a receipt. Changed content creates another object. Failed retrieval or validation leaves earlier objects/receipts intact, returns nonzero, and reports the source ID and error class. It does not import the app, touch a database, normalize rules, instantiate shared contracts, or publish data. This pilot-local helper adds no dependencies or shared tooling configuration. Crash-consistent concurrent writing and multi-user storage are not implemented.

`requests.json` and `source-manifest.json` are acquisition notebooks, not proposed SR-04 contracts. `object` paths in the manifest are relative to the private capture directory; `repository_path` is either a retained licensed snapshot relative to this directory or null. URLs can return newer bytes on re-capture: do not silently replace pinned objects. The polygon queries contain the captured parcel geometry in WKID 3157; regenerate them after a parcel revision and preserve the prior request.

## Verification performed

- All 26 September 24 requests succeeded. Fifteen licensed source records resolve to fourteen distinct retained JSON objects (two zoning responses have identical bytes).
- Retained object SHA-256 and lengths checked against the manifest; GIS responses parsed, contained real features, and did not report an exceeded transfer limit.
- Three parcel responses checked against the geometry embedded in their zoning/roofline requests. Actual fields and feature identifiers inspected; no calculated fit is claimed.
- September 18 and 24 bylaw PDFs, layer metadata and site-feature responses matched byte-for-byte. Catalogue and website HTML hashes changed; catalogue substantive descriptions/licences were rechecked. HTML/portal byte changes alone do not establish a regulatory or design revision.
- Bylaw PDF text inspected with pypdf; PDF pages 16, 17, 27, 28 and 30 visually inspected, including the garden-suite continuation, height diagram and GRD-1 table. This is agent source inspection, not professional review.
- Manufacturer plan/elevation PNGs were acquired privately and inspected; the elevation sheet contains a dimensioned plan dated April 18, 2024. It is not a controlled current design set. Manufacturer images remain outside Git.
- Two standalone offline test methods passed: identical/changed captures, malformed JSON, ArcGIS error payload, timeout preservation, and rejecting an HTML response to a PDF/PNG request. Legacy tests and database tests were not run.
- No live model extraction, typed ingestion, data publication or evaluator was run. No manufacturer, municipality, reviewer or customer was contacted.

Issue requirements were inspected on September 18 and again September 24: [SR-01](https://github.com/QuinnPaterson96/ShovelReady/issues/1), [SR-04](https://github.com/QuinnPaterson96/ShovelReady/issues/4), [SR-05](https://github.com/QuinnPaterson96/ShovelReady/issues/5), [SR-06](https://github.com/QuinnPaterson96/ShovelReady/issues/6). All remained open, with no comments and the September 18 requirements. No merged/agreed SR-04 interface was established in this work. GitHub issues remain the live status source; this packet records what this acquisition delivered.

Contains information licensed under the [Open Government Licence - City of Victoria](https://opendata.victoria.ca/pages/open-data-licence). No municipal or manufacturer endorsement is implied.

## Foundation integration

The acquisition tests run offline in the backend CI job using the locked Python environment. Retained snapshot hashes and byte lengths were rechecked against all 15 manifest records during integration review. This does not resolve the input/review gates above.
