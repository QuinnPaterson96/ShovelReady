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

Frontend: `npm --prefix frontend test` (44 pass after rehearsal fixes), `npm --prefix frontend run typecheck`
and `npm --prefix frontend run build` pass. The build reports a >500 kB chunk warning;
no measured performance failure yet. Added regressions cover remounted site input
values, edit invalidation, invalid lot area and alias evidence in review output.
Ruff passes for app/tests/contracts/migrations/scripts/municipal tools. Generated
site and evaluator boundary artifacts and the address packet check pass.
At `9bd5ae46b285e3974e35819b71ea656897ce1372`,
`python -m uv run --locked python scripts/test_postgres.py --postgres-bin
"C:/Program Files/PostgreSQL/17/bin"` passed 444 tests and 28 subtests; one native
lifecycle opt-in skipped locally. The runner stopped its disposable cluster.
Hosted CI passed all five checks, including native Windows lifecycle and container
startup, at that head. Final-head CI is required again before merge.

An owned scratch database was separately initialized/migrated/seeded for the demo;
port 55611 was refused by Windows (10013), so an available loopback port was selected.
No existing cluster was adopted. The documented launcher served clean commit
`9bd5ae4` on 18098 with spatial revision
`spatial:sha256:db45fb736cd0fe2455d65b64105b038539bc7695e62666be6b2840474af8aee7`
and address revision
`address:sha256:4830a1985952b3150bf01bc276575a08238c5bbb71bf4fc489675231be534e5f`.
The integration browser verified 1253 QUEENS AVE -> PID 028-279-638, source evidence,
and invalid height/lot-area submission remaining on inputs with keyboard focus on
the respective invalid field. Initial pointer automation did not change navigation;
keyboard activation worked. This is recorded as a tool interaction limitation,
not an adjudicated application defect.

The browser also exposed that alias status lives in Fact.basis, not Evidence.method.
The renderer and regression now preserve both, matching the actual producer shape.

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


## Independent virtual-user outcome and adjudication

One fresh Sol/medium participant used a separate browser tab on `9bd5ae4`, without
source/API access or implementation findings. It completed the frozen ordinary task:
aux box Model 240, 1255 QUEENS AVE, parcel confirmation, survey note, summary,
return/edit/reconfirm, and a provider-facing explanation. It left building height
and datum unknown and correctly stated that no fit or permit finding was established.
It observed sourced dimensions and unresolved site/rule/service evidence. No external
message was sent. This is a single agent result, not human validation or legal review.

Confirmed defect: entering the displayed phrase "Accessory building" yielded
Outside coverage because the scope comparison accepted only "accessory". Both
labels now map to the same proposed scope, with a regression ensuring principal
buildings remain outside. Participant difficulty: a note edit after returning to
inputs required another lookup. Retained lookup results now survive navigation and
manual edits for explicit reconfirmation; changing the search clears them. Confirmation
and summary still invalidate on edits. The additional regressions bring frontend
tests to 44. The initial participant's visible-tab request was unsupported; background
browser creation worked. No failed request is counted as app behavior.
