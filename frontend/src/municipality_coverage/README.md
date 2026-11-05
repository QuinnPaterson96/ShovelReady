# Municipality routing and coverage

`MunicipalityContext` distinguishes source-attributed city selection from supported
rule coverage. The selected geocoder locality provides a provisional hint; the
selected City of Victoria parcel adapter takes precedence once available. Typed
address display text and the search query never supply municipality identity.

`SiteDiscovery.onMunicipalityChange` reports selection and reset immediately,
before the observed-property callback. Unsupported/unknown cities do not call the
Victoria parcel adapter. The host must gate Victoria zoning, property scan,
conditional screening and placement scenarios with `hasVictoriaCoverage`, clear
jurisdiction-dependent findings when context changes, and carry context into
reports/evidence. `resetMunicipalProjectSettings` retains use/foundation intent
while clearing the prior property's jurisdiction facts. Manual geometry can remain
available without local rule comparisons.

`ProjectDetails` accepts `municipality` and `onMunicipalityChange`; an explicitly
null municipality withholds local zoning controls. `SelectedProperty` accepts an
optional municipality override so a corrected city stays consistent with the host.
The saved example factory derives attribution from its retained parcel fixture.

The coverage request action opens a prefilled public GitHub issue form containing
the municipality name only. It does not submit or claim to save a request. Visitors
must submit on GitHub, and may need to sign in. A consumer-friendly private request
form/inbox is a later product/operations choice; there is no new database or service.

Focused tests cover source-driven routing, unsupported and unknown selections,
selection reset and late replies, municipality-only intake links, project intent
preservation, and withholding stale Victoria controls. These checks establish
software behavior, not authoritative municipal boundaries, rule acceptance or
actual customer usability.
