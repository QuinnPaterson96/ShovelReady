# ShovelReady — Design Decisions and Technical Handoff

_Last updated: 2026-09-17_

## 1. Product thesis

ShovelReady is a zoning-intelligence product intended to answer a high-level question:

> Given a prefabricated building model, where could it plausibly be built?

The product is not intended to make authoritative legal determinations. The core positioning is **probable fit / preliminary feasibility**, with a clear distinction between:

1. **Scouting mode** — broad, fast, optimistic filtering across many zones or parcels.
2. **Detailed lot analysis** — slower, more precise evaluation of a selected parcel using conditional zoning rules and source text.

This distinction is central to the architecture.

---

## 2. Initial market focus

The initial market is Canadian, with Vancouver as the first implementation target.

Early target users include:

- Prefabricated / modular housing manufacturers
- Residential developers
- Land acquisition / development analysts
- Planning consultants
- Real-estate investors
- ADU / garden suite builders
- Potential municipal or policy users later

The core pain point being addressed is the manual work involved in identifying where a building type or model is likely to fit existing zoning.

The product should eventually support workflows such as:

- "Where can this prefab model fit?"
- "Which lots are worth investigating?"
- "What are the most important constraints on this parcel?"
- "Which rules require human/planner review?"
- "Which areas have the best zoning fit before detailed due diligence?"

---

## 3. MVP / tech-demo scope

### Tech demo

The first technical demonstration is intentionally narrow and should be sufficient for:

- Grant applications
- Conversations with retired planners / SMEs
- Basic technical validation
- Early developer/manufacturer feedback

Initial demo functionality:

1. Load a predefined zoning document and display extracted zoning values.
2. Allow entry of building parameters such as height and floor area.
3. Show which zones appear compatible.
4. Select a zone and inspect conditional / detailed rules extracted from the source document.

### MVP

The fuller MVP expands the demo into:

1. A map of permissible / potentially compatible zones or parcels.
2. Address lookup.
3. Scouting filters using simplified zoning constraints.
4. Parcel / zone drill-down.
5. A checklist or report containing detailed zoning constraints and conditional rules.

The MVP should demonstrate the complete loop:

> zoning document → structured extraction → database → scouting filter → parcel / zone drill-down → detailed report

---

## 4. Core architectural principle: two levels of zoning intelligence

A major design decision is to avoid forcing all zoning logic into one representation.

### 4.1 Scouting layer

Purpose:

- Fast filtering
- Large-scale querying
- Map rendering
- "Probably viable" / "clearly impossible" classification

Characteristics:

- Denormalized
- Mostly numeric
- Query-friendly
- Optimistic
- Intentionally lossy
- Avoids expensive conditional evaluation

Examples of scouting fields:

- `max_units`
- `max_lot_coverage`
- `max_far`
- `maximum_building_height`
- `maximum_stories`
- `setback_distance`
- `minimum_parking`

Associated metadata may include:

- `*_is_ratio`
- what a ratio is relative to, where necessary
- optional provenance / source identifiers

For scouting, the ingestion pipeline should choose permissive / optimistic values where a rule contains alternatives or conditions.

Examples:

- Highest allowable FAR
- Highest allowable height
- Lowest applicable setback where simplification is needed
- Missing / unknown constraint treated as non-blocking for the scouting pass

This layer is a **fast prefilter**, not a compliance verdict.

### 4.2 Detailed rules layer

Purpose:

- Parcel-specific checks
- Human-readable reports
- Planner validation
- Conditional evaluation
- Auditability / source traceability

Characteristics:

- Preserves complex rules
- Stores thresholds, discrete conditions, comparisons, external references, and calculations
- Can use JSONB and/or normalized rule tables
- Evaluated only after a user selects a zone or parcel

This is where rules such as these live:

- "7.5 m or 25% of lot depth, whichever is greater"
- "If site width <= 15 m, side setback is 10% of site width; otherwise 1.5 m"
- "Only if the building existed before June 18, 1956"
- "Subject to Schedule C"
- "Director of Planning may approve if..."

---

## 5. ETL pipeline

The zoning ingestion process is explicitly treated as an ETL pipeline.

### Extract

Sources may include:

- Zoning PDFs
- HTML bylaws
- Municipal schedules
- Linked regulations
- GIS / zoning maps
- Future municipal APIs

### Transform

The transformation stage uses an LLM to:

