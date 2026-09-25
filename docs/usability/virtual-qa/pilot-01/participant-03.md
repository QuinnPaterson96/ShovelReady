Original review note: **Example A has an evidence-access limitation:** its expanded “Inspect rule and source evidence” panel displays `Retained file: docs/usability/synthetic-source.txt` and a SHA-256, but offers no visible link or open/download control for that retained file. I could read the inline excerpt, but could not access the retained source through the displayed UI. This does not establish that the file is missing.

Selected result: **Synthetic example A / `synthetic-evaluation-1`**, dataset `synthetic-preview`, release `synthetic-example-1-release-1`, rule `synthetic-rule-A / synthetic-rule-A-r1`.

No numeric inconsistency found: the result says “Saved assertion: occupancy / lot area 0.40 fraction is at most 0.45”; the expanded source says “Fictional occupancy / lot area maximum 45%,” and “Threshold: <= 0.45 fraction (original: 45%). Basis: occupied_site_area / lot_area.” Evidence references: operations 03, 05–06 and 09.

Numbered operation ledger (tool-call titles):

1. **01 Open local application in participant tab** — Created background tab at `http://127.0.0.1:18233/`; initial state displayed Investigation mode.
2. **02 Select Fictional preview** — Selected “Fictional preview · synthetic saved scenarios.”
3. **03 Read Fictional preview choices** — Selector showed “Synthetic example A” selected; heading and result identity verified. Displayed “Candidate,” `synthetic-evaluation-1`, and the passing assertion above.
4. **04 Open example A rule and source evidence** — Clicked “Inspect rule and source evidence.”
5. **05 Read example A evidence** — Expanded panel displayed source excerpt, threshold, snapshot `synthetic-preview-snapshot-v1`, retained path and SHA-256. Retained path was text, with no link/button in accessibility state.
6. **06 Capture rendered example A evidence panel** — Screenshot verified pass assertion, expanded evidence, 45% source and 0.45 threshold.
7. **07 Scroll to retained source reference** — Scrolled down to lower evidence details.
8. **08 Read lower source evidence state** — Accessibility state reported no tree change after scrolling.
9. **09 Capture retained source reference** — Screenshot showed “Retained file: docs/usability/synthetic-source.txt,” SHA-256 `ab719f7a08437260d730f21153f9fa437bbbde8d81858b072c1a1e122af9acc2`, and no visible source-opening control.
10. **10 Close participant review tab** — Closed only my tab.

**Tool failures:** None. **Total:** 10 browser operations.
