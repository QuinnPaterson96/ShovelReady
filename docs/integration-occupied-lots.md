# Occupied-lot integration — September 26, 2026

Base main: b7f7b193d50367a761e5cec3663fc010cda108ec.
Reviewed worker heads: #140 d1fd070, #141 bc3bc7e, #142 da32345.
All five checks succeeded on each worker head before integration.

## Delivered and reviewed

- #142: 16 apparently occupied geometry cases, comprising 13 newly captured parcels
  plus three retained pilot leads; 76 new request receipts, 62 distinct source objects,
  nine prior-source references. Offline verifier succeeds. The three useful UI examples
  are VIC-087 (simple), VIC-090 (multiple intersecting rooflines), VIC-093 (address/zoning
  ambiguity). This is a convenience sample, not a representative validation dataset.
- #141: versioned pure Python supplied-rectangle measurements: containment, overlap,
  distances, and comparisons with explicit assumptions/source status. No placement
  search, site-fit classification, HTTP, persistence or UI changes.
- #140: proposed separation, rear-yard siting/setback and rear-yard occupancy subset.
  Review concludes geometry observations can proceed while rule applicability remains
  unresolved. The packet records consolidation/currentness conflicts, unknown principal
  building/lot-line roles and measurement surfaces. This integration does not independently
  approve the legal interpretation or its numeric thresholds.

## Review corrections and combined evidence

The numeric boundary accepted boolean dimensions as 1/0 and coerced numeric strings.
Strict numeric fields now reject both, with regression checks across dimensions,
coordinates, angles and supplied minimums. Ordinary numeric JSON remains supported.

33 focused tests pass: analytical geometry and numeric-boundary regressions, retained
packet integrity, and 13 source-to-result compatibility replays. Each replay uses actual
saved parcel/roofline bytes, the existing XY converter, typed request, engine and JSON
round-trip. A deliberately outside synthetic 2 by 3 m placement must report 6 square
metres outside; this is independently specified, not an approved real-site reference.
Source identity, roofline basis and incomplete-capture warning survive serialization.

Commands from repository root:

```powershell
python -m uv run --locked python scripts/acquire_occupied_lots.py verify
python -m uv run --locked pytest -q tests/test_scouting_geometry.py tests/test_occupied_lot_integration.py
python -m uv run --locked ruff check app/scouting_geometry tests/test_scouting_geometry.py tests/test_occupied_lot_integration.py scripts/acquire_occupied_lots.py
```

Final integration CI is recorded on the integration PR. No UI behavior changed, so
no new browser validation or localhost redeployment is claimed. Existing localhost
continues to serve the earlier app. No migration or accepted-data publication occurs.

## Next step and explicit gaps

| Gap | Impact | Next action / owner |
|---|---|---|
| No runtime adapter or placement UI | Users cannot exercise these measurements in the app yet | #139: package a bounded retained packet; select site/model; draw/rotate a supplied rectangle; show independent results and provenance |
| Capture only intersects the parcel | Nearby off-parcel structures are omitted; nearest captured roofline is not nearest building everywhere | #139: preserve query scope and partial status; later buffer acquisition if required |
| Roofline/role/address uncertainty and zoning ambiguity | Cannot assume walls, principal house, yard or current applicable pathway | #139: explicit assumptions/manual correction and unresolved labels; source review before legal comparisons |
| Rule currentness and measurement conventions unresolved | Proposed numeric comparisons are not accepted legal tests | #104/source reviewer: resolve adopted instrument and site pathway; #138 research remains provisional |
| Supplier drawings and local delivery roles incomplete | A rough model rectangle does not establish installed height, projections or delivery feasibility | #124/#125: controlled technical documents and supplier confirmation; no outreach sent |
| No automated occupied-lot browser journey or human pilot | Software module evidence does not establish task completion, comprehension or commercial value | #139: three contrasting end-to-end cases; #16: human walkthrough/time and interpretation evidence |

Implement geometry-only partial scouting first; do not hold it behind completion of
all regulatory/provider evidence. Preserve independent observations when other inputs
are unknown. Rejecting a supplied placement must not exclude the whole property.
See the behavior-focused test standard in quality.md; retain useful calculation tests
and spend additional QA effort on integration and a few genuine user journeys.
