# Verification and integration handoff

## Scope and source review

Research only, October 7, 2026 Vancouver time. Integration owner is recipient; decision is which municipality deserves the next bounded homeowner slice. Main findings and proposed work are in [README.md](README.md); [sources.md](sources.md) separates evidence by layer and rights. Only this new directory is owned. Primary checkout's unrelated reporting-guidance changes were left intact; no shared application or root documentation changed.

Base: `origin/main` **f61a120a9115174d25a799c437f87f8768834d41**. Personal `GH_CONFIG_DIR=C:/Users/quinn/.config/gh-quinnpaterson96`, `gh api user` returned QuinnPaterson96. Origin verified as personal ShovelReady. Isolated managed worktree; branch `codex/crd-source-readiness-2026-10`; local author/committer both `quinnpaterson96 <60762693+QuinnPaterson96@users.noreply.github.com>`, verified with `git var`.

Read project instructions, README, architecture, quality, reporting standard, historical decision/restart context; inspected prior municipal spatial/rule/rights/topology packets, supplier research and current #246/#247/#248/#112/#103 context. Existing proposals remain hypotheses; no architecture ticket was implemented/closed. #112's runtime exclusion is unchanged.

Actual verification:

* Read official municipal HTML/REST metadata, catalogue/licence PDFs, BC catalogue API records, source XSD and WFS capabilities. Returned municipal metadata successful except Oak Bay legacy endpoint timeout. No Langford/CRD feature samples retained under unresolved rights.
* Six anonymous geocoder calls (`maxResults=3`) and six first-point PMBC bbox calls (`count=20`); actual matched/returned counts 1/1, 2/2, 1/1, 1/1, 2/2 and 1/1 in report order Oak Bay Transit, Westdowne, Saanich Kingsley, Cedar Hill, Langford Lone Oak, Jenkins. Every parcel query below cap. Explicit CRS transformation and point containment calculated; outcomes do not verify title or crosswalk.
* Four Saanich catalogue downloads; actual ZIP/DBF/PRJ inspection, archive comparisons with Sept 25 manifest, exact address + point/parcel joins, full-file zoning envelope scan with invalid geometries withheld from intersection. Roof contacts computed only for valid shapes; no house role assigned.
* Fresh Saanich bylaw, building/parcel metadata and four Langford current documents downloaded to OS temporary directory and selected relevant text inspected. pypdf warns about CFF font decoding on the large Saanich PDF; selected text was readable and bytes match the prior independently located packet. Extraction success is not independent interpretation review.
* Oak Bay adopted 4871 amendment read through web PDF tool; June 2 Transit drawing rendered with `pdftoppm`, both sheets visually inspected. A2 site label PID 006-163-424/Plan 4004 agrees with PMBC; zoning table has another legal identity. Westdowne PDF legal table inspected. No drawings or image reproductions committed. Current Oak Bay bylaw/OCP links could not be inspected; no third-party replacement used as current law.

## Replay and retained evidence

`inspect_sources.py` is a research acquisition aid, not an application integration. Commands run from this worktree with Python 3.12 and task-local dependencies (requests, pyshp 3.1.6, Shapely 2.2.0, pyproj 3.8.0, pypdf 6.19.0):

```powershell
python docs/research/crd-source-readiness-2026-10/inspect_sources.py metadata
python docs/research/crd-source-readiness-2026-10/inspect_sources.py provincial
python docs/research/crd-source-readiness-2026-10/inspect_sources.py saanich
python docs/research/crd-source-readiness-2026-10/inspect_sources.py documents
python docs/research/crd-source-readiness-2026-10/inspect_sources.py boundaries
python docs/research/crd-source-readiness-2026-10/verify_evidence.py
```

The initial Saanich pass was extended to reselect current zone contacts and capture roof summaries, then rerun. Extra overlay/street metadata, ArcGIS item and WFS capability probes were small read-only supplemental calls. Their exact URLs/access timestamps are retained. Live rerun changes capture data; do not overwrite historical evidence when comparing releases. Libraries were installed in a task-specific OS temporary directory; project dependencies were not changed. Original ZIPs/PDFs remain outside Git in the OS temporary research folder; committed selected records and byte hashes are portable, but a hash alone cannot recover original full source bytes.

Final offline inspection recomputes six containments from retained responses, two municipal civic/parcel joins and defective contact statuses, validates all JSON/XML, checks local Markdown targets, and checks Git whitespace. All passed. The first link-check invocation failed on Windows' default text encoding; explicit UTF-8 corrected it. This protects research consistency, not source accuracy. No application/database/model/browser journey tests run: documentation/evidence only, no application change and no accepted release. No CI success is claimed before final-head results. Main report reviewed from a recipient's perspective: choice, reason, material blockers and owners are visible before technical evidence; no overall fit claim.

[Capture manifest](capture-manifest.json) hashes the retained serialized evidence files. Provincial JSON is parsed/reformatted with original attributes and coordinates, not original HTTP bytes. Source document hashes and Saanich archive hashes refer to actual downloaded bytes; their raw files are not in the PR. No accepted dataset release identity was invented.

## Explicit remaining gaps

* **Demo usability:** Saanich adapter/case not connected; #246/#247 context/definitions and #248 integration owner must deliver and test the slice. Two selected joins do not measure general address reliability. Main-house identity needs user confirmation; manual sketch remains fallback. Human comprehension/value study not performed.
* **Municipal data rights/coverage:** Langford commercial municipal reuse unresolved (#103/City custodian); Oak Bay endpoint/current legal access and reuse unverified (municipal-data owner); CRD distribution restrictions and DRA Access Only terms prevent treating them as open substitutes. Terms pages failed, not assumed permissive.
* **Accepted real evaluation:** Saanich zoning self-intersections persist (#112/source custodian); all three lack independently reviewed complete site applicability, source currency/effectiveness, overlays, title/servicing, compatible dimensioned manufacturer inputs, accepted rules/release. Review owner and model-data owner must supply these artifacts; code merge cannot establish them.
* **Provider commitment:** Island service offer only; no site-specific manufacturer approval, installation/route plan or quote. Project owner can arrange an enquiry after choosing a real case; none sent here.

No outreach, forms, purchases, cloud resources, runtime integration, source publication or deployment. Research PR is for integration review and must remain unmerged until its owner decides the next step.
