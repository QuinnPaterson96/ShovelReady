# Demo usability integration — 2026-10-05

Base main 13a1c70. Integrated #193 at 8a917fe and #194 at 10bfb4d. Final combined head and CI are recorded in the integration PR.

## Result

Address suggestions distinguish an omitted province from material identity corrections, retaining raw faults and explicit selection. A sole leading civic record can precede weaker street/locality alternatives; competing civic/block identities, units and ties remain expanded. The saved example supports map click/drag, cardinal movement buttons, arrow keys, step selection and reset. Exact coordinates are technical details.

[Independent virtual visitor baseline](virtual-visitor-model300-oct5.md) completed the previous release's example, dimension edit, unsent question and switch to own property. Its strongest friction corroborates #192. Integration adds a custom-size scenario notice at edited measurements and explains that property-mode switching clears the current draft. The visitor's long-draft concern remains a usability hypothesis for human validation, not a measured conversion problem. Its reported unavailable frontend build display is a UI observation; the previous release's API identity independently reported both commits, so the report does not prove an absent deployed build identity.

## Verified

- `npm --prefix frontend test`: 86 passed on combined code.
- `npm --prefix frontend run build`: TypeScript and Vite passed; existing bundle-size warning remains.
- Stateless local production frontend/API at 127.0.0.1:18142; no database used.
- Browser: initial example measurement, North button plus ArrowRight changed coordinates by exactly 1 m each; previous result cleared; reset restored nominal source dimensions. Width 3.5 m remeasurement displayed the custom-size warning. Own-property switch cleared example and returned address entry.
- Live public 1144 May St, Victoria: civic suggestion displayed with readable omitted-province correction, four alternatives initially collapsed, Enter opened disclosure, alternative could be selected and stayed visible.
- 390x844 and 1280x900: no horizontal document overflow. Screenshot at C:/Users/quinn/.codex/visualizations/shovelready-usability-wave/movement.png.
- Worker #194 separately verified pointer click/drag, invalid width, reset, full precision on focus and delayed-response rejection at its head. Integration did not repeat its delay proxy. Worker #193 checked material-ambiguity fixtures and keyboard disclosure. Final CI is required before merge.

## Remaining gaps and next action

- Human comprehension (#185): run a real visitor through movement, edited size, draft retrieval and mode switching. Virtual evidence is not human validation. Physical touch-device behavior also remains untested.
- Draft length: consider a short question-first preview only after checking whether visitors can find and retain their question; retain full evidence separately. Product/UI owner, #185 follow-up.
- Address ranking evidence is narrow: retain conservative handling and add actual counterexamples as found. Source reliability monitoring remains #169.
- Accepted real evaluation still needs controlled manufacturer/site facts, reviewed applicable rules and accepted publication. This release supplies neither legal fit nor a regulatory height comparison.

No API schema, migration, infrastructure or accepted dataset change.
