# ShovelReady restart assessment

Assessment date: September 17, 2026. Research and recommendations, not an implementation specification or parcel-level legal determination.

**Recommendation: preserve the ingestion-first, two-layer concept, but change the scouting contract before extending the code.** A narrow, reviewed Vancouver demonstrator is technically feasible. Reliable municipal coverage and a profitable business remain unproven. The biggest uncertainty is whether affordable screening removes enough real investigation work to justify maintaining the data.

I reviewed the [design handoff](prior-work/design-decisions.md), [extraction prompt](../app/prompts/document_parsing), backend, frontend, test scaffolding, and repository history. I also inspected recent context in the conversations named “ShovelReady” and “ShovelReady Business Recap.” The handoff is dated September 17, 2026; it describes intended behavior that is substantially ahead of the implementation. The repository has one committed baseline and existing uncommitted restructuring. This assessment changes no application code.

**The existing architecture has understandable reasons behind it.**

| Existing hypothesis | Reasoning in the handoff and code | Assessment |
|---|---|---|
| Fast, permissive scouting plus detailed rules | Broad discovery needs inexpensive filters; investigation needs conditions and evidence. | Preserve the distinction, with more precise result semantics. |
| LLM extraction during ingestion; deterministic runtime | Avoid repeated inference costs, variable answers, slow maps, and difficult regression testing. | Preserve. Determinism still depends on correct inputs and supported semantics. |
| Flat scouting records | A small numeric representation is convenient for repeated comparisons and map queries. | A derived projection is useful; avoiding all joins is not yet a demonstrated requirement. |
| Hybrid relational data and JSONB | Rule forms are still evolving; fully normalizing every legal construction would slow learning. | Preserve. Add typed validation around JSON rather than accepting arbitrary dictionaries. |
| Preserve unresolved references and calculations | A headline limit is insufficient when another clause defines applicability or how quantities are measured. | Preserve and make this part of the initial data contract. |
| FastAPI, SQLAlchemy, PostgreSQL, React/TypeScript/Vite | Python suits ingestion; the frontend consumes an API; no stated server-rendering requirement. | No reason to replace the stack for this experiment. |
| JSON upload form first | Gives a cheap manual bridge from extraction experiments to storage. | Useful as an internal tool, but not evidence that ingestion or customer value works. |
| Validated data as a durable asset | Corrections, provenance, updates, and parcel associations could compound over time. | Plausible, conditional on maintenance economics and demand for reuse. |

The earlier context discussed multi-agent ingestion, but the current task explicitly defers it. A local batch command using one extractor and ordinary validation is enough to test the present hypothesis.

**Several problems are implementation gaps, rather than reasons to reject the product architecture.**

| Evidence | Consequence |
|---|---|
| [Route registration](../app/api/routes/__init__.py) imports absent event/card/user routes and does not register zones. [Database initialization](../app/services/db.py) imports absent models. | The visible backend cannot complete the intended startup path. |
| [Numeric validation](../app/api/routes/zones.py) assigns `is_ratio = is_ratio(field_obj)`. | Python treats the name as local; ordinary numeric extraction raises `UnboundLocalError`. Reproduced in isolation. |
| [ORM construction](../app/api/routes/zones.py) uses `lot_coverage_is_ratio`, while the model declares `max_lot_coverage_is_ratio`. | A second blocking mismatch remains after repairing validation. |
| Conditional lists always select their largest numeric value. Threshold objects and comparisons are unsupported. | The implementation contradicts the handoff's lowest-setback policy and cannot ingest important prompt outputs. Comparing a percentage directly with metres would also be meaningless. |
| Upload accepts only an untyped Part 1 dictionary. | Raw extraction, detailed rules, calculations, source evidence, and reference resolution are not persisted. |
| Storage has a creation timestamp but no release identity, source version, uniqueness policy, or idempotency. | Repeated uploads can create duplicates; results cannot be reproduced against a defined regulatory snapshot. |
| Only the front setback is read; uses and ratio denominators are discarded. | A row cannot support reliable building-to-parcel matching. The response model also omits ratio flags. |
| Two frontend package roots; mixed CRA/Vite scripts; nested app still displays the template counter. | The upload component is not integrated into a coherent running frontend. |
| Duplicate root handlers; unrelated dependencies and tests. | Copied scaffolding obscures the small amount of ShovelReady-specific behavior. |