- Extract relevant parameters
- Normalize terminology
- Classify numeric vs ratio-based constraints
- Identify minimum vs maximum constraints
- Detect thresholds
- Detect discrete conditions
- Detect freeform / discretionary conditions
- Detect "whichever is greater / lesser" comparisons
- Preserve references to external schedules
- Extract calculation methods
- Produce structured JSON

Post-LLM code then:

- Validates structure
- Normalizes units
- Checks expected min/max semantics
- Checks ratio handling
- Produces the simplified scouting projection
- Produces / stores the detailed rules representation

### Load

The output is loaded into two conceptual stores:

1. Scouting data
2. Detailed rules / source-derived data

The raw extraction should also be retained for debugging and reprocessing.

---

## 6. Why structured extraction instead of query-time LLM reasoning

The preferred product architecture does **not** ask an LLM to reason from raw zoning text for every address lookup.

Reasons:

- Query-time LLM calls are slower.
- They are more expensive.
- They are non-deterministic.
- They are harder to test.
- They are harder to explain.
- They make map-scale filtering impractical.
- They make regression testing difficult.

The LLM is therefore primarily an **ingestion / transformation tool**, not the runtime compliance engine.

A later LLM layer may still be useful for:

- Explaining rules in plain language
- Summarizing a parcel report
- Answering natural-language questions about already-structured rules

---

## 7. Zoning extraction schema

The extraction prompt evolved toward a few standard rule shapes.

### 7.1 Single numeric value

```json
{
  "units": "m",
  "isRatioOf": "N/A",
  "value": 7.3,
  "is_minimum": true,
  "is_maximum": false
}
```

### 7.2 Numeric threshold

Use when the applicable rule changes based on a numeric property such as site width, lot area, or number of storeys.

```json
{
  "threshold": "site_width",
  "threshold_units": "m",
  "conditions": [
    {
      "minimum": "N/A",
      "maximum": 15,
      "value_if_threshold": {
        "units": "%",
        "isRatioOf": "siteWidth",
        "value": 10,
        "is_minimum": true,
        "is_maximum": false
      }
    },
    {
      "minimum": 15,
      "maximum": "N/A",
      "value_if_threshold": {
        "units": "m",
        "isRatioOf": "N/A",
        "value": 1.5,
        "is_minimum": true,
        "is_maximum": false
      }
    }
  ]
}
```

### 7.3 Discrete category

Use when the applicable value depends on a non-numeric category such as building type.

```json
[
  {
    "condition": "duplex",
    "value_if_condition": {
      "units": "m²",
      "isRatioOf": "N/A",
      "value": 780,
      "is_minimum": true,
      "is_maximum": false
    }
  }
]
```

### 7.4 Freeform / complex condition

Use when the condition cannot be represented cleanly as a threshold or finite category.

```json
[
  {
    "condition": "if the Director of Planning considers the impact on privacy and overlook",
    "value_if_condition": {
      "...": "..."
    }
  }
]
```

### 7.5 Comparative rule

Use for language such as:

> "7.5 m or 25% of lot depth, whichever is greater"

```json
{
  "whichever_is": "greater",
  "options": [
    {
      "units": "m",
      "isRatioOf": "N/A",
      "value": 7.5,
      "is_minimum": true,
      "is_maximum": false
    },
    {
      "units": "%",
      "isRatioOf": "lotDepth",
      "value": 25,
      "is_minimum": true,
      "is_maximum": false
    }
  ]
}
```

This is preferable to representing each option as an unrelated condition because the comparison itself is part of the rule.

### 7.6 External / unresolved rule references

If a document references a separate rule, schedule, or bylaw that is not included in the current source, store a rule reference rather than inventing a value.

Example:

```json
"parking_requirements": "conditional_rule: rule_parking_schedule_c_001"
```

And separately:

```json
{
  "rule_parking_schedule_c_001": {
    "rule_name": "rule_parking_schedule_c_001",
    "text": "Parking requirements are subject to Schedule C.",
    "applies_to": "parking_requirements"
  }
}
```

### 7.7 Derived calculation methods

Calculation rules must be preserved separately.

Examples:

- Floor-area inclusions / exclusions
- Balcony exclusions
- Parking floor exclusions
- Open-site-space calculations
- "whichever greater" derived setbacks

Example:

