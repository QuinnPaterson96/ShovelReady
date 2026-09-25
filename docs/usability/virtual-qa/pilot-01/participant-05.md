Original note: **Evidence-access limitation in Synthetic example E**, selected result `synthetic-evaluation-5`, dataset/release `synthetic-preview / synthetic-example-5-release-1`.

After selecting Fictional preview → Synthetic example E → expanding “Inspect rule and source evidence,” the UI provides an excerpt and provenance but displays **“Retained file: docs/usability/synthetic-source.txt” as plain text, with no open/download control**. Browser-only review therefore cannot follow that retained-file reference to inspect the full source. Evidence: operation 7 accessibility output, nodes 129–132; operation 11 screenshot. This is a limited access finding, not evidence that the file is missing.

I found no contradictory result conclusion: “Needs investigation,” “unresolved reference · synthetic-check-5,” and “Fictional Schedule X is absent. Approval condition remains unresolved.” agree with the expanded source’s “D: Fictional Schedule X approval condition is not available in this fixture.” (Operations 5 and 7.) “Missing facts: None recorded for this check” could be confusing alongside the absent schedule, but the UI separately identifies the unresolved reference, so I did not classify it as a contradiction.

Numbered operation ledger, using exact tool-call titles:

1. **Open local application in own background tab** — opened supplied localhost URL; initial state showed Real observations.
2. **Select Fictional preview** — selected mode by combobox label.
3. **Read Fictional preview examples** — confirmed Fictional preview and A–F choices.
4. **Select Synthetic example E** — selected E.
5. **Read example E result and checked scope** — confirmed result identity, Needs investigation, conditional approval, unresolved Schedule X.
6. **Expand rule and source evidence** — clicked disclosure.
7. **Read expanded evidence and source references** — read excerpt, unresolved semantics, snapshot, capture date, retained path and SHA-256.
8. **Capture rendered example E evidence presentation** — screenshot confirmed rendered unresolved-reference text and source excerpt.
9. **Scroll to retained-source metadata** — scrolled down one page.
10. **Read retained-source metadata controls** — AX read returned no tree change.
11. **Capture retained file shown as plain text** — screenshot confirmed retained path and hash, with no adjacent source-opening control.
12. **Close own review tab** — closed only my tab.

**Total: 12 operations. Tool failures: none.**
