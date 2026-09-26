# SR-45 Langford detached garden-suite transfer packet

Status: manual, cited, **unreviewed candidate** on 2026-09-25. It is neither an
`AcceptedRuleRevision` nor a dataset release or a parcel fit result. The [machine-readable
packet](packet.json) targets one pathway: an existing one-family dwelling on a verified R2
lot, with a proposed ground-floor suite in a detached accessory building. It does not
include a site, model, placement, or approved development permit.

## Source acquisition and currency

The City's [live bylaw directory](https://langford.ca/city-hall/bylaws-directory/) links
separate current consolidated parts. No official structured rule API was identified for
these clauses; manual PDF reading was the explicit fallback. The source URLs, printed page
dates, locators and short attributed excerpts are in `packet.json`. No official PDF bytes
are committed, so the packet has no persistent official-document hash or `SourceSnapshot`.
The [City reuse notice](https://langford.ca/disclaimer/) allows unaltered personal copies
but restricts retransmission, distribution and commercialization without written permission.
Permission to distribute or commercialize full PDFs remains unresolved; no outreach occurred.

The [Part 3 consolidation](https://langford.ca/wp-content/uploads/2023/04/Part-3-General-Regulations.pdf)
is marked 20 Jul 2026 on cited pages; the [R2 zone part](https://langford.ca/wp-content/uploads/2023/04/2_One-and-Two-Family-Residential-Zones.pdf)
is marked 29 Jun 2026. [Definitions](https://langford.ca/wp-content/uploads/2022/10/zoning-blyaw-part-1-interpretation.pdf)
are marked 20 Jul 2026. The [amendment list](https://langford.ca/wp-content/uploads/2023/04/List-of-Amendments-1.pdf)
records adoption of No. 2213 on 20 May 2025, No. 2274 on 29 Jun 2026, and No. 2268 on
20 Jul 2026; its last listed entries include 17 Aug 2026. These are adoption or printed
consolidation dates, **not independently verified commencement dates**. The consolidation
says it is for convenience only. Check original amending instruments, commencement and
any later amendments before acceptance. The older whole-bylaw PDF and historical Pilot
case were not used as current general law. The City's
[planning page](https://langford.ca/home/planning-and-zoning/) describes *internal*
secondary suites; those conditions were not substituted for detached-suite rules.

## Five candidate checks and semantic limits

| Check | Candidate scalar shape | Source | Blocking dependency |
| --- | --- | --- | --- |
| Lot area | > 400 m², strict | 3.08.04(1), p. 3-7 | Express Part 6 exception; R2/site identity unknown |
| Lot width | ≥ 11 m | 3.08.03(5), p. 3-7 | Bylaw width definition and site geometry unreviewed |
| Lot depth | ≥ 29 m | 3.08.03(5), p. 3-7 | Bylaw depth definition and site geometry unreviewed |
| Garden-suite gross floor area | ≤ 65 m² | 3.08.04(3), p. 3-7 | Regulatory GFA basis and combined accessory-area rule unresolved |
| Garden-suite height | ≤ 4.5 m | 3.08.04(4), p. 3-8 | Regulatory height datum/roof method and accessory-height interaction unresolved |

The packet records original metric numbers, dimensions, operators and measurement labels;
there are no ratios among the chosen five. The `> 400` operator deliberately preserves
the word “over”: exactly 400 m² is not treated as satisfying that general clause. R2
section 6.22.01(7) lists a garden suite with a one-family dwelling subject to 3.08; it
does not alone establish parcel permission. R2 section 6.22.04 has multiple dwelling-form
and lot-area alternatives, including a one-family dwelling with a detached garden suite
on some lots. These must be reviewed together and never combined with unrelated forms.

Other live constraints include the Part 3 City Centre exclusion, one-suite baseline and
possible Part 6 allowance for a second suite, owner occupancy, parking, sanitary sewer or
septic capacity, one driveway, behind-rear-building-line location, setbacks, pedestrian
access, private open space, combined accessory area and R2 lot coverage. The packet
does **not** encode these as silent passes or as prohibitions. It only probes transfer of
five scalar shapes and keeps permission and runtime support unresolved. For instance,
an apparent 65 m² manufacturer figure cannot pass the gross-floor-area rule until the
bylaw's accounting definition and the building's measured input match. A lot with width
11 m might satisfy the numeric comparison, but that does not resolve City Centre,
servicing, zoning or other conditions.

## Reproduce the bounded mapping

From the repository root:

```powershell
python -m uv run --locked python -m tools.municipality_transfer.langford_rules > C:/Temp/langford-candidates.json
python -m uv run --locked pytest -q tests/test_langford_rule_transfer.py
```

The command builds `Quantity`, `Evidence`, `Applicability`, `ScalarBound`,
`RuleReference`, and `RuleContent` values from the manual packet. It deliberately sets
applicability, references and runtime support to `unresolved`, approval to `unknown`, and
reports zero accepted revisions, releases and evaluable checks. Its provisional source
IDs satisfy the shape of `Evidence.snapshot_id` but are **not** persisted or independently
reviewed `SourceSnapshot` records. It rejects unsupported effective dates, source hashes,
foreign sources, duplicate logical IDs and malformed values. The `scalar_shape_only`
rows show syntax the scalar evaluator could eventually compare after review; the GFA and
height rows explicitly show unresolved measurement mappings. No evaluator or model runs.

For a local excerpt check, supply an **unaltered**, separately downloaded official Part 3
PDF as `--part3-pdf PATH`. This calls `pdftotext` on each cited page, reports a hash of the
supplied bytes and checks short excerpts. It is an excerpt-match check, not a legal
interpretation or completeness check. On 2026-09-25, all five excerpts matched a temporary
Part 3 copy with SHA-256
`c4413c8f072dd94df83c4d7c8815045701a28283cc95536f702da818a7666b06`.
The temporary file and generated output are not in Git.

## Independent review checklist

1. Confirm each official PDF is still linked by the current directory; compare original
   Nos. 2213, 2274 and 2268 and any later relevant amendments, commencement and current
   consolidated text. Resolve the odd 400 m² parenthetical imperial conversion without
   changing the metric legal text by assumption.
2. Confirm one actual parcel's current R2 zoning, site-specific text/map amendments,
   OCP City Centre designation and any overlays; do not infer coverage from a generic R2
   label or subdivision minima.
3. Independently read 6.22.01, 6.22.04, 3.08.01, 3.08.03, 3.08.04 and 3.05; decide how
   the one-family/garden-suite alternative, Part 6 exception, existing suite and combined
   accessory rules interact. Record reviewer, date, exact source version and rationale.
4. Check exact bylaw definitions and measurement methods for lot area, width, depth,
   gross floor area and height. Supply reviewed site/design facts on matching bases,
   including existing accessory buildings; do not reuse manufacturer gross area blindly.
5. Review site conditions, setbacks, building line, sewer/septic proof, parking, occupancy,
   pedestrian access and open space. Decide which clauses are in-scope checks and which
   remain visible investigation items. Verify any required development/building approval.
6. Only then create retained, licensed source snapshots and hashes, attributed reviews,
   immutable rule revisions, coherent alternative membership and a separately published
   release. Test boundary values and evidence display at the exact reviewed revision.

## Transfer observations and handoff

Observed transfer work: four current official consolidated PDFs/sections and one City
reuse notice read; five Part 3 clause excerpts checked against exact PDF pages; five
candidate scalar mappings; three focused offline tests. The local PDF replay took about
two seconds on this machine. Human source-review minutes were **not recorded**, and the
remaining checklist has not been timed; no estimate of production coverage is justified.

Compared with the [Victoria SR-39 packet / PR #94](https://github.com/QuinnPaterson96/ShovelReady/pull/94),
Langford can reuse the same `Quantity`/`RuleContent` scalar shape but introduces an
explicit `> 400 m²` threshold with a Part 6 exception, paired lot width/depth, a City
Centre OCP exclusion, a possible second-suite zone pathway and a separate total
accessory-building area dependency. Both packets lack independent acceptance; Langford's
manual source IDs are less mature than Victoria's pinned private PDF manifest. The
current evaluator requires `AcceptedRuleRevision` and reviewed measurements, so no
Langford result can be produced by this packet. SR-41/#89 may display the candidate
citations and blockers only; integration would need an explicit candidate/preparation
display path and accepted-source publication later, under shared-file ownership.
Use #88's model catalogue when design inputs are ready; this packet makes no model-fit
claim. This bounded experiment does not launch Langford coverage or block Victoria work.