I executed only the parser helpers extracted via Python AST, without importing the application or connecting to a database. A simple height failed with the name-shadowing error; threshold objects, `N/A`, `uncertain`, and empty conditional lists also failed; a missing field returned `(None, False)`. This demonstrates contract failures, not extraction accuracy. The existing test suite references missing unrelated models and contains database cleanup operations, so I did not run it. Its database setup also contains an embedded remote credential: remove it from active configuration and establish whether it needs revocation before reusing that scaffolding. No credential value is reproduced here.

**The substantive contradiction is between permissiveness and justified compatibility.**

The handoff says both “choose optimistic values” and “unsupported conditions are never silently flattened.” These are compatible only if simplification has a defined meaning.

Selecting the greatest height, greatest floor-space allowance, least setback, and greatest unit count independently can manufacture a combination that no single permitted development pathway supports. Likewise, missing data can keep a parcel in a candidate set, but cannot justify a positive match. A detailed explanation shown later does not repair an earlier misleading map label.

Use three outcomes within an explicitly bounded scope:

- **Candidate:** the supported checks pass under one coherent pathway; list any conditions and checks still outside scope.
- **Needs investigation:** missing inputs, unresolved references, unsupported logic, discretionary approval, or conflicting evidence could change the result.
- **No match under evaluated pathways:** an evidenced constraint rules out every supported alternative. This is not a claim that rezoning, a variance, or an unmodeled pathway is impossible.

Keep approval status separate from physical/numeric fit. A numeric candidate may still require conditional approval. Keep unknown candidates visible, count them separately, and never render them as verified matches.

For the first prototype, retain a few explicit pathway rows keyed by use and material conditions. Do not create a universal solver. A SQL prefilter can reject a building only where a bound is sound for all relevant modeled alternatives. Otherwise it retains the case. Cheap deterministic checks can then evaluate the retained pathways. Each result identifies its pathway and source rule revisions.

The handoff's sample setback SQL is also underspecified: if the stored value is a required minimum and the input is available clearance, compatibility requires available clearance >= required minimum. Naming these quantities resolves the apparent reversed comparison. Floor area alone cannot be compared to a zone-wide FSR without a site area and a compatible floor-area definition.

**Actual Vancouver material exposes gaps the existing prompt cannot adequately represent.**

The current R1-1 PDF retrieved for this review is labelled June 2026. These examples form an initial failure corpus, not a complete interpretation:

| Source provision | Observed requirement | Schema implication |
|---|---|---|
| 2.2.4 | Laneway houses refer to Section 11; schedule sections 3 and 4 do not apply. | Preserve exclusions and dependencies, not just additional references. |
| 3.1.1.3 | Unit limits depend on tenure; another obligation combines area, frontage, geography, and tenure. | A single numeric threshold or category is insufficient. |
| 3.2.2.3 and 3.2.2.10 | Height and storeys are both constrained; third-storey area is also limited. | Separate scalars cannot express the complete building form. |
| 3.2.2.11 | A narrower side yard depends on frontage and discretionary approval. | A permissive alternative is not an automatic entitlement. |
| 4.1 | Floor-area accounting includes conditional inclusions and exclusions. | Manufacturer floor area cannot automatically stand in for regulatory floor area. |

