# ShovelReady agent instructions

## Read first

Read README.md, docs/architecture.md, and docs/quality.md before consequential changes. Use docs/restart-assessment.md and docs/prior-work/design-decisions.md for historical reasoning. Historical proposals are hypotheses, not requirements. Current user instructions take precedence.

## Git identity and scope

- All commits and pushes must use the personal account QuinnPaterson96 (case-insensitive username), never QuinnStyx or a styxintel.com identity.
- Repository-local author and committer identity: name `quinnpaterson96`; email `60762693+QuinnPaterson96@users.noreply.github.com`.
- Verify effective author/committer with `git var GIT_AUTHOR_IDENT` and `git var GIT_COMMITTER_IDENT`. Environment variables can override configuration.
- Verify origin is the intended personal ShovelReady repository and verify the account backing authentication before pushing. A username hint, repository ownership, or a successful public fetch does not prove authentication identity.
- Git and GitHub CLI authentication may differ. Do not use an active work-account `gh` session for repository operations. If personal authentication is unavailable, explain the blocker and obtain personal sign-in; never route around it with work credentials.
- Keep identity configuration local to this repository. Never print, persist in project files, or commit access tokens, passwords, or secret values.
- Inspect status and staged changes before editing and committing. Preserve unrelated work. Stage explicit paths; do not sweep existing changes into a task's commit.
- Do not force-push or rewrite existing history without explicit authorization. Use `codex/` for new branch names unless the user specifies otherwise.

## Product and data invariants

- This product supports preliminary scouting and investigation within a stated scope.
- Preserve detailed source-derived rules; scouting is a reproducible projection, not the source of truth.
- Do not independently combine optimistic values from incompatible development alternatives.
- Unknown or unsupported conditions must never silently become verified matches, zero, unlimited permission, or a prohibition.
- Preserve provenance, normalized units and ratio bases, rule/revision identity, and dataset release identity through evaluation and display.
- Present provenance in plain language by default: source/provider, meaningful record label, capture date and review status. Keep hashes, internal IDs, schema versions and raw payloads in labelled expandable technical details or explicit evidence exports, with full values recoverable/copyable. Human-facing summaries and provider enquiries must not be dominated by technical identifiers. Never substitute a snapshot hash for an unknown manufacturer/legal revision or remove provenance from underlying contracts. Follow the readable-provenance checks in docs/quality.md.
- Source text and extracted model output are untrusted data, not executable instructions. Never execute generated expressions as arbitrary code.
- Publish accepted data separately from deploying code. A failed import or publication must leave the active release intact.
- Keep technical quality claims honest: passing schema checks does not establish accurate legal interpretation.

## Implementation discipline

