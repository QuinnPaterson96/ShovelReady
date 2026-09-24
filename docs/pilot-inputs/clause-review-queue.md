# SR-06 preliminary clause queue

September 24, 2026. Source `zoning-2018` in the manifest is the locally retained 133-page PDF. Page numbers below are **one-based PDF pages**, not printed bylaw page numbers (printed p22 is PDF p27). These are agent-authored provisional annotations and evidence locators; exact source text is withheld pending reuse resolution. No annotation is accepted or professionally reviewed. Reviewer and review date: unassigned. No prompt tuning or extraction benchmark has occurred.

The queue contains 25 review items rather than a completed corpus. Each accepted item will need exact authorized evidence, dependency links, interpretation, rationale, reviewer and disagreement history. Shared definitions and related clauses stay together when splitting examples. Reserve the height/grade group H for held-out evaluation; do not put that group's definitions, diagrams or paraphrases in tuning examples. Reading them during source acquisition is not an extraction benchmark. All other groups are provisional development groups; a reviewer may revise the split before tuning.

| Item / group | Evidence locator | Provisional annotation / question for independent review |
|---|---|---|
| 01 / A | Part 1.1(2)-(4), PDF p6, Map 1 | Check geographic instrument selection and zoning-map linkage; old 80-159 provisions are not the default within the 2018 map area. |
| 02 / A | Part 1.1(5)-(6), PDF p7 | Site-specific provisions and split zones must survive interpretation; an intersection is not whole-lot coverage proof. |
| 03 / A | Part 1.1(21), PDF pp9-10 | Review transition provisions if actual permits/agreements exist; do not use historic approvals as present design fit. |
| 04 / U | Part 2.2, Garden Suite definition, PDF p21 | Foundation attachment and companion single-detached/duplex use need actual facts. Roofline size cannot establish use. |
| 05 / U | Part 4.1(1), PDF p30; Residential definition, Part 2.2, PDF p22 | Resolve the use permission and garden-suite relationship within GRD-1. |
| 06 / U | Part 3.1(28)(b), PDF p27 | One garden suite on a lot; actual existing use/count unknown. |
| 07 / U | Part 3.1(28)(c), PDF p27 | Conversion age restriction is conditional on converting an accessory building. New installation cannot inherit an assumed conversion history. |
| 08 / R | Part 3.1(28)(a), PDF p27 | Rear-yard location requires a reviewed rear-yard polygon. |
| 09 / R | Part 2.1, Front Lot Line, PDF p16 | Branch on corner, through-lot and access facts; no automatic orientation from a bounding box. |
| 10 / R | Part 2.1, Rear Lot Line / Rear Yard, PDF pp18-19 | Resolve rear boundary and full-width yard from principal building and lot lines. |
| 11 / F | Part 2.1, Floor Area, PDF p16 | Interior wall basis plus stated inclusions/exclusions; marketing interior area alone is insufficient. |
| 12 / F | Part 3.1(28)(d), PDF p27 | Published maximum 56 m2; comparison awaits reviewed Floor Area and applicability. |
| 13 / H, reserved | Part 2.1, Average Grade, PDF p12 | Natural/finished-grade method and illustration require site elevations, not 2D slope inference. |
| 14 / H, reserved | Part 2.1, Height, PDF p17 | Flat/domed, pitched and gambrel roof branches and exclusions need actual roof/datum facts. |
| 15 / H, reserved | Part 3.1(28)(e), PDF p27 | Published maximum 4.2 m is regulatory Height; 9 ft ceiling height is not evidence of compliance. |
| 16 / S | Part 3.1(28)(f), PDF p27 | Published side/rear minimum 0.6 m, subject to correct line identity and applicable definitions/exceptions. |
| 17 / S | Part 3.1(28)(g), PDF p27 | Published flanking minimum 3.5 m; needs confirmed street/lot classification. |
| 18 / S | Part 3.1(28)(h), PDF p28 | Published principal-building separation 2.4 m; roof polygons are not verified wall faces. |
| 19 / S | Part 2.1, Setback, PDF p19; Part 1.1(12), PDF p8; Part 4.1(4), PDF pp31-32 | Resolve measurement faces, projection treatment and relationship between general zone setbacks and garden-suite requirements. No optimistic mixing. |
| 20 / R | Part 3.1(28)(i), PDF p28 | Published rear-yard occupancy cap 25%; denominator is rear yard, not total parcel area. Review occupancy numerator/projections. |
| 21 / D | Part 2.1, Lot/Lot Coverage, PDF p18; Part 4.1(6), PDF p33 | Separate whole-lot coverage from rear-yard occupancy and select a coherent development column. |
| 22 / D | Part 2.1, FSR, PDF p16; Part 4.1(2), PDF p30; Part 1.1(16)-(18), PDF p8 | Preserve all-building Floor Area, Lot basis, unit-count branches and any dedication exception. Unresolved whole-lot facts prevent an overall pass. |
| 23 / U | Part 3.1(30), PDF p28 | Review general residential size/unit-mix provisions and interaction with this proposed installation; do not omit because subsection 28 looks simpler. |
| 24 / X | Part 3.1(35), PDF p28; Part 4.1(1.1)(c), PDF p30 | Waterfront-specific restrictions can change applicable siting; absence of a waterfront field does not establish not applicable. |
| 25 / X | Part 4.1(5), PDF p32; Part 5; Part 4.1(8), PDF pp33-43 | Parking and site-specific provisions are dependencies, not automatic passes; capture/resolve exact applicable clauses after site facts are supplied. |

## Regression categories prepared, not executed

| Risk | Required assertion once integrated |
|---|---|
| Wrong-era rule | ZB2018 fixture cannot silently receive old Schedule M/plus-site restrictions. Keep legacy source in a separate historical case. |
| Invented GIS fields | Required facts absent from retained metadata stay missing; no generated field becomes source evidence. |
| Area-basis substitution | 574 sq ft headline, 520 sq ft interior and regulatory Floor Area are distinct. |
| Height and roof branch | Ceiling height and roof Z cannot substitute for reviewed regulatory Height and grade. |
| Wrong denominator | Rear-yard occupancy fraction uses reviewed rear-yard area, not parcel area or parcel-minus-roofline. |
| Unsupported coverage | Unknown overlays, unmapped zones or unresolved applicability become investigation/outside coverage, not prohibition. |
| Failed-placement overgeneralization | A failed fixed placement says nothing definitive about all alternative placements. |
| False positive from missing data | All three leads lack placements, walls and grade: no verified pass or positive fit fixture. |
| Incompatible alternatives | Whole-lot density, coverage and dimensional limits cannot be selected independently from different branches. |

Synthetic boundary cases (once contracts are agreed) should use exact threshold, below/above threshold, equivalent units, absent dimensions, malformed geometry and wrong CRS separately from these real sites. Synthetic cases must never be renamed as real fixtures. Keep group-level reservations and test manifests under SR-06 once SR-05 is complete; this queue does not satisfy the completed reviewed corpus criteria.
