# ORCA Jay: unreviewed technical packet

Reviewed 2026-09-25. Keep the current model page, its linked 2026 general specifications, the older 2025 Jay card and 2023 brochure claim separate. Shared model name and 29 × 15 ft dimensions do not establish a single unchanged configuration.

## Source register

| ID | Official URL / locator | Capture, SHA-256 of actual bytes | Revision / reuse limit |
|---|---|---|---|
| J1 | [Current Jay model page](https://www.orcalgs.ca/models/jay/), hero and **Dimensions & specs** / **What's included** / **Customize** | Direct HTTP retrieval returned 403, so **no retained bytes and no hash**; page inspected in web reader 2026-09-25 | No printed revision. Current page path alone does not identify final order configuration. Public reading only; no redistribution licence found. |
| J2 | [Product specifications brochure](https://www.orcalgs.ca/wp-content/uploads/2026/03/Product-specifications-brochure-2026.pdf), linked as “Download product specs (PDF)” from J1; PDF pages 3, 10–11 (1-based) | 200, PDF, 1050738 bytes; `643ad5039c9b4439a7b8613ba7063d343fc29fe6a605bd81cae45b3bf3fdc56f` | `/2026/03/` is a URL date clue, **not** a printed document revision. General product specification, not a Jay dimensional/permit drawing. Inspected via PDF text/page review; not redistributed. |
| J3 | [Jay downloadable card](https://www.orcalgs.ca/wp-content/uploads/2025/01/JAY-downloadable-card-2025-.pdf), PDF page 1 headline, page 2 furnished plan, pages 3–4 feature tables | 200, PDF, 1272418 bytes; `cd1b19159126c6ca8ccc171ebc43816bf825cac961124e4d238a2a5d635111fe` | Filename contains 2025; no printed drawing revision or evidence it controls J1's current offer. Pages rendered and inspected; not redistributed. |
| J4 | [2023 POD brochure](https://www.orcalgs.ca/wp-content/uploads/2023/09/POD-Brochure-2023.pdf), indexed PDF pages 7–9 (1-based) | Direct retrieval returned 404; **no current bytes/hash**. Web index text/visual reviewed as historical conflict context. | Historical brochure: Jay 375 sq ft and gable/pitched roof on p. 7; a 29 × 15 ft plan on p. 9. Not a current specification. |
| J5 | [Older Jay portfolio page](https://www.orcalgs.ca/portfolio/jay/), size/dimension section and download links | Direct HTTP retrieval returned 403; web reader inspected 2026-09-25, no bytes/hash | Links to J3 and separately advertises 435 sq ft and 29 × 15 ft. No page revision; historical/current relationship unresolved. |

## Source observations (literal basis)

| Field | Observation and basis | Source |
|---|---|---|
| External dimensions | Current page explicitly labels 29 × 15 ft “External dimensions” and separately “Footprint.” No wall face, deck or overhang inclusion definition. The older card labels the same numbers “Dimensions”; its plan shows a deck at one end. | J1 Dimensions & specs / hero; J3 pp. 1–2 |
| Advertised area | Current page says “Total area 435 sqft”; it does not state enclosed, usable, gross, deck-inclusive or legal floor-area basis. Older card says “435 sqft” beside 29 × 15 ft and depicts a deck. The equal arithmetic product is **not proof** of its area basis. | J1 Dimensions & specs; J3 pp. 1–2 |
| Roof choices | Current page lists shed, flat or gable. Older card lists single pitch or gable; historical brochure lists gable/pitched. The chosen roof and all roof/eave heights are unresolved. | J1 Dimensions & specs; J3 p. 1; J4 p. 7 |
| Use/configuration | Current page claims one bedroom and one bathroom; finish, siding, window placement and accessibility may change before production. J3 p. 2 has room dimensions and deck but no title block, elevation, roof/grade or envelope projection dimensions. | J1 hero / Customize; J3 pp. 1–2 |
| General components | J2 describes 140 mm exterior wall stud profile (p. 3), 30 gallon water tank in Jay (p. 10), and appliance alternatives (p. 11). These do not fix exterior measurement basis or as-built configuration. | J2 pp. 3, 10–11 |
| Conflicting older size | J4 advertises 375 sq ft for Jay, versus J1/J3 435 sq ft. It may reflect a design/area-basis change; neither explanation is established. | J4 p. 7 vs J1/J3 |

## Unit conversion, separate from source observation

Exact factors: 1 ft = 0.3048 m; 1 ft² = 0.09290304 m². 29 ft = 8.8392 m; 15 ft = 4.572 m; 435 ft² = 40.4128224 m²; older 375 ft² = 34.83864 m². The 435 ft² value is retained here as a provider **total-area claim**. It is deliberately absent from `manufacturer_interior_area` and `manufacturer_footprint` in the [candidate](candidate-jay.json), because the contract would imply unsupported bases. The older 375 ft² is never substituted into the current candidate.