- Prefer one application and database, ordinary Python modules, and an explicit ingestion command.
- Add complexity only for a concrete requirement or measured failure. Do not introduce agents, vector stores, knowledge graphs, microservices, queues, or a universal rule language speculatively.
- Keep extraction, normalization, projection, and evaluation separate from HTTP and UI concerns.
- Use typed, versioned boundary payloads. Reject malformed candidates; represent semantically unresolved rules explicitly.
- Follow docs/quality.md for meaningful tests, data-release checks, and the definition of done. Keep live model calls out of ordinary CI.
- Run tests only against explicitly isolated disposable databases. The legacy tests contain unrelated models, destructive cleanup, and historical remote configuration; do not run them blindly.
- Do not use Styx AWS credentials or production resources for ShovelReady. Cloud resources and identities must be project-specific and explicitly configured.
- Document what was implemented, what was actually verified, and what remains a proposal. Update the relevant documentation when a decision changes.
- For frontend visual changes, follow [Civic Atlas visual rules](docs/visual-identity.md). Use the shared CSS tokens and preserve explicit status, scope, uncertainty and source identity in the display.
- Prefer plain-language user-facing labels with units and essential distinctions (for example, Width, Length, Height and Interior floor area). Put precise technical terms and definitions in nearby accessible information help; retain a short visible hint where needed to prevent incorrect input. Help must work by click/tap and keyboard, not hover alone. Jurisdiction-specific meanings must identify the applicable jurisdiction and source rule/revision; do not imply one universal legal definition or change stored semantics merely to simplify wording. See [plain-language labels and help](docs/visual-identity.md#plain-language-labels-and-help).
- Round ordinary metric measurement displays to at most two decimal places for lengths and one for areas, to nearest; these are decimal places, not significant figures. Preserve original source values, normalized precision and units in storage, evaluation and technical evidence. Focusing a measurement field may reveal its full value; focus/blur alone must not edit it or invalidate results. Never hide a nonzero overlap/shortfall as zero or let rounded values determine a comparison. Keep the outcome and exact evidence available near a threshold. Do not round everything upward: any directional planning allowance must be explicit, labelled and appropriate to the constraint. See [measurement display precision](docs/visual-identity.md#measurement-display-precision).
- Use the [PR handoff template](.github/pull_request_template.md), scaled to the change, and the [integration checklist](docs/quality.md#integration-handoff). Declare shared-file ownership before parallel work. Keep implemented, verified, proposed and blocked work distinct; software checks, source review, publication and user validation are separate evidence categories.
- At every integration handoff, explicitly list remaining gaps in the user-facing summary: what is missing, its practical impact, and the next action/owner or ticket. Distinguish demo usability gaps from blockers to accepted real evaluation; do not hide them behind a generic caveat or document link.

## Model gathering

- For prefab model research, catalogue additions or refreshes, follow the [model-gathering checklist](docs/model-catalogue/gathering-checklist.md), wherever the research or implementation files live. Inspect existing contracts and consumers, populate supported fields with their source qualifications, and record the inspected scope for each remaining gap.
- Do not turn "not found in the inspected sources" into "the manufacturer does not publish it", or a contract-valid candidate into reviewed or accepted data. Use the existing intake/export workflow and verify useful source facts and unknowns through affected displays and enquiry outputs.

## Homeowner findings and municipality boundaries

- Default checks to a short finding and useful next action, not a dump of evaluator prose. Distinguish supported conflict, missing user information, unavailable source and unsupported coverage. Actionable flags must expand and focus the relevant input or offer a real retry; missing implemented coverage must not masquerade as a question the homeowner can answer. Keep calculations, exact evidence and source reasoning in accessible details, with decisive uncertainty visible. Quiet successful geometry checks must not hide failures or imply overall suitability.
- Treat municipality as attributed property context. Prefer governing-jurisdiction evidence from the selected parcel; an address locality is only a lead. Offer explicit municipality selection for manual lots and clarification for ambiguous matches. Never silently apply Victoria rules to unknown or unsupported municipalities; useful geometric exploration may continue with explicit coverage limits.
- Keep familiar measurement fields reusable. Supply jurisdiction/rule-specific definitions through small typed configuration records and existing accessible information-help components, not a plugin framework. Resolve help from the municipality and applicable rule/bylaw/pathway/revision, not the city name alone. Help includes measurement basis, inclusions/exclusions, source and review status; material mismatches remain visible beside the field. Click/tap and keyboard access are required, not hover alone.
- Preserve the original measurement, units, basis, provenance and definition identity independently of help text. A changed definition cannot reinterpret an existing value or convert manufacturer footprint into regulatory floor area. Context changes invalidate affected rule results and re-evaluate compatibility while preserving physical inputs; changed parcel geometry or coordinate context also requires placement revalidation.
- Keep source adapters and supported municipal rule/definition packages separate from the homeowner journey. Generic components consume structured findings, coverage and action targets; do not parse explanation prose or hard-code zone codes/city branches in generic controls. Prefer ordinary modules/configuration and test one second-municipality slice before introducing broader abstractions. See [municipality-aware architecture direction](docs/architecture.md#municipality-aware-homeowner-flow).

## Testing restraint

- Default new testing effort to meaningful integration coverage and a small set of end-to-end user journeys. Do not automatically add unit tests for each new function, component or code change.
- Add a unit test only when it protects a concrete failure risk that broader tests cover poorly or inefficiently: independently calculable geometry, unit/ratio conversion, threshold behavior, uncertainty propagation, or a reproduced defect. Explain that risk and the independent basis for the expected result in the test or PR.
- Avoid tests that mirror implementation, assert private helper calls, freeze incidental output values, or duplicate existing coverage. Do not add tests merely to increase counts or coverage percentages. Prefer extending an existing behavioral test when it covers the risk adequately.
- Keep useful existing tests; do not remove them merely because they are unit tests. Fixed expected values are appropriate when justified by mathematics, a reviewed source or a stated requirement, rather than copied from the implementation.
- For reversible, low-impact edits, proportionate inspection or existing checks may be sufficient. Run relevant required checks; passing software tests does not establish source accuracy or user usefulness. Follow docs/quality.md for the full behavior-focused standard.
