Original note: **Evidence-access limitation found.** In Fictional preview, I selected **Synthetic example A**, result **`synthetic-evaluation-1`**, dataset/release **`synthetic-preview / synthetic-example-1-release-1`**.

The result displays **“pass · synthetic-check-1”**, followed by **“Saved assertion: occupancy / lot area 0.40 fraction is at most 0.45. Only this coverage check was considered.”** It identifies **“Rule: synthetic-rule-A / synthetic-rule-A-r1”**, but provides no source/evidence link or detail control for inspecting that rule or the underlying values. This is observable in the full accessibility read at operation 3 and the lower-result screenshot at operation 12. Thus I could read the saved assertion but could not inspect its supporting evidence through this result.

I found no arithmetic inconsistency: 0.40 is at most 0.45. The page explicitly calls these **“Hand-authored saved assertions, not evaluated sites”**, so the finding is limited to evidence access in this synthetic preview.

**Operation ledger — 13 browser operations total; no tool failures or retries:**

1. **“1. Open local application in own background tab”** — Created own background tab at `http://127.0.0.1:18234/`; initial UI showed Real observations.
2. **“2. Select Fictional preview investigation mode”** — Selected Fictional preview by its mode label.
3. **“3. Read Fictional preview examples”** — Read accessibility state; example A selected, result identity and assertion recorded. No evidence link/control appeared in result.
4. **“4. Explicitly select Synthetic example A”** — Selected A explicitly.
5. **“5. Confirm selected example A result and evidence controls”** — Read state; unchanged.
6. **“6. Inspect visible example A layout and evidence access”** — Screenshot showed Fictional preview and synthetic-data disclaimer.
7. **“7. Scroll to example A result details”** — Scrolled down one page.
8. **“8. Read result details after scrolling”** — Read state; unchanged.
9. **“9. Inspect result identity and scope screenshot”** — Screenshot confirmed A, Candidate, result/release/design/site/placement identities and scope.
10. **“10. Scroll to example A saved check and bottom of result”** — Scrolled down one page.
11. **“11. Read lower result evidence controls”** — Read state; unchanged.
12. **“12. Inspect saved assertion and rule evidence screenshot”** — Screenshot confirmed pass assertion, plain rule identity, missing-facts statement and **“Spatial snapshots: None”**; result ended without evidence controls.
13. **“13. Close own background review tab”** — Closed only my tab.