```json
{
  "rule_name": "calculationRule_floor_area_rt1",
  "text": "Floor area includes ... and excludes ...",
  "associated_zone": "RT-1"
}
```

---

## 8. Parameters currently prioritized for extraction

Current extraction targets:

1. `unit_density_per_lot`
2. `lot_coverage`
3. `FAR/FSI`
4. `maximum_building_height`
5. `maximum_stories`
6. `setback_distances`
7. `floodplain_and_environmental_overlays`
8. `parking_requirements`
9. `unit_mix_rules`
10. `explicitly_permit_manufactured_housing`
11. `material_fire_rating_requirements`
12. `permitted_use_and_dwelling_type`
13. `zone_name`

The scouting layer intentionally uses only the subset required for fast filtering.

---

## 9. Scouting table design

Current ORM concept:

```python
class ScoutingZone(Base):
    __tablename__ = "scouting_zones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_code = Column(String, nullable=False)
    city = Column(String, nullable=False)
    province = Column(String, nullable=False)

    max_units = Column(Numeric, nullable=True)

    max_lot_coverage = Column(Numeric, nullable=True)
    lot_coverage_is_ratio = Column(Boolean, nullable=False, default=False)

    max_far = Column(Numeric, nullable=True)

    maximum_building_height = Column(Numeric, nullable=True)
    maximum_stories = Column(Integer, nullable=True)

    setback_distance = Column(Numeric, nullable=True)
    setback_is_ratio = Column(Boolean, nullable=False, default=False)

    minimum_parking = Column(Numeric, nullable=True)
    parking_is_ratio = Column(Boolean, nullable=False, default=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
```

This model is intentionally denormalized.

The reasoning is that scouting is read-heavy and performance-sensitive. It should avoid joins and complex rule traversal.

---

## 10. Ratio handling in scouting

Some zoning fields may be expressed either as absolute values or ratios.

Examples:

- Setback = `2 m`
- Setback = `10% of lot width`
- Lot coverage = `45% of site area`
- Parking = `1.2 spaces per dwelling unit`

The scouting representation stores:

- numeric value
- whether it is a ratio

Example:

```text
setback_distance
setback_is_ratio
```

The same pattern may be used for other fields.

The application can precompute the comparison values and pass them into the query rather than performing expensive calculations inside SQL.

Example conceptual filter:

```sql
WHERE
(
    setback_is_ratio = false
    AND setback_distance >= :absolute_setback
)
OR
(
    setback_is_ratio = true
    AND setback_distance >= :setback_ratio
)
```

This design intentionally trades normalization for fast lookup.

---

## 11. Database design philosophy

### Scouting DB / table

Use denormalization aggressively.

Reason:

- Few writes
- Many reads
- Map-scale filtering
- Repeated comparisons
- Minimal need for cross-city joins
- Data is effectively a materialized projection of the richer rules

### Detailed rules store

Use a hybrid relational + JSONB model.

Likely structure:

```text
zones
zoning_parameters
conditional_rules
calculation_rules
source_documents
```

Nested rule structures can remain JSONB until the runtime evaluation patterns stabilize.

Potential progression:

1. Start with JSONB.
2. Observe which rule forms are actually common.
3. Normalize high-value / high-frequency rule types later.
4. Keep rare edge cases as JSONB.

Do not prematurely normalize every legal edge case into a large relational hierarchy.

---

## 12. Ingestion endpoint design

Current semantic operation:

```text
POST /zones/upload
```

This should remain one endpoint because it represents one user/system action:

> ingest one parsed zoning dataset

Internally it performs multiple operations.

### Required request fields

- `city`
- `zone_code`
- `part_1_zoning_parameters`

Future request may also contain:

- `part_2_conditional_rules`
- `part_3_calculation_method`
- source metadata
- document version
- jurisdiction
- source URL / file ID

### Endpoint responsibilities

1. Validate the parsed JSON.
2. Normalize values.
3. Detect ratios.
4. Validate min/max semantics.
5. Produce optimistic scouting values.
6. Insert / update `scouting_zones`.
7. Insert detailed zoning rules.
8. Insert conditional rules.
9. Insert calculation methods.
10. Preserve source / provenance.

Keep the HTTP endpoint thin. The route should delegate transformation and persistence to service-layer functions.

---

## 13. Validation / normalization layer

A dedicated validation function should sit between LLM extraction and DB insertion.

Concept:

