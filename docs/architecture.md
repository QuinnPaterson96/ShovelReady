# Architecture direction

## Canonical homeowner journey - October 8, 2026

One mounted assessment host owns the model, property, placement, comparisons and
unsent enquiry/export state. Home and Start assessment replace the redundant
model-selector and general-preparation primary destinations. An explicit homepage
demo action passes a one-shot example/model entry payload to this host; history and
ordinary entry resume it. Cold model links validate IDs against the existing
catalogue. Presets do not introduce builder tenancy or model-specific calculations.
The older input preparation remains a Research tool for custom design dimensions,
scope, evidence requests and synthetic preparation examples; it does not produce
homeowner placement assessments. See [integration evidence](integration-canonical-navigation.md).

## Homeowner journey state — October 7, 2026

Navigation changes presentation only. Explicit answer edits invalidate relevant
findings and acknowledgements; workflow completion never confirms evidence.
Unknown street context preserves physical measurements but blocks dependent
frontage and yard conclusions. Shared map and report surfaces use the same current
inputs. See [integration evidence and remaining gates](integration-homeowner-journey-round.md).

## Enquiry export checkpoint - October 7, 2026

Model 300 enquiries now request explicit context and separate the recipient message
from the sender's preparation checklist. Current measured geometry produces local
PNG/PDF, Markdown/ZIP and unsent MIME email exports in the browser. No storage,
contact API or automatic provider transmission is added. See the
[integration record](integration-enquiry-placement-export.md) for evidence and remaining gates.

## Municipality-aware homeowner flow

Decision: October 6, 2026. This is the implementation direction, not a claim that
the current Victoria-specific UI has already been generalized.

The property carries attributed municipality context. The selected parcel's
governing jurisdiction is preferred over geocoder locality; unresolved matches
require clarification. Manual lots allow explicit municipality selection. Separate
identity from service/rule coverage: an unsupported municipality can still use
local geometric exploration without borrowing Victoria regulations.

Use stable physical measurement fields with contextual definitions in accessible
information help. A small typed definition record should identify its quantity,
basis/reference, units, inclusions/exclusions, jurisdiction, applicable rule and
revision, source and review status. Definitions belong to supported rule packages;
source retrieval belongs to municipal adapters. Municipality alone is insufficient
to choose a legal definition when bylaws/pathways differ. Missing definitions stay
unresolved, with generic physical help available.

Original measurements retain their meaning and provenance when context changes.
Invalidate jurisdiction-dependent conclusions and reassess measurement compatibility;
never silently reinterpret a number under a new definition. Preserve placement only
when its geometry and coordinate context remain valid. Keep material incompatibilities
visible beside inputs instead of burying them in help.

Generic homeowner components consume structured findings with explicit status,
scope, missing facts, available actions and evidence references. They do not parse
diagnostic prose or recognise individual zone codes. Present a short finding and
next action; expand details for calculations and sources. Unsupported coverage is
neither prohibition nor permission. A geometry pass is not an overall feasibility pass.

Implement with ordinary modules and configuration; no plugin loader, universal rule
language or speculative service architecture. Sequence:

