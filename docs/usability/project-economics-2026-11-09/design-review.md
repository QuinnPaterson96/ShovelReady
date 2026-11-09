# Independent assessment A · Project economics

## Design specificity

The estimate feels like an extension of Civic Atlas. The model and saved property remain attached to the calculation, the three project-cost lines match decisions a prefab buyer can discuss with a provider, and the layout uses the surrounding journey's quiet teal surfaces, rules and native controls. A larger type scale for rent and annual income would give the rental case more presence. The expansion is a conventional form and aside, but the task-specific breakdown and live response give that structure a purpose.

## Overall impression

The summary answers whether the scenario is worth exploring and gives the homeowner a clear next step. The expanded editor lets them question the assumptions without adding work to the main journey. The biggest opportunity is preserving valid costs through a typing mistake and making it easier to compare assumptions with outcomes on a phone.

## What's working

- The compact summary makes the calculation legible. Model 300 opens at a $250,000 priced subtotal with $187,000 building, $8,000 fees and $55,000 installation. The subtotal label and source line convey its scope, and comparison and technical material stay collapsed.
- The rental choice is reversible. Keyboard activation of **Skip for now** placed focus on **Change rental preference**, which put focus on **Include rental income** when reopened. Including rental added $2,040 monthly rent, $17,442 annual income after running costs and 14.3 years of payback against the priced subtotal.
- **View and adjust estimate** opens a dedicated view and moves focus to its heading. Returning from the bottom link restored focus to the opener and the previous scroll position at both widths. Changing fees to $9,000 and rent to $2,200 gave $251,000 subtotal, $18,810 annual operating income and 13.3 years payback in both views. The operating result independently follows $2,200 × 12 × 0.95 × 0.75, with payback $251,000 ÷ $18,810.

## Priority findings

1. **P1 · A malformed cost edit replaces a valid amount with unknown.** Open the Model 300 estimate, set `#economics-cost-fees` to `9000`, then enter `9,000`. The input shows the error and the live subtotal falls from $251,000 to $242,000. Payback switches from 14.4 years to **Not estimated**. `CostAmount` passes an empty amount to the draft on every invalid edit, which is also how it handles an intentional clear. Keep the last valid amount in the draft during an invalid nonblank edit and keep the inline hint. Clear should still produce unknown. Accepting conventional grouped commas could reduce mistakes, but preserving the priced input is the material fix. I restored the field to `9000` during the review. Suggested command **harden**.
2. **P2 · The headline rent basis omits the benchmark population.** In the summary and the detail aside, `.economics-rent-figures` says **Victoria · 1 bedroom asking rent**. The rental editor correctly specifies a metro-area apartment proxy grouped by bedroom count without a size adjustment. Name the actual population in the existing short line, for example **Victoria metro · 1-bedroom apartment asking rent**. The expanded source can keep the size distinction. This is an observed scope omission. Whether a particular homeowner misreads the current copy remains untested. Suggested command **clarify**.
3. **P2 · Enabling rent inside the expanded editor drops keyboard focus.** Skip rental on the summary, open the estimate, then activate `.economics-add-rental` with Enter. The rental form mounts and `document.activeElement` becomes `BODY`. The main summary has explicit focus restoration for the equivalent action. Focus `#economics-rental-title` or the first field when the detail button is replaced. Suggested command **harden**.
4. **P2 · A phone edit separates the input from the live result.** At 390 × 844, the bottom of `.economics-live` was at document y=689 and the monthly rent input at y=2,895. At the focused rent input the live panel ended 1,806 px above the viewport. Desktop keeps it in view as the page scrolls. Give the phone editor a route to the rental controls and a nearby way to see the updated income and payback, without introducing a persistent overlay that hides inputs. Suggested command **adapt**.

## Nielsen heuristics

