# SR-30 calibration evidence

Implemented and locally verified on September 24, 2026 (UTC September 25): offline
grading guardrails and six [saved authored answers](../../../contract_tests/fixtures/grading/answers.json).
Reviewer: **Codex SR-30 author, agent**, with author/reviewer overlap. The answer text,
visible authored evidence, proposed status, expected result, rationale and disputed
interpretation are retained. No independent human calibration, participant session,
legal review or source acceptance is claimed.

| Saved example | Effective result | Evidence limit |
|---|---|---|
| Supported bounded negative | Supported | Saved software assertion, not real site exclusion. |
| Critical omission | Not attempted; one atomic critical omission | Placement limitation absent; no invented affirmative claim. |
| Invented bug | Unsupported | Alleged requirement contradicts saved outside-coverage boundary. |
| Correct unknown | Supported | Missing Schedule X prevents approval conclusion. |
| Disputed interpretation | Unassessable | Proposed supported grade retained; evidence dispute withholds effective success. |
| Environment failure | Unassessable | Proposed supported grade retained; browser failure cannot grade application success. |

These six cases test supplied semantic judgments and conservative gating, not autonomous
semantic-grader accuracy. The latter two intentionally disagree with the proposed
supported judgment; no model-agreement accuracy percentage is claimed. Additional
offline tests cover clean-control false alarms, seeded hits/misses, bad/missing evidence,
zero/unknown denominators, changed rubrics, critical policy freeze, unsolicited discovery,
history correction, deduplication/conflict, draft withholding and output preservation.
The actual SR-26 sample stays unscored and produces no app-defect draft.

## SR-28 compatibility check

Read-only check of SR-28's actual case files in its clean `4185` worktree at
`d7983cd751fcbea23d59482b4e1475a098b670bd` after its owner reported facilitator browser
review; the written browser-review report was also read. No files there were changed. Parsed each shared
case, generated its canonical pin and a matching separately supplied rubric, then graded
an explicitly authored blocked adapter record with no assessment or participant note.
All 11 accepted their exact pins; all 18 scored checks remained unassessable; zero drafts.
This establishes safe format compatibility, not detection accuracy or a new browser run.
The case digests below identify the inspected bytes:

| Case | Canonical case SHA-256 |
|---|---|
| affirmative-label-clean | `2a057a4f3945e4bc543152e1bd8f552304fd1bff1685f04f7fd5c19c120a2212` |
| affirmative-label-fault | `f227aa2f9717dd14704d9af7f2aa91dcd6b16a4924701a54df979bb41407bdc0` |
| evidence-access-clean | `4a9e0acd85014668742695eabf5a1ab6af8f5c2c38db12d8ed35237b51b6948c` |
| evidence-access-fault | `475fbc3ac490fd9c7523aba4049ef3b761e5c46ba720e16886a7f51e569426c9` |
| synthetic-a-candidate | `aaa7c7b96db47f9fd8986bf8eadff47d27d542aa4b73bbe56d17cb35dc6b4879` |
| synthetic-c-negative | `627e55e4717893c2558a43a3ca930ea6255ac5655ea447030d683a49572b8c1f` |
| synthetic-e-conditional | `10526f3b4267e14f72028cbff5d75648c8e1d73c52ddadef8c8b598ccbf19fd3` |
| synthetic-f-correction | `0bbd2b1f1c3869cfdf1a99bfda70aeaa776f857ee562760a80228ca44a16601b` |
| unit-display-clean | `6371cce9a996c10a3f044c0fef3b1edc0cc67f60328f2ca8a693dc15ba4023dd` |
| unit-display-fault | `9b1d206806d5ed1178564ffb968e7ca30d6f119f0236343740be7c41b4f60359` |
| vic080-evidence | `37f077ef2acf62879bba5a2fbd2eb4b885a6392edc4c2712cc6027a6f8e2814e` |

All six controls use `control-observation`. Pair IDs are `evidence-access`,
`unit-display`, `affirmative-label`: respectively missing A disclosure, C displayed
feet versus original metres, and E affirmative headline versus unresolved alternative.
SR-28's browser/source review belongs to that owner; this task did not inspect its pixels.

SR-29 confirmed final `run.json`, separate prepared snapshot, retained note/evidence
references and lifecycle receipts, with retry ancestors in sibling attempt directories.
No integrated SR-29 final output was available for replay here. A reviewer must register
and inspect the lifecycle/evidence references, not infer success from a parsed run.

## Remaining gates

Combined calibration still needs the integrated SR-28 final bytes and SR-29 saved runs,
reviewed participant responses for the paired controls, disagreement/adjudication records
and measured review effort. Freeze SR-30's optional critical policy before the SR-31
dispatch; absent policy means N/A. Independent human review remains unavailable and
explicitly unclaimed. None of these limits prevents offline tooling use, closes SR-13/
SR-16, or authorizes live grading models or issue publication.