```python
def extract_validated_field(
    field_obj,
    field_name,
    expected_is_ratio=None,
    expected_extremum=None,
):
    ...
```

Validation responsibilities:

- Value exists or has an explicit null/uncertain state.
- Numeric fields contain numeric values.
- `isRatioOf` is recognized.
- Ratio-based fields are supported by scouting insertion.
- Unexpected ratio forms are logged or rejected.
- `is_minimum` / `is_maximum` match the expected semantics.
- Unexpected rule shapes are logged or rejected.
- Conditional lists are reduced according to explicit scouting policy.
- `whichever_is` rules are handled explicitly.
- Unsupported conditions are never silently flattened.

Important principle:

> A scouting simplification may be permissive, but it should never be silently arbitrary.

Every lossy transformation should be reproducible and ideally traceable to its source rule.

---

## 14. Provenance and auditability

Each transformed rule should eventually retain enough metadata to trace it back to source text.

Useful fields:

- source document
- document version / date
- page
- section
- raw clause text
- extraction timestamp
- parser / model version
- confidence / validation status
- human-reviewed flag

This matters because zoning data changes and because planner feedback may reveal extraction errors.

The long-term data moat is not merely "having zoning PDFs." It is the combination of:

- normalized rules
- reliable provenance
- version tracking
- validation
- corrections
- parcel mapping
- rule-change history

---

## 15. Backend stack

Current backend decision:

- **FastAPI**
- **SQLAlchemy**
- **PostgreSQL**
- **PostGIS** when parcel / map data is introduced

Why FastAPI:

- API-first product
- Python ecosystem fits ETL / NLP / LLM work
- Low ceremony
- Natural Pydantic integration
- Fits separate React frontend
- Easy to split background ingestion from user-facing API later

### Recommended package organization

```text
app/
├── api/
│   ├── routes/
│   ├── dependencies.py
│   ├── error_handlers.py
│   └── middleware.py
├── models/
├── schemas/
├── services/
│   ├── db.py
│   ├── scouting.py
│   ├── zoning_ingestion.py
│   ├── zoning_validation.py
│   └── zoning_rules.py
├── core/
│   └── config.py
└── main.py
```

Do not put database models or business services under `api/`.

---

## 16. Frontend stack

Current frontend decision:

- **React**
- **TypeScript**
- **Vite**
- **SWC**
- **Tailwind CSS**
- **React Router**
- **Axios** or native `fetch`

Why:

- FastAPI remains the backend of record.
- No need for Next.js server-side backend features.
- Vite is a clean fit for a standalone React client.
- TypeScript is useful because zoning payloads are highly structured.
- SWC improves compilation speed.
- Tailwind supports rapid UI prototyping.
- React Router supports deep links to zones / parcels / reports.

Recommended structure:

```text
project-root/
├── app/          # FastAPI backend
├── frontend/     # React/Vite app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/
│   │   ├── types/
│   │   └── routes/
│   └── package.json
└── README.md
```

Do not mix Create React App / `react-scripts` with Vite.

Development command:

```bash
npm run dev
```

---

## 17. First frontend admin / ingestion page

Initial frontend feature:

- JSON textarea
- City dropdown
  - Vancouver
  - Victoria
- Zone-name input
- Submit button
- Success message
- Full backend error message on failure

This page is an internal ingestion/debugging tool rather than a polished user-facing product.

It is useful because it allows rapid inspection of the LLM → API → DB pipeline before the map UI exists.

---

## 18. Geospatial architecture

The eventual map should use:

- PostgreSQL + PostGIS as the authoritative spatial store
- parcel geometries
- zone geometries
- spatial indexes
- bounding-box / viewport queries
- later, vector tiles or precomputed map layers if needed

Do not attempt to return hundreds of thousands of parcel records directly to the browser.

Likely progression:

1. City / neighborhood viewport filtering
2. Indexed PostGIS queries
3. Precomputed scouting result per parcel or zone
4. Vector tiles / cached layers for large-scale rendering

The scouting table is intended to make this fast.

---

## 19. Serverless / background processing

A hybrid architecture is appropriate.

User-facing APIs:

- FastAPI service

Background ingestion:

- potentially AWS Lambda / S3 for document intake
- queue / worker architecture if parsing becomes long-running
- Lambda is appropriate for short ingestion steps
- long LLM processing may eventually be better in workers / ECS / batch jobs rather than synchronous API requests

