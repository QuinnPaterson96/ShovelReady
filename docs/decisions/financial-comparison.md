# Financial comparison and retained alternatives

**November 8 addition — Start rental scenarios with sourced defaults.** Quinn
approved regional apartment asking-rent benchmarks as editable preliminary
scenarios for each model, using metro and bedroom cohort rather than inventing a
rent-per-square-foot adjustment. Show annual rent after vacancy, income after
running costs and cash flow after debt as distinct measures. Keep illustrative
allowances, owner overrides and source observations distinguishable, preserve
unknown financing and missing data, and retain the source and assumptions in
supporting exports. This authorizes the bounded scenario calculator deferred
below; it does not establish achievable suite rent, installed-cost returns or a
best-model ranking. See [implementation and remaining gaps](../rental-scenarios.md).

Accepted by Quinn on November 4, 2026, following the October 23 rental-model
walkthrough and the ticket triage in this chat. These decisions authorize the
bounded implementation below; they do not claim that it is already delivered.

**Decision 1 — Support the next investigation.** The next financial increment
helps homeowners compare plausible options and decide what information to obtain.
Build the retained suitability-and-cost comparison in #333 before a profitability
ranking. A starting price remains useful evidence, and incomplete information must
still allow exploration and an enquiry; it cannot establish which model offers the
best rental return. Keep affordability preferences, attributed starting prices,
partial subtotals and whole-project estimates distinct, and never reward missing
evidence with a better comparison result.

**Decision 2 — Preserve each alternative.** Preserve the homeowner's work separately
for each model within the current project/session: authored questions, placement,
configuration and budget inputs. Recalculate affected results when inputs change,
and keep each provider's message focused on its own alternative. Shared property
facts remain separate, and changing properties must not silently transfer old
placements or costs. This supports comparison without accounts or a new persistence
system; make the session/reload boundary clear.

**Decision 3 — Defer numerical returns to a bounded scenario tool.** A small optional
scenario calculator is a later, separately scoped increment. First choose the
question it answers, such as annual rental cash flow or return on total project
cost, and define its necessary inputs. Explicit user assumptions can support
provisional scenarios without professional verification of every figure before
exploration. Missing inputs must remain visible, and comparisons must use consistent
assumptions rather than inventing a winner. This wave does not add rental prediction,
finance adapters or numerical profitability ranking.

**November 6 clarification — Ask about financial goals once per project.** Offer every
project an optional choice of project cost, potential rental income, or both. Keep skip
and edit available. An explicit rental answer can be reused. A building type alone cannot
establish a financial goal. The choice follows the homeowner between models, while each
model shows its own costs and questions. This also accommodates a future project with
both owner-occupied and rented units without requiring plex evaluation in this release.

## Delivery and evidence

The review reported PDF export failure (#329), lost authored questions (#330), and
unrelated costs in provider messages (#331). Recoverable alternatives (#332) and
comparison (#333) are improvements. Narrow-screen testing (#334) is a verification
gap, not a confirmed responsive defect. All observations refer to the reviewed
deployment a27c2f511d4087cddb307590f21bd4ea9c57e432; triage did not reproduce them.

Implementations must preserve useful provisional results and disclosed, correctable
defaults. An enquiry does not require a complete professional assessment. Existing
source review, accepted publication and human validation remain independent of code
delivery. Quote/configuration evidence remains under #124/#125 and human validation
under #16/#147. Revisit numerical scope when a concrete user decision and coherent
input scenario justify it, not merely because a ranking can be calculated.

## Worker ownership and integration

All workers use Sol 6.1 with high reasoning effort and isolated worktrees based on
current main a27c2f5 plus this decision record. No merge or deployment is requested.

| Worker | Tickets | Exclusive ownership |
|---|---|---|
| Export/reporting | #329, #331 | EnquirySaveOptions.tsx, enquiry.tsx, manufacturer.ts, enquiry-downloads tests, project_budget/pipeline.ts and its reporting tests, export/build delivery files as required |
| Alternative state | #330, #332 | BuilderDemo.tsx and its integration tests; new retained-alternative state modules |
| Comparison and QA | #333, #334 | New comparison components/styles and their behavioral coverage; browser verification artifacts; comparison documentation |

The comparison worker agrees a typed interface with the state worker before wiring
it. The state worker alone edits BuilderDemo.tsx, including the comparison mount.
Shared CSS, package manifests, contracts and other overlapping files require an
ownership message before editing. Export/reporting coordinates any host changes
through the state worker. Existing PRs #296/#297/#298 must be inspected for overlap;
do not merge, replace or rewrite their branches. Workers commit explicit paths and
report tests, remaining gaps and commit IDs to the integration owner.

Record generated-output and measured-viewport evidence; do not label an agent
walkthrough as human validation. Real quotes/site evidence, accepted legal evaluation
and customer usefulness remain missing, owned by the existing evidence/research
tickets. The integration owner reconciles combined behavior and documentation after
worker handoffs. This note itself was checked for consistency and whitespace only.
