# Coverage, product baseline and verification

October 16, 2026. Documentation-only research handoff. Recipient: Quinn. Decision: choose the next inexpensive product test. Evidence remains separate from proposed changes and current accepted-data gates.

## Repository baseline and preserved work

Working checkout HEAD: `8cfbe0a8147f00fef8da7df7c7d70e1967ccc0f6`. This is the local inspected baseline, not a claim about current remote HEAD. Initial `git status --short` showed existing edits to AGENTS.md, README.md and docs/quality.md; untracked docs/reporting-standard.md plus generalizable-model-design, homeowner-flow and shared-framework research directories. Those were preserved. This new directory did not exist before the task. No branch, commit, push, PR or remote authentication was required/performed. No work identity or AWS credentials were used.

Read repository/user instructions, README.md, docs/architecture.md, docs/quality.md, docs/reporting-standard.md and historical restart/design-decision material. Inspected builder-screening-demo, conditional-zoning and live-parcel integration records, recent shared-framework/generalizable-model proposals, and implementation under frontend/src/builder_demo, evidence_checklist, conditional_screening, app/municipal_sites, app/model_catalogue. The recommendations refer to this working-tree state, including supplied uncommitted documentation, rather than treating historical proposals as requirements.

| Current behavior verified by file inspection | Consequence for recommendations |
|---|---|
| BuilderDemo.tsx / enquiry.tsx: use, timing, optional budget, access, services, question; copy/download/optional email-draft handoff | Do not recommend generic intake or unsent export as new features |
| Same journey permits preparing an enquiry with placement unknown; no automatic send | Test incomplete intake before expanding required fields |
| Nominal dimensions, roofline/parcel geometry, manual fallback, state invalidation, conditional comparison and source citations already exist | Do not call for another generic map, footprint fit check or zoning chatbot |
| evidence_checklist includes missing inputs and next actions, legal identity, survey/model evidence and service-area questions | Opportunity is concise recipient-specific responsibility/decision support; not inventing a checklist |
| model_catalogue includes provider-claimed service areas and installation exclusions | Clarify whole-project budget scope; do not claim absent exclusions |
| app/municipal_sites/api.py points to the Victoria Land service | Additional utilities/tree layers are not integrated by this adapter |
| Conditional zoning integration retains currentness/interpretation/measurement gaps and no accepted publication | Research cannot establish accepted legality or justify a general green result |

These are code/document inspections, not a fresh browser test or software validation run. No application execution was needed to assess the recommendations. Existing demo usability, accepted source review and actual builder validation remain separate.

## Search coverage and stopping rule

Searched public web sources with combinations of BC/Greater Victoria/Vancouver Island, builder, garden suite, prefab, site preparation, access, feasibility, missing middle, podcast/transcript, CHBA-VI, HAVAN and practitioner names. Investigated association podcasts, the ADU Hour, Island builder/manufacturer statements, small developer accounts, public event listings and recorded-interview candidates. Search hits labelled Victoria in Australia and Toronto-based firms with a person named Victoria were excluded. Search engines' relative ages/crawl dates were not treated as event dates.

Stopped at 17 substantive sources and 15 conservative business/practitioner clusters after recurring themes and contrary evidence were assessed and the most plausible low-cost data sources were checked. This is a bounded discovery exercise, not saturation across BC. Seven sources are actual publisher transcripts; ten are written statements/interviews. Eight sources directly concern Island practitioners (S01/S09/S10/S11/S13/S14/S15/S16). Transcripts skew to the Lower Mainland. Six transcripts are hosted by HAVAN, so editorial selection is concentrated even though speakers differ. Only S08 represents a large institutional developer. S17 adds legal/homeowner context but is grouped with repeated Smallworks/Small Housing voices, not counted as independent corroboration.

### Accessible candidates not used as substantive evidence

