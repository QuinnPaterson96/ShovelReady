# SR-26 findings and proposed follow-up

The single virtual participant retrieved the licensed site-80 evidence and produced a reproducible, cautious preliminary note. No consequential application defect or unsupported fit/permit claim was established. This is evidence about one agent's interaction with the merged viewer, not human usability, legal accuracy, customer demand or accepted publication.

## Assessment after the uncoached pass

The [withheld rubric](withheld-rubric.md) was fixed before dispatch; the assessment below was written only after the [participant response](participant-note.md). “Supported” means supported in this bounded UI task, not independently verified land-use facts.

| Rubric item | Assessment | Evidence / limit |
|---|---|---|
| 1. Reproducible identity | Supported | Correct site-80 feature 0, PID/plan/VicPID, collection, full app/frontend commit, spatial revision and three feature locators. Explicitly not a release. |
| 2. Screening/fit boundary | Supported | “Retain this as an investigation lead”; no zoning eligibility/design fit; no accepted dataset, placement or publication. |
| 3. Parcel/zoning observations | Supported | Correct rounded geometric area, parcel IDs, ZB2018 / GRD-1 (PGA) / OBJECTID 3; unreviewed caveat. Full PGA title comes from captured attributes, corroborated in the post-pass browser check, not supplied by the rubric. No permission inferred. |
| 4. Roofline/geometry boundary | Supported | Roofline 69970 / Residential separated from wall footprint/principal building; geometric-only intersection and overlay caveats. No buildable-area inference. |
| 5. Source/capture evidence | Supported with omission | Exact capture times and snapshot/feature locators; says dates do not establish legal effective dates and external source was not reviewed. Does not explicitly repeat that current external URLs can differ from retained bytes. No false currency claim was made. |
| 6. Next-information request | Partial | Requests reviewed boundaries/applicability, building identification/footprint, legal yards/lot lines, grade, design and placement. Does not explicitly request existing dwelling-unit count, principal-building use or frontage verification. “Intended use” is not a substitute for existing use/count. These omissions are not evidence that the UI prevented the requests; the current generic UI does not explicitly enumerate every case-specific item. |
| 7. Actual obstacles | Supported | Reports visibility/handle recovery separately from missing screening/data. The latter is a known product boundary, not a regression. |

No numerical score is used. The participant was not given hidden ticket/source facts to force a complete legal-input checklist. Its note remains preliminary.

## Findings ledger

| Category | Severity / observation | Evidence and disposition |
|---|---|---|
| Observed application defects | None established in this pass | Selection, identities and evidence retrieval supported the bounded task. No claim of comprehensive defect absence. No runtime patch or new regression test warranted. |
| Tool/environment obstacle | Recovered; non-blocking | Participant's visible-tab request unsupported for subagents, followed by undefined handle; recovered with background tab and returned ID. No facilitator coaching. Actual rendered browser use continued. This is not a ShovelReady bug. |
| Agent omission | Limited completeness | Missing explicit existing use/count and frontage requests, and no explicit current-link drift caveat. No incorrect approval claim. Assess using the actual note; do not retrofit a coached answer. |
| Visible technical language | Human-study hypothesis H1 | `exact_self_touch_decomposed_requires_review` was retrieved and repeated without explaining its practical meaning. An agent can copy this text; human comprehension is unknown. |
| Next-step discoverability | Human-study hypothesis H2 | Generic missing-fact prose supported most requests, but the note omitted several case-specific facts. The omission alone cannot attribute causation to UI design. |
| Reproduction burden | Human-study hypothesis H3 | The note includes long hashes and several locators. This worked for this agent; human transcription burden and a need for copy/export controls remain untested. |

## Proposed acceptance criteria, not implemented fixes

No consequential defect was observed, so there is no invented defect reproduction or acceptance result. The concrete post-pass check is recorded in [run-record](run-record.md). If the team chooses these follow-ups, validate them separately:

- **H1, plain-language geometry diagnostic:** At Real observations → site-80 → site-80-zones feature 0, present a readable explanation of the self-touch/decomposition warning while retaining the exact diagnostic and source identity. It must say review is required and must not imply corrected legal geometry or valid zoning coverage. Acceptance would require source/geometry-author confirmation of the explanation plus UI verification; human understanding still needs a human study.
- **H2, next-information support:** If a reviewed per-lead checklist is added, distinguish supplied evidence from unresolved requests and show its provenance/revision. For VIC-080, include confirmation of principal use/count, frontage and PGA applicability without turning any unknown into a permission. Validate with an uncoached actual user on a fresh case. Do not claim the current agent omission proves this feature is needed.
- **H3, reproducible handoff:** If a copyable note is added, preserve collection, exact observation revision, source-scoped feature locators, dates and no-screening status. Verify the copied artifact against the visible selection and ensure it never calls the revision an accepted release. Actual users should first demonstrate whether copying identifiers is a material problem.

No additional agent, persona farm, automation, source recapture or runtime agent system was created. Any future independent run needs a new participant and a newly withheld rubric; rerunning this participant after feedback would be practice, not independent validation.

## Delivery and remaining gates

Implemented: report files only under `docs/usability/wave-five/`, including exact participant instructions, separately withheld rubric, final note, observed run and findings. Verified: merged clean baseline, owned scratch launcher/seed, one uncoached browser participant, narrow post-pass UI corroboration and process/port cleanup. Proposed: optional plain-language diagnostics, checklist and copy support, conditional on review/real-user evidence. Blocked/future: accepted source interpretation, design/site/placement inputs, real source-to-screening integration, publication and customer validation remain unchanged.

Conversation isolation was used, but no OS sandbox proof is claimed. Screenshots are retained in task tool history rather than an exported report bundle; the repository preserves text evidence and the final participant response. Software checks, one virtual rehearsal, independent source review, data publication and real-user validation are distinct evidence categories. This report completes the bounded rehearsal, not the broader SR-13/SR-16 objectives.
