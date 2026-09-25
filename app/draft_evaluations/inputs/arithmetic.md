# Invented draft evaluation arithmetic, revision 1

These are software demonstration inputs, not municipal law, actual sites,
manufacturer dimensions, professional review or accepted publication.
The reused synthetic geometry structure originates in contract_tests/fixtures.py.
All review metadata attests invented arithmetic only.

One alternative A has a supplied width bound <= 10 metres. This direct comparison
uses a reviewed synthetic width fact tied to the exact design/site/placement.
- synthetic-direct-pass: 10 m <= 10 m is true, including the exact boundary.
  With the supplied invented as-of-right approval, expect a scoped candidate.
- synthetic-missing-fact: the binding names width-fact-r1 but that fact is absent.
  No number can be compared; expect needs_investigation, never zero or a pass.
- synthetic-placement-failure: 11 m <= 10 m is false. Expect no match under the
  evaluated alternative for this supplied placement only. Other placements have
  not been searched and are not excluded.

All legal use, other dimensions, coverage, references and other placements are
outside this single invented check. No release identity exists.
