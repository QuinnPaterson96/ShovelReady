# Address suggestion ranking decision

October 6, 2026. Scope: the unreviewed BC Address Geocoder suggestions in the Model 300 property search. This changes presentation only; selecting an address, selecting a Victoria parcel, and confirming the observed property remain separate actions.

## Evidence and decision

The public geocoder returned **419 Cecelia Rd, Victoria, BC** at civic-number precision for both `419 Cecelia, Victoria` and `419 Cecelia Rd, Victoria, BC`. The incomplete query's civic record scored 93 and reported only `STREET_TYPE/missing` and `PROVINCE/missing`. Its next result was the same street without a civic number at 70. The complete query's civic record scored 100. The saved normalized incomplete response is `frontend/src/site_discovery/cecelia-api.fixture.json`; the raw provider fields are retained by the live response contract. [BC Address Geocoder](https://www2.gov.bc.ca/gov/content/data/geographic-data-services/location-services/geocoder) describes standardized address suggestions; its score, precision and faults describe match quality, not parcel identity or a calibrated probability.

Show a leading suggestion when it is the **unique highest-scoring civic record**, its only corrections are omission of a provider-supplied BC province and/or street type, and no competing civic/block record, unit, or different street/locality/type candidate is present. Lower-precision locality results that discard the queried street are still available under Other matches. Omitted locality, a supplied but incorrect street type or municipality, a substantive provider correction, or a competing address keeps the choices expanded with one review message. A single suggestion still requires explicit choice.

The provider response for `419 Cecelia` without a municipality included **419 Celia Rd, Cranbrook** at block precision only three points below the Victoria civic result. `419 Cecelia, Saanich` produced a locality alias correction on the Victoria civic record. `419 Cecelia St, Victoria` produced `STREET_TYPE/notMatched`. All remain review cases. This is why missing street type alone is never enough to declare a lead.

Scores only order provider candidates. If the provider changes its response shape or supplies incomplete comparison fields, the interface falls back to unranked choices. The leading suggestion is still unreviewed, and the user must check the municipal parcel separately. Reconsider this rule if saved provider examples or user review reveal another plausible street, locality, civic or unit that it hides.

## Verification limits

The saved response and synthetic competitor variations protect the ranking boundary in frontend tests. They do not establish that the provider address is legally current, identifies a particular parcel, or matches the user's property. Source review and user validation remain separate work.
