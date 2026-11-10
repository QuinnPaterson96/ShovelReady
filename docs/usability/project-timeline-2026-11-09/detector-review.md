# Assessment B — independent detector and browser evidence

Target: frontend/src/project_timeline/ProjectTimeline.tsx and frontend/src/project_budget/ProjectEconomics.tsx. Workspace: C:/Users/quinn/.codex/worktrees/project-timeline/ShovelReady. URL: http://127.0.0.1:8046. Review date: 2026-11-09. Assessment A was not read. Product code was not edited.

## Deterministic scan

One invocation: `impeccable.cmd detect --json frontend/src/project_timeline/ProjectTimeline.tsx frontend/src/project_budget/ProjectEconomics.tsx`. Exit 0; exact stdout `[]`. Two requested markup targets; zero primary findings and zero advisory findings; no rule names or file locations to report. Help confirms multi-target arguments are supported. No false positives. This is regex-based TSX evidence, not proof of rendered accessibility. Civic Atlas's system font, teal, quiet borders and explicit provisional outcomes are intentional, not defects. No critique ignore.md was present.

## Browser method and limits

Native CUA browser was attempted first. Chrome connection was unavailable; browser inventory exposed in-app browser. Visible IAB is unavailable inside subagent threads, so a fresh hidden IAB tab was created, inspected, and closed. Read-only evaluate supports geometry; it explicitly cannot perform mutable injection. Therefore no detector overlay was injected, no user-visible overlay exists, and no live-server helper was started. Fallback evidence is CLI plus actual native screenshots/DOM geometry. Root's 8046 app server was left running. Temporary 390×844 and 1440×1000 viewport overrides were reset.

Path exercised: Try an example → Skip rental estimate → View and adjust timeline → Adjust permits → From/To keyboard order → reversed range and recovery → Restore permits default → Timing sources and assumptions. Screenshots were inspected in native tool output at both sizes. No screenshot files were written by this assessment.

## Observations

- At both 390 and 1440, document horizontal overflow was 0 px. Headlines, stages, explanatory copy, and dates wrapped inside the page.
- Native disclosure keyboard Enter opened the timeline and permits editor. Tab from From Permits reached To Permits. The focused input has a clearly visible teal focus outline in the actual screenshot.
- Phone targets: timeline disclosure 283×45.375 px; date 271.8125×44; selects 271.8125×46.375; stage disclosure 271.8125×49.969; duration fields 124.3125×44. Desktop open duration fields 202×44; restore button 207.484×46.781. These measured controls meet Civic Atlas's 44 px height floor.
- Summary leads with 16.1–29 weeks and calendar dates, qualified as from project start / editable planning scenario. Detailed origins identify planning allowance, municipal target + planning allowance, and manufacturer estimate / unreviewed. Source drawer clearly distinguishes 20-business-day review target from permit issuance. Those are useful disclosed defaults; no additional warning gate is recommended.

## Concrete findings for synthesis

1. **P2 — validation is distant from the offending field.** With Permits lower=6 and upper=2, a correct plain-language error appears in `.timeline-errors` above all stages. On the phone during entry, its top was −735 px while the edited upper field was at 193 px. Neither bound exposes aria-invalid nor aria-describedby. A screen-reader status may announce the global error, but sighted users receive no nearby indication and cannot discover the recovery text without scrolling back. Location: ProjectTimeline.tsx:8–15 (Bounds inputs), :52 (global error), :62–66 (stage editor). Add concise per-stage inline feedback associated with the offending bounds; preserve the overall readiness result and retain the existing unknown behavior. This does not require new confirmations.

2. **P2 — the selected manufacturer scope truncates at phone width.** At 390 px, the closed select reads `Contract to delivery, including p…`; the decision-relevant permit dependency is cut off. Location: ProjectTimeline.tsx:46–49. Later overlap prose partly recovers context, so this is not a blocker. Shorten the visible option to a readable scope name and put the qualification in nearby wrapping text, or provide the current scope as a wrapping caption.

3. **P3 — label text is unnecessarily split across two rows.** From/To and `(weeks)` render on separate lines even at desktop, because the label has flex-column children around an inline visually-hidden stage span. Actual desktop screenshot shows From, then (weeks), then input. Location: Bounds at ProjectTimeline.tsx:11–14; project-timeline.css:12. Wrap the complete visible text in one span while retaining a single accessible stage-specific name.

4. **P3 — expanded settings inherit excessive vertical spacing.** Phone screenshot uses nearly a screen from disclosure through three settings; measured labels have a 22.4 px inherited top margin in addition to the grid gap, and selector labels are 104.765 px tall. Timeline with just permits open is 3840 px high on phone / 2733 px desktop. Location: project-timeline.css:10–13. Reset margins within the settings grid and preserve readable grouping. The six-stage content remains valuable, so reducing evidence solely to shorten the page is not recommended.

## Remaining review gaps

No real device/iOS autozoom check, screen-reader announcement test, first-year-rent checkbox geometry, zoom-to-200% check, or actual customer comprehension study was performed. The native browser could not install an isolated external-network route; the existing example performed its usual municipal lookups, which were incidental to this timeline-only review. No source accuracy, accepted publication, legal evaluation, or database tests were claimed. Root can use existing integration coverage for scope changes and income behavior; this evidence supports one bounded UI correction batch.
