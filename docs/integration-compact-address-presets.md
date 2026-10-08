# Compact address entry and homepage presets — October 8, 2026

The homeowner property step now leads directly to address search. Removed the
own-property/example cards and entry-method dropdown. Manual entry is a secondary
“Can’t find your address?” action with a return to search. Accessible information
help retains source meaning and selection limits. Selected properties offer Change
address, with property-reset consequences in nearby information help.

Homepage Explore examples opens a dedicated, labelled list with a shareable
#examples/model-300 preset. Direct loading opens Model 300 with the saved Victoria
parcel and approximate placement. Explicitly opening a preset replaces property
inputs; ordinary navigation preserves the current journey. Intended use stays
unanswered or preserves supplied project preferences; it is never inferred from a
preset. Leaving the preset for address entry clears its URL so reload cannot reopen
an example in place of the new property. Research examples remain separately reachable.

Verification: existing search/parcel, model-switch, review and enquiry journeys plus
an App-level routing test for direct preset loading, homepage links, navigation
preservation, return to real address search and manual fallback. The test runtime
supports static SVG URL imports; missing Vite build metadata still displays unknown
identity in non-Vite mounts. CI/live verification is recorded in the PR handoff.

No geocoder ranking, duplicate-address fix or broader municipal coverage is added.
Those remain separate search follow-ups. Only the existing saved Victoria Model 300
preset is exposed; additional presets require their own reviewed configuration.
Software/UI checks do not establish source accuracy or independent user validation.
