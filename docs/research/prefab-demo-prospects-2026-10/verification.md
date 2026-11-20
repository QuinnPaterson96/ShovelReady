# Verification and integration handoff

## Scope and provenance

Prepared for Quinn's choice of models/prospects, under the model-gathering checklist and reporting standard read on October 7, 2026. Consulted AGENTS, README, architecture, quality, catalogue/contracts/authoring/intake, frontend model selection and enquiry export, prior prefab technical/supply/report-review research, and historical Landing acquisition questions. Primary checkout's unrelated modified AGENTS/README/quality and untracked reporting standard were preserved; the reporting guidance informed this report but is not copied or committed by this task.

Base: current fetched `origin/main`, **f61a120a9115174d25a799c437f87f8768834d41**. Branch `codex/prefab-demo-prospects-2026-10`, isolated managed worktree. Ownership limited to this report directory. No application/UI/schema/configuration/database/deployment or active release change.

## What was verified

- Eight prospects' bounded official source/flow inspection, with precise URLs, access date and method in [evidence.md](evidence.md). Quadra/Yarrow/Studio plan visual inspection and browser checks exposed facts omitted by the web reader. These are **agent source observations**, not independent professional or manufacturer review.
- Composed-report inspection: ranking separates commercial fit from partial geometry readiness; headline and sheets preserve WCCH's residential-use gap, Nexus's unreadable assessment and competitor overlap. Price currency, stages and unknown measurement bases remain adjacent to their claims. This is agent editorial review, not actual recipient validation.
- Existing offline research intake run from worktree root:

  ```powershell
  python -m uv run --locked python -m app.model_catalogue.research_intake --input docs/research/prefab-demo-prospects-2026-10/candidate-input.json --output-dir docs/research/prefab-demo-prospects-2026-10/staged
  ```

  Result: **valid_unreviewed**, three candidates, no structural errors, **47 explicit review gaps**. [Input](candidate-input.json), [canonical candidate](staged/candidate.json), [gap report](staged/report.json). Staging is research-only; it neither selects models in the demo nor publishes data. Price/timing and service narratives remain limited by existing contract structure; supporting sources and timing distinctions are in the prose sheets.
- Before/after SHA-256 of both active catalogue JSON copies: `16eea51a5de1bf4d4fe1dfccdf2a530904b3e717cbe0b884a5127afa5f790c8c`, unchanged. Candidate snapshot identity differs from active. Missing usable interior/footprint bases and roof-height datum remain null/missing, including Yarrow's separately labelled proposed floor area.
- Quadra's exact mixed-unit conversion is 6.1214 m. Existing Quantity supports decimal feet, not inches/fractions; the research JSON stores an explicitly approximate decimal-ft reading with its original 20 ft 1 in text, producing 6.121399999999998984 m. This is representational rounding, not manufacturer tolerance; no schema expansion or source rounding claim is made.
- `git diff --check`; JSON parsing/candidate output inspection; local relative Markdown-link review. Final staged diff reviewed before commit. Remote links were inspected as listed; they may later change and inaccessible resources remain gaps.

No app tests/database/browser-demo regression run: documentation and staged research only. No live model extraction, contact, form submission, purchase or image hosting occurred. No data publication or deployment was attempted. Required CI on the PR head is a separate integration check, not proof of provider accuracy.

## Remaining gaps and next owner

| Gap | Practical impact | Next action / owner |
|---|---|---|
| Controlled plans/elevations, area definitions, projection extents, height datum and exact configurations | Partial 2D research can be demonstrated; accepted height/area/regulatory evaluation cannot | Provider supplies current documentation; designated source/site reviewer reconciles definitions before accepted use |
| WCCH permanent residential configuration | Compact geometry does not justify promoting an approved garden suite | Provider confirmation; Quinn substitutes Yarrow for residential demo if unresolved |
| Nexus assessment questionnaire unavailable in inspection | Commercial ranking may overstate an intake opportunity | Quinn/provider inspect its actual questionnaire and internal handoff before proposing integration |
| Victoria-specific route, foundation/services, exact work split, prices/taxes and schedule prerequisites | Broad coverage cannot become installed cost, site service or occupancy promise | Manufacturer written scope when authorized; site professional establishes access/grade/foundation feasibility |
| Image/plan licence, capture retention and controlled source revisions | Official links only; catalogue/visual publication not approved | Provider rights-holder permission/update agreement; retain authorized evidence separately |
| No manufacturer/customer validation | No proven benefit, demand or willingness to pay | Quinn arranges a small consenting pilot after choosing scope and obtaining authorization |
| Existing app supports only its configured demo/model path | JSON staging alone is not model onboarding or a working provider integration | Integrator owns later mapping/UI journey work and proportionate existing behavioral checks |

This refresh supersedes the older *prospecting priority* of Jay as first alternative for this specific basic-intake pitch objective. It does not erase Jay's earlier technical evidence, change the current Model 300 demonstration or integrate these candidates.
