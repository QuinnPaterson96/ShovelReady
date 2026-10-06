# Property assumptions handoff

Status: standalone component proposal for the Model 300 integration. No zoning check, accepted site record or publication was made.

## What this supplies

`SiteAssumptionsEditor` accepts an existing `occupied_lots/contract` `Case`, an explicit `geometryRevision`, a `placementRevision`, and `onChange(SiteAssumptions | null)`. The typed `sr.zoning-site-assumptions.v1` payload is in `frontend/src/zoning_site_assumptions/model.ts`. It carries the parcel source and capture status separately from user assertions. Building outlines retain their captured `roofline` / `wall` / `unknown` basis. Boundary roles start at `unknown`, and each segment's ID includes the geometry revision, ring and segment number. Roles are never inferred from parcel shape or long axis.

The component asks for the existing main-building type, known garden-suite count, a possible principal-building outline and waterfront status. It lets the user classify each edge as front, rear, side or flanking street, or leave it unknown. The map is optional; numbered buttons and labelled selects provide a keyboard path. Complex rings and undrawable shapes retain a text/manual unknown path. A user can enter distances measured from proposed walls to lot lines, wall-to-wall separation, and regulatory floor area when the relevant basis is known. Invalid or blank numbers remain absent. These entries are marked `origin: user` and are tied to a `placementRevision`.

`geometryRevision` must identify the *actual supplied geometry capture*, such as a source snapshot identity; it is not a bylaw or model revision. The integration worker should pass a fresh value whenever coordinates change. Changing property or geometry remounts the editor and discards all assumptions. Changing placement clears its measurements but keeps property facts and edge roles. The integration owner must also invalidate prior evaluator results and enquiry findings synchronously when these input props change; the editor emits `null` during placement invalidation and then the current packet.

Suggested integration: mount after `placementCase(confirmed)` is available, pass a capture-specific parcel geometry revision, and retain the latest emitted payload only while its `case_id`, `parcel_id`, `geometry_revision` and `placement_revision` match the current site and placement. Pass classified edges plus their source segment coordinates to the conditional evaluator. Do not copy roles into `named_boundaries` without an explicit converter and provenance. The evaluator must independently decide legal applicability and measurement compatibility; a user-labelled edge is not a reviewed legal lot line.

## Gaps and ownership

For demo usability, the integration worker needs to mount the component, supply real revision identities, connect the evaluator request, invalidate stale results, and test the full journey on a narrow screen and with a keyboard. This standalone PR only checks the component and payload boundary. If the current property has no stable source geometry revision, the integration worker must establish one before retaining edge choices.

For accepted real evaluation, a site reviewer still needs a registered lot and street relationship, legal frontage/rear/side classification, principal-building use and wall faces, suite count, waterfront status and any parcel-specific exceptions. A qualified source reviewer must resolve the applicable rule revision and measurement definitions. The capture's rooflines and a nominal Model 300 rectangle cannot supply those facts. The data publication owner must separately review and release accepted rule and site inputs. Software validation below does not establish legal accuracy or user comprehension.

## Verification

Constructed boundary cases cover an ordinary four-edge parcel, a five-edge/corner ambiguity, property/capture replacement identity, placement measurement invalidation, and a rendered labelled keyboard alternative. These are independent of any legal interpretation. `npm test`, `npm run typecheck`, `npm run build` and `git diff --check` are the intended software checks. No live parcel, browser interaction, human validation, source review or publication is claimed here.
