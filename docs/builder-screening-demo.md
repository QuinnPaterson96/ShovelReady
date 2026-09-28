# Builder website screening POC

Decision date: September 27, 2026. Reference company: **aux box**. Lead product:
**Model 300**. Geographic demonstration: **City of Victoria**, initially using the
three retained site packets. This is an independent ShovelReady demonstration;
aux box has not commissioned, endorsed or validated it.

This brief sets the next product direction. It does not implement a company website,
change catalogue acceptance, publish zoning data or establish a customer relationship.
Code baseline inspected: main `1d0e199`. Earlier broad scouting and data-platform
ideas remain possible future consumers of the same data system.

Implementation follow-up: the [foundation integration](integration-builder-demo-foundation.md)
records a measured nominal Model 300 candidate placement and mounts the map/enquiry
components. That supersedes the unverified candidate-placement status below; company
entry, manual fallback and accepted zoning results remain outstanding.

## Customer, job and commercial hypothesis

The paying customer is a builder or prefab manufacturer with an existing website.
The visitor is a prospective homeowner trying to understand whether to enquire.
The product helps the visitor select a model, explore a supplied placement and
prepare an enquiry that the builder can assess with less back-and-forth.

Proposed pitch: **Help visitors explore a model on their property and arrive at
your first conversation with a useful site summary and clear questions.**

The hypothesis is improved enquiry quality and reduced initial qualification work.
Neither lead volume, time saved nor willingness to pay has been measured. A paid
installation and recurring operation, with separately scoped consulting, remain
business experiments. Bespoke requests can teach us about the problem; record their
cost and whether another builder would need the same capability.

## Why this company

