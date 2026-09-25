Original note: Example E has an observable outcome inconsistency. Its result headline is **“Candidate”**, but its pathway says **“Alternative outcome: needs investigation”** and **“Approval status in this fiction: conditional.”** The remaining condition is **“Resolve fictional Schedule X before an approval conclusion.”** The check and expanded source evidence both say **“Fictional Schedule X is absent. Approval condition remains unresolved.”** The headline therefore communicates a stronger outcome than the underlying displayed check supports.

Selected identity: `synthetic-evaluation-5`; dataset/release `synthetic-preview / synthetic-example-5-release-1`; design `synthetic-design / synthetic-design-r1`; site `synthetic-site-5 / synthetic-site-5-r1`; placement `synthetic-placement-5 / synthetic-placement-5-r1`.

Evidence: operation 8, AX nodes 45–46 (Candidate), 90–103 (alternative, condition, check), 113–117 (unresolved source semantics). Expanded evidence was accessible through the UI. No tool failures.

Numbered operation ledger (each title is the exact tool-call title):

1. **Open local application in a new background tab** — opened `http://127.0.0.1:18236/`; initial UI returned.
2. **Select Fictional preview investigation mode** — selected the visible mode by label.
3. **Read Fictional preview controls and results** — read mode, example selector, and initial A result.
4. **Select Synthetic example E** — selected E by label.
5. **Read selected example E result and saved check** — confirmed E and `synthetic-evaluation-5`; read unresolved check.
6. **Expand rule and source evidence for example E** — clicked “Inspect rule and source evidence.”
7. **Read expanded example E evidence** — read unavailable Schedule X and unresolved semantics.
8. **Record complete example E identity and contradictory outcome labels** — full AX read recorded the evidence quoted above.
9. **Close my example E review tab** — closed only my created tab.

Total: **9 browser operations**.
