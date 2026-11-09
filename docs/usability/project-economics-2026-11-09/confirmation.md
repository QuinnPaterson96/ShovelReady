# Assessment A · Correction confirmation

Reviewed the frozen `index-D-DS426T.js` build at the local Model 300 example. This was one focused confirmation of the prior findings. The native browser API exposed no browser surfaces during this turn, so the check used the repository's Playwright dependency with installed Chrome. The previous assessment used native in-app browser control.

| Check | Result |
|---|---|
| Valid and malformed costs | In `#economics-cost-fees`, both `9000` and `9,000` gave a $251,000 subtotal and 14.4 years payback. The grouped value had no invalid flag. Entering `9x` set the inline error **Enter a valid CAD amount. The previous value still applies.** The subtotal and payback stayed the same. Back and reopen preserved $9,000 as the valid fee. Deliberate clearing reduced the subtotal to $242,000, listed fees as open and withdrew payback. |
| Benchmark scope | Summary and expanded desktop aside both say **Victoria metro · 1-bedroom apartments**. The rental editor retains the Statistics Canada source and its lack of size adjustment. |
| Rental hierarchy | The desktop screenshot shows the monthly rent, annual income and payback numbers at 18.4 px against 14.8 px labels, with the 33.6 px project subtotal as the main anchor. |
| Rental inclusion focus | After choosing **Skip for now** and reopening the expanded estimate, pressing Enter on **Include rental income** focused `#economics-rental-title`. |
| Phone navigation | At 390 × 844, all three **Estimate sections** links focused their headings and scrolled them into view, about 16 px from the viewport top. |
| Phone calculation feedback | At a $2,200 rent assumption, the rent input and the nearby $18,810 annual income and 13.3 years payback were visible together. The duplicate rental figures in the top estimate were hidden at this width. Returning restored opener focus and scroll position (2303 px), retained the edited figures and left document width equal to viewport width. |

No material issues remain in the tested keyboard and visual path. Screen-reader output remains unverified. The mobile result is readable next to the input, but the source places the desktop rental rows inside the live region and the mobile copy outside it. Automatic announcement parity on phones remains a bounded accessibility follow-up.

## Updated Nielsen scores

| Heuristic | Score | Basis |
|---|---:|---|
| System status | 3 | Visible result updates close to the relevant inputs. |
| Match with the real world | 3 | The rental benchmark population and incomplete cost basis are explicit. |
| Control and freedom | 3 | Rental can be skipped and restored, the valid draft persists, and return restores focus. |
| Consistency and standards | 3 | Existing visual tokens and native controls, with predictable heading focus. |
| Error prevention | 3 | Common thousands separators work, malformed values cannot replace valid costs, and blank is explicit unknown. |
| Recognition rather than recall | 4 | Scoped labels, discoverable section jumps and nearby results keep the core tested decisions in view. |
| Flexibility and efficiency | 3 | Keyboard jumps and mobile output reduce repeated traversal. |
| Aesthetic and minimalist design | 3 | Stronger figure hierarchy in the compact summary. |
| Error recovery | 3 | A specific inline hint explains the error and preserves valid work. |
| Help and documentation | 3 | Sources and field guidance stay available in the editor. |
| **Total** | **31/40** | **Good** |

[Desktop summary](confirmed-desktop-summary.jpg) · [Phone result beside the rent input](confirmed-phone-live-return.jpg) · [Browser measurements and outcomes](confirmation-browser.json)