Source: [R1-1 District Schedule](https://bylaws.vancouver.ca/zoning/zoning-by-law-district-schedule-r1-1.pdf), especially printed pages 5, 8, and 12–15.

The City's [amendment register](https://vancouver.ca/home-property-development/zoning-land-use-document-library-amendments.aspx) records changes to district schedules and other sections in 2026. An unchanged URL or a recent download is not proof that every relevant instrument and map agrees. The first source manifest must record what was reviewed and any unresolved currency discrepancy.

**The prompt is a useful catalogue of rule shapes, but it is not yet a storage or evaluation contract.**

| Area | Existing strength or gap | Minimum change to test |
|---|---|---|
| JSON envelope | Requests multiple top-level objects while requiring valid JSON; no explicit containing structure. | One object with schema version, source references, rules, calculations, and issues. Calculations must be a collection. |
| Numeric constraints | Scalars, thresholds, categories, and min/max comparisons are useful starting forms. | Tagged types and explicit operators such as `<=` and `>=`; disallow contradictory min/max flags. |
| Thresholds | Inclusive/exclusive boundaries are unspecified; adjacent ranges can overlap. | Record boundary operators; test exact boundaries, gaps, and overlaps. |
| Units | Free text permits inconsistent spellings and scales. | Controlled dimensions and canonical units: metres, square metres, counts, and explicit ratios. Retain original text/value/unit. |
| Percentages and ratios | Prompt allows 0.10 for 10%; handoff examples use 10 with `%`. A Boolean ratio flag loses the denominator. | Canonical fractional representation: 45% becomes 0.45 with a named basis. FSR 1.2 remains 1.2, not 0.012. Spaces/unit is a rate with its own dimension and rounding rule. |
| Setbacks | Named in the prompt without a specified shape; code assumes `front_yard`. | Distinguish front, rear, interior side, exterior side, measurement reference, and applicable building role. |
| Uses and nonnumeric rules | Numeric shapes do not naturally represent use permission, approval process, overlays, or construction qualifications. | Separate use classification, approval status, spatial applicability, and descriptive requirements. Do not infer prohibition from silence. |
| Applicability | Category and freeform conditions look alike; nesting, conjunctions, exceptions, and precedence are absent. | Implement only predicates demonstrated by the benchmark; preserve unsupported clauses as explicit review items. Record overrides only when evidence supports them. |
| Comparisons/calculations | Greater/lesser options are recognized, but formula dependencies and dimensions are not. | Evaluate alternatives after converting them into comparable quantities. Initially execute a small allowlist of reviewed formulas. Never execute generated code. |
| Coverage | A fixed parameter checklist can omit whole obligations. | Keep a section-to-rule coverage ledger: extracted, reviewed irrelevant, unsupported, or failed. Missing output is not evidence of absence. |

Treat “prefabricated,” “modular,” and “manufactured” as distinctions to resolve for the chosen product and approval path, not interchangeable permission keywords. Store intended land use separately from construction method. Fire performance and certification belong in a separately identified scope; a district schedule alone is not a complete building-code dataset.

Building inputs need at least use, units, footprint dimensions, height with measurement basis, storeys, and floor areas by relevant definition. Where only gross manufacturer area is known, return a bounded or unresolved floor-area check rather than silently equating definitions. Parcel inputs need area, frontage/depth or reviewed geometry, orientation/front boundary, and facts required by the supported pathway. Existing buildings and shared site totals matter when retained.

**Provenance, identity, and uncertainty should be first-version requirements.**

Use a small contract, with separate concerns rather than one confidence field:

- **Source snapshot:** jurisdiction, instrument, official URL, captured bytes and hash, retrieval time, printed revision, verified effective dates where known, and source category. Do not infer legal effective time from download time. Record bylaw versus guidance explicitly.
- **Evidence:** source snapshot ID, section/subsection, PDF page index and printed page, and a short exact excerpt with access to surrounding text. Capture table headers and footnotes as context. A citation to the right document but the wrong clause is a failure.
- **Rule identity:** an application-assigned logical ID distinct from an immutable revision ID. Use document/section anchors to match candidates, but section numbers can change and one clause can contain multiple rules. Review ambiguous matches and record splits, merges, and supersession. Content hashes detect changed content; they do not establish legal identity.
- **Processing history:** raw response, extraction run, model identifier/settings where available, prompt hash, parser/schema version, validation issues, and review/correction history. Keep original proposals when a reviewer corrects them.
- **Publication:** a dataset release identifies source versions, accepted rule revisions, parcel/zoning snapshots, and projection/evaluator versions. Publish the detailed rules and derived scouting data together. Reprocessing must not mutate an old release.

Separate extraction status (`extracted`, `not_found_in_reviewed_scope`, `ambiguous`, `failed`), review status, runtime support, and legal applicability. `Not applicable` is a conclusion under particular facts; `not found` is a statement about a search. An unresolved external reference needs a target instrument/section and resolution status, not an invented LLM ID embedded in a string. Absence of a numeric constraint is not the same as an explicit unlimited allowance.

Quarantine malformed or dimensionally invalid output before publication. Preserve uncertain but useful rules in the detailed store with their status; they cannot authorize affirmative runtime results. A human-reviewed flag is meaningful only for a particular rule revision and review scope. Model confidence may help prioritize review but should not substitute for measured extraction quality.

**The smallest useful MVP is two designs, one district schedule, and a reviewed parcel sample.**

Start with new principal single-detached dwellings under R1-1, two fixed design variants, and approximately 20–30 ordinary interior parcels in one small area. Use a real manufacturer's specifications if available; otherwise clearly label the designs as demonstration inputs. A planning professional should confirm the selected pathway and the source bundle before results are published. If early interviews identify laneway housing as the actual buying need, substitute that single pathway and its required sources instead of adding both.

Evaluate selected dimensions, site coverage, floor-space ratio, setbacks, and use status. Use verified parcel dimensions/frontage for the first sample; test rotation only where the design permits it. Boundary geometry can support screening, but cadastral polygons do not establish all legal site facts. The City's [parcel dataset](https://opendata.vancouver.ca/explore/dataset/property-parcel-polygons/) is assessment-based and warns of varying precision; [zoning polygons](https://opendata.vancouver.ca/explore/dataset/zoning-districts-and-labels/) likewise have accuracy and update qualifications. Both report weekly extracts.

Explicitly classify corner/irregular/split-zone sites, uncertain geometry, retention projects, and unresolved overlays as outside the automatic path. Show unsupported cases rather than silently dropping them. An assumed cleared site must be visible as an assumption; the tool has not established demolition permission or land availability.

The demonstration should:

1. Ingest a pinned official source bundle and retain raw extraction plus evidence.
2. Validate and manually review the small rule set; publish a named release.
3. Load the sample parcels with recorded fact sources and spatial-match status.
4. Accept either design or equivalent building parameters.
5. Show candidates, no-matches, and investigation cases in a table and small map.
6. Open each result to show tested constraints, calculations, unmet inputs, conditions, exclusions, and cited source clauses.
7. Re-run the same input/release and reproduce the same result; demonstrate one corrected rule producing a new release and a visible result diff.

Do not include citywide address search, listings, economic feasibility, automated siting optimization, or a comprehensive approval verdict. A zone-only demo can test ingestion, but cannot establish parcel-level fit or scouting usefulness. One district is enough because parcel variation supplies useful positive and negative cases.

**A single application and database are sufficient.**

```text
Pinned source files + source manifest
                  |
Local ingestion command: parse -> extract -> validate -> review
                  |
PostgreSQL: source/run metadata + accepted rule revisions (JSONB)
                  |
Explicit release -> reproducible scouting projection
                  |
FastAPI deterministic screening + detailed evidence endpoints
                  |
Small React client: design inputs, results, map, rule inspection
```

Store source files locally by hash initially. Use one PostgreSQL database; add PostGIS when importing the map sample if spatial joins are performed there. No separate scouting database is warranted. Conceptually keep source snapshots, extraction runs, rule revisions, releases, and derived scouting rows; implement only the tables required by the experiment. A rule can retain descriptive content without claiming executable semantics.

Keep ingestion, normalization, projection, and evaluation as ordinary Python modules independent of HTTP and UI. A synchronous local command is sufficient for ingestion. The API reads published data; its upload handler delegates to the same modules. Start with small GeoJSON responses for the sample; tiles and cache infrastructure require measured volume or latency problems.

These boundaries permit a second consumer to read the same released dataset or evaluation output later. A versioned JSON export and a small analytics query are enough to test reuse. External API products, authentication schemes for third-party agents, and long-term service guarantees are separate decisions.

**Decision disposition.**

| Preserve now | Test experimentally | Defer | Change before extending implementation |
|---|---|---|---|
| Two levels of detail; ingestion-time LLMs; deterministic supported evaluation; Vancouver focus; existing backend/frontend stack; relational metadata plus JSONB | Optimistic screening's useful reduction; pathway granularity; source segmentation; need for layout-aware extraction; reviewer effort; usable manufacturer inputs; willingness to pay | Multi-agent systems; vector search; knowledge graphs; service decomposition; queues/cloud intake; citywide tiles; universal legal DSL; custom training; multi-city rollout; commercial agent/API product | Mandatory evidence and release identity; canonical units/ratio bases; explicit uncertainty; coherent alternatives; immutable accepted revisions; typed ingestion envelope; coverage ledger; broken scaffolding |

“Keep scouting flat” becomes “keep scouting inexpensive and derived.” “Unknown is non-blocking” becomes “unknown remains visible but unverified.” “Provenance eventually” becomes “provenance from the first retained extraction.” Reverse the handoff's proposed sequence: do not finalize the scouting table before testing the source and consumer requirements.

**Feasibility depends on three independently falsifiable hypotheses.**

Technical feasibility is favorable for the narrow workflow: source capture, structured extraction, review, storage, scalar evaluation, and a small map are ordinary engineering. Reliable unattended extraction across arbitrary zoning material is not established by this review. Deterministic execution makes mistakes repeatable, not legally correct.

Product feasibility is uncertain: a building-model-first workflow may match manufacturers' territory planning, or customers may overwhelmingly start with a specific lot and adapt the design. Local users may already know broad district allowances, leaving little value until parcel constraints are incorporated.

Business feasibility is uncertain: review, updates, support, and acquisition costs may dominate inference costs. More jurisdictions can increase maintenance burden faster than revenue. The durable asset would be validated interpretations and update history that users rely on, not simply a large normalized table.

The competitive baseline is already substantive. Vancouver offers [standardized designs reviewed for general zoning consistency](https://vancouver.ca/home-property-development/standardized-housing-designs.aspx), while requiring site-specific refinement. Gridics markets [site-selection tools and zoning data APIs](https://gridics.com/products/) and [expert-prepared feasibility reports](https://gridics.com/property-zoning-reports/). These are evidence of alternatives and an existing category, not proof of Vancouver demand or direct feature parity. Compare ShovelReady with the user's actual current workflow, including municipal tools and professional help.

**Run inexpensive research with predetermined failure signals.** The following targets are proposed pilot gates, not measured performance or production guarantees.

| Priority / question | Low-cost experiment | Evidence against the thesis |
|---|---|---|
| 1. Who repeatedly needs model-to-land search and pays for it? | Interview 6–8 manufacturers, small developers, and planners using their last real screening tasks. Ask for inputs, deliverables, elapsed time, and purchase authority. Then offer a small paid concierge shortlist. | Prospects describe only occasional curiosity; cannot supply projects; or consistently want a different workflow. No paid pilot commitment after a small focused outreach round. |
| 2. Does permissive screening save net work? | Have a planner independently screen the same 20–30 parcels, blinded to system output. Compare candidate recall, false exclusions, unknown share, precision, and total investigation minutes including verification. | Most parcels remain unknown, or reviewing optimistic false positives consumes the time supposedly saved. Aim initially for no false exclusions in the reviewed in-scope sample and at least 30% net time reduction. |
| 3. Can the prompt recover decision-relevant meaning? | Label roughly 40–60 clauses across the selected schedule and its dependencies, including exceptions and tables. Compare the original prompt with a minimally revised evidence/status envelope, using a held-out subset and three repeated runs. | Missed exceptions or wrong applicability persist despite review; improvements only fit known examples. Measure omissions and wrong evidence, not just valid JSON. |
| 4. Is LLM ingestion cheaper than manual curation? | Time manual entry and extraction-plus-review on comparable unseen sections. Log parsing, inference, repair, reviewer, and correction time separately. | Assisted work costs as much as or more than manual entry after several iterations. Use cost per accepted rule and per maintained release, not tokens alone. |
| 5. Can changes be maintained reliably? | Obtain two official snapshots or a verified amendment pair; produce a rule diff, identify affected results, and re-review only what is warranted. | Stable rules churn IDs, changes escape detection, or each amendment effectively forces a full reread. Synthetic edits test plumbing only, not municipal maintenance. |
| 6. Are parcel facts available cheaply enough? | Audit 30 joins against official maps and reviewed parcel facts; include boundary, corner, and irregular cases. Record missing frontage, access, and applicable-source evidence. | Most useful cases require paid or bespoke research before even preliminary screening is possible. |
| 7. Is zoning the binding prefab obstacle? | Review 5–10 actual prospects or failed projects with a manufacturer and planner; identify whether design adaptation, logistics, site work, approvals, or zoning dominated. | Zoning-compatible results routinely fail for issues the proposed product cannot cheaply identify, or customers do not value a zoning-only step. |
| 8. Is reusable data an asset customers need? | Produce the same shortlist in the UI and a simple versioned export; ask a design partner to use the export in an existing workflow. | No repeated use or willingness to pay for maintained data; users only value bespoke consulting or lead generation. |
| 9. Can source data be reused on viable terms? | Inventory terms for documents, spatial datasets, imagery, and any proposed commercial enrichment; obtain targeted clarification where needed. | Necessary data cannot be redistributed or maintenance/data costs erase the intended margin. Do not assume all website content shares an open-data licence. |

The City's [terms of use](https://vancouver.ca/your-government/terms-of-use.aspx) distinguish open datasets from general site materials; reuse rights need source-specific review. No blanket commercial-reuse conclusion is made here.

For the extraction benchmark, score numeric value, unit/basis, applicability, exception capture, dependency capture, source support, and critical-rule recall separately. Track pipeline failures by stage. A second planner should review a small subset to reveal ambiguity in the reference labels themselves. The original prompt must actually be run before claiming a quantitative improvement: this first pass is a source/schema audit and local code probe, not that benchmark.

Use adversarial fixtures for percentage scaling, missing versus zero, exact thresholds, simultaneous metre/storey limits, wrong dwelling category, incompatible alternatives, unresolved references, malformed JSON, source changes, and repeat imports. A no-match result must identify the supported branch and decisive rule. Do not assume that larger lots or fewer units always improve eligibility; test monotonic behavior only within pathways where it is justified.

**Implementation sequence, contingent on those findings.**

1. **Establish the workflow and evidence set.** Choose one customer segment, obtain two design inputs, confirm one use pathway, pin its sources, and create the small clause/parcel reference set. Exit with a concrete scouting decision and measurable baseline; change scope if model-first demand is absent.
2. **Run the extraction comparison.** Preserve the original prompt as a baseline, record its failures, and introduce only schema changes those failures require. Exit with reviewed examples and measured correction effort, not a “final ontology.”
3. **Repair the minimum scaffold.** Resolve routing/model imports, helper shadowing, ORM names, frontend duplication, and unrelated test/configuration residue. Use a clearly isolated local database. Add focused contract tests and a simple startup/import check.
4. **Persist evidence and accepted releases.** Retain raw runs, typed candidate rules, review outcomes, dependencies, and immutable released revisions. Make repeated imports idempotent; incomplete or failed ingestion cannot replace the current release. Add migrations once this first storage contract is agreed.
5. **Implement the bounded evaluator and projection.** Support the small proven rule set, preserve pathway coherence and uncertainty, and attach evidence to each decision. Validate against the held-out boundary and parcel cases.
6. **Build the thin end-to-end demonstration.** Connect design inputs, the sample table/map, and detailed rule inspection. Demonstrate reproducibility and a correction creating a new release. Do not expand source or geographic scope to improve presentation.
7. **Run the timed customer pilot and update drill.** Measure net saved time, shortlist quality, review cost, and willingness to pay. Expand to a second use or district only after these are satisfactory. Otherwise narrow the service, revise the workflow, or stop.

The next useful deliverable is the small reviewed evidence corpus and baseline extraction results. That work decides what the first schema and scouting projection must do; rebuilding the application first would conceal the most important uncertainties.
