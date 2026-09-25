Original note: **Example C has a visible threshold-unit inconsistency.** Selected result: `synthetic-evaluation-3`; release: `synthetic-example-3-release-1`; rule: `synthetic-rule-C / synthetic-rule-C-r1`.

After selecting Fictional preview → Synthetic example C → expanding “Inspect rule and source evidence”:

- Result states “supported failure · synthetic-check-3” and “this supplied placement has 1 m setback against a 2 m minimum” (operation 5).
- Expanded evidence states **“Threshold: >= 2 ft (original: 2 m)”**, while Synthetic section C repeats “fails a 2 m setback: saved distance 1 m” (operation 7; visually confirmed in screenshot operation 8).

These are materially different thresholds: 1 m fails a 2 m minimum but exceeds 2 ft. The UI does not explain the discrepancy. This observation concerns the displayed synthetic assertion only.

Operation ledger (exact tool-call titles):

1. “1. Open assigned local application in background tab” — created own hidden IAB tab at `http://127.0.0.1:18232/`; initial state showed Investigation mode.
2. “2. Select Fictional preview investigation mode” — selected rendered option.
3. “3. Read Fictional preview results” — read AX state; synthetic selector appeared.
4. “4. Select Synthetic example C” — selected rendered option.
5. “5. Read example C selected identity and assertions” — confirmed C, result identity, supported failure, 1 m versus 2 m assertion.
6. “6. Expand rule and source evidence for example C” — clicked evidence disclosure.
7. “7. Read example C rule and source evidence” — found conflicting threshold and source text.
8. “8. Capture visible example C evidence” — screenshot showed assertion, threshold, and Synthetic section C together.
9. “9. Close own background review tab” — closed own tab successfully.

**Total: 9 browser operations. No tool failures or retries.**
