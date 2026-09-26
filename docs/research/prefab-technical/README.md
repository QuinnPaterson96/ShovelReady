# SR-55: bounded technical acquisition

Captured/reviewed 2026-09-25. Scope: aux box Model 300 and ORCA Jay only. The [report review in PR #128](https://github.com/QuinnPaterson96/ShovelReady/pull/128) supplied leads, not specifications. The two packets record official observations separately from unit conversions and from the unreviewed catalogue-shaped candidates. No legal fit, source acceptance, or publication follows.

| Model | Acquired official artifact | Acquisition limit |
|---|---|---|
| [Model 300](model-300.md) | Public product page, dimensioned plan image, elevation render | No controlled architectural/installation drawing set, roof/grade datum or overhang schedule found in the reviewed links. |
| [Jay](jay.md) | Current model page, linked 2026 general product-spec PDF, older 2025 Jay card and dimensioned room plan | Current linked PDF has no Jay drawing or exterior height. The older plan cannot identify the current configuration or the basis of 435 sq ft. |

Candidate files: [Model 300](candidate-model-300.json) and [Jay](candidate-jay.json). Each is a standalone `sr-40.catalogue.v1` envelope for **offline contract validation only**. They are not inputs to the active catalogue. The [gap and unsent request](gaps.md) identifies evidence that needs manufacturer confirmation.

## Capture and reuse

SHA-256 values below are of the actual HTTP response bytes retrieved on 2026-09-25, not reconstructed text, search-cache content, document revision IDs or manufacturer approval. Bytes were kept only in a local temporary inspection directory and are **not redistributed** in this PR. Product pages and public downloads permit reading; no explicit licence to republish images/PDFs was located in the reviewed pages. The ORCA current HTML page returned HTTP 403 to the direct retrieval client, so its values have a live-page locator but **no byte hash**. The linked PDFs downloaded successfully. An old 2023 brochure was visible in the web index but direct byte retrieval returned HTTP 404; it is conflict context, not candidate evidence.

## Verification and replay

From repository root, while #121 remains outside this base:

```powershell
python -m uv run --locked python -c "import json; from pathlib import Path; from app.model_catalogue.catalogue import Catalogue; [Catalogue.model_validate(json.loads(p.read_text(encoding='utf-8'))) for p in Path('docs/research/prefab-technical').glob('candidate-*.json')]; print('candidate schema valid')"
```

This verifies shape, references and deterministic unit conversion enforced by `Quantity`. It does not verify the source interpretation, configuration, drawing currency or legal measurement basis. Reviewed URL/artifact locators and practical gates are in each packet and [gaps.md](gaps.md).
