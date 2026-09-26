# Frozen baseline agent rehearsal — attributed observation

Source: [coordinator's durable issue #115 report](https://github.com/QuinnPaterson96/ShovelReady/issues/115#issuecomment-5842143571), received after the human materials were drafted. The coordinator identified the participant as fresh Sol/medium agent `/root/homeowner_ux_case`, in a separate background in-app browser tab, using visible UI only, without source/API access or prior findings. This file transcribes that report; it is not a second run, independent browser audit or human validation. The reported approximately **4–6 minutes** was participant-estimated wall time, not instrumented or human task time. Human timing and outcome fields in [recording-sheet.md](recording-sheet.md) remain blank.

## Pinned baseline and task

Application/frontend identity visibly matched `34d95c322cfa2139ba758f12bfc8508986dcf9e4`. The coordinator froze spatial revision `spatial:sha256:db45fb736cd0fe2455d65b64105b038539bc7695e62666be6b2840474af8aee7` and address revision `address:sha256:4830a1985952b3150bf01bc276575a08238c5bbb71bf4fc489675231be534e5f` for the five-address-row / three-parcel demo. The participant explored aux box Model 300 at 1170 MAY ST, Victoria, without survey, approved placement or independently measured height. No synthetic example was imported and no external message was sent.

## Reported sequence and understanding

| Dimension | Reported observation | Assessment within this rehearsal |
|---|---|---|
| Task path | Entered City of Victoria / garden suite / accessory building; selected Model 300; searched 1170 MAY ST; explicitly confirmed retained PID 008-140-723; wrote a verification note; inspected the summary; returned, expanded the note, reconfirmed the retained candidate and regenerated the summary. Revised note persisted. | Completed the requested browser path with explicit reconfirmation. No exact click/timing trace is asserted here. |
| Checks and status | Understood “Needs investigation” and that no fit checks, zoning screening or placement evaluation ran. | Appropriate bounded interpretation; no legal correctness finding. |
| Model and site evidence | Read nominal source dimensions 3.048 × 9.144 m and provider interior area 20.99608704 m². Kept building height unknown because advertised exterior height lacks datum/roof-point reference. Approximate GIS area about 577.33 m² remained unreviewed. | Source leads remained distinct from verified regulatory dimensions or surveyed lot area. |
| Assistance, app/tool failures | Assistance was not quantified in the report; it reported no app defects or tool failures. | No confirmed defect from this run; absence of a reported failure is not a general reliability measure. |

## Provider-facing enquiry returned by participant — **not sent**

> I am considering an aux box Model 300 garden suite at 1170 MAY ST, Victoria. The app found an unreviewed parcel lead but performed no fit checks. Can you confirm the current model configuration and projection-inclusive dimensions, bylaw-defined Floor Area and measured roof high point with datum, plus Victoria delivery/crane/foundation requirements and costs? I also need a current survey and dimensioned placement plan, existing-suite count and City confirmation of applicable rules before anyone can assess fit.

## Hypotheses and adjudication boundary

The participant found the raw hashes/IDs and long rule/provenance sections dense, and the collapsed copyable provider draft hard to discover. It found reconfirming the same parcel after a note edit cumbersome. These are attributed usability hypotheses, not adjudicated application defects. The explicit reconfirmation behavior preserves edit invalidation and should not be silently removed on this evidence. The bounded lookup and absence of checks may help source gathering and question formulation, but do not establish fit, permit certainty, workflow savings or customer demand.

No ticket is opened from these preferences. A later integrated build needs its own pinned identities, participant record and observation of any revised design. Its result must not overwrite or be combined with this baseline. Actual or likely human sessions and measured effort remain for the authorized SR-16 pilot; controlled design/site facts, reviewed rules and accepted evaluation remain separate gates.
