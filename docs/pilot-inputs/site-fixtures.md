# Three real site leads: provisional fixture specifications

Packet revision: September 24, 2026. Source bundle: `source-manifest.json`. These are **real GIS parcels, not completed reviewed placement fixtures**. No positive fit has been manufactured. No survey, supplied placement, owner enquiry or permit ground truth was supplied. Technical reviewer, manual-fact author and review date are all unassigned.

## Selection and observed sample records

The initial discovery query on PID layer 11 selected `ParcelType='LA' AND Shape_Area > 500 AND Shape_Area < 900`, ordered by OBJECTID, limited to 12. From that convenience sample, 59, 80 and 86 were retained for ordinary GRD-1 versus PGA-labelled investigation and differing roofline counts. The area filter is an acquisition convenience, **not an eligibility threshold**. The original discovery response is private research; exact retained parcel requests and polygon-intersection requests are reproducible from `requests.json`. This is not an unbiased customer sample or a guarantee of residential use.

| Fixture lead | Stable identifiers observed | Parcel GIS area (m2, rounded for display only) | Observed zoning | Intersecting roofline IDs |
|---|---|---:|---|---|
| VIC-059 | PID `028-279-638`; VicPID `V04661019`; Lot A, Plan EPP7204 | 563.765795 | Zoning OBJECTID 601; `ZB2018`; `GRD-1` | 72944 (`Residential_2023`), 76767 (`Residential`) |
| VIC-080 | PID `008-140-723`; VicPID `V02291034`; amended Lot 44, Plan VIP937 | 577.328801 | Zoning OBJECTID 3; `ZB2018`; `GRD-1 (PGA)` | 69970 (`Residential`) |
| VIC-086 | PID `001-327-470`; VicPID `V02291040`; Lot B, Plan VIP29997 | 660.534229 | Zoning OBJECTID 3; `ZB2018`; `GRD-1 (PGA)` | 69967 (`Residential`) |

For each numeric ID N, manifest entries `site-N-parcel`, `site-N-zones` and `site-N-rooflines` identify the actual original Esri JSON responses, captured times and hashes. They retain rings in WKID 3157, original fields and nulls. The two PGA responses happen to have identical bytes and share a hash-named object; their distinct parcel-polygon request URLs are preserved. Query intersection is a lead for investigation, not a legal zone or building-ownership adjudication.

## Per-site handoff

| Lead | Specific evidence to resolve | Provisional expected behavior, not an executed result |
|---|---|---|
| VIC-059 | Identify which, if either, roofline is the principal dwelling; establish whether the second structure remains, is removed or is relevant to existing garden-suite count. Resolve the mixed 2023/default feature labels. | Needs investigation until building uses, current footprints, placement, grade and applicable rules are reviewed. Do not infer a garden suite from the small roofline. |
| VIC-080 | Check the PGA designation against the map/definitions; identify principal dwelling and existing unit count. Verify frontage and lot-line orientation from supplied plans. | Needs investigation. PGA does not independently authorize an enlarged garden suite or justify selecting an unrelated density branch. |
| VIC-086 | Independently establish the principal building, lot boundaries, legal rear yard and placement; do not copy VIC-080 facts despite shared zoning. | Needs investigation. Larger GIS area is not proof that The Landing fits or that rear-yard occupancy passes. |

Observed governing-instrument lead for all three: 18-072 / Zoning Bylaw 2018. Final technical applicability status: **unreviewed**. Required review includes full parcel coverage, current zoning/amendments, any site-specific provisions, applicable transitions/permits, legal lot identification and relevant restrictions. No historical Schedule M or plus-site rule is assigned.

## Required supplied/manual facts for each packet

These are a written input checklist for SR-04/SR-06, not a competing typed contract. Each item needs a revision ID, original evidence/URL or authorized document hash, capture/measurement date, author, reviewer, review status, units/CRS and uncertainty. Unknowns remain unknown rather than zero or false.

1. **Site identity and survey:** confirm the actual legal lot and survey version, physical/cadastral boundaries, street/lane connections, corner/through/waterfront status, title constraints and geometry limitations. A GIS parcel and roofline alone do not establish these.
2. **Principal building:** supplied wall footprint and relevant projections, current use and dwelling-unit count, source drawing/survey date, any other buildings, and a reviewed mapping to observed GIS features. Do not automatically choose the largest roof polygon.
3. **Lot-line classifications:** supplied front, rear, side and flanking segments, reasoned against the pinned definitions and actual access/frontage facts. Identify ambiguous geometry explicitly.
4. **Rear-yard boundary:** supplied, manually reviewed polygon with its defining principal-building line and rear lot line. Record the reviewed denominator; parcel-minus-building area is not a legal rear yard.
5. **Proposed placement:** supply one fixed Landing revision/configuration, wall and projection polygons or a reviewed transform of an authorized dimensioned plan, units, horizontal CRS, origin/anchor, rotation convention and location. Record the human supplier and independent review. **No placement coordinates have been supplied for any of these three leads.**
6. **Vertical facts:** surveyed natural and finished grade at required locations, vertical datum, foundation/finished-floor elevation and roof geometry tied to the same datum. No assumed flat site and no use of ceiling height as building height.
7. **Area and pathway accounting:** design Floor Area reconciliation, existing/proposed dwelling count, whole-lot floor area/coverage and applicable exclusions, rear-yard occupancy numerator/denominator, and a coherent regulatory alternative. Preserve physical and regulatory quantities separately.
8. **Review/outcome:** independent check rationale, exact source/version locators, unresolved references, supported and omitted checks, disagreement and correction history. At this stage expected numerical outcomes are withheld for all three.

When placements arrive, retain an original failed supplied placement and a later revision as separate facts if useful. Failure at that placement cannot establish no possible placement. If any lead is unusable, replace it with another real documented site and record why; do not alter inputs to create a pass. No independent reviewer was named in the supplied task, and the clarification request has not supplied one as of this packet.
