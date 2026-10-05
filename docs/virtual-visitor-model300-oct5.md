# Model 300 virtual-user walkthrough — first-pass record

**Date:** 2026-10-05  
**Scope:** Virtual-user software/UX evidence from the public browser UI. This is not an independent human comprehension study or legal review. It is baseline evidence for integration ticket #185 and does not close its human-testing requirement.  
**Displayed application commit:** `13a1c7063fdfe284cef1e4d718037d77a1a9db36` (matches the expected release). The page showed frontend build commit and selected observation revision as “Unavailable.”

## Task and outcome

I explored aux box Model 300 on an example property without entering an address, changed its illustrative width, reviewed the height explanation, prepared a question in the unsent local draft, and returned to the own-property address entry. I did not copy or send the draft or contact a builder.

## Observed journey and interpretation recorded before critical review

1. From the home page I chose **Explore Model 300**. The page presented a four-step journey: Model, Property, Placement, Next steps. I read the model as a nominal 10 ft × 30 ft rectangle with an advertised exterior height of 10 ft 6 in and a 300 sq ft footprint. The page explicitly said the product record was unreviewed and the installed regulatory height was unknown.
2. I chose **Try an example property**. This loaded “City of Victoria Parcel 87,” a captured parcel and roofline, and an illustrative copper rectangle. I understood the image as a placement sketch, not a confirmed building location. The initial measurement said the rectangle was contained, had no observed overlap with the captured roofline, was 1.21 m from the captured parcel boundary, and 1.94 m from the nearest captured roofline. It said zoning, legal setbacks, installed height, access, and permit eligibility were not assessed.
3. I went to **Placement** and looked at the image and fields. The image used teal for parcel, purple for roofline, and copper for the rectangle. I hesitated at Centre X/Y because projected metre coordinates around 473689 and 5362171 did not tell me a simple direction to move the box. I changed width from 3.05 m to 3.50 m instead. The page removed the prior measurement and said to measure again. After **Measure this placement**, it reported containment, no observed roofline overlap, 1.17 m to parcel boundary, and 1.72 m to nearest roofline. I understood this as a geometry comparison for a hypothetical wider rectangle, not confirmation that aux box sells that width.
4. In the height explanation, I read 10 ft 6 in (3.2 m) as the manufacturer's overall figure without a stated datum or roof-point definition. Foundation allowance was optional and separate. Installed height and the applicable regulatory limit stayed unknown. I would need a current drawing and clarification from the provider before treating height as settled.
5. At **Next steps**, I entered this question in **Access or crane questions**: “For this Victoria example, what clear access width and crane setup would delivery require? Can you provide the current drawing and clarify whether the 10 ft 6 in height includes the foundation?” The copyable unsent draft incorporated it along with the example and edited placement. The page said the text stays in the browser until copied and no provider request or contact record is created. I left it unsent.
6. I chose **Use my own property**. The example selection and its placement disappeared; the Victoria address search was shown with an empty address field. I stopped there without supplying personal property data.

## Observed friction and reproducible steps

- **Position editing is hard to approach as a novice.** Home → Explore Model 300 → Try an example property → Placement. The visible controls are width, length, Centre X/Y in projected metres, and rotation. The picture gives cardinal north but no direct drag affordance or plain-language position control. I chose a dimension edit because the large coordinate values did not map readily to “move toward the back of the lot.”
- **A custom width can be measured, but its relationship to the product needs careful reading.** In the same placement view, change Width from 3.05 to 3.50 and click Measure this placement. The result updates and the draft says “width user edited,” while the model header still gives the nominal provider width. I understood this as a scenario, but could imagine reading the new distance as evidence for the marketed Model 300 if I skimmed.
- **The next-step draft is long and technical.** Load the example, then use Next steps. The auto-generated text includes source URLs, unknowns, and geometry language before and after the question field. The draft is useful as a record, though I had to read it carefully to find my own question and see that it remained unsent.

## App versus browser/tool problems

No application error or blocked flow appeared during this walkthrough. The requested Chrome browser was unavailable to the automation tool, so I opened a separate temporary tab in the Codex in-app browser at its default viewport. That tool limitation did not prevent the task. I did not resize the viewport or reuse an existing tab. The visual observations above came from that tab's rendered page and accessibility text; no screenshot was saved in this report.

## Unanswered questions from the visitor's perspective

- Can an actual Model 300 have a width other than the nominal 3.05 m, or is width editing only a geometry scenario?
- What is the current controlled drawing and exactly how is 10 ft 6 in measured relative to the roof and foundation?
- What access width, crane setup, utilities, and local service availability would be needed for a Victoria site?

## Separate critical review and high-value follow-ups

1. **Make movement understandable.** Observation: Centre X/Y are editable projected coordinates, and I could not translate them into a natural placement move from the diagram. Hypothesis: a drag handle or plain-language north/south/east/west nudge with a visible metre increment would let first-time visitors test position rather than changing size as a workaround. Verify with a user attempting to move the example rectangle and explain where it went.
2. **Distinguish product size from a hypothetical edited envelope at the measurement.** Observation: I measured a 3.50 m width, while the displayed Model 300 nominal width remained 3.05 m; the draft did identify the width as user edited. Hypothesis: a concise label beside the updated result such as “custom scenario; product availability unconfirmed” would reduce the risk of treating the altered rectangle as a purchasable configuration. Test whether visitors understand this without prompting.
3. **Check whether visitors can extract and retain their own builder question.** Observation: the generated draft included my question, but it was embedded in a lengthy source and caveat record; switching to own-property entry removed the example draft from view. Hypothesis: a short question preview and an explicit explanation of what happens to the draft when changing property modes would improve confidence. Test whether visitors can identify their question and describe what remains saved after switching modes.