1. [#246: Property municipality context](https://github.com/QuinnPaterson96/ShovelReady/issues/246).
2. [#247: Contextual measurement definitions](https://github.com/QuinnPaterson96/ShovelReady/issues/247), using #246.
3. [#248: Second-municipality vertical slice](https://github.com/QuinnPaterson96/ShovelReady/issues/248), validating both against the homeowner work in #242/#243.

The structured-findings presentation boundary is part of existing #242, not a
parallel competing summary implementation. Coordinate shared UI ownership before
starting these follow-ups. The second-city slice does not imply new accepted legal
coverage; existing Saanich topology and Langford source/rights gaps remain open.

## Zoning lookup checkpoint — October 6, 2026

The stateless app now includes a bounded City of Victoria parcel-polygon zoning
lookup. It returns attributed map observations and explicit coverage/ambiguity
states, separately from accepted rule publication. Project details now consumes
this lookup under #238, retaining separate municipal, default and user origins;
no new service or database is needed. See the
[combined integration record](integration-map-zoning.md).

## Hosting checkpoint - October 2, 2026

The owner selected Railway and GoDaddy DNS for a stateless public observational demo.
One container serves frontend/API; current geometry needs no PostGIS or hosted database.
See [hosting runbook](hosting.md). This explicitly supersedes earlier accepted-data
gates for hosting the observational journey; persistent pilot and exact-image CD
requirements in SR-14/15 remain open. Hosting does not publish regulatory data.

## Homeowner workflow checkpoint — October 6, 2026

Model 300 opts into source selection: after an address choice, a sole parcel lead
with supported geometry proceeds automatically; alternatives require a parcel
choice. The separate confirmation gate remains in generic discovery. The new
`site-discovery.selected.v1` local record has explicit selection basis and
`identity_attestation: not_confirmed`; the older confirmed record keeps its
original meaning. Placement provenance, enquiry and evidence export distinguish
these records. Neither source selection nor workflow completion establishes
ownership or legal boundaries.

The generic homeowner renderer consumes named statuses and action targets; the
Victoria adapter determines scope. A host-supplied summary slot below each map
puts counts and the next action after compact adjustment controls and before detailed evidence. No evaluation API,
rule packet or persistence change is involved. The #231/#233 follow-up groups derived scenario roles and optional legal-basis entries in one boundary checklist, retaining separate origins and exact exports. See the
[verification and remaining gaps](integration-homeowner-summary.md).

The guided continuation adds ordered street, boundary, check, enquiry and email
steps to the existing rail. Review milestones are local and revision-scoped;
Draft requested records only a browser compose request, never delivery. See the
[guided journey evidence](integration-homeowner-summary.md#guided-continuation-and-expanded-journey--october-6-2026).

The October 7 property update makes explicit answers atomic user confirmations and
adds a source-scoped scan checklist. A labelled non-waterfront default stays unknown
in legal evaluation and only supports probable geometric scouting. See the
[property answer integration](integration-boundary-planning.md#property-answers-and-scan-checklist--october-7-2026).

## Live property discovery checkpoint - September 29, 2026

The existing app mounts bounded synchronous BC geocoder and Victoria municipal
adapters. The Model 300 host owns explicit address/parcel confirmation, passes a
source-attributed site into the stateless placement engine, and clears results on
edits. `site-discovery.confirmed.v1` stays separate from retained lookup/publication
identity. Raw source text is included for user export; no durable live-observation
store or startup fetch was introduced. The municipal adapter emits validated planar
geometry alongside raw Esri geometry so hole/shell nesting survives the handoff.
Manual sketches use `LOCAL:METRE`, never an invented geolocation. See the
[integration record](integration-live-parcel-discovery.md) for verification and gaps.

## Earlier direction


Status: agreed direction for experimentation, updated September 24, 2026. Foundation, contracts, draft persistence, licensed spatial import, offline extraction replay, draft scalar evaluator, observation API/UI and persistent local database tooling are implemented; accepted real-site evaluation/publication and deployment remain future work. See the [latest integration review](integration-review-2026-09-24.md), [restart assessment](restart-assessment.md) and [original handoff](prior-work/design-decisions.md) for evidence and earlier reasoning.

## Current POC direction (September 27, 2026)

The [builder website screening brief](builder-screening-demo.md) now sets the near-term
consumer of this architecture: an independent aux box Model 300 demonstration in the
City of Victoria, leading from model selection through supplied placement to an unsent
enquiry summary. It supersedes The Landing as the first demo design candidate below.
This is product scope, not an implemented integration or accepted regulatory result.

Reuse the existing catalogue, placement API and evidence boundaries. Keep the reference
company's model allow-list, presentation, stated coverage and eventual enquiry routing
as configuration outside measurement and rule evaluation. API-populated facts and manual
fallbacks retain distinct provenance. Useful approximate geometry can be shown before
regulatory publication; it must not be presented as zoning compatibility. One company
does not justify a tenant platform, a new service or a separate rules engine.

The [foundation integration](integration-builder-demo-foundation.md) now connects map
placement and local handoff. Company entry and explicit manual site geometry remain
the [next implementation wave](backlog/builder-demo-wave.md); their integration must
preserve the distinction between captured GIS coordinates and user-supplied local sketches.

## Boundaries

```text
Pinned source documents and manifest
                |
Explicit ingestion command
parse -> extract -> validate -> review
                |
Versioned detailed rules and evidence
                |
Publish dataset release + scouting projection
                |
Deterministic screening and evidence API
                |
React inputs, results, map, and investigation view
```

The LLM proposes structured data during ingestion. Code validates and normalizes it; reviewed revisions become eligible for publication. Preserve raw responses and failed attempts for diagnosis. Runtime checks execute only supported, reviewed semantics.

Detailed rules retain applicability, exceptions, calculations, dependencies, source evidence, and explicit unsupported states. The scouting projection can be denormalized, but must preserve coherent pathways and identify its source rule revisions. Avoid a general-purpose legal solver until evidence requires one.

Results are candidate, needs investigation, or no match under evaluated pathways. Conditions, approval status, scope exclusions, and missing inputs are separate fields. An unresolved alternative prevents claiming that every possible pathway fails.

## Minimal persistence

Use one PostgreSQL database with relational metadata and validated JSONB for evolving rule shapes. Conceptually track:

- Source snapshots: URL, retained bytes/hash, capture date, instrument and version, verified effective dates where available.
- Extraction runs: raw output, prompt/model/parser/schema identifiers, errors and review history.
- Logical rules and immutable revisions: evidence anchors, normalized semantics, applicability, dependencies, and review status.
- Dataset releases: source/rule/spatial versions and compatible projection/evaluator versions.
- Derived scouting records, sample parcel facts, and reproducible evaluation results as needed.

Logical identity is separate from content hash and revision identity. Section numbers alone are not permanent identities. Explicitly review ambiguous matches, splits, and merges. Unknown effective dates remain unknown.

Canonical units include metres, square metres, counts, and dimensionally explicit rates/ratios. Preserve original units and values. Percentages normalize to fractions with a named basis; floor-space ratios and parking rates keep their distinct meanings. Manufacturer floor area must not silently substitute for regulatory floor area.

## First scope

September 18 research refinement: one actual fixed small design, one reviewed pathway, and about three real site fixtures with supplied placements for the technical proof; approximately 20–30 real enquiries for the subsequent customer pilot. City of Victoria garden suites are the leading candidate, The Landing is an unverified initial design candidate, and Vancouver is the fallback. Obtain actual inputs and review current rule applicability before confirming fit. See the [MVP backlog](backlog/README.md) for dependencies and acceptance criteria. Do not silently expand to several use types.

Persist versioned principal-building geometry, lot-line classifications, rear-yard boundaries, and proposed placements with source/manual-review provenance. Keep physical and regulatory measurements distinct. A failed supplied placement is not proof of universal site incompatibility; outside supported coverage is not a zoning exclusion. No automatic placement search is required.

Support a small set of dimensional/use checks. Irregular geometry, split zoning, missing facts, and unmodeled overlays remain visible investigation cases. The bounded SR-09 import now uses Shapely/GEOS for XY intersections and pyproj for explicit CRS conversion, retaining immutable observations in PostgreSQL JSONB. PostGIS is deferred until larger-scale database spatial queries justify it; see the [implemented tradeoff and evidence](spatial.md). A small explicitly tagged geometry response is sufficient. Original XY is EPSG:3157; derived longitude/latitude is EPSG:4617 and must not be silently relabelled WGS84/RFC 7946 GeoJSON.

The observational investigation API exposes an explicitly selected licensed spatial-import revision before regulatory publication; its UI clearly says no screening occurred. This is distinct from a future screening API consuming an accepted dataset. The draft evaluator now has a separate compute/import command, immutable diagnostic storage and an opt-in synthetic API/UI. The complete request/report is retained without inventing release membership or filling intentionally absent rule/fact records. HTTP aliases expose only pinned repository-owned examples and verify the request and recomputed report. Unknown source acceptance, site facts and placements remain gates for real conclusions. See the [draft bridge](draft-evaluations.md), [wave-seven verification](integration-wave-seven.md), [evaluator](evaluation.md), [investigation API](investigation-api.md) and [local database workflow](local-development.md).

## Cloud direction

- One container serves FastAPI and built React assets.
- Managed PostgreSQL stores application data; object storage retains source files and raw outputs outside ephemeral application disks.
- Ingestion initially runs as an explicitly invoked batch command. No queue or worker service is required yet.
- Use HTTPS, protected administrative ingestion, managed secrets, backups, and useful error logging.
- Start with local development and one shared demo deployment. Add an independently isolated production environment when customers rely on the service.
- Use a ShovelReady-owned cloud account/project and credentials. No hosting provider or cloud resources have been selected or provisioned.

## CI/CD direction

GitHub Actions requires backend lint/offline tests with disposable PostgreSQL migrations, frontend tests/type-check/build, container startup and native Windows local-database lifecycle checks. The latter verifies the owned helper through restart and real API retrieval and refuses an unexpected skip. The full accepted ingestion-to-result integration fixture remains SR-13 work; existing checks do not establish that path.

The backend job also checks that the frontend report schema, TypeScript types and
computed fixtures still match the Python exporter. The computed synthetic bridge is
verified through storage/API/UI; it supplies no accepted source or published release.

The local demo launcher serves one built app from a clean commit with explicit owned
database configuration and spatial revision, displaying nonsecret build/data identity.
The ten-case public research inventory remains provisional and separate from accepted
rule data. The implemented database-free public-case evidence view does not publish
it or establish a fit. Its inventory identity is separate from the licensed spatial
observations; selected Stannard research updates remain provisional. The container
smoke check probes this endpoint to verify metadata packaging. See
[wave-five integration](integration-wave-five.md).

On-demand virtual-user QA is separate file-based tooling: shared cases/runs/findings,
owned disposable app builds, manual participant handoff and offline replay of attributed
reviews. It adds no runtime agent, scheduler, database, model service or live-model CI.
Frozen recipes retain their application baseline separately from the newer tooling
commit and any derived fault-build identity. See [wave-six integration](integration-wave-six.md)
for verification and the participant/calibration limits.
The [first reviewed pilot](integration-pilot-01.md) supports retaining this bounded,
on-demand workflow. It supplies no evidence for scheduling, automatic ticket creation
or a separate QA data service. Accepted source-to-result implementation remains the
development priority; this synthetic calibration does not verify that path.

Once SR-14 configures a protected demo environment, SR-15 will deploy the tested immutable image and smoke-test it. Identify images by commit. Serialize deployments to a given environment and avoid obsolete runs overwriting newer deployments. Preserve a known-good image for rollback. No deployment currently runs on merge.

Apply database migrations as an explicit release step, not concurrent application startup table creation. Prefer backward-compatible changes; application rollback does not automatically roll back the database. Test backup restoration before customer reliance.

Data publication is separate: validated draft -> reviewed immutable release -> atomic active-release change. Prompt/model changes require extraction evaluation before their output is promoted. Changing code must not implicitly publish newly extracted rules.

## Implementation sequence

The [ticket backlog](backlog/README.md) refines this sequence: pilot acquisition, scaffold repair, and provisional contracts can start together; CI starts after safe startup, and deployment follows the local end-to-end image. Cloud and accepted-data publication remain separate work items. Research is not a blanket prerequisite for implementation.

1. Preserve the merged scaffold, typed boundaries, CI, immutable draft persistence, licensed spatial import, offline extraction tooling, draft evaluator and real spatial evidence viewer.
2. Obtain the controlled design and reviewed source/site/placement subset needed to connect supported real rules to the evaluator. Use the existing observation viewer for a bounded workflow rehearsal; it does not yet screen designs. Customer recruitment does not gate this technical work.
3. With authorized reviewed references, recorded human timing and an explicit budget, benchmark the original extraction prompt and diagnose actual failures before tuning.
4. Integrate supported reviewed semantics and inputs with explicit dataset publication, coherent scouting projection and the screening API/UI. Do not turn a selected observation revision into an accepted release.
5. Verify the complete source-to-result path and deployable image in SR-13, then configure the protected demo and CD with recovery evidence in SR-14/15.
6. Measure customer time savings and update costs before expanding coverage.

After the computed draft bridge, use the [next-step plan](next-steps-after-wave-seven.md)
to obtain one reviewable real case before choosing further conditional semantics or
publication scope. File-based intake and release tooling can follow concrete supplied
inputs; source acceptance and external input supply remain separate from code delivery.

The [wave-eight experiment](backlog/wave-eight-prompts.md) now uses the provisional
historical Pilot proposal for an offline mapping attempt. Current accepted-rule and
source/input boundaries remain unchanged: preparation failure is distinct from an
EvaluationReport and must not acquire invented reviews or source hashes. Specific
approved-plan acquisition proceeds separately. This tests actual intake gaps before
any shared-contract change; it does not add a production service or accepted release.

[Wave nine](integration-wave-nine.md) implements a primary Home -> inputs -> summary
flow and a separate read-only Pilot preparation endpoint/view. Input completion and
example import confer no review or fit outcome. Preparation diagnostics remain distinct
from EvaluationReport, and runtime packaging must not depend on checkout-only scripts
or research files. The Pilot page and input flow share a prominent status banner;
preparation remains amber and never implies evaluation.

Defer multi-agent ingestion, vector databases, knowledge graphs, microservices, elaborate cloud infrastructure, custom model training, and a commercial third-party API. Record any later adoption in a decision note with the observed need, simpler alternatives, and revisit criteria.


## Wave-ten checkpoint

The site-preparation API projects the configured retained spatial revision; it does
not fetch citywide data or resolve addresses. Candidate confirmation and manual values
remain unreviewed. The standalone model catalogue uses a pinned manual provider
snapshot with unknown roof-height references and explicit service-area limitations.
Both components await SR-41 integration. Their generated artifacts are drift-checked
in CI. Municipal transfer commands remain offline experiments, not production adapters.

See [combined evidence](integration-wave-ten.md) and [next steps](next-steps-after-wave-ten.md).
Source citations, independent interpretation review and release publication remain
separate gates. All new rule candidates are non-executable/unaccepted.


## Wave-eleven checkpoint

Site/model preparation components are mounted in the assessment flow. Editable
site inputs survive page navigation separately from confirmed source selections;
edits invalidate confirmation and the prepared summary. Address lookup optionally
joins five pinned City Address Points rows to three retained parcel leads using
GISLINK. It preserves aliases, raw source evidence and exact packet selection.
No citywide runtime geocoder, new database schema or accepted data release is added.
See [integration evidence and gaps](integration-wave-eleven.md).


## Wave-twelve checkpoint

A deterministic frontend checklist derives source-attributed evidence requests from
the current draft and existing packets. It is mounted in the preparation summary;
it does not evaluate rules or store an independent truth. Victoria clause requests
are withheld outside complete supported scope. Manual model identity is preserved.
The source record remains available through progressive disclosures, and copyable
review text is prominent. No backend contract, database migration or accepted release
changed. See [integration evidence](integration-wave-twelve.md).

## Wave-thirteen checkpoint

Offline research intake now stages explicit candidate JSON and gap reports without
mutating active snapshots. Model 300 and Jay research packets replay through it,
remaining unreviewed. Retained address lookup normalizes only supported terminal
street suffix pairs and preserves comparison provenance and ambiguity. No schema,
migration or frontend change. See [integration and next steps](integration-wave-thirteen.md).


## Occupied-lot scouting checkpoint

PRs #140-#142 supply 16 retained Victoria parcel cases (13 new, 3 prior), a pure
supplied-placement geometry engine, and a proposed three-check rule subset.
[Integration evidence](integration-occupied-lots.md) records compatibility checks,
review corrections and gaps. #139 now owns the runtime adapter and placement UI.
Approximate observations do not require a complete accepted regulatory release;
legal comparisons remain separately gated and labelled. No new site-fit result or
active dataset publication is implied by these merges.


## Interactive occupied-lot checkpoint

Three retained Victoria parcels now connect to a placement sketch and stateless geometry
API. Users can drag/rotate a supplied rectangle and inspect approximate partial results.
See [integration evidence and next round](integration-placement-ui.md). This is geometric exploration,
not accepted zoning evaluation. #139 and #147 retain their outstanding criteria.

## Homeowner placement workspace

The Model 300 journey uses one placement map with Move unit, Mark street edges,
and Adjust boundaries tabs. Tab changes preserve placement and map view. The
selected map edge and its boundary form share state; checklist actions open the
relevant tab and focus the correction control. Detailed measurements and evidence
remain expandable in that workspace. Street-side suggestions require a supported
four-edge boundary and an explicit single-street assumption.

Existing suite count initially assumes none, with explicit journey-default
provenance. Homeowners can choose none, one or more, or not sure and optionally
confirm their answer. Confirmation records what the homeowner said, without
independent verification. These states survive API evaluation and technical export;
Unknown prerequisites remain unresolved in legal evaluation. A separate probable
scouting status can describe explicitly attributed defaults and measurement proxies;
legal boundary status, variances and measurement definitions receive no verified default.

The map-adjacent summary leads with the decision and next action. A worthwhile
provider enquiry requires supporting coverage beyond containment and checked
counts, including height and siting checks; incomplete coverage remains visible.
This UI does not publish accepted zoning data or establish site applicability.

Boundary adjustment now uses a right-hand marking panel: choose Side, Rear, Front
or Flanking, then click an edge to apply an explicit user assumption. Visible edge
labels echo the stored role; keyboard users can select an edge and apply the same
mark. Clear removes an explicit mark; an applicable suggestion can reappear. Irregular outlines still
need manual review. Next-action and journey-step information buttons expose nearby
explanations by click/tap/keyboard without changing inputs or advancing the journey.

Street adjacency is a separate optional typed user observation in the site-assumptions
contract: a set of exterior edge IDs and a completeness observation. Completeness records
whether the user explicitly confirmed it or advanced from street marking.
Edits clear completeness; property/geometry changes clear marks. A complete single
street edge on a simple four-edge parcel may narrow scenario suggestions; multiple
marks narrow coherent scouting alternatives only when complete; incomplete marks
never establish legal front/flanking roles. Road bands
are schematic exterior offsets only for supported convex four-edge geometry; other
outlines retain marks without invented road geometry. All modes retain these bands,
and enquiry/technical exports retain attribution and completeness. Step information
is a viewport-bounded hover/focus popup with tap pinning and Escape/outside dismissal.

On supported convex four-edge lots, explicit front/rear marks anchor display-only
suggestions: the opposite edge is rear/front; the remaining marked street edges are
flanking, and confirmed non-street edges are sides. Without an anchor, one complete
street edge suggests front. Incomplete non-street edges remain unknown. Explicit
roles are retained; contradictions are shown and conflicting front/rear anchors
suspend suggestions. Map labels identify suggested roles and the editor can accept
one as an explicit user assumption. The optional typed `boundary_role_suggestions`
record preserves suggestion basis and conflicts in HTTP/evidence exports; it never
supplies evaluator facts. Irregular outlines continue to require manual review.


October 6 preliminary assumptions update: advancing with Next/Prepare enquiry or
Adjust boundaries completes street marks; returning to the street tab reopens
completion. A boundary-offset grid shares the existing manual wall-to-line entries,
with captured approximate values shown separately. Complete marks constrain the
scouting front alternatives to marked streets and remaining adjacent street edges
to flanking alternatives; explicit legal-role assumptions can still conflict.

Scouting area uses nominal footprint (or supplied rough estimate) +10%. Scouting
height uses advertised height +10% +0.30 m foundation allowance. Buffers and
allowance are editable, source values remain unchanged, and clearing a candidate
limit yields `probable`, never a measured or accepted pass. Above-limit proxies
remain unknown; entered installed-height conflicts and regulatory-area findings
retain priority. Source rule identities and exact observations remain exported.
The unique largest valid mapped outline within the parcel is a provisional main
building for separation only, with an explicit override; tied/unsupported outlines
remain unknown. Rear-yard checks still require main-building use and site context.
Front distance uses coherent front alternatives and any supplied wall-to-line
overrides, preserving captured values independently.

`POST /api/victoria-zoning/property-scan` (`victoria-property-scan.v1`) queries six
fixed City heritage/conservation/DPA/special-restriction/application/history sources,
using the selected parcel polygon and its GISLINK history join. Bounded failures,
missing joins and truncated responses remain unknown; records require review.
Successful empty searches are probably clear only within that searched scope.
Issued permit documents, title covenants, projections and servicing are not scanned.
The UI retains these as separate review gaps and links the City's records portals.
No new dataset release or accepted source interpretation is published. Saved Parcel
87 also receives the current zoning lookup; manual sketches receive no invented zone.


## Attributed boundary planning defaults

October 6, 2026: [boundary planning integration](integration-boundary-planning.md)
adds optional edge-keyed buffers in metres, independent waterfront-edge observations,
and an explicit switch disabling main-outline inference after Not sure. These are
compatible additions to the site-assumptions v1 payload. A default main outline uses
journey_default evidence, is independently revalidated for scouting and remains
unknown for the legal principal-building prerequisite. Planning evidence extends
scenario edge checks without changing their raw distance/outcome; buffered-only
shortfalls use review in the separately scoped findings and homeowner summary.
Measured overrides remain distinct and unbuffered. No schema migration or accepted
rule publication is involved; old requests retain their zero-buffer behavior.

## Prefab journey generalization — October 7, 2026

The homeowner host now selects Model 300, Model 240, C.H. Studio Pod or Quadra 4
through an explicit demo adapter. Research observations have a separate snapshot
identity and remain unreviewed; accepted catalogue publication is unchanged. Model
switches retain property facts and invalidate model-specific results and overrides.
See [mapping, verification and remaining gaps](prefab-generalization.md).


## Homeowner state and current-output integration — October 7, 2026

[Round 2 integration](integration-homeowner-ux-round2.md) keeps intended-use mapping
and attributed source/property selection shared across display and reporting. A
retained result is display-only and scoped to property/model; current-input keys
control acknowledgement, readiness and copy/export eligibility. Late asynchronous
responses cannot replace a newer input. Recipient PDF, editable Markdown, sender
checklist and technical evidence are separate projections of one current snapshot.
No new service, database schema or accepted-data publication is introduced.

## Bounded walkthrough checkpoint — October 9, 2026

The existing assessment owns example initialization and a small typed frontend playback
controller. It calls the existing journey/placement actions and waits for current API
results. Explicit Next/Back replaces dwell timers; each placement visit has a fresh
command identity, so Back restores the comparison and rejects stale responses.
There is no alternate evaluator or tour service. Demo-supplied intended-use
attribution passes through the existing conditional boundary separately from defaults
and observations. No persistence, migration or publication changes. See
[verification and integration gaps](guided-walkthrough.md).
