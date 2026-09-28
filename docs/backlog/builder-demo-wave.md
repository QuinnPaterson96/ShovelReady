# Builder demonstration task wave

September 27, 2026. Combined outcome: a visitor explores aux box Model 300, supplies
site facts through supported APIs or manual entry, investigates an explicitly scaled
placement where possible, and leaves with a readable unsent enquiry. Useful partial
results do not require invented zoning approval.

Base: integrated PR #158. All workers use Sol medium and isolated managed worktrees.
The GitHub issues are the execution status source of truth. No outreach is authorized.

| Task | Ownership | Dependency |
|---|---|---|
| [#159 builder journey](https://github.com/QuinnPaterson96/ShovelReady/issues/159) | builder_demo, App, minimal occupied_lots | #158; can run alongside #160 |
| [#160 manual site](https://github.com/QuinnPaterson96/ShovelReady/issues/160) | manual_site and scoped scouting_geometry changes | #158; no App/occupied_lots edits |
| [#147 fresh validation](https://github.com/QuinnPaterson96/ShovelReady/issues/147) | docs/usability/builder-demo | Current frozen combined preview; final new journey follows #159/#160 |

Parent owns README, architecture, quality, AGENTS, backlog, combined mounting and merge.
Workers must coordinate any shared contract before changing it. Avoid parallel edits to
scenario_handoff or occupied_lots from the manual-site worker. Do not introduce a fake
component to satisfy an unfinished dependency.

## Prompt for #159

## Outcome
Build an independent ShovelReady sample website journey for aux box Model 300: model page -> site facts -> optional placement -> readable unsent enquiry. Follow docs/builder-screening-demo.md. Depends on integration PR #158; begin implementation from the integrated main revision supplied by the coordinator.

## Scope and acceptance
- Prominent company-specific entry, one real catalogue model (aux-300), source-labelled dimensions and advertised-height distinction. Use an explicit allow-list; unrelated manufacturers must not leak into this journey. Preserve the general investigation workspace separately.
- Clear independent-demo attribution. Own schematic/Civic Atlas styling; no copied manufacturer imagery or affiliation claim. Reuse catalogue data; do not fork a second model database or imply a controlled revision.
- Start with user site/address facts. Reuse existing API lookup and SitePreparation where useful, preserving source versus manual facts, ambiguous/unavailable results and corrections. Do not associate an address with occupied-lot geometry through an unverified join.
- Retained examples are optional and explicitly imported. The three occupied-lot packets are not citywide address coverage. Unsupported addresses can still produce a useful partial enquiry with geometry/zoning unassessed; area alone cannot generate a shape.
- Use the integrated placement workspace for an explicitly selected retained example; add small optional props if needed without breaking the existing route. Model/dimension/site/placement edits invalidate earlier measurements and enquiry content.
- Collect intended use, timing, optional budget and access/services questions with unknown answers allowed. No personal contact information storage, external submissions, quotes or ROI calculations.
- Provide a concise locally copyable enquiry for both measured and facts-only cases. Preserve unknowns, dated sources, nominal/custom dimension distinction and relevant service restrictions. Do not claim legal compatibility or contact aux box.
- Meaningful connected verification: retained example, unsupported address/manual facts, input edit invalidation, model allow-list, desktop/narrow/keyboard. No per-helper test quota or new framework.

## Ownership and dependency
Own frontend/src/builder_demo/**, frontend/src/App.tsx, minimal frontend/src/occupied_lots/** integration and docs/builder-demo-ui.md. Declare any additional shared-file need before editing. Do not edit frontend/src/manual_site/**, app/scouting_geometry/**, or central README/architecture/quality/AGENTS/backlog files. A parallel task builds a standalone manual-geometry component; do not fake/import its unmerged output. Document a small mounting handoff, and coordinate its later composition with the parent. You can complete the source/manual-facts and retained-example journey independently.

Use Sol medium. Read AGENTS.md, README.md, docs/architecture.md, docs/quality.md and docs/visual-identity.md. Personal QuinnPaterson96 only: git name quinnpaterson96, email 60762693+QuinnPaterson96@users.noreply.github.com; GH_CONFIG_DIR C:/Users/quinn/.config/gh-quinnpaterson96. Verify origin, effective identities and authenticated account before commit/push. Explicit paths, no force-push, work credentials, Styx resources, outreach or accepted publication. Tests touching a DB must use an owned disposable DB. Use a separately owned preview; do not stop ports 18098/18136 or edit the coordinator checkout. Open and attach a scoped PR with actual checks, demo command, unrun items and explicit remaining gaps. Do not merge or spawn agents. A technical pass is not source acceptance or customer validation.

## Prompt for #160

## Outcome
Remove the all-or-nothing dependency on retained parcel geometry. Build a standalone, explicitly user-supplied site input/sketch that can pass a scaled approximate shape to the existing geometry engine, while facts-only input remains useful when a shape is unknown. Parent #139; depends on integration PR #158.

## Scope and acceptance
- Own frontend/src/manual_site/**, a small documented output contract and docs/manual-site-input.md. No App.tsx, occupied_lots, builder_demo or central documentation edits. The parent/entry-flow owner mounts this component after review.
- Reuse existing Case/Site and source structures where valid. Return manual facts separately from optional usable geometry. An address/area is not enough to infer a parcel shape; require explicit geometry dimensions or scale. A plainly labelled approximate rectangle with user-entered width/depth is sufficient initially. Do not portray it as surveyed or geocoded land.
- Let a user supply existing structure rectangles and placement in the same explicit coordinate frame; distinguish unknown obstruction coverage from a confirmed empty list. Capture source/user attribution and invalidate confirmed output on edits. Preserve imported geometry and corrections separately if offering correction mode; do not overwrite source observations.
- Existing engine requires projected metre CRS. If local metre sketches need support, implement one explicit engineering/local frame marker and a narrow deterministic path in app/scouting_geometry/**. Never label arbitrary local coordinates EPSG:3157, infer a real geolocation or weaken rejection of other invalid CRSs. Keep GIS and local frames distinguishable in payload, output and display. Document any boundary change and coordinate it before the other worker consumes it.
- Unknown/missing geometry produces no distances; unknown buildings do not establish clear space. Partial supported containment/boundary measurements may be returned with missing obstruction checks explicit. Do not add legal setbacks, automatic site fit, model placement search or a GIS dependency.
- Verify a user-entered scaled site -> actual API -> partial measurements chain with an independently calculable rectangle case. Verify malformed scale/dimensions, local/GIS mismatch, edit invalidation and incomplete obstruction coverage. Extend existing tests for these concrete risks; no implementation-mirroring tests.

## Handoff
Export a standalone ManualSiteInput component and document exact props/output plus a minimal caller example. Preserve current retained-site API and existing callers. No public source or address lookup can silently invent a geometry association. The builder entry task can run concurrently; combined mounting and final browser checks depend on both PRs.

Use Sol medium. Read AGENTS.md, README.md, docs/architecture.md, docs/quality.md, docs/visual-identity.md and docs/builder-screening-demo.md. Personal QuinnPaterson96 only: git name quinnpaterson96, email 60762693+QuinnPaterson96@users.noreply.github.com; GH_CONFIG_DIR C:/Users/quinn/.config/gh-quinnpaterson96. Verify origin, author/committer and authenticated account before commit/push. No force-push, work credentials, Styx resources, outreach or accepted publication. Use owned disposable DBs only if tests need a DB; this task should normally be stateless. Own a separate preview; do not stop ports18098/18136. Do not merge or spawn agents. Create and attach a scoped PR with source/interface distinctions, actual checks, demo steps and explicit remaining gaps. Parent owns integration and shared docs.

## Prompt for #147 follow-up

Use a fresh browser-only participant against the coordinator's reachable frozen preview
at localhost18136, code e52596b. Before source/report access, choose Victoria parcel 87
and aux box Model 300 through visible UI, explore a supplied placement, rotate/revise
and remeasure, then find a useful unsent summary. Explain what is measured, unknown
and worth asking next. No prescribed successful placement or expected measurements.
No provider contact or legal judgment. Record actual interactions and separate app
behavior, agent limitations, hypotheses and source gaps. Read project instructions
before writing code/files; seal browser observations before inspecting implementation.

After recording the isolated run, own docs/usability/builder-demo only. Produce an
attributed report and acceptance plan for the forthcoming builder/manual-input journey.
Use available narrow-screen/keyboard checks without overstating what was observed.
Keep controlled delay/outage and human validation separate. Apply the same personal
Git identity, PR handoff and testing restraint instructions above. Open a scoped PR;
no runtime edits, merging or further agents. Final builder-flow execution requires
#159/#160 integration and a newly identified reachable preview.
