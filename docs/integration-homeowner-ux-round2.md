# Homeowner UX round 2 — combined integration

Prepared for review on `codex/homeowner-ux-round-2`, starting from main `0a8af322`
plus prefab generalization #295 (`3a0edd4`). No main merge, deployment, provider
submission or accepted-data publication is authorized/performed in this round.
Combined PR: [#299](https://github.com/QuinnPaterson96/ShovelReady/pull/299).
Property [#297](https://github.com/QuinnPaterson96/ShovelReady/pull/297), results
[#296](https://github.com/QuinnPaterson96/ShovelReady/pull/296) and outputs
[#298](https://github.com/QuinnPaterson96/ShovelReady/pull/298) target the integration
branch. Their original slice handoffs describe earlier wiring gaps; the combined
verification below supersedes those gaps where explicitly completed.

## Implemented

- Exact source identity plus canonical equivalent geometry permits grouping;
  source records remain recoverable. Same address/near-equal area alone does not.
  Actual 601 Su’it candidates have PIDs 008-094-764 / 008-094-772, different adjacent
  polygons and areas 756.043994418 / 755.624434726 m². Keep both choices. The shared
  282.491 m² roof intersects them by 123.206 / 156.399 m² respectively. This is
  concrete property-identity uncertainty, not proof of one combined legal lot.
- Compact selected-property summary, explicit Change and non-destructive alternate
  parcel inspection. Roof discrepancies are quantified in accessible source help;
  material multiple-parcel context is shown once and retained in the enquiry.
  Recipient wording is first-person; the selected PID appears in the plan and
  multiple-parcel enquiry, rather than leaving the provider to guess the parcel.
- Deliberate property changes use neutral wording, clear placement/streets/site
  answers and site-specific enquiry question/response, retain model/use/timing/
  budget/contact preferences. Inspecting/reopening without selecting another site
  does not reset answers. Latest callback delegation fixes a reproduced stale
  property-confirmation closure.
- Intended use is requested early. Blank and Not sure stay distinct unknowns;
  office/other use does not inherit garden-suite comparisons. The same mapping
  supplies screen, report, enquiry and drawing. Technical evidence retains raw
  exploratory scenarios with an explicit scope annotation; it does not promote
  those hypotheses into current unknown-use findings.
- During same-property/model recalculation, a coherent previous summary and its
  matching use qualification remain labelled Updating checks. Property/model
  switches immediately remove the other scope. Request identity/abort guards
  reject late responses. Relevant edits invalidate dependent acknowledgements;
  review alone does not. Acknowledgement advances workflow, never resolves evidence.
- Current-input guards cover copy/save, enquiry confirmation and provider draft
  preparation. Enquiries/exports are unavailable while recalculating. Asynchronous
  drawing/PDF work checks complete input identity again before downloading.
- Three summary groups retain detailed evidence statuses. Concise material concerns
  and next actions precede the default-open checklist. Role/margin illustrations
  use native disclosures and retain the obvious unknown path.
- Requested response opens the enquiry once; distinct custom questions remain among
  provider questions. Planning questions and sender preparation remain separate.
  Primary Save enquiry PDF includes the actual current approximate drawing; PNG,
  placement PDF, Markdown, ZIP/evidence and unsent email attachments remain available.
  Gap callouts use protected gutters; connectors cannot cross their text. Plan
  inclusion note belongs on the plan page, with one heading and readable paragraphs.

## Verification categories

Software: `npm test --prefix frontend` passes all 171 behavioral checks;
`npm run build --prefix frontend` passes TypeScript/Vite (existing large-chunk
advisory). Tests cover incomplete/unknown streets across navigation, unchanged
review, selective acknowledgement invalidation, conflict acknowledgement, explicit
unknown use across human documents, late geometry/request rejection, property
callback updates, equivalent versus different candidates and model switches.
Expected geometry/equivalence cases are independently described; replay does not
establish source/legal accuracy.

Backend compatibility: `python -m uv run --locked pytest -q
 tests/test_model_catalogue.py tests/test_model_research_intake.py` passes 34 checks;
`ruff check app/model_catalogue tests/test_model_catalogue.py`, model build_demo
`--check` and build_snapshot `--check` pass. No local database tests, remote database
resources or live model calls were used. Required final-head CI is recorded on #299;
CI supplies isolated disposable database/container checks.

Actual public-source reads: BC Geocoder and Victoria parcel/roofline/zoning/property
scan APIs were exercised through the local app for 601 SU’IT ST and 419 Cecelia Rd.
Su’it identity/geometry findings are retained in the source fixture and property
slice handoff. Capture dates are UTC (October 8), during the October 7 local session.
These observations are unreviewed; no source acceptance or legal conclusion follows.

Root exploratory browser review: final composed local build on port 8013, both
Su’it parcel choices and second-PID placement; Cecelia PID 008-118-221; saved Parcel
87. Explicit unknown streets survived advancing/review. Preferences survived site
change while site-specific answers cleared. Unknown use and Studio/300 switching,
rapid keyboard moves, current-only outputs, 390×844 layout and keyboard enlarged
preview/Escape were exercised. This is agent QA, not real homeowner validation.

Actual downloaded outputs: all eight PDF pages below were rendered with Poppler
and inspected. `pdfinfo -url` verified annotation destinations, including sanitized
public parcel/building layers for unknown use. Query-level source references remain
unchanged in technical evidence. Artifacts are retained locally under
`C:/Temp/ux-round2-review`; they are QA evidence, not accepted source publications.

| Actual case/output | Observed result |
|---|---|
| Saved Parcel 87, Model 300, Garden suite (`saved-final-source-enquiry.pdf`, 3 pages) | Explicit saved-example labels; 0.7 m² outside parcel, 1.6 m² roof overlap and 0 m main-home gap against candidate 2.4 m retained; 10 clickable source annotations |
| 419 Cecelia Rd, PID 008-118-221, Model 300, Not sure (`cecelia-final-source-enquiry.pdf`, 2 pages) | Requested call leads; intended use remains unconfirmed; physical 27.4 m² overlap retained; no applicable garden-suite passes; large main-home outline labelled unverified; 4 clickable physical-source annotations |
| 601 Su’it St, selected PID 008-094-772, Model 300, Garden suite (`suit-final-source-enquiry.pdf`, 3 pages) | Selected PID visible in message and plan; first-person parcel-scope question; 1.3 m² roof overlap and candidate main-home concern retained; 10 clickable source annotations |

The final Cecelia ZIP was downloaded and unpacked: seven expected files, readable
recipient Markdown with working relative drawing reference, separate sender
checklist/report/JSON, and both drawing formats. No prior Su’it/Studio content or
unknown-use height promotion appears in its human documents. JSON explicitly
records `selected_use: null`, `garden_suite_comparisons_applied: false`, current
evaluation state and the supplied Not sure/Prefer not to say/call answers.

Independent browser testing was attempted, but the tester’s CUA inventory exposed
no browser. No independent UI pass or real-user validation is claimed. The
independent agent reviewed the actual recipient artifacts to assess whether a
provider could understand the project, current concerns and requested response.
Its earlier selected-PID, source-link, courtesy-only-page and unknown-use count
findings were corrected and reinspected. Final review of all three cases found no
material blocker to an initial provider conversation: messages and plans agree,
with explicit project intent, unresolved concerns and requested responses. Short
second message pages containing relevant DPA information, dense Su’it connectors
and MapServer caption wording remain nonblocking polish. The independent review
record is retained at `C:/Temp/homeowner-current-recipient-review.md`; this is agent
artifact review, not human validation or verification of legal/source accuracy.

## Review setup

Build frontend, then PowerShell `$env:SHOVELREADY_ENV='demo'` and
`python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8013`.
Open localhost, Explore prefab models, select intended use and a named case. Search
uses public read APIs; local assessment and exports require no database. Do not
submit provider forms or send the generated enquiry during verification.

## Remaining gaps and next actions

| Gap | Practical impact | Next owner/action |
|---|---|---|
| Rasterized, untagged PDF text | Readable/Unicode-safe but not searchable or screen-reader structured; Markdown remains editable/accessible | Export/accessibility owner: licensed Unicode font plus tagged/vector PDF follow-up |
| Short message page before the plan in some PDFs | Relevant DPA content can occupy a mostly empty second page | Export owner improves paragraph pagination without shrinking text or omitting material findings |
| Su’it legal-lot/project scope | Choosing one adjacent mapped parcel cannot establish combined ownership or boundary scope | Homeowner/source owner obtains title/survey and confirms which parcel(s) the project concerns; no automatic polygon union |
| Independent browser surface unavailable | Root walkthrough and fixture tests do not supply an independent UI pass | Product/testing owner reruns independent browser and actual homeowner/provider walkthrough, #147 |
| Background-browser clipboard outcome not confirmed | Copy handler integration passes; local background session did not produce a matching clipboard read | QA owner verifies foreground clipboard and fallback on supported browsers before release; text/Markdown downloads remain usable |
| Controlled provider drawings, measurement faces/grade, applicable rules and source acceptance | Preliminary geometry and candidate comparisons cannot become accepted real evaluation | Data/provider owner obtains controlled plans; City/professional review and separate publication process, #104 |
| Wider address ranking and licensed product images | Weak alternatives still visible; neutral source-link preview remains | Separate follow-ups #234 and #199; not folded into this round |
| Automatic street context | Streets still require explicit user input; unknown stays unresolved | Research #289, not an implementation dependency |
| Persistent whole-journey recovery | Tab recovery retains separate enquiry text, not a verified restored assessment | Persistence owner SR14; user must reselect/recheck after reload |

No parent acceptance gate is closed by software success alone. Existing source,
publication, persistent-pilot and human-validation gaps remain explicit.

