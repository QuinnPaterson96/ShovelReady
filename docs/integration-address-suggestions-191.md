# Address suggestion follow-up — issue #191

## Evidence and decision

The public BC Address Geocoder response for `1144 May St, Victoria` was captured
on 2026-10-05 in `frontend/src/site_discovery/may-street-api.fixture.json`.
Its base data date is 2026-07-07. The 99-point civic address has only the
`PROVINCE/missing` fault because the query omitted BC. The other four suggestions
are street-level, do not retain number 1144, and include different localities.
Those lower-precision suggestions remain selectable under **Other matches**.
The 525 Superior saved response has the same clear civic/street distinction.

The saved `200 Gorge Rd W, Saanich, BC` response remains expanded: its 93-point
block candidate changes street direction and locality. The policy also expands
ties, competing civic/block records, different unit records, unknown precision,
and a leading record with any fault other than an omitted BC province. Scores
only order provider suggestions; no suggestion is selected or confirmed by rank.
Any later selection clears downstream parcel observation and confirmation.

Provider faults now name the affected field in ordinary language. The complete
candidate and provider source are still available in technical details, including
the original fault code, element, value, capture identity and source dates.
This is a display/ranking change; it does not alter source observations, geometry,
legal evaluation, publication or data storage.

## Verification

- `npm ci --prefix frontend`: lockfile dependencies installed in this worktree.
- `npm test --prefix frontend`: 86 passed, including saved May/Saanich replays,
  competing identities, ties, units and alternate-selection invalidation.
- `npm run build --prefix frontend`: TypeScript and production build passed;
  existing large-chunk advisory remains.
- Local stateless app at `http://127.0.0.1:18191/`: live 1144 May search showed
  the civic lead, correction, source date and closed Other matches disclosure.
  Enter on the disclosure opened all four selectable alternatives with readable
  corrections. No address was auto-selected. Default desktop layout was inspected.

## Remaining gaps

- Provider rankings are unreviewed and can change with its data release. Future
  source review should sample more query forms and revise the policy if a hidden
  alternative proves to be a material identity. Owner: address discovery follow-up.
- Narrow viewport was not checked because this parallel wave shares browser
  viewport state. Mobile wrapping and touch disclosure remain a demo usability
  check for integration ownership; keyboard Enter and default desktop were checked.
- No accepted parcel identity, zoning release or real-site fit follows from the
  address order. Independent source review and human comprehension testing remain
  separate integration work, as recorded in `docs/model300-wave-integration.md`.
