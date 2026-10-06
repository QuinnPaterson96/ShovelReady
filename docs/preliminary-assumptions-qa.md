# Preliminary assumption checks · October 6, 2026

Implemented on base `2ea3f19239d2b25b66a74c5639bcefc65039c178`.
The final GitHub PR head identifies the checked implementation.

## Behavior and software evidence

- Next/Prepare enquiry and Adjust boundaries complete street marking; returning to
  Mark street edges reopens it. Completion method is exported separately from roles.
- One complete street suggests front; complete corner marks constrain coherent
  front/flanking alternatives. Contradictions still prevent a bounded pass.
- Distance correction opens the right-hand boundary grid; captured approximate
  distances remain separate from entered wall-to-line values.
- Default none-existing is Probably fine with an assumption popup and yellow check.
- Editable area +10%; height +10% +0.30 m foundation. Above-limit proxies remain
  unknown. Entered regulatory floor-area conflicts override nominal estimates.
- Unique largest valid parcel-contained mapped outline supplies provisional separation.
  Ties stay unknown; selecting a building overrides the inference.
- Front distance includes supplied offsets; captured geometry remains recoverable.
- Supported zoning prepopulates for live selections and saved Parcel 87; overrides
  remain attributed. Unsupported/split/unavailable zones cannot become supported.
- Six City map/history sources produce sourced findings. Empty successful searches
  are scoped probable; positive records require review; incomplete reads remain unknown.

Checks: `uv run --locked ruff check app tests contract_tests migrations scripts`;
`uv run --locked pytest -q` (547 passed, 37 skipped, 28 subtests);
`npm run build --prefix frontend`; `npm test --prefix frontend` (134 passed).
Local database cases skip without explicitly configured disposable PostgreSQL;
CI owns isolated PostgreSQL and native Windows lifecycle verification for final head.
No database migration, accepted rule review or data publication occurs here.

## Browser and source evidence

Local production build, normal desktop viewport and 390x844 mobile viewport:
right-side markings/grid, inferred labels and road band, probable status/help,
flag-to-grid focus and typed offset were inspected. Mobile page width remained
within viewport and the height popup stayed inside the viewport. Existing mounted
journey coverage checks reopening/completion and retained overrides.

City lookup for saved Parcel 87 returned GRD-1 (PGA). Five scan layers returned
no mapped records; development permit areas returned a record requiring review.
The height proxy displayed 3.82 m and area proxy 30.7 m2. Known placement conflicts
remained visible. Live reads demonstrate adapter usability, not source completeness
or legal accuracy. Source metadata/hash and scan limitations remain in evidence.

## Remaining work and ownership

- Permit documents/conditions, title covenants, site-specific variances, projections
  and servicing capacity remain unsearched. The homeowner/provider must review the
  linked City records and site-specific design; an empty mapped scan cannot clear them.
- Accepted real evaluation needs reviewed source rules, applicability and site/provider
  measurements. Source reviewer/data owner owns these blockers and publication.
- Product owner still needs homeowner/provider usability validation; browser checks
  do not establish usefulness. Persistence and immutable deployment/rollback evidence
  remain SR-14/SR-15 operating work; this change does not close those criteria.
