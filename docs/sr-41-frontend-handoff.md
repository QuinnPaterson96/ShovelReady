# SR-41 frontend preparation handoff

Base: merged PR #101, `4e177989080bdf0a6831b9006b8630a96883c139`.
Scope: mounted assessment inputs and summary, existing SR-38 v1 site boundary,
SR-40 catalogue selection, and the existing SR-39 Victoria packet. This is
preparation only. No accepted rule, placement evaluation or publication is added.

The site and model selections remain full objects in the session draft. A model
selection or edit maps only compatible measurements into the older display values;
unknown height reference maps to unknown height. Site confirmation retains the
source candidate and separate manual values. All input changes clear the prepared
status. The summary includes full retained source objects, baseline quantities,
capture dates, revisions and source links. The four Victoria clauses are imported
directly from the packet JSON to avoid a second hand-authored rule copy. They are
shown as provisional evidence and never sent to the evaluator.
The container frontend stage copies that packet JSON into the build context;
the runtime image serves only the compiled assets and does not need the packet file.
The summary offers a selectable, copyable provider-review text record with the
scope, site/model selection, source identity, checked items and unresolved facts.
It does not send anything to a provider.

## Frozen integration and virtual-user case

Use a fresh session on this revision and a locally started API with an explicitly
isolated disposable database seeded as in `docs/local-development.md`. Record the
frontend commit, packet snapshot ID and spatial revision before starting. Do not
change data or prompt midway through the rehearsal.

1. On Assessment inputs, enter City of Victoria / garden suite / accessory. Choose
   a catalogue model and observe its provider capture, service note and absent
   roof-height reference. Search PID `028-279-638`; explicitly confirm the retained
   parcel lead. Add a manual area that differs from the GIS area. Prepare summary.
   Expected: both areas and their origins survive, conflict is flagged, no green
   result, and each provisional clause is cited with its source/revision.
2. Return to inputs and edit any model quantity, height reference, or manual site
   field. Expected: status returns to Not assessed. Prepare again and inspect the
   changed value and original baseline. Unknown height remains unknown until its
   reference is asserted; that assertion remains user supplied and unreviewed.
3. Search a nonexistent PID and an address. Expected: no match and unavailable
   address join are distinct. Stop the API or use an unavailable endpoint, then
   enter manual address/PID/area. Expected: explicit lookup error, manual unmatched
   site state, no verified parcel identity and no evaluator result. Enter area `0`
   to confirm visible error and blocked confirmation.
4. At a narrow viewport, review status text, source identity, controls and focus.
   Ask an independent participant, without coaching, to explain what was checked,
   what remains unknown, whether the model is available in Victoria, and what they
   would send a provider. Adjudicate observations against the frozen app/data state
   before opening defect tickets.

This frozen case is a handoff, **not** an independent participant run. The mounted
browser rehearsal remains open because the available in-app browser rejected the
local development URL with `ERR_BLOCKED_BY_CLIENT` on this host.

## Remaining gaps

| Gap and impact | Evidence | Next action and owner | Demo / real evaluation |
|---|---|---|---|
| No address-to-PID join; address lookup unavailable | SR-38 v1 supports three PID leads only; #86 remains partial | Verify a permitted join with retained samples, #86 | Manual/PID demo works; broader real enquiry blocked |
| Parcel identity, survey, building geometry, placement and constraints unverified | SR-38 observation and this per-check summary | Source/site review and controlled placement, SR-05/06/10 | Preparation demo works; real evaluation blocked |
| Victoria clauses unaccepted; consolidation/currentness unresolved | SR-39 packet and `source_unavailable` source-span replay; #104 follow-up | Resolve official amendments, measurement definitions and independent acceptance, #104 and SR-05/06/10 | Evidence display works; evaluation blocked |
| Model roof-height datum and installed Victoria service unconfirmed | SR-40 catalogue and #104 follow-up | Obtain controlled dimensions/service artifact; review independently, #104 | Catalogue demo works; real fit blocked |
| Mounted browser and independent virtual-user rehearsal not completed here | In-app browser rejected localhost; frozen case above | Run on an accessible browser against composed head; SR-41 integration owner | Blocks claimed browser/user validation, not code-only demo |

Software checks, source interpretation, accepted publication and user validation
are separate evidence categories. No provider contact or publication occurred.
