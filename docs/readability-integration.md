# Readability integration

Base main 31652cc; worker #134 head e35bbc5. Human-facing source labels and
provider/evidence text now omit internal hash noise; full records remain under
technical disclosures and separate copy controls. Review corrected two losses:
full provisional rule identities are retained with the complete packet, and
parcel/zoning metadata is no longer labelled as roofline data by a default branch.

Frozen QA controls retain the exact renderer from historical baseline 303b40a
in a fixture. Integrity checks compare against that pinned renderer; case recipes,
hashes and fault assets are unchanged. This is not a rebaseline or a fresh QA result.

Frontend tests/build and the repaired historical fixture/runner checks are run
before merge; exact final checks and live browser observations are recorded on the
integration PR. No data release, rule acceptance or real-site fit is introduced.

Next scope: approximate occupied-lot scouting, not vacant-land-only search or
subdivision. Reuse existing Victoria parcel/roofline acquisition before expanding
to 10-20 cases. Keep GIS-based geometric observations, user assumptions and supported
rule checks distinct. Missing optional checks need not suppress useful completed
checks. A failed supplied placement cannot exclude every placement on a parcel.
Survey precision and full supplier commitments are later verification needs, not
blanket gates to presenting approximate spatial opportunities.

Remaining: current rules/applicability subset, building geometry basis/coverage,
supplied placements, controlled height definitions, physical access/services and
human value testing. Hash readability is software scope; these are separate gates.
