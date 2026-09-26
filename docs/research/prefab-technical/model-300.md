# aux box Model 300: unreviewed technical packet

Reviewed 2026-09-25. The public model page is a marketing/product configuration, not an order-specific drawing revision. The page and its two linked images are the bounded official source set inspected. No PDF specification or controlled drawing download was linked from the Model 300 page. Do not treat the illustration or its drawn base line as a defined site-grade datum.

## Source register

| ID | Official URL / locator | HTTP capture, SHA-256 of actual bytes | Revision / reuse limit |
|---|---|---|---|
| A1 | [Model 300](https://www.auxbox.ca/model-300), introduction and **The Layout & Specs > Dimensions** / **Site Prep, Delivery + Installation** | 200, HTML, 335598 bytes; `722369c4af220b4d29984b989d940d3b96c40d98515182c2c4bbc28893184dca` | No printed model/drawing revision or effective date. Public reading only; no redistribution licence found. |
| A2 | [Model 300 furnished floor plan](https://images.squarespace-cdn.com/content/v1/5fac3c101547270b1b7fda04/81ddc22e-a73e-4a7d-820f-a6d348c10c49/Model%2B300%2Bfloor%2Bplan%2B%28furnished%29.png), plan perimeter and room labels | 200, `image/webp` response, 10596 bytes; `00cfb0343161f7d596091ffe121f39b6c734d63daea786f7fa99c7115d24b24c` | URL ends `.png`, served bytes were WebP. No printed revision, scale, architectural title block or projection schedule. Inspected visually; not redistributed. |
| A3 | [Model 300 render elevations](https://images.squarespace-cdn.com/content/v1/5fac3c101547270b1b7fda04/5214a7ca-afaf-416b-8236-9f46f2c8518d/Model%2B300%2BRender%2BElevations.jpg), four elevations and height callout | 200, `image/webp` response, 13270 bytes; `767e13cb6a98489d3cdcedb97ff649c9a236a01aaa4999d08c6dd9537dd9de3d` | URL ends `.jpg`, served bytes were WebP. Render with a 10 ft 6 in vertical callout, no defined bottom/top datum, grade, roof build-up or title block. Not redistributed. |

## Source observations (literal basis)

| Field | Observation and basis | Source |
|---|---|---|
| Exterior length/width | “30' long x 10' wide”; the plan labels 30 ft × 10 ft. These are published exterior/plan dimensions; inclusion of roof projections is not defined. | A1 Dimensions; A2 perimeter dimension lines |
| Advertised exterior height | “10'6 high” on page; elevation render also shows 10 ft 6 in. Its lower and upper reference surfaces are not specified, so this is **not** installed roof height. | A1 Dimensions; A3 height callout |
| Living space | “Total living space: 226 sq ft.” The room labels in A2 do not define wall-area measurement rules. Do not turn this into legal floor area. | A1 introduction; A2 room labels |
| Provider footprint | “Footprint: 300 sq ft.” The source does not define whether projections, deck or installation elements are included. | A1 introduction |
| Room/use claim | Page calls it long-term accommodation for 1–2, with bedroom, full bathroom and complete kitchen. This is an offer/use claim, not occupancy approval. | A1 introduction |
| Installation claim | Crane placement; permitting, foundations, site services, shipping and install at extra cost. | A1 Site Prep, Delivery + Installation |

## Unit conversion, separate from source observation

Exact factors: 1 ft = 0.3048 m; 1 ft² = 0.09290304 m². 10 ft = 3.048 m; 30 ft = 9.144 m; 10 ft 6 in = 10.5 ft = 3.2004 m; 226 ft² = 20.99608704 m²; 300 ft² = 27.870912 m². These are unit changes only; they do not resolve the measurement definitions.

The [candidate](candidate-model-300.json) maps the provider-labelled 226 ft² to `manufacturer_interior_area` with its living-space definition, and the labelled 300 ft² to `manufacturer_footprint` with its caveat. `roof_height` remains missing. The active catalogue already contains the A1 dimensional values; this packet does not overwrite it or imply that A2/A3 are approved revisions.
