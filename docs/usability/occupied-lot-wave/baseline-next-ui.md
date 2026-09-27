# Ticket #147: virtual-homeowner baseline attempt

**Status:** blocked before the app loaded. This is an agent-only baseline attempt, not a human usability test or a completed parcel exercise. Recorded 2026-09-27 (America/Vancouver).

## Participant setup and isolation

- Designated preview: `http://127.0.0.1:18133/` in a fresh background Codex in-app browser tab.
- Visible build identity: unavailable because the preview did not load. The repository revision later read for documentation work is not a substitute for a UI-visible build identity.
- Brief: explore the retained Victoria example labelled parcel 87/VIC-087 with a nominal **4 m wide × 6 m deep** rectangle supplied for this exercise, not verified manufacturer dimensions. Place and rotate it, revise one placement, explain what warrants investigation, distinguish app measurements from unknowns, and find a useful summary to share. Make no legal eligibility decision and submit no enquiry.
- Isolation: before the browser attempt, I read no app source, previous validation reports, hidden rubrics or prior coordinator measurements. I used no shell/API access to the app, invented no address, and did not modify the app or touch the other preview port. Repository instructions were read only after the attempt was blocked.

## Observed actions and evidence

| Step | Action | Visible outcome |
| --- | --- | --- |
| 1 | Opened `http://127.0.0.1:18133/` in a new background in-app browser tab. | Browser returned `net::ERR_CONNECTION_REFUSED`. Its tab showed “This site can't be reached” and “127.0.0.1 refused to connect.” |
| 2 | Opened the same designated URL in a second fresh background tab. | Browser again returned `net::ERR_CONNECTION_REFUSED`. |

The app supplied no page, build label, parcel selector, placement control, measurement or summary. There was no app screen to capture; no screenshot is claimed. The browser error and tab title above are the only UI-visible evidence. I did not infer a cause from the refusal or try to start, stop or change a service.

## Outcome and interpretation

**Observed:** task entry was blocked. The requested placement, rotation, revision, result explanation and summary sharing were not performed. Effort was limited to two navigation attempts; task effort and friction inside the app are unmeasured.

**Suspected defects:** none attributable to app behaviour from this attempt. Connection refusal is a preview availability blocker, not evidence that any app control is missing or broken.

**Usability hypotheses:** none formed from app use. Labels, discoverability, summary quality and uncertainty communication remain unobserved.

**Practical impact:** this run cannot establish what the app measured, whether a location is worth investigating, or whether a homeowner can understand or share a result. It supplies no legal or site eligibility evidence.

## Repeat against combined #152/#153 preview

Pending integration and an available preview. The coordinator should provide the combined preview URL and preserve its UI-visible build/data identity. With a fresh browser-only participant and the same brief:

1. Open a fresh background tab and record URL, visible build identity, date and viewport. If unavailable, record the error and stop without filling in outcomes.
2. Find parcel 87/VIC-087 through visible UI only. Enter the supplied 4 m × 6 m rectangle; record which dimension is width/depth and any uncertainty labels.
3. Place and rotate it to investigate one location, then revise once. Record exact user actions, displayed measurements and how the result changes. Capture scoped screenshots at the initial parcel, first placement, revised placement and result, if reached.
4. Find the most useful copy/share summary through visible controls. Record what it actually says about measured geometry, missing facts, sources, review state and next action. Do not submit an enquiry or contact anyone.
5. Separate observed behaviour from suspected defects and usability hypotheses. Compare with the original baseline only after this isolated run; implementation-aware adjudication belongs to the coordinator.

The existing #147 delayed-response and site-list-outage verification gaps remain separate and open. This blocked attempt covers neither. The repeat also cannot substitute for independent source review, accepted publication, real evaluation or human validation.
