# SR-25 verification and handoff

Starting base: `24b6cc0d503d1b53a242e23339eb0fbc447a4195` (`origin/main`,
planning PR #47). History also contains merged PRs #40-#43. Clean managed worktree
`cd8d/ShovelReady`; branch `codex/stannard-reference`. No second worktree or
original checkout used. All changed paths belong to this directory.

## Setup and source inspection

On September 24, 2026, from the repository root in PowerShell:

```powershell
git status --short
git diff --cached --stat
git remote -v
git log --oneline --all --grep='Merge pull request #4'
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
$env:GH_CONFIG_DIR='C:/Users/quinn/.config/gh-quinnpaterson96'
gh api user --jq .login
gh issue view 45 --json title,body,state
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' fetch origin main
git rev-parse HEAD origin/main
git switch -c codex/stannard-reference
```

Observed identity: personal `QuinnPaterson96`, author/committer
`quinnpaterson96 <60762693+QuinnPaterson96@users.noreply.github.com>`.
Origin is `https://github.com/QuinnPaterson96/ShovelReady.git`. Verified personal
gh helper selected explicitly per Git command, without global changes or token
disclosure. Both base references matched; branch creation preceded the fetch,
which confirmed no stale-checkout adjustment was needed.

Primary browsing used exact URLs/locators in the manifest. Public trackers were
parsed with requests/BeautifulSoup. PDF inspection used bundled Python 3.12 with
pypdf, SHA-256, and pypdfium2 rendering. Default Python lacked pypdf and PyMuPDF
was unavailable, so no dependencies were added to the project. Poppler's
`pdftotext -layout` successfully recovered later-plan layout despite a MiKTeX
environment notice. R2-65 required visual reading because extracted glyphs were
garbled. No OCR/LLM extraction or evaluator run was performed.

Reproducible source-inspection recipe (use fresh owned temporary storage, never
commit source bytes; permissions for durable retention remain unresolved):

```python
import hashlib, io, requests
from pypdf import PdfReader
import pypdfium2
# url is an exact source URL from manifest.json
response = requests.get(url, timeout=30)
response.raise_for_status()
content = response.content
assert content.startswith(b"%PDF")
print(hashlib.sha256(content).hexdigest(), len(content))
reader = PdfReader(io.BytesIO(content))
print(len(reader.pages))
# Inspect only relevant pages; do not emit incidental personal details.
pdf = pypdfium2.PdfDocument(content)
# zero-based page_index: plan 0; later 0,1; zone 0,1; M 0,1; A 1,17,19
pdf[page_index].render(scale=1.5).to_pil().save(owned_scratch_png)
```

Observed original and later hashes are recorded in the manifest, not inferred
from URLs. Inspection scope: C1/p1; later A0.0/p1 and A0.1/p2; both R2-65 and
Schedule M pages; Schedule A pp2,18,20, with full extracted definitions searched.
The June 27 bubbled later file was hashed/count-checked only. General regulations
were text-searched for context, not accepted as historical law. No claim of a
complete visual audit of all ten later sheets is made.

Official eScribe search-index queries included `Stannard October 12, 2023`,
`R2-65`, and document IDs 95470, 93451, 91300, with targeted adoption/authorization,
variance and Schedule M terms. Direct reads returned HTTP 403 for IDs 95470,
92901, 93441 and 94297; web opens of 95470/92901 also failed. Indexed official
text remains explicitly lower-assurance evidence, with no guessed hashes or page
counts. Unrelated search hits and personal correspondence were not incorporated.

## Focused offline checks

Run from the repository root against the final packet tree:

```powershell
python docs/research/stannard-reference/verify_packet.py
python -m uv run --locked ruff check docs/research/stannard-reference/verify_packet.py
git diff --check
git diff --name-only 24b6cc0d503d1b53a242e23339eb0fbc447a4195
```

Observed results on September 24, 2026: **PASS, 17 sources, 11 claims, two provisional
checks, eight unsafe mutations rejected, local links valid**; Ruff passed; whitespace
check passed. `uv run --locked` created this worktree's own `.venv` using Python
3.12.3 and the existing lockfile (33 packages); dependency files were unchanged.
The verifier checks manifest shape,
original inventory identity/hash consistency, official hosts, source references,
page bounds, revision separation, original decimal-string preservation,
provisional guards and local document links. Eight deliberately unsafe mutations
must fail. It is not a source-truth test or an accepted reference-corpus test.

Not run: application/backend/frontend/database suites (no application changes),
live models, paid services, current-law certification, independent human source
review, accepted publication or real-user validation. No database, preview,
CI configuration, accepted corpus, cases.json or height/grade holdout changed.
Demo: N/A, research packet; the offline verifier is the reproducible inspection command.

## Delivery boundary

Implemented: bounded manifest, chronology/review memo, proposed corrections and
offline checks. Verified: specified public-source access/transcription and local
metadata safeguards only. Proposed: independent confirmation and future narrow
bindings. Blocked for evaluator use: authority/version chain, measurement
definitions and facts, conditional semantics, executed permit reconciliation,
reviewed revisions and retention rights. No numerical outcome was manufactured.

GitHub PR head identifies the committed tree. Hosted CI must be checked separately
at that head before integration; local metadata checks do not establish CI success.
Rollback is removal of this research directory; no migration or active release exists.
