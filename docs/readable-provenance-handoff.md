# Readable provenance handoff (SR-57)

## Implemented

The preparation summary now has separate human-facing provider review and evidence-request text, plus a closed technical evidence record with exact site, model, rule and checklist identities. Native disclosures retain raw IDs, hashes, versions and JSON. The review text uses source labels, public links, capture dates, explicit unknowns and next steps. Clipboard buttons report success or failure; the read-only text remains selectable if automatic copy fails.

Parcel/model cards, checklist evidence, draft and synthetic result inspection, Pilot and public-case evidence, and licensed observation inspection now place technical identifiers inside labelled disclosures. Source contracts, evaluator logic, draft edits and confirmation invalidation were not changed.

## Verification

From `frontend/` after `npm ci`: `npm test` passed 55 tests; `npm run typecheck` and `npm run build` passed. Vite reported its existing main-chunk size advisory. Browser inspection used this worktree's Vite server on port 18131, not the coordinator preview. A selected Model 240 showed manufacturer revision as not supplied, unreviewed provider facts and no screening. Copying the provider text showed “Copied to clipboard.” Pressing Enter on the technical-record summary expanded it and exposed exact associated source identities. At a 390 × 844 viewport, document width and scroll width were both 375 px; the opened technical textarea was 306 px wide and contained the full Victoria capture hash. The viewport override was reset.

Screenshots: [desktop review summary](screenshots/readable-provenance-desktop.png) and [390px technical record](screenshots/readable-provenance-390px.png). The exact app commit for these screenshots is identified in the PR handoff; the screenshots were captured during the implementation working tree before that commit.

## Remaining gaps

- Demo usability: a live parcel lookup was not browser-checked because this isolated Vite preview had no project API. The focused retained-candidate rendering/export tests passed. Next: coordinator should verify a retained parcel lead against a configured local API during integration.
- Accepted real evaluation: provider captures, legal rule applicability, surveyed lot geometry and placements remain unreviewed or missing. They block a real fit finding. Next: source and site reviewers obtain controlled inputs and publish an accepted release in separate work.
- User validation: no real user tested the revised wording or copy flow. Next: run the prepared walkthrough with prospective users after integration.
