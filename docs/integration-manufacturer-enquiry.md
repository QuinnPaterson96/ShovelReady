# Manufacturer enquiry reporting — October 7, 2026

## Problem and result

The first-contact recipient is a prefab manufacturer's sales/technical team. The
enquiry should help them identify the model/property, spot material preliminary
concerns, and explain their scope and the information needed for a first discussion.
The sender supplies project/site facts; the manufacturer supplies design, service,
commercial and installation information; City staff or a qualified professional
must establish planning applicability. This implements the recipient/action-first
standard being added separately in `docs/reporting-standard.md`.

The supplied export mixed roughly 2,400 words of diagnostic screening state into
an email. Its two rear-yard concerns coexisted with a misleading zero-conflict
summary for a separate subset. The Model 300 path now generates:

- A short recipient enquiry, with site/use/context when supplied, current concerns,
  five manufacturer questions and a clear closing. The review sample is 451 words.
- A separate supporting screening report, with an overall account, explicitly
  scoped subsets, approximate physical gaps, candidate distances, separate planning
  allowances, readable source labels/dates and uncertainty.
- Complete technical evidence in a fenced JSON section of the supporting Markdown
  download and in the existing copyable disclosure. It includes model/catalogue
  identity, user enquiry inputs, original source records, exact quantities, all
  rule/revision/packet identities, lookup errors, scenario requests/results, and
  acknowledgement state. No accepted dataset release is invented.

The report draws its concern account from included checks rather than treating
one producer's coverage count as an overall decision. It does not sum incompatible
checks. Strict-input counts are derived from included checks; declared coverage is
still retained in evidence. Acknowledgement affects the user's workflow and remains
in evidence; it neither removes a concern nor appears as recipient-facing prose.
Approximate geometry and strict-input findings remain separate; their evaluation
semantics have not changed.

Blank intended use stays unspecified unless the user explicitly confirmed use in
Project details. Foundation, suite-count, waterfront and largest-outline defaults
remain labelled assumptions. An ordinary measurement and its candidate threshold
can round to the same displayed number while the nonzero difference stays visible.
The rear-yard comparison uses the producer's explicit ratio (rear-yard denominator).

Optional relationship, project stage, configuration, requested next step and sender
details sit in a disclosure, without blocking first contact. Existing use, budget,
timing, access and service answers are reused. No identity, budget, permission,
attachment or design preference is fabricated. Private email mode withholds the
automatic site sections and address-bearing subject; the user-written question and
closing still require review. Draft-link length fallback remains explicit and
requires pasting the full text; no enquiry is silently truncated.

The generic retained geometry handoff is also split into a short provider enquiry
and its existing detailed report/JSON. Its stale/mismatched-site protection remains.
Unrelated reporting and the backend contracts/evaluator are unchanged.

## Provenance and impact