Potential flow:

```text
document upload
    ↓
S3
    ↓
ingestion trigger
    ↓
text extraction / chunking
    ↓
LLM parsing
    ↓
validation / normalization
    ↓
detailed rules DB
    ↓
scouting projection
```

The MVP does not require all of this immediately.

---

## 20. Local model / LLM strategy

Initial inference can use external models for quality and speed of iteration.

Local experimentation was considered using:

- Hugging Face
- llama.cpp
- quantized models
- Docker

Hardware constraints discussed:

- M1 MacBook Air, 8 GB RAM: suitable for app development and external API calls; heavily constrained for larger local models.
- Ryzen 2600, 32 GB RAM: can run quantized local models for experiments, but CPU inference will be slow.

Main strategic decision:

> Do not make custom model training the early moat.

The likely moat is:

- zoning data collection
- schema design
- extraction pipeline
- normalization
- validation
- corrections
- parcel integration
- change tracking
- customer workflow integration

---

## 21. Data moat thesis

The potentially defensible asset is the **transformed, validated, versioned zoning database**, not the LLM itself.

Advantages accumulate with:

- more jurisdictions
- better parsing
- human corrections
- standardized schemas
- source provenance
- parcel mappings
- historical changes
- known edge cases
- model-to-zone fit results
- customer-specific product libraries

This creates a compounding data / workflow advantage even if competitors have access to the same foundation models.

---

## 22. Product/business layering

The architecture naturally supports multiple business tiers.

### Scouting

Potential value:

- territory selection
- land acquisition screening
- prefab sales targeting
- city / region comparison
- high-volume site search

### Detailed lot report

Potential value:

- planner / developer due diligence
- pre-sale prefab feasibility
- homeowner ADU checks
- acquisition memo support
- downloadable reports

### Longer-term extensions

Potential future products:

- Prefab model + land listings
- Total cost estimates combining land + prefab
- ADU lot-fit tool
- Preferred manufacturer listings
- Developer / lender analytics
- Parcel profitability scoring
- Change monitoring when zoning updates
- API access to standardized zoning data
- Municipal partnerships
- Buyer pooling / multiplex development coordination

These are future options, not MVP requirements.

---

## 23. Key design rules to preserve

1. **Separate scouting from detailed compliance.**
2. **Use LLMs to transform zoning, not to answer every runtime query.**
3. **Keep the scouting path flat, denormalized, and fast.**
4. **Preserve full source rules elsewhere.**
5. **Never silently discard unsupported rule forms.**
6. **Log or reject unexpected ratios / min-max semantics.**
7. **Treat external rule references explicitly.**
8. **Store calculation methods separately from headline limits.**
9. **Preserve provenance.**
10. **Avoid premature full normalization of legal language.**
11. **Design ingestion as a reusable ETL pipeline.**
12. **Use Vancouver as the first constrained implementation target.**
13. **Optimize the demo for planner validation and grant credibility, not feature breadth.**

---

## 24. Immediate next implementation steps

1. Finalize `ScoutingZone` fields and ratio metadata.
2. Implement `extract_validated_field`.
3. Add explicit handling for:
   - single values
   - lists of conditions
   - thresholds
   - `whichever_is`
   - external conditional rules
4. Move ingestion logic out of the route into `services/zoning_ingestion.py`.
5. Store the raw parsed JSON alongside derived records.
6. Add detailed rule persistence.
7. Add source metadata / provenance.
8. Build the internal React ingestion page.
9. Seed several Vancouver zones.
10. Implement `POST /zones/upload`.
11. Implement a basic scouting endpoint.
12. Add PostGIS and Vancouver zoning / parcel geometry.
13. Build the first map view.
14. Add zone / parcel drill-down with detailed rule display.
15. Validate outputs with planners before expanding geography.

---

## 25. Current high-level architecture

```text
Municipal zoning documents
        │
        ▼
Text / document extraction
        │
        ▼
LLM structured extraction
        │
        ▼
Validation + normalization
        │
        ├──────────────► Raw extraction / provenance
        │
        ├──────────────► Detailed rule store
        │
        └──────────────► Optimistic scouting projection
                              │
                              ▼
                       ScoutingZone table
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
         Map / mass scouting        Zone / parcel selection
                                             │
                                             ▼
                                   Detailed rule evaluation
                                             │
                                             ▼
                                      Zoning report
```
