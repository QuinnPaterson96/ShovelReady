# Navigation refresh browser QA — October 2, 2026

Scope: independent browser walkthrough of the combined navigation and brand refresh for issue #178, served at `http://127.0.0.1:18142/`. The behavioral pass used integrated commit `ca3fcea` (brand `f83c9c6`, navigation `ca3fcea`). Afterward, the home illustration and scoped content-focus outline fix were rebuilt and visually inspected. A subsequent Research disclosure close-on-navigation correction was reported by integration ownership but was not in the browser build used for these observations.

## Observed browser behavior

- From Home, General assessment opened. Its contextual **Model 300 property demo** button opened the distinct Model 300 journey. The header exposed Home, Model 300 and General assessment as primary destinations, with Examples and evidence, Pilot investigation and Occupied-lot sketch under Research.
- In Model 300, a fictitious manual site labelled `Fictional QA lot, Victoria` with a 20 m × 30 m local parcel rectangle and a 3.05 m × 9.14 m placement centred at X 10 m, Y 15 m produced a local-sketch measurement: contained, 8.48 m from the parcel boundary, nearest building unresolved. The text explicitly said obstruction coverage was unknown and no zoning or overall fit was evaluated.
- The unsent enquiry held `Family studio`, `Next spring` and `Check lane access`. After navigating Model 300 → Home → Research/Examples and evidence → Model 300, the site, dimensions, measurement and enquiry entries were still present. On Home, the retained BuilderDemo inputs were inside a `[hidden]` ancestor, absent from the accessibility tree, and Home alone had `aria-current="page"`.
- Editing the placement Y value to 16 m removed the earlier measurement. The copyable enquiry changed to **No current placement measurement** and requested another measurement.
- Research opened a three-item menu. Escape closed it and returned focus to Research. Selecting Examples and evidence closed it. At 390 px, Tab from the open Research control focused **Examples and evidence**, and Enter opened that page and closed the menu.
- The Model 300 step links navigated to their named sections; the **04 Next steps** link updated the fragment to `#builder-next` and brought its section into view.
- The default Model 300 view and copyable draft named aux box, the product source link, capture date, unreviewed status, unknown manufacturer revision, independent demonstration, and no zoning/provider-contact conclusion. The default Examples view stated no screening had occurred and showed the unavailable observations state without implying a result.

## Visual checks

At the default desktop viewport, the final rebuilt Home showed the brand/header, distinct primary navigation, a labelled conceptual parcel illustration, and a visible statement that it is not a measured fit or approval. The earlier large programmatic focus outline around the content card was gone after the scoped fix. At 390 × 844, Home, Model 300 and General assessment had document scroll width 375 px, equal to client width 375 px; no page-level horizontal overflow was observed. The Model 300 step strip had its own horizontal scrollbar and the Research dropdown remained visible within the narrow viewport. The illustration and disclaimer stacked below the Home introduction.

## Limits and follow-up

Integration follow-up: the final rebuilt app was reloaded and Research was opened
with Enter, followed by Model 300 through the primary navigation. The accessibility
tree confirmed Research collapsed and the builder opened. The final combined
frontend run passed all 71 tests and the TypeScript/Vite build; the existing
large-chunk advisory remains. At an explicit 1280 px desktop viewport, the builder
rail was visible and document scroll/client widths both measured 1265 px.

This was one manual browser walkthrough, not a real-user study, source review, legal interpretation check or accepted data publication. The site was fictitious; live address/parcel search, provider source navigation, external contact, backend observations and the retained-example workflow were not exercised. The stateless demo's Examples view reported that investigation configuration or database was unavailable. State retention was checked across in-app navigation, not reload or a new browser session. Screenshots were visually inspected in the QA browser session but not exported as files by the available browser interface. Recheck the final integrated head after the reported Research disclosure correction, and use the final head for build/CI evidence.
