# Synthetic saved responses

Every response here is hand-authored synthetic input. None was returned by a model
or extracted from a municipal source. `metadata.json` deliberately has origin
`synthetic`, no model/settings/provider metadata, and invented evidence/identities.
The unchanged historical prompt is hashed and retained during replay only as the
format reference; this does not claim it was sent to a provider.

`valid.response` tests ten feet → 3.048 metres, not a real setback. Other files test
malformed JSON, multiple top-level objects, unresolved references, percentage
ambiguity, wrong ratio basis, unsupported conditions, absence and applicability
claims, uncertainty and omission. `missing_citation.response` is replayed with
`fields={}` in the focused test. Programmatic mutations test empty citation context,
wrong dimensions, contradictory directions, duplicate keys, booleans, nonfinite
numbers, expressions and metadata integrity.

Only parser/state behavior is established. These fixtures cannot be benchmark
ground truth, development zoning examples, acceptance decisions or site outcomes.
