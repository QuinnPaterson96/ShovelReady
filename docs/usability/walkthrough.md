# Browser rehearsal evidence · 2026-09-24

## Provenance and limits

Exercised implementation: commit `3f74790c9ba83e71069933c163452cc76f708bfd`.
The browser run occurred immediately before committing those unchanged UI/fixture
files. Fixture version: `synthetic-preview-v1`; Git blob:
`55279b9277939812d086c271538676185dd2fc57`.
The subsequent commit adds this report only. No accepted data or deployment changed.

Environment: Windows, Node 22.14.0, Python 3.12.3, uv 0.12.17; Vite on
`http://127.0.0.1:5173/`. The actual browser was Codex's in-app browser. Edge was not
available through the configured browser controls, so no Edge behavior is claimed.
Accessibility-tree observations and viewport screenshots were inspected through
the browser tools. Screenshots were shown in the task tool record; this file retains
the navigation and visible-text evidence below, not a video or separate screenshot bundle.

**Author/tester overlap:** the same coding agent authored the fixtures, script and
rubric and performed the walkthrough. It already knew their content. During the
first UI pass it selected actions and read answers from the rendered labels and
disclosures; it did not inspect application state, read fixture files, or call a
hidden answer endpoint to complete tasks. This is an author rehearsal, not a blind
test, independent validation, or a simulation of measured human behavior.

## Actual navigation and visible evidence

| Step | Action performed | Visible evidence returned by the browser |
|---|---|---|
| 1 / A | Opened the local page; default selected example A. Focused the evidence disclosure and pressed Enter. | Banner: “All examples are synthetic.” Outcome: “Candidate”; “Supplied placement only.” Exclusions listed building code, servicing, title, overlays and placement search. Open evidence showed `<= 0.45 fraction (original: 45%)`, `occupied_site_area / lot_area`, section A, `synthetic-rule-A-r1`, snapshot v1. Capture `2026-09-24T12:00:00Z`; legal effective from/to “Unknown”. |
| 2 / B | Set the labeled selector to “Synthetic example B”. | “Needs investigation”, “missing fact”, approval “unknown”. Missing-fact list: “Roof peak from foundation datum”; “Regulatory grade and height definition”. Explanation: “Ceiling height cannot establish regulatory height.” Evidence disclosure reset to closed for the new example. |
| 3 / C | Pressed Down with the selector focused; clicked the evidence disclosure. | Selected C. “No match under evaluated pathways”; saved assertion “1 m setback against a 2 m minimum. Another placement has not been assessed.” Open evidence showed `>= 2 m`, original `2 m`, basis “Fictional distance to rear line”, section C and `synthetic-rule-C-r1`. |
| 4 / D | Set the selector to “Synthetic example D”. | “Needs investigation”, “outside coverage”, approval “unknown”. Explanation: “This fictional site is outside the saved dataset coverage. No zoning exclusion can be inferred.” |
| 5 / E | Pressed Down from D; Tab from the selector, then Enter. | Selected E. “Needs investigation”; approval “conditional”; condition “Resolve fictional Schedule X before an approval conclusion”. Expanded evidence showed runtime support “unresolved”, “unresolved reference: Fictional Schedule X / approval condition”, section D, capture timestamp and unknown effective dates. |
| 6 / F | Set the selector to “Synthetic example F · archived result”. Tab/Enter opened original evidence; another Tab/Enter opened the comparison. | Banner “Archived result pinned to synthetic-release-1.” Original remained “Candidate”, result `synthetic-evaluation-6`, rule `synthetic-rule-A-r1`, threshold 45%. Comparison showed `synthetic-evaluation-6-corrected`, `synthetic-release-2`, “No match under evaluated pathways”, `synthetic-rule-A-r2`; same `synthetic-design-r1`, `synthetic-site-6-r1`, `synthetic-placement-6-r1`. |
| 7 / F source | Tab/Enter opened the corrected result's evidence. | Section E: “Fictional correction changes A to 35%; the same saved 0.40 example fails in release 2.” Threshold `<= 0.35 fraction (original: 35%)`, same ratio basis; snapshot v1; capture timestamp and unknown legal effective dates. Original and corrected result were both present in the page. |
| 8 / health | Initially used preview without API. Started the existing local API with `SHOVELREADY_ENV=test` using locked dependencies; reloaded. | Before: “Backend unavailable — start the local API and reload.” After: “Backend reachable”, followed by the existing liveness-only/no-accepted-dataset limitations. Reload reset the selection to A, as documented. |
| 9 / layout | Inspected viewport screenshots after opening corrected evidence, after health reload and after Ctrl+Home. | At the observed 763 × 493 viewport, the source disclosure had a visible blue focus outline, wrapped text, and readable threshold/basis. The top screenshot showed the synthetic banner; lower screenshot showed the health state. This does not establish phone layout or a full accessibility audit. |