| Candidate / direct link | What could be inspected | Decision / remaining limitation |
|---|---|---|
| [Victoria Real Estate Podcast: 1789 Emerson, September 15, 2025](https://www.yyjrealestatepodcast.com/2249878/episodes/17850093-how-1789-emerson-balances-affordability-and-quality?t=0) | Player and show notes naming Dale Degagne and Robert Starkey; no transcript exposed in retrieved page | Recording content not verified; exclude descriptions as evidence. A future listener could assess this public Island account |
| [RDN industry training](https://rdn.bc.ca/industry-training-opportunities) | Listing for March 12, 2026 integrated-design webinar with registration, and training opportunities involving CHBA-VI | Not an accessible recording/transcript; exclude claims about what participants actually said. Did not register |
| [Viewpoint: Jake Fry, March 8, 2019](https://viewpointvancouver.ca/podcast/lets-get-small-jake-fry-on-building-a-new-housing-typology/) | Public audio player and editorial introduction | No inspected transcript/audio; excludes content claims and duplicate practitioner count |
| [mddl LinkedIn Office Hours clip](https://www.linkedin.com/posts/mddlco_missingmiddle-affordablehousing-heyneighbour-activity-7344454488226766848-DwOl) | Short public clip text; full event directed to community past events | No joining/logging in; exclude inaccessible full discussion and duplicate Aryze corroboration |
| [Urban Thrive / Julian West Q&A](https://victoria.citified.ca/news/q-a-on-parking-free-missing-middle-housing-development-in-victoria-with-julian-west-of-urban-thrive/) | Initial retrieval returned a page reference and search excerpt, but subsequent body access timed out/returned 403 | Excluded from substantive matrix because reliable full-text verification failed; do not substitute the promising search excerpt |
| [aux box FAQ](https://www.auxbox.ca/faq) | Official Model 620 page linked here, but request returned 404 | No FAQ claims used; Model 620's accessible process remains S13 |

Exploratory Reddit discoveries included homeowner price/coordination discussions, but no anonymous identity was verified as a BC builder and none enters recurrence counts. No homeowner anecdote establishes typical price or prevalence. Search coverage is weaker in the Interior, North, remote/rural sites and Indigenous-led housing, and this report should not be generalized there. Recent corporate blog material may be marketing-generated and its underlying experiences were not independently audited. Successful builders/published projects overrepresent survivors; no CRM rejection records, failed-project denominator, paying customers or controlled trials were available.

## Verification actually performed

- Opened substantive source pages/transcript text and recorded speaker role, locator, date basis and limits in evidence.md. HAVAN dates for S05/S06/S07/S08/S17 came from HTML `datePublished`, not later `dateModified`. S04 exact publication date remains unknown. No audio/video verification or invented timestamps.
- Read official API/service metadata and licence text. Python standard-library urllib requests recovered City ArcGIS metadata/licence content where the web reader showed an empty JavaScript shell or rejected JSON. Queried only impossible predicate `where=1=0`, so no occupied-property records were returned. Compact metadata in api-checks.json makes the boundary and limits portable without reproducing licensed source text.
- Checked City-owned exact sewer-lateral/replacement-tree catalogue items link the City licence. Inspected licence permission, attribution, exclusions and no-warranty terms. Other layer rights and real feature currency remain open.
- Reviewed source and recommendation agreement: recommendations are explicitly inferred; described professional work, commercial offers, API access and willingness to pay remain different categories. None of the source price ranges became a product default, estimate or ROI claim.
- Final local document checks: a Python standard-library check passed for relative Markdown links, exactly three numbered experiments, 17 source rows/15 groups, A/B/C/D recurrence counts of 9/12/5/5 and four successful empty-result API checks. Final `git status --short` retained the same pre-existing edited/untracked paths and added only this research directory. `git diff --stat` still showed only the three pre-existing tracked-file edits; the five new research files are untracked and were inspected separately. No software tests, database tests, live model calls, browser journey, CI, outreach, accepted-data publication or deployment were performed; these are unnecessary for this research-only change.

## Handoff and remaining criteria

Problem/result: bounded public practitioner evidence now supports a ranked next-test decision and an auditable source matrix. Interfaces/configuration/migrations: N/A. Demo: N/A, no app changes. Recovery: remove only this new research directory if unwanted; preserve all existing edits. No PR was prepared, so no final-head CI or GitHub authentication claim is made.

The memo's remaining-gap table is part of the handoff: builder payment/time evidence is absent; Island recordings are insufficiently inspected; vendor/legal claims are unaccepted; site-specific inputs and source/publication review still block accepted real evaluation; additional data-layer rights/currency and maintenance burden remain unverified. Quinn owns authorizing a bounded experiment; the existing source/data owner retains regulatory review and publication responsibility. These gaps do not prevent reviewing a usable preliminary demonstration or unsent enquiry, but they do prevent claims of validated commercial value or accepted site feasibility.

## Integration correction — October 19, 2026

The original research inspected local baseline `8cfbe0a`, which was older than current main. Integration reviewed `415420a` and corrected the memos: catalogue `Price` and `Timing` contracts already exist, and the enquiry already carries relationship, stage and requested-response context. Historical verification statements describe the original research only. Current-feature gap claims must be rechecked at implementation time. External research is retained as dated, unreviewed evidence; this integration did not independently validate every source, fee interpretation or licence conclusion. See [combined next steps](../commercial-research-integration-2026-10-19.md).