aux box lists a Parksville address. Its published process already asks prospective
customers about available space, zoning, crane access and finances, then offers a
discovery call and further site/planning work. This gives the POC an identifiable
place before the first conversation. We are inferring an opportunity to improve that
handoff, not claiming its existing process is ineffective or that the company wants
our software. [Official process](https://www.auxbox.ca/how-it-works).

Model 300 already has a source-labelled entry and technical packet in this repository,
so it avoids a new manufacturer ingestion project. ORCA's Jay remains a credible
alternative, but its retained packet has area/version and installation-scope questions
that are unnecessary for this first demonstration. See the existing
[Model 300 packet](research/prefab-technical/model-300.md) and
[Jay packet](research/prefab-technical/jay.md).

## Real constraints, with their limits

The following product observations were checked on the
[Model 300 page](https://www.auxbox.ca/model-300) on September 27, 2026.
This live check does not replace the earlier retained source snapshot or create a
controlled manufacturer revision.

| Published fact | Demo treatment |
|---|---|
| Exterior 30 ft by 10 ft | Nominal rectangle: 9.144 m by 3.048 m. Projection envelope unresolved. |
| Exterior height 10 ft 6 in | Display 3.2004 m as advertised height; installed grade/roof datum unknown. |
| Living space 226 ft2; footprint 300 ft2 | Keep separate labelled quantities; neither establishes regulatory floor area. |
| Bedroom, bathroom and kitchen; long-term accommodation claim | Fix the selected configuration; local dwelling eligibility remains unreviewed. |
| From CAD 187,000 | Dated starting price, not an installed project quote. |
| Permitting, foundations, services, shipping and installation extra; crane placement | Show exclusions and collect access questions without asserting installation feasibility. |

The page's headline uses a different living-space figure from its explicit specification;
retain the labelled values and conflict rather than silently resolving it. Its advertised
North American delivery reach is a provider claim, not our screening coverage or a
site-specific service commitment.

Lead with one model. Add [Model 240](https://www.auxbox.ca/model-240) only when a second
configuration improves the demonstration: its flex-space, bathroom and kitchen options
must remain distinct, including their prices and intended-use claims. Do not show a
base configuration's price alongside a fully equipped dwelling.

[Model 620](https://www.auxbox.ca/model-620) is a later larger comparison. Its page now
links a specification PDF, but this pass did not establish a verified complete exterior
envelope and compatible height datum from it. Do not infer dimensions from advertised
area or promote it into placement based on the existence of a download.

## The demonstration journey

1. **Start on a builder-style model page.** Show Model 300, readable sourced facts and
   a prominent "Explore this model on your property" action. Use a ShovelReady sample
   host with plain-text company attribution and our own schematic, not an apparent
   official aux box website. No copied imagery, logo package or submitted provider form.
2. **Identify the site and intended use.** Prefer supported address/parcel lookup;
   keep test cases behind an optional example picker. Show the resolved municipality
   and data coverage. An unsupported address offers manual information, not a false
   parcel match or an implication that the property is unsuitable.
3. **Confirm or supply site facts.** Display approximate parcel/roofline observations
   with source and date. Let the visitor correct or supply missing geometry with clear
   user-supplied attribution. Facts alone can form a partial enquiry when geometry is
   absent; no distances are computed until a usable, explicitly scaled shape exists.
4. **Explore placement.** Load the selected model's nominal rectangle, allow movement
   and rotation, and report containment, observed overlap and measured distances.
   Changes to dimensions become a labelled custom scenario, not a manufacturer option.
   Preserve partial geometric value while showing which regulatory checks are unavailable.
5. **Clarify next questions.** Ask about intended use, timing, optional budget range,
   known access obstacles and service connections. "Not sure" is a valid answer. Do
   not turn a crane-access answer into lift approval or a starting price into total cost.
6. **Preview a useful enquiry.** Summarize model/configuration, site, placement, measured
   observations, supplied facts and the two or three next questions. Offer a local
   copy/download preview. Actual enquiry submission, personal-data collection/storage
   and routing wait for a real customer installation and its requirements.

Use a visible status with text as well as colour: "Placement to investigate",
"Conflict at this placement", or "More site information needed". Keep zoning scope
visible separately; no overall green approval when zoning has not been evaluated.
The exact wording is a usability hypothesis. A failed supplied placement never proves
that every placement or development pathway fails.

## Proof cases and success criteria

- **Candidate placement:** on one retained Victoria site, show actual API measurements
  for the nominal Model 300 rectangle, source links and outstanding questions. Find and
  record the placement empirically; no Model 300 fit is established by this brief or
  by the earlier successful movement of a differently sized synthetic rectangle.
- **Observed conflict:** move that rectangle into a captured roofline, then correct it.
  The result explains the measured conflict and clears stale conclusions after edits.
- **Unsupported or incomplete site:** enter an address outside the retained set. Manual
  facts produce a useful partial enquiry, with geometry and zoning explicitly unavailable
  unless their separate requirements are met. No fabricated lookup result.

A scripted demo passes when these journeys work and the recipient can distinguish
measured, user-supplied and unchecked facts. This is software/usability evidence,
not source acceptance or commercial validation.

For a subsequent builder interview, compare the proposed summary with its normal intake
using the same small set of consented or public cases. Ask what it would do next, what
information it must ask for again, and whether any omission changes its decision. Measure
triage time and follow-up questions; ask for a paid pilot after demonstrating usefulness.
Do not treat an agent walkthrough or favourable comments as purchase evidence. If the
tool requires substantial staff reconstruction, hides viable enquiries, or serves too
few relevant visitors to justify its cost, revise the offer before expanding coverage.

## Implementation sequence

1. **Review existing work first:** assess [PR #155](https://github.com/QuinnPaterson96/ShovelReady/pull/155)
   (map workspace), [PR #156](https://github.com/QuinnPaterson96/ShovelReady/pull/156)
   (local scenario handoff) and [PR #154](https://github.com/QuinnPaterson96/ShovelReady/pull/154)
   (blocked virtual-user baseline). These were open at this brief's source check; their
   existence is not verification. Reuse suitable work after integration checks.
2. **Company-specific entry and handoff:** one reference-company configuration, an
   explicit model allow-list, a sample host page and an unsent enquiry preview. Reuse
   the catalogue/API and placement workspace. Keep branding, model selection, coverage
   and eventual routing outside measurement/rule logic. No tenant platform is needed.
3. **Coverage and manual fallback:** connect supported addresses to retained packets,
   then support missing/corrected site inputs. Clear prior results on relevant changes.
   Label assumptions throughout the handoff. This is necessary for a convincing website
   journey, even if the first engineering demonstration starts with three fixtures.
4. **Run the three cases on a frozen combined build:** add only consequential integration
   or browser regressions; exercise unavailable data, stale responses, keyboard use and
   a narrow screen. Repeat the blocked user walkthrough on that reachable build.
5. **Add one useful reviewed zoning subset and validate demand:** source work can proceed
   alongside UI work, but accepted regulatory results require reviewed applicability and
   publication. Use a demo to solicit builder feedback before adding more companies,
   municipalities or a full catalogue. No outreach has occurred in this task.

A sample website plus a reusable entry component demonstrates the installation concept.
Production embedding, cross-origin configuration, enquiry delivery and support arrangements
are later customer-integration work. Preserve one application/database, deterministic
evaluation and versioned evidence; no new services, agent runtime or billing system.

## Current gaps and ownership

| Gap | Practical impact | Next owner/action |
|---|---|---|
| No integrated company-specific journey | Existing tools do not yet demonstrate the commercial offer | UI owner: step 2 after reviewing #155/#156 |
| Only three retained geometry packets; no complete manual site fallback | Most typed addresses cannot reach automatic placement measurement | Site-input owner: #139 and step 3 |
| No accepted current rule release | Cannot report zoning compatibility; approximate geometric observations remain usable | Source reviewer: #104; review and publish a bounded pathway |
| Uncontrolled product revision, projection envelope and installed-height datum | Nominal plan placement only; no height-compliance or delivery guarantee | Manufacturer research: #124/#125; seek controlled inputs in a later authorized contact |
| Latest virtual-user baseline blocked | No completed fresh-user validation of this combined journey | QA owner: #147, then step 4 |
| No builder-approved intake, confirmed site service or measured willingness to pay | Company selection provides constraints, not a customer commitment | Product owner: demonstrate, interview and propose a paid pilot |

Keep this reference company's requirements as configuration unless evidence shows a
shared rule. The second builder should test reuse, rather than requiring a second engine.
