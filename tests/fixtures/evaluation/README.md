# Synthetic evaluator arithmetic oracle

These invented rules, measurements, sources, reviews and geometries test software
decisions only. They are not Victoria/Vancouver rules, manufacturer facts, actual
review approvals, or legal-accuracy examples. No preview assertions are reused.

Independent expected arithmetic:

- At 10 metres against 10 metres: `<` and `>` fail; `<=`, `>=`, `==` pass.
- Nine metres is below ten; eleven is above ten.
- Ten feet is exactly 3.048 metres; 100 square feet is exactly 9.290304 square metres.
- 45 percent is 45/100 = 0.45; a fraction 0.45 equals that threshold.
- FSR 1.2 compares 1.2 regulatory floor area per lot area; it is not 0.012.
- Alternative A allows width <= 5 and depth <= 10. Alternative B allows width <= 10
  and depth <= 5. A supplied 8 by 8 placement fails each alternative. Selecting the
  two limits of 10 would invent a passing alternative.

The coordinates merely identify a supplied synthetic placement. No geometry or
legal definition is calculated by the evaluator. Expected outcomes are recorded
in tests, independently of evaluator operators/conversion helpers.