| # | Heuristic | Score | Evidence |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Immediate recalculation, with the mobile result outside the editing viewport. |
| 2 | Match with the real world | 3 | Familiar cost and income language. The summary gives only part of the rental benchmark scope. |
| 3 | User control and freedom | 3 | Reversible rental choice, return to project, retained valid changes and a market-rent reset. |
| 4 | Consistency and standards | 3 | Civic Atlas tokens, labelled controls and focus ring. The two rental entry points handle focus differently. |
| 5 | Error prevention | 2 | Scoped defaults and clear labels. A nonblank invalid cost edit writes unknown into the calculation. |
| 6 | Recognition rather than recall | 3 | Cost categories, benchmark and explicit assumptions support recognition. The phone editor requires remembering the earlier result. |
| 7 | Flexibility and efficiency | 2 | Keyboard controls and direct amount editing are available. Reaching rent and returning to the result takes several phone screens. |
| 8 | Aesthetic and minimalist design | 3 | Focused summary with a clear primary action. Income has the same visual weight as adjacent value rows. |
| 9 | Error recovery | 2 | Inline format guidance is specific. Previously valid cost data has to be entered again after an invalid edit. |
| 10 | Help and documentation | 3 | Short field hints and progressive source details explain assumptions in context. |
| | **Total** | **27/40** | **Acceptable** |

## Cognitive load

- **Single focus, grouping, one thing at a time and progressive disclosure pass.** The local summary has four simultaneous task actions before answering the rent prompt, with one main next step. The comparison sits in a separate disclosure. Each quick cost group has one to three inputs.
- **Chunking and minimal choices have a bounded exception.** The full Canada market list has more than four entries when opened. A native select contains it and Victoria is preselected. The pre-existing desktop journey rail exposes 11 steps as wayfinding. The separate editor removes it.
- **Visual hierarchy is partial.** Cost is visually distinct. Expected rent, annual income and payback share the same numerical weight, so a renter's primary numbers are less prominent than the brief calls for.
- **Working memory fails on a phone.** The user has to retain or revisit the live result while editing assumptions well below it. Desktop avoids that separation with the sticky aside.

## Emotional journey and personas

- **First-time homeowner.** The concrete starting numbers and optional rental branch support early momentum. The proposed payback shows its basis and stays useful for deciding whether to speak with the provider. The rent population should be clear in that first estimate.
- **Keyboard user.** Summary choice, expanded entry and return restored useful focus in the tested path. Including rent from the detail view loses the active element at the point a new editing task begins. A screen reader was outside this pass.
- **Phone user.** The 390 px summary and expanded editor had no horizontal overflow, and the checked cost inputs, rental inputs and back links measured at least 44 CSS px in height. The phone summary fits in one viewport at its anchor. The distance between the input and result creates an avoidable interruption during editing.
- **Peak and end.** The positive moment is seeing the rent and payback appear or change. It is immediate on the desktop summary. A valid edit and the visible focus on the returning link provide closure. The phone edit separates the change from that moment. These are walkthrough judgments, with user comprehension unmeasured.

## Minor observations

- Raise the expected rent and annual-income numerals to an intermediate type size on the summary. Both currently use the small row-value style, while the subtotal alone has display type. Keep the subtotal anchor and the payback basis.
- Repeated fieldset and field labels such as **Development and permit fees** slightly lengthen the narrow editor.
- The expanded rental calculation excludes property appreciation. The estimate provides no estimate of added sale value.
- **Needs bounded project costs** accurately points to cost coverage but is less familiar than the section's other labels. A short label about missing or open costs would help when the amount is unavailable.

## Questions to consider

- Can a prospective renter identify the benchmark population and explain why they would enter their own rent?
- Can a phone user try two rent assumptions and compare payback without losing their place?

## Evidence

Native in-app browser on the frozen local preview, route `#examples/model-300`, asset `index-B2KgWgwF.js`. Desktop 1440 × 900 and phone 390 × 844, each tested in the same fresh review tab. The temporary viewport override was reset. No detector results were consulted. The four-model regression, end-to-end enquiry exports and live-user comprehension were outside the review.

- [Desktop cost summary](desktop-cost-only.jpg) and [benchmark rent summary](desktop-rental-summary.jpg)
- [Desktop editor](desktop-detail.jpg), [sticky result after editing](desktop-rent-edit.jpg) and [restored opener focus](desktop-return.jpg)
- [Phone summary](phone-summary.jpg), [phone editor top](phone-detail-top.jpg), [phone rent controls below the result](phone-rent-edit.jpg) and [state after including rent inside the editor](phone-include-focus.jpg)
