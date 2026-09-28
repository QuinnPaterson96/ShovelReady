# Builder demo foundation integration

September 27, 2026. Base main `1d0e199`; incorporates #154 (`5f2770b`), #155
(`a37ae2f`), #156 (`e36dab6`) and #157 (`9d8ad93`). Runtime verification is pinned
to integration code commit `e52596b`; later changes in this PR are documentation.
Each input PR passed required CI. Final integration-head CI must pass before merge.

## Implemented and corrected

- Map-first placement, labelled metric nudges, explicit recenter/clear, navigation
  retention and grouped partial results are integrated with the local scenario and
  unsent enquiry component. Missing/currently edited measurements cannot export.
- Review found that missing overlap rows could yield a no-overlap headline. The UI
  now requires observed containment and an observed overlap relation for every captured
  building, while preserving any known conflicts when other measurements are unresolved.
- Restored provider service/footprint notes and source date/link in the default and
  copied model information. The Landing's captured service exclusion is no longer hidden.
- Enquiry comparisons now derive target and user/source attribution from the actual
  requirement, and scenario export rejects changed named boundaries or capture metadata.
- #154 records a connection-refused baseline attempt. It is integrated as a blocked
  attempt, not evidence of a successful user journey. #147 remains open.

## Verification

From the integration checkout: `npm ci --prefix frontend`, `npm test --prefix frontend`
(60 passed), `npm run build --prefix frontend` (TypeScript and Vite passed), and
`git diff --check`. The existing large-bundle advisory remains. Added regressions target
the reproduced missing-measurement and provenance failures, using the retained producer
fixture; they do not establish the correctness of surveyed or regulatory facts.

Local database tests were not rerun for frontend/documentation changes. Required CI
checks backend, frontend, container startup and the isolated native Windows database
lifecycle. No live models, production resources or data publication are involved.

A database-free preview at `http://127.0.0.1:18136/` serves the frozen code commit
`e52596b4a900048bcfbeb1302b0af1dc3cb95559`. Both API and frontend identity were set to
that commit before starting. Existing previews were not stopped. The first browser
navigation preceded readiness and was refused; a fresh tab then loaded successfully.
For repeat launch, build that clean commit with `VITE_APPLICATION_COMMIT` set to its
full hash, then run `python -m uv run --locked uvicorn app.main:app --host 127.0.0.1
--port 18136` with `SHOVELREADY_APPLICATION_COMMIT` and `SHOVELREADY_FRONTEND_COMMIT`
set to the same hash. No database configuration is needed for these retained packets.
Use another explicit port if occupied. Port availability alone is not readiness.

Coordinator browser observations (implementation-aware, not blinded user validation):

- Selected aux box Model 300 on VIC-087. Catalogue populated 3.048 m width and 9.144 m
  depth, with unreviewed source and service/footprint caveats visible.
- Explicit recenter at (473693.57, 5362187.76), rotation 0: 27.87 m2 captured-roofline
  overlap, parcel-boundary distance about 5.35 m.
- User-supplied centre (473689.18, 5362171.53), rotation 90: contained, no captured
  roofline overlap, about 1.21 m to parcel boundary and 1.94 m to Roof 1. These are
  nominal-rectangle observations against approximate captured geometry, not zoning fit.
- Editing position/rotation removed the prior download controls and displayed the
  remeasurement explanation. A new measurement produced a current enquiry/export.
- Browser-downloaded JSON was read back and matched the full retained site and catalogue
  model objects, plus the submitted dimensions and rotation. Downloaded text contained
  the Model 300 measurements and no raw hashes. The browser download-event wait timed
  out, but actual files were subsequently verified; that tool timeout was not a failed
  app download. Files used were `shovelready-scenario-v1.json` and
  `shovelready-provider-enquiry-draft.txt` in the local Downloads directory.
- Automatic clipboard copy reported unavailable and selected the text for manual copy.
  That fallback was visible. Automatic clipboard success is not claimed.

A fresh browser-only agent task has been dispatched under #147 against this reachable
build. Its report and any narrow-screen/keyboard follow-up will be reviewed separately;
neither it nor the coordinator walkthrough measures human demand or time saved.

## Remaining gaps and next owners

| Gap | Impact | Owner / next action |
|---|---|---|
| No company-specific entry, intake or facts-only enquiry | The commercial offer is still a plan around a general workspace | #159 builder journey worker |
| Only three retained site geometries; no manual scaled site fallback | Arbitrary addresses cannot reach useful placement geometry | #160 manual-site worker; #139 remains open |
| Fresh report and controlled delayed-response/site-outage checks incomplete | Not all composed recovery and comprehension claims are verified | #147 QA worker/coordinator |
| Current source applicability and accepted publication missing | Geometric observations cannot establish zoning compatibility | #104 source reviewer and existing publication tickets |
| Controlled model revision/envelope/height and site service unconfirmed | Nominal rectangle cannot establish installed clearance or delivery feasibility | #124/#125 manufacturer evidence work |
| No builder-approved intake or willingness-to-pay evidence | Selection of aux box is a reference case, not a customer commitment | #16 product owner; demonstration then interviews |

The [next-wave assignments](backlog/builder-demo-wave.md) separate runtime ownership.
The builder flow and manual component can be implemented in parallel; combined mounting
and complete builder-journey validation follow both. No company outreach is dispatched.