The first element-targeted Enter attempt reported a browser-tool preparation timeout
and sent no input; the returned tree showed the disclosure focused. Enter on the
focused control then expanded it. Later Tab/Enter sequences worked. This is a tool
interaction failure, not evidence of an application keyboard defect.

The HTML-like source probe appeared literally as
`<img src=x onerror="alert(1)"> & <script>alert(1)</script>` in expanded evidence.
The page remained usable and no dialog interrupted the walkthrough. React renders
these strings as text children; no HTML injection or generated-code execution is
used. This is a bounded inert-rendering check, not a comprehensive security test.

## Findings ledger

| Category | Finding | Evidence / next step |
|---|---|---|
| Observed UI defect | None established in this narrow run. | Selection, text states, disclosure navigation, comparison and both health states behaved as described above. Do not interpret this as proof of usability. |
| Model-generated usability hypothesis H1 | Repeated identities, scope exclusions and conditions may make the next action difficult to find. | Long page observed; no human confusion observed. Ask actual coordinators to perform B/C without navigation hints. |
| Model-generated usability hypothesis H2 | “As of right” may be read as actual approval even with the adjacent limitation. | Literal wording observed in A/C/F; human interpretation untested. Use A/C tasks with likely users and record their actual explanations. |
| Model-generated usability hypothesis H3 | Source dates behind the evidence disclosure may be missed. | Dates are inside the collapsed control. Ask reviewers to complete E/F without telling them where dates are located. |
| Unverified behavior | Screen-reader announcements after selector changes; mobile/narrow layout; browsers other than the in-app browser. | Keyboard focus and visible labels were checked; no assistive-technology session or mobile viewport run performed. |
| Unverified behavior | Human satisfaction, hesitation, completion time, savings, demand, legal accuracy and real fit. | No human participants, live enquiries, professional review or real evaluator. No metrics claimed. |

No consequential observable UI defect arose that justified adding a new UI regression
test in this pass. The focused saved-data checks guard uncertainty claims and release
mixing; they do not stand in for browser interaction tests or legal expectations.

## Deterministic verification

- `npm ci`: completed; installed 74 packages, audit reported zero vulnerabilities.
- `npm run typecheck` and `npm run build`: passed; Vite built 32 modules.
- `uv run --locked python docs/usability/check_fixtures.py`: 3 tests passed. Validated
  seven saved `EvaluationResult` payloads, their rule/source payloads and evidence,
  retained source bytes, uncertainty rejection and corrected-rule/release separation.
- `uv run --locked ruff check docs/usability/check_fixtures.py`: passed.
- Existing database-free contract suite: 14 tests passed.
- `git diff --check`: passed.

During authoring, typecheck caught ES2020 `replaceAll` use and an overly narrow
inferred correction-rule type; both were corrected before the browser pass. The
artifact hash check caught Windows newline translation; exact LF source bytes and
a scoped `.gitattributes` fixed it before the pass. Distinct scenario release IDs
avoid assigning different rule sets to one release. No shared dependencies or CI
were modified. Final verification uses the locked environment (Pydantic 2.13.5),
not only the initially available system Pydantic.

## Handoff

SR-12: reuse the presentation with a validated API adapter and supported source
retrieval. Cover optional rule references and other contract states before replacing
these fixtures. SR-16: use the separate goal script and rubric with actual or likely
users; establish understanding and workflow value from observations. H1–H3 are study
questions, not findings about people. Real source applicability, design/site/placement
inputs, evaluator integration and customer validation remain outside this preview.
