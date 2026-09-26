# Wave-eleven integration

Base: main `c025df85f772b691c1525fbe032610b3febde4f2`.
Composed heads: #106 `1d7cecd867f1853184619049533f1d1b0dabe835`,
#107 `53493a58729c5bb21cb61c49829096977d5bc1c2`,
#108 `26406b8a8f76bf760ab88689e60e14159a02f354`,
#109 `39fa271e3487e8f507bcd1038926b9a96322af8c`,
#110 `7a0fb8f35716ad8196251ebea55d18ced790c91f`.

## Implemented

The five branches combine without conflicts. Integration fixes preserve editable
manual site fields and lookup query in parent session state across page navigation,
while edits invalidate confirmation and summary. Error focus covers model and site
inputs. Captured source address, alias/join method, snapshot, feature locator and
capture time appear in candidate/summary/provider-review output separately from
manual corrections. Official maps.victoria.ca source links are allowed.
The demo selects the address packet explicitly through the documented environment
variable. No database migration, source acceptance or publication occurs.

## Verification

Frontend: `npm --prefix frontend test` (42 pass), `npm --prefix frontend run typecheck`
and `npm --prefix frontend run build` pass. The build reports a >500 kB chunk warning;
no measured performance failure yet. Added regressions cover remounted site input
values, edit invalidation, invalid lot area and alias evidence in review output.
Ruff passes for app/tests/contracts/migrations/scripts/municipal tools. Generated
site and evaluator boundary artifacts and the address packet check pass.
Disposable PostgreSQL and browser results will be recorded after the composed run;
these checks are not yet claimed complete in this checkpoint.

## Frozen ordinary-task rehearsal

On the frozen composed demo, prepare a Victoria accessory garden-suite enquiry for
`1255 QUEENS AVE` using auxbox 240. Retain unknown measurements rather than guess.
Add a note that a survey is still needed, review the preparation summary, return to
inputs and amend the note. Produce a short provider-facing summary and explain
whether the app establishes fit, what evidence is available, and what is still
needed. Participant uses the browser only and receives no implementation findings.
Record app commit, selected spatial/address identities, tool failures and actual
observations. This is one agent rehearsal, not human validation or legal review.

## Remaining gaps and owners

| Missing evidence / observed limitation | Impact | Next action / owner |
|---|---|---|
| Five captured address rows / three parcel leads only | Useful bounded demo; arbitrary homeowner search unsupported | Assess broader permitted lookup only after workflow feedback; SR-38/#86 follow-up |
| Unreviewed legal lot, building/yard geometry and supplied placement | Cannot evaluate actual siting/separation | Controlled site/placement artifact and reviewer; SR-05/06/10 |
| Consolidation/adoption chain and independently accepted rule interpretations | Provisional citations cannot establish current applicable rules | Obtain certified/adopted material and review; SR-48/#104, SR-05/06/10 |
| Controlled prefab roof datum/dimensions and installed Victoria service | Marketing quantities cannot establish regulatory dimensions or deliverability | Provider artifact requests prepared but unsent; SR-48/#104 |
| No accepted release or real-site evaluation | Preparation summary remains needs investigation | Proceed with SR-10–13 only after reviewed inputs exist |
| Saanich captured source polygons contain self-intersections | No reliable contact area/applicability for affected polygons | Source correction or authoritative topology clarification; SR-46/#102 |
| Langford municipal commercial/retransmission rights unresolved; bounded candidate captures | Municipal layer use/expansion blocked | Authorized permission request and written terms; SR-47/#103 |
| One agent rehearsal only; no independent human calibration/customer study | Cannot claim user success or time savings | Human review/customer pilot; SR-30/SR-16 |

No external requests were sent. Public-source findings, software verification,
independent source review, accepted publication and user validation remain distinct.
