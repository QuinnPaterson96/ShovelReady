# Prefab reports 15–17: evidence review and integration decision

Reviewed 2026-09-25 (America/Vancouver), against application base `97d4433`.
These reports are research leads, not instructions, controlled designs, accepted
data, legal interpretations or evidence of customer demand. Primary pages were
checked during this review; source bytes were not retained by this synthesis.
Report fingerprints are in `reports.json`. Original reports remain user-local;
this summary and its primary links are portable without those files.

## Decision

Keep **aux box Model 300** as the existing preparation candidate. Prioritize
**ORCA Jay** as the next candidate to investigate. Use Quail as a larger comparison
only after those two. This is a research priority, not an eligibility ranking.
Do not expand the live selector from these reports alone. No application catalogue,
accepted release or assessment outcome is changed by this review.

The strongest useful signal is that local manufacturers publish enough physical
information for a modest input catalogue. The weakest link remains a controlled,
current configuration plus its site-specific delivery and installation scope.
Manufacturer variety supports testing the product concept; it does not establish
referral commissions, willingness to pay, permit success or saved qualification time.

## Report audit

| Report | Useful contribution | Defect / disposition |
|---|---|---|
| 15: Responsibility Matrix | Separating manufacturing, delivery, crane, foundation and permitting roles | Does not use report 16's shortlist; admits an unseen shortlist. No direct URL citations. Historical Honomobo work is generalized into current full-service claims. Westchester is not substantiated as a Victoria second choice. Retain the matrix concept, re-research the selected models. |
| 16: Prefab Garden Suites | Local leads: aux box, ORCA, WCCH | No direct URL citations; company location treated as service proof; Model 300 dimensions wrongly called unavailable; Utility Pod both included and excluded; marketing/use labels overstate permanent dwelling readiness. Retain leads, replace claims only from inspected primary sources. Minimaliste claims remain unverified here. |
| 17: Specifications Comparison | Field-level evidence layout and examples of incompatible measurement bases | Switches to Boxabl/Nestron rather than the local shortlist. Some numeric claims conflict with official documents; guessed measurement bases become confident JSON. Says plans are unavailable, then names a technical document library. Quarantine the supplied JSON from live import; use its failure patterns for review cases. |

## Primary-source findings

