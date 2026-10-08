# Homeowner journey integration — October 7, 2026

## Ownership and implementation

Integration PR #288 combines output PR #286 (6f4335b), map PR #287
(f5681e63), and parent journey changes. Each owner used an isolated worktree.
Root owned BuilderDemo.tsx, shared journey contracts, ExampleProperty wiring,
API uncertainty propagation and integration tests. Map owned OccupiedLots,
PlacementScenarios, SiteAssumptions and BoundaryMapTools presentation. Output
owned HomeownerSummary, victoriaSummaryAdapter, manufacturer and placementExport.
Neither worker edited BuilderDemo or merged/deployed independently.

Items 1–12, 14–15, 17–20: navigation is read-only; explicit street completion
is independent from workflow progress. Partial marks and Not sure survive Next
and revisits. Unknown streets retain physical measurements while boundary/front/
yard applicability remains unresolved. Main-building separation can be measured
without street classification. The previous largest-outline correction remains
protected by the Cecelia geometry regression.

Acknowledgements depend on relevant inputs and current findings. They record
an enquiry discussion decision, never a resolved conflict. Unrelated height edits
preserve boundary acknowledgement; changing its boundary input invalidates it.
Stages collapse into editable summaries, newly opened targets receive focus,
and map labels, full-size viewing, role help and nearby concerns share one preview.
Findings identify missing information, affected checks and next actions. Intended
use and evidence qualifications carry through screen, enquiry and drawing;
recipient message, sender checklist and technical evidence are separate.

## Reproduction and software checks

Before the fix, advancing incomplete streets changed all_marked to true. The
behavioral regression failed true !== false. Evidence:
C:/Temp/journey-baseline-reproduction.txt.

Final local checks: npm --prefix frontend test (152 passed), frontend build and
typecheck passed; focused pytest for placement scenarios API, geometry and
conditional screening (55 passed); ruff app/tests and git diff --check passed.
Integration coverage checks partial/unknown streets, unchanged review navigation,
selective acknowledgement invalidation, retained conflict status, unknown use
reports, late response invalidation, section focus and coherent package outputs.
These software checks do not establish source interpretation or homeowner usefulness.
CI additionally runs disposable PostgreSQL integration and Windows database checks.
Merge is gated on final-head CI; Railway deploy and actual identity checks follow.

## Independent fresh-agent pass

A fresh virtual homeowner agent used only the browser on frozen e67532f, without
source, implementation tests or worker handoffs. This is independent exploratory
agent validation, not real human research. Record:
C:/Temp/homeowner-independent-user-pass.md.

Saved Victoria example: unknown streets, main home, suite count, waterfront,
use/installation and ownership; retained 0.7 m² outside parcel and 1.6 m² roof
outline overlap; prepared an undecided-use call request, copied text, downloaded
ZIP and inspected Markdown/PNG/two PDF pages. It continued without resolving
concerns, revisited controls, used keyboard movement and opened/dismissed the
full-size plan at 390×844. No email or provider form was sent.

Confirmed useful outcomes: uncertainty remained uncertainty, physical changes
recomputed concerns, package and enquiry retained scenario and conflict meanings,
preparation stayed separate, contact handoff remained unsent. Initial clipboard/
download-event timeouts were tool limitations; a separate copy matched the message.
The accessibility-name question was not confirmed as a defect: later accessible
snapshot identified the implicitly labelled selects correctly.

One substantive comprehension finding: a hypothetical candidate count said
0 outside scope immediately after unknown-use applicability was excluded. Fixed:
unknown/other scenario now describes those details as hypothetical prompts and
omits applicable-pass counts. Regression protects this recipient contradiction.
A follow-up independent check is requested for that report change.

## Exact cases and remaining gaps

Item 21: saved example and retained 419 Cecelia Rd geometry/API regression were
checked. The reported real flows are 1276 Richardson Street and 2018 Stanley
Avenue. The owner explicitly waived revalidation because those findings were fresh;
this round does not claim a new browser pass on either address. 419 Cecelia is a
separate geometry regression, not a substitute for either reported case.

- Item 13: civic address ranking/weak alternatives remain follow-up #234;
  affects choosing among ambiguous search results; discovery owner should finish.
- Item 16: simpler introduction/rights-cleared product image remains #199;
  no unlicensed image introduced; product owner obtains permission and asset.
- Item 22: automatic street context research #289, deliberately not a runtime
  dependency; sourced suggestions must remain correctable and uncertainty-aware.
- The checklist remains lengthy for undecided use; fresh tester found the provider
  message clearer than supporting details. Product/user-research owner should test
  a shorter disclosure with real recipients (#147), plus an assistive-technology audit.
- Accepted rules, controlled model/site facts and reviewed interpretation remain
  #104: candidate checks cannot establish accepted real evaluation.
- Real homeowner/provider usefulness remains #147. Fresh-agent success is not
  human validation. Full keyboard tab order/screen-reader behavior is unverified.
- Durable editable assessment recovery and exact-image promotion/practiced rollback
  remain SR-14/SR-15. Current tab text recovery is historical, not a current assessment.

Release verification and final commit identities are recorded in the PR handoff.

## Final live visual correction

After integration deployment, parent browser inspection reproduced invisible SVG
roof/main/model/scale glyphs despite correct accessible names and bounding boxes.
Text anchored directly at large EPSG:3157 coordinates was not painted. The focused
follow-up renders glyphs at local zero coordinates and translates each label to its
existing map anchor, matching the established boundary-overlay pattern. Geometry,
answers, measurements and finding status are unchanged. Local full-size browser
inspection confirms all four labels visibly paint. This is a parent visual check,
not independent user validation; the tester follow-up browser was unavailable.
