# Attributed virtual-homeowner walkthrough — frozen occupied-lot preview

Date: 2026-09-27. Tester: Codex agent acting from a homeowner task brief, not a human customer. Preview: `http://127.0.0.1:18136/`, application and frontend build `e52596b4a900048bcfbeb1302b0af1dc3cb95559`, both read from the visible technical build disclosure. This report is exploratory software and usability evidence. It is not human timing, demand, source acceptance, a legal interpretation, or independent verification of geometry arithmetic.

## Task and method

I used a fresh background browser tab and visible UI only before recording the findings below. The task was to select aux box Model 300 on retained Victoria parcel 87, explore and revise a placement, measure it, and find an unsent summary useful for a builder. I did not invent an address or dimensions, contact the provider, inspect source or API data during the first pass, or make an eligibility judgment. Browser screenshots were captured at model selection, map placements, result, handoff, and the 390 px view in the tool session; this browser interface did not expose a supported way to retain those captures as repository files. The observations and exact values below are the portable record, not a claim that screenshots are preserved.

## Observed path

1. From Home, I opened **Occupied-lot sketch**. Victoria parcel 87 was already selected and labelled a City of Victoria capture from 2026-09-26, unreviewed. The page warned that parcel-intersecting rooflines are not walls and the sketch does not establish site fit or permit eligibility.
2. I selected **aux box · Model 300**. The UI filled a 3.048 m nominal width and 9.144 m nominal depth. It labelled the provider measurements captured 2026-09-25, unreviewed, with no supplied manufacturer revision. It also said the installed envelope, roof projections, Victoria service and site feasibility need confirmation.
3. I used **Recenter rectangle on parcel** as an explicit starting point, then **Measure this placement**. The page reported 27.87 m² overlap with captured Roof 1, 5.35 m to the captured parcel boundary, and 0 m to Roof 1.
4. I changed rotation from 0° to 90° and moved south by one 1 m step. The prior measurement disappeared until I measured again. The revised result still reported 27.87 m² roofline overlap and 0 m roofline distance; captured-boundary distance changed to 2.69 m.
5. I clicked the upper teal part of the parcel away from the purple roofline. The measurement again cleared. After remeasurement, the page reported **no parcel crossing or captured roofline overlap observed at this position**, with 1.06 m to the captured parcel boundary and 8.42 m to Roof 1. The summary identified the supplied rectangle centre as `473694.35, 5362203.27` in EPSG:3157, rotated 90°. This is one approximate placement; the result explicitly said it did not establish clear space.
6. The result included a copyable plain-language summary and a separate **Draft provider enquiry · unsent**. The draft provided source links, measured observations, caveats, and questions about a controlled drawing, installed envelope, access, foundations, services, and local service commitments. I did not copy, download, or send it. The visible flow ends with a local handoff, not provider contact.

My homeowner-style takeaway would be: the nominal Model 300 rectangle can be sketched in the northern part of this retained parcel without touching the captured roofline in that one measurement, but the captured boundary is only 1.06 m away. The distances refer to the supplied rectangle and captured parcel/roofline polygons, not surveyed legal boundaries, walls, installed projections, setbacks, access or utilities. I would take the unsent summary to a builder as a question list and seek controlled model dimensions, a site survey/current building layout, and site/service review before treating the sketch as a workable plan.

## Narrow screen and keyboard supplement

After the initial record, I temporarily set the browser viewport to 390 × 844 px. Navigation wrapped into multiple rows; the parcel picker, map, legend, selected Model 300 details and measured-result text remained readable in the portions inspected, with vertical scrolling. I did not exhaustively audit all controls or assistive technology. I reset the viewport afterward.

The focused map accepted `ArrowRight`: after a measurement at centre X `473694.11`, pressing the key on the map cleared the stale result, and remeasurement gave X `473695.11` (a 1 m increase). The prior click used to focus the map changed the placement, so only the subsequent X comparison isolates the arrow-key action. Full Tab/Shift+Tab order, screen-reader announcements and focus after every control were not verified.

## Friction and classification

- **Observed copy defect, low severity:** the unsent provider draft repeated punctuation in “Victoria project service and site feasibility unconfirmed..”. It also used “later user edits cannot be determined” even though the current selected dimensions matched the captured nominal values. The latter reads ambiguously to a prospective customer; whether a narrower wording is required is a product decision.
- **Usability hypothesis:** the plain-language summary starts with exact projected XY and source/status detail. That supports reproducibility, but a builder-facing first paragraph could foreground the measured conflict/clearance and unknowns, leaving coordinates in a technical disclosure. This is an agent interpretation, not human comprehension evidence.
- **Observed boundary preserved:** the app removed an earlier result after changing rotation or placement and required remeasurement. It labelled “no overlap observed” as limited to captured features and did not claim legal permission or clear space.
- **Unverified:** clipboard behavior, saved download contents, controlled delay/outage, unsupported-address fallback, human usefulness and builder intake value. A separate timeout or clipboard result from another session is not reproduced here and is not a confirmed defect in this report.

## Evidence categories and next action

This pass verifies that the frozen build exposed a measurable candidate placement and an unsent local handoff for the retained example. It does not verify the arithmetic independently or establish the source capture's legal accuracy. The next software pass should exercise the builder entry and manual fallback against the [acceptance plan](builder-entry-acceptance-plan.md), then repeat controlled unavailable/delayed response cases and a consented human/builder review. Keep #147 open for those criteria. The builder journey depends on integrating [PR #158](https://github.com/QuinnPaterson96/ShovelReady/pull/158); this report does not claim that integration or a customer installation is complete.
