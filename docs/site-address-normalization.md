# Bounded retained-address spelling

Status: implementation decision for SR-52, September 25, 2026. This changes lookup
of the five already captured City of Victoria Address Points rows only. It does not
add source data, establish a legal parcel identity, or perform screening.

## Decision

Keep `sr-38.site-lookup.v1` and use the existing per-candidate
`address.evidence.method` string to distinguish matching methods. The previous
case-insensitive, whitespace-collapsed FullAddress comparison remains the direct
match. A second comparison expands only a final `ST`/`STREET` or `AVE`/`AVENUE`
token, since `ST` and `AVE` occur in the retained packet. The rest of the address
must remain identical after case folding and whitespace collapse. Punctuation,
unit prefixes or numbers, directions, street names, and house numbers are not
removed or interpreted. Unsupported spellings produce no match.

Compare each retained row independently and return every matching row and joined
parcel candidate. A direct match to one row does not suppress another row that
collides after suffix normalization. Each candidate keeps the captured FullAddress,
Legal_Type, GISLINK, source receipt, feature index, and unreviewed status. The
method names the direct or suffix-normalized comparison and the captured GISLINK
join. Candidates remain unselected pending explicit user confirmation.

This is a narrow convenience for finding a retained lead. It cannot determine
whether a supplied address is current, which alias is preferred, whether a unit
belongs to a parcel, or whether a parcel is legally suitable. Reconsider the
mapping only with additional captured observations and collision tests.