- Starting base: local `origin/main` at `60f7188` (PR #275), in the managed
  `manufacturer-enquiry` worktree. The original checkout was at `8cfbe0a`; it and
  the separate owner's uncommitted reporting-standard documentation were preserved.
- Interfaces: frontend presentation/export functions only; no HTTP contracts,
  migrations, credentials, deployment or data publication changed.
- Decisions: retain the existing evidence/report structure rather than shorten all
  evidence; assemble recipient prose from structured statuses and quantities rather
  than infer facts from diagnostic strings. Reconsider the missing-plan wording when
  a real labelled plan export/attachment mechanism is implemented.

## Verification and demo

From this worktree's `frontend` directory:

```powershell
npm ci
npm run typecheck
npm test
npm run build
$env:TSX_TSCONFIG_PATH = 'tsconfig.app.json'
node --import tsx tools/generate_manufacturer_sample.tsx
```

The full frontend suite passed all 140 tests. After final label/grammar polish, the
16 focused builder/reporting and conditional-screen tests, typecheck and production
build passed again. That focused command was `node --import tsx --test
src/builder_demo/builder-demo.test.tsx
src/conditional_screening/conditional-screen.test.ts` with the TSX configuration
above. These final focused checks cover the delivered tree; the full-suite result
precedes only that wording polish. The build
retains its existing large-chunk warning. No backend/database tests were run because
no backend behavior changed; no live model/source calls occurred. Remote CI has not
been run for this local work. Integration still requires review and final-head CI.

Behavior coverage extends the existing host/map/checklist/enquiry journey: a current
distance conflict remains after acknowledgement/removal, edits invalidate it, and
raw acknowledgement records remain recoverable. Reporting regressions protect the
two rear-yard concerns alongside a zero-conflict strict subset, defaults versus
confirmed/explicit use, retained exact evidence/source identity, private email,
arbitrary source text in Markdown, producer-count disagreement, and independently
stipulated tiny excess/shortfall values. Existing detailed commercial/source/geometry
tests now exercise the supporting report rather than require them in a sales email.
These checks establish software behavior, not source accuracy or recipient usefulness.

Reviewable artifacts:

- [Original supplied export](samples/manufacturer-enquiry/before-enquiry.md).
- [Generated short enquiry](samples/manufacturer-enquiry/after-enquiry.md) and
  [plain text](samples/manufacturer-enquiry/after-enquiry.txt).
- [Supporting report with reconstruction evidence](samples/manufacturer-enquiry/supporting-report.md).
- [Rendered React preview](samples/manufacturer-enquiry/preview.html) and
  [exact reconstruction input](samples/manufacturer-enquiry/reconstruction-evidence.json).

The original geometry/full live API payload was unavailable. This is explicitly a
reporting reconstruction: supplied address, gaps, rear-yard concerns and original
27.870912000912913 / 47.15957088298145 figures are retained. Strict-input contract
shape/source identity comes from a separately labelled synthetic API fixture and
does not recreate the original five-meet/eight-missing count. The generator does
not query this property or manufacture its geometry, original full hashes, named
permit-area records or approval. The original export remains available for comparison.

Browser inspection of the rendered enquiry and expanded report found the model,
address, unspecified use, two concerns, preparation gaps and requested response
readily identifiable. The report identifies its narrower distance and strict-input
scopes; the email contains no raw bylaw diagnostics or marketing quotes. This was
developer/agent recipient-perspective inspection, not a real manufacturer study.

## Remaining work

| Missing item | Practical impact | Next owner/action |
|---|---|---|
| Marked site-plan export/attachment | The recipient cannot spatially locate the concerns from the email alone. The current map has no reusable labelled plan export; the enquiry explicitly says no plan is included. Demo first contact remains possible. | Sender supplies a marked property plan/access photos; product owner can commission export of the existing map with street, main house, orientation, endpoints and gaps. |
| Original live geometry/API/scan records | The example cannot be independently recomputed and the development permit area cannot be named. | Sender/product owner supplies the original technical export or reruns the current inputs and reviews the returned record names. |
| Sender, use, ownership relationship, configuration, timing, access/utilities | The manufacturer needs follow-up to scope an assessment/quote; optional input fields and concise preparation questions cover these gaps. | Property contact supplies facts where known; manufacturer identifies prerequisites. |
| Current controlled drawings, legal measurements, applicability/currentness and accepted data | Blockers to accepted real evaluation, not to an honest preliminary enquiry. No permit entitlement or verified site feasibility is established. | Manufacturer supplies controlled drawings; property contact/qualified professional confirms site facts; City/source reviewers establish rule applicability/currentness; data owner handles separate accepted publication. |
| Real manufacturer comprehension testing | Recipient understanding and time saved remain unmeasured. | Product owner tests the brief and supporting report with actual recipients; retain feedback before claiming usability validation. |
| Integration and CI | The local implementation is reviewable, but these checks do not establish remote final-head CI or deployment. | Integration owner reviews the local commit and runs required CI; no deployment or email sending is part of this task. |
