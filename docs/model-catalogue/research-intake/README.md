# SR-53: offline prefab research intake

This stages **structured, explicitly supplied** candidate JSON for review. It does not fetch a report, extract prose, change either active catalogue copy, or publish a model. The current `Catalogue`, `Model`, `Measure`, `Source`, and `Quantity` contracts define the input. The output remains `unreviewed`, even when validation succeeds.

## Run and inspect

From the repository root:

```powershell
python -m uv run --locked python -m app.model_catalogue.research_intake --input C:/path/to/candidate-input.json --output-dir C:/path/to/new-staging-directory
```

The output directory must be new. Success writes `candidate.json` and `report.json` and exits 0. Invalid JSON or candidate data writes only `report.json` with field paths and exits 1. Setup errors, including an existing output directory, exit 2 without replacing files. The active backend and frontend catalogue paths are excluded. Use a distinct `snapshot_id`; never reuse the active one. The candidate is the contract's canonical JSON serialization, not a source approval.

For an **existing-source roundtrip demonstration**, start with `app/model_catalogue/catalogue.json`, retain only its `click-landing` model, and change `snapshot_id` to a new staging ID. `tests/test_model_research_intake.py` runs that exact case and checks the candidate roundtrip and byte identity of both active snapshots. It adds no manufacturer fact. The synthetic rejection cases in that test deliberately alter a source ID, conversion, duplicate measurement/model, and missing height.

## Mapping template for forthcoming reports

Use a fresh input JSON in the exact `Catalogue` shape. Copy structural keys from the existing snapshot, then replace **all** model and source facts only with items supported by the supplied report. Do not carry a previous model's claims into a new one. Record the original wording in `quantity.original_text`, its numerical reading in `original_value` and `original_unit`, and the exact unit conversion in `value`, `unit`, and `dimension`. For feet use `value = original_value × 0.3048`; for square feet use `× 0.09290304`. Preserve approximations in the original text and avoid claiming more precision than the source supports.

| Report item | Catalogue destination | Review instruction |
|---|---|---|
| File/page URL or supplied document location, capture date, retained bytes | `sources[]`: `url`, `locator`, `captured_at`, `sha256`, `artifact_status` | Use a stable locator. `capture_gap` and a null hash remain visible gaps; do not fabricate a digest. |
| Provider's controlled drawing/version, if stated | `sources[].upstream_revision` | Keep separate from capture date and file hash. Null means unknown. |
| Exact model configuration/revision, if established | `configuration`, `source_revision` | This is the model-level revision. Null when the report does not establish it. |
| Exterior width/depth with stated reference faces | `nominal_exterior_width`, `nominal_exterior_depth` | Attach each known value to its `source_id`; say whether projections are included. |
| Labelled living/interior area | `manufacturer_interior_area` | Never interpret as regulatory floor area. |
| Labelled footprint | `manufacturer_footprint` | Preserve the provider's definition. Unknown overhang/deck treatment is a gap. |
| Exterior overall height with undefined datum/high point | `advertised_overall_height` | Keep `roof_height` missing. Ceiling height alone is neither field. |
| Roof high point from an explicit foundation datum | `roof_height` | Enter only when the source explicitly supports both endpoints; regulatory grade remains separate. |
| Absent or ambiguous measure | `status: "missing"`, `quantity: null`, `source_id: null`, concrete `reason` | Keep uncertainty in `missing_facts` and notes too. |
| Service, installation, use, footprint and height qualifications | Corresponding model notes/status | Retain qualifiers. The current contract does not attach a source ID to each narrative statement. |

For every known measurement, `status` is `known`, `reason` is null, and `source_id` refers to an entry in that model's `sources`. For every missing measurement, give a reason and no quantity or source ID. Include `roof_height` as explicitly known or missing. Retain source and model revision as different fields. A report may establish one without the other.

## What validation establishes

The intake rejects malformed/duplicate-key JSON, invalid contract shapes, duplicate model/source/measurement identities, detached known measurements, inconsistent unit conversions, invalid capture dates or hashes, and missing source lists. The report lists unresolved measures, missing facts, capture/hash gaps, unknown revisions, a provider URL absent from captured sources, and independent source review as actions. A supplied PDF may support measurements without being the provider homepage. No physical quantity is mapped to a regulatory quantity; the supported measurement names do not contain regulatory floor area or regulatory building height.

Observed contract limits from the existing attributed Landing record: known measurements have source IDs, but model narrative claims such as service area and installation do not have per-field source references. `missing_facts` is free text. `Source.sha256` is optional and `Source.captured_at` is text; this intake adds digest/date checks for supplied candidates. `Quantity` already checks exact conversions, so this command reuses that check. A source can still be misinterpreted or mislabeled while passing software validation. A reviewer must compare the candidate with the actual report, confirm physical definitions and configuration, and decide whether more contract fields are needed for a concrete report. No schema expansion is made here.

## Remaining gates

- **Demo usability:** A structured candidate can be staged offline now. A forthcoming report still needs manual mapping into JSON; this command offers no prose parser or interactive form.
- **Accepted real evaluation:** Focused provider reports, controlled dimensions, installation/service confirmation, and independent source review are outstanding. The research owner must obtain and map them; a reviewer must verify them before any separate publication decision.
- **Publication:** A reviewed candidate requires a separate publication change and release check. This intake cannot activate a release.
- **User validation:** No user walkthrough of this research workflow has occurred; the product/integration owner must test it with actual reviewers after reports arrive.
