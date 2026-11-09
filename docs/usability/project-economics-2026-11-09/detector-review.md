# Assessment B · Project economics

Target `frontend/src/builder_demo/BuilderDemo.tsx`, slug `frontend-src-builder-demo-builderdemo-tsx`. Preview `http://127.0.0.1:5247/#examples/model-300`, frozen build asset `index-B2KgWgwF.js` as supplied. Assessment B was run in its own fresh tab and had no access to A findings. The workspace and project instructions, Civic Atlas visual rules and Impeccable critique guidance governed this pass. The supplied workspace instructions reference a provisional-screening decision file absent from this worktree. No critique ignore file or project detector config was present.

## CLI detector

One invocation of Impeccable 4.3.1 `detect --json` across the changed product markup files. Exit 0, zero primary findings, zero advisories. Full output `detector.json` contains `[]`; stderr was empty. No triggered rules, locations or false positives.

- `frontend/src/App.tsx`
- `frontend/src/builder_demo/AlternativeComparison.tsx`
- `frontend/src/builder_demo/BuilderDemo.tsx`
- `frontend/src/navigation/BuilderJourneyNav.tsx`
- `frontend/src/project_budget/BudgetSection.tsx`
- `frontend/src/project_budget/ProjectEconomics.tsx`
- `frontend/src/rental_scenario/RentalScenario.tsx`

## Native browser evidence

A first IAB creation timed out, with a Statsig initialization timeout printed during recovery. A second creation worked. The IAB was hidden for the whole assessment, with fresh tab ID 1 in IAB browser ID 2. Its documented Playwright evaluate surface is read-only and offers no mutable script insertion. Overlay preflight stopped at the API capability check. No live overlay server was started, no script ran, no overlay console output exists and the parent-owned application server was left running. Fallback signal was the native DOM/AX state, native browser screenshots and read-only DOM geometry. No Playwright process was launched outside the native tool.

- Desktop 1440 × 960. From the journey rail, the economics summary showed the $250,000 CAD subtotal, $187,000 building, $8,000 development and permit fees and $55,000 installation. It offered estimate detail, rental inclusion or skip, and a distinct primary enquiry action. Including rent then opening estimate moved to a separate in-assessment editor with model and property identity, a clear return link and side-by-side project costs and live totals. The estimate showed $2,040 expected monthly rent, $17,442 annual income after running costs and 14.3 years simple payback. The estimate stayed qualified as a subtotal and the rental figures retained their market and financing qualifiers.
- Phone 390 × 844. Actual document client and scroll widths were both 375 px excluding the scrollbar. Economics summary, detail, cost fields, and skip result fit without horizontal clipping. The three measured targets were 44 px for View and adjust estimate, 44 px for Change rental preference and 55.8 px for Continue to enquiry.
- Pressing Enter on View and adjust estimate moved focus to the dedicated h1 with visible focus. Changing Delivery and lift from $15,000 to $19,000 and tabbing to the next cost updated subtotal to $254,000 and payback to 14.6 years. Returning with the bottom Back to project link at the same phone width restored focus to View and adjust estimate, 49 px from the viewport top, and the summary retained the edit as $59,000 installation and $254,000 subtotal.
- Change rental preference focused Include rental income. Skip for now hid rental metrics, retained the cost edit and moved focus to Change rental preference. Continuing via keyboard focused Prepare a useful question. No communication was sent.
- At a desktop-to-phone viewport switch while the editor was already open, the first top Back to project action focused the estimate link offscreen (roughly 1,235 px down). A journey-rail click reached the summary after scrolling settled, and a normal phone editor return at a steady width landed correctly. The resize artifact was not reproduced in a normal same-width path.

## Browser-observed issue

**P2 · Editing on a phone separates the change from its result.** The live estimate sits above the long editor and becomes static at the narrow breakpoint. After the $19,000 delivery edit, the next focused field sat 399.5 px down the viewport while the estimate was 874.1 px above it. The subtotal and payback did update and the live region was present, but a sighted phone user needs to scroll back to see the effect. The affected breakpoint is in `frontend/src/project_budget/project-economics.css:187` and the live block begins at `frontend/src/project_budget/ProjectEconomics.tsx:137`. A compact subtotal/delta during edits or a clear jump back to live estimate would preserve access without pinning the entire rental card. The static detector returned no findings here.

**Code observation, unverified in-browser** · The editor's cost-only Include rental income button is removed when rental becomes active. The inline handler at `frontend/src/project_budget/ProjectEconomics.tsx:164` does not explicitly direct focus to the revealed rental section. The main summary's preference controls were browser verified and did restore focus.

## Evidence and cleanup

Native screenshots were emitted for desktop summary and editor, and phone summary, editor, edit focus, return and skip. The documented native screenshot surface returned bytes and emitted them in the tool transcript without a durable filesystem path. No screenshot fallback pass was added because native viewport and captures worked. This file and the detector files are retained as evidence. No temporary script or body file was created. Viewport override was reset. The hidden review tab remains temporary and auto-closes at turn end. No tracked files changed in this assessment.