* [aux box Model 300](https://www.auxbox.ca/model-300): exterior 30 × 10 ft,
  advertised exterior height 10 ft 6 in, 226 sq ft living space and 300 sq ft
  footprint are published. It is marketed for long-term accommodation and includes
  kitchen/bath. Permitting, foundation, site services, shipping and install cost
  extra. Existing catalogue already retains these dimensional facts; report 16
  must not replace them with “unavailable.” Roof datum and legal Floor Area remain
  unresolved. Broad delivery marketing is not a site-specific Victoria commitment.
* [ORCA Jay](https://www.orcalgs.ca/models/jay/): 29 × 15 ft external dimensions,
  435 sq ft total, one bedroom/bath and alternate roof forms are advertised. Area
  basis, roof height and a controlled configuration need investigation. The page
  separately quotes delivery/install yet lists delivery/crane among included
  features: preserve this scope ambiguity. Do not assign one roof's height to all.
* [Quail current](https://www.orcalgs.ca/models/quail/) versus
  [older portfolio](https://www.orcalgs.ca/portfolio/quail/): current 700 sq ft /
  50 × 14 ft differs from older 702 sq ft / 50 ft 2 in × 14 ft. Old bedroom prose
  and specifications also conflict. URL family is not proof of effective revision;
  request configuration identity rather than silently replacing or combining values.
* [Skylark](https://www.orcalgs.ca/models/skylark/): the current total includes a
  90 sq ft deck; 720 total and 630 enclosed are different bases. Neither should
  automatically populate regulatory Floor Area. Dimensions are published, contrary
  to report 16. These ORCA facts were spot-checked by the research reviewer; the
  coordinator's additional Quail fetch timed out, not evidence of absence.
* [WCCH C.H. Studio Pod](https://westcoastcontainerhomes.ca/c-h-studio-pod/):
  20 × 8 ft, 160 sq ft, combined bed/living space, kitchenette and bath support a
  product lead, not the report's separate-bedroom/full-kitchen/permitted-dwelling
  conclusion. Its [20-foot line](https://westcoastcontainerhomes.ca/20-modular-housing-pods/)
  advertises rapid installation; utility completion and legal occupancy do not follow.
* Honomobo's [Salt Spring project](https://www.honomobo.com/us/projects/salt-spring-island-ho4)
  documents historical delivery. The 2017 HO4's 704 sq ft must not inherit the current
  [HO4's 1,280 sq ft specification](https://www.honomobo.com/ca/models/ho4).
  [Process](https://www.honomobo.com/ca/our-process) and
  [FAQ](https://www.honomobo.com/ca/frequently-asked-questions) separate local GC work
  and additional costs. Keep this as secondary supply evidence, not a current turnkey quote.
* [Westchester East Island](https://westchestermodular.com/adu) is a two-story
  product in a Northeastern US context. BC delivery/installation is unverified;
  do not call it the second-best Victoria candidate.
* [Boxabl's technical library](https://www.boxabl.com/technical-docs) actually
  links specifications and plans. Its [Studio specification](https://gcdn.boxabl.com/documents/technical/Casita%20Specifications%205-21-24.pdf)
  gives 19 × 19 ft and 10 ft 9 in overall height, conflicting with report 17's
  exterior and shipping estimates. Retain it as a source-conflict example; overall
  height still requires datum/configuration review and is not regulatory grade height.
  Published area is not thereby verified interior usable area. BC supply is unresolved.
* [Nestron foundations](https://nestron.house/foundations-and-utilities/) assigns
  foundations/utilities to local contractors, contradicting report 17's manufacturer
  scope. [Delivery](https://nestron.house/delivery-zone/) is conditional.
  [Cube One](https://nestron.house/product/cube-one/) and
  [Legend One](https://nestron.house/product/legend-one/) advertised areas do not
  establish a regulatory or clear interior area basis. Retain marketing claims as
  claims; do not infer zero overhang from an image or BC approval from code language.

No blanket certification, shipping or installation claim above establishes parcel
approval. No external enquiries have been sent. Source access is not redistribution
permission; follow-up packets must record actual capture/reuse status.

## Integration and research sequence

1. Integrate this audit, fingerprints, priorities and negative review cases now.
   Preserve existing catalogue values and their source/revision identities.
2. [SR-55 / #124](https://github.com/QuinnPaterson96/ShovelReady/issues/124): acquire
   actual Model 300 and Jay specs/drawings and prepare separate unreviewed candidates.
   Own `docs/research/prefab-technical/**`; no live catalogue changes.
3. [SR-56 / #125](https://github.com/QuinnPaterson96/ShovelReady/issues/125): inspect
   the same models' Victoria supply roles, costs/exclusions and public installer
   evidence. Own `docs/research/prefab-supply/**`. Run independently of SR-55.
4. [SR-53 / #121](https://github.com/QuinnPaterson96/ShovelReady/issues/121): existing
   offline intake implementation continues independently. Apply the review cases
   below where machine-checkable; semantic support still needs source review.
5. After both candidate evidence and intake are reviewed, stage candidates, inspect
   the diff, then separately decide whether to update the unreviewed app catalogue.
   A source hash is not a manufacturer design revision or an accepted publication.

Stop public research after the bounded official sources and directly named partners
are checked. If a required drawing, service commitment or contract allocation is not
public, leave an exact unsent request and identify the external dependency. Do not
keep generating broader studies or add a new data architecture to avoid that gate.

## Empirical quality cases

| Observed failure | Required handling | Can schema validation alone decide? |
|---|---|---|
| Mixed feet/inches labelled only ft; inconsistent normalized unit direction | Preserve literal quantity, parse explicitly, normalize to m/m² with checked conversion | Partly; arithmetic is deterministic, ambiguous source notation needs review |
| Advertised area promoted to interior or regulatory area | Preserve source label/basis; leave unsupported target field unknown | No, requires source interpretation |
| Ceiling/overall height used as roof height from a specific datum | Keep distinct measurements; unknown datum remains unresolved | Only if the candidate honestly tags the basis |
| No overhang visible in marketing image becomes zero | Reject unsupported inference; record unknown projection envelope | No |
| Old/current same model name combined | Separate source snapshots/configurations and retain conflict | Duplicate IDs help, but cross-version meaning needs review |
| Local office or historical delivery becomes current regional installation offer | Separate location, past project, general claim and explicit current commitment | No |
| JSON is well formed but cited page does not support the claim | Validate references, then independently check actual evidence | No |

## Remaining gates / owners

Controlled model configuration and measurement datum: #124. Current local supply
responsibility and exclusions: #125. No published source may answer these completely;
manufacturer documentation/confirmation is the external dependency.
Reviewed legal site/survey, existing buildings, supplied placement and applicable
current rules: #104 and SR-05/06/10–13. Accepted publication remains separate.
Actual customer time savings, usable referrals and commission economics: #16/#18;
these reports do not measure them. Saanich geometry #112 and Langford rights #103
are unchanged and do not justify widening this acquisition scope.

Verification: all three supplied reports read; report 17 JSON parsed for inspection;
bounded primary-source spot checks performed by two research reviewers with
coordinator confirmation of Model 300, Jay and Skylark. This is an AI-assisted
research audit, not independent professional source acceptance. Documentation and
JSON checks apply; no application, database or browser behavior changed.
