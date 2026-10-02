# Civic Atlas visual rules

Status: first applied visual direction, September 25, 2026. These rules govern
the current prototype pages; they are not a final logo or a claim of usability
validation. The CSS variables in `frontend/src/index.css` are the implementation
source of truth. Future UI work should use those variables instead of copying
hex values into components.

## Intent

ShovelReady should feel like a clear map and evidence workspace: calm, precise,
and approachable. Make the next useful action easy to see. Preserve the distinction
between a promising lead, an unresolved condition, a computed draft example, and
an accepted result. The name suggests readiness; page labels must state the actual
scope and evidence status without relying on colour or a distant disclaimer.

## Plain-language labels and help

Lead with familiar words and units. Prefer **Width (m)** over "Nominal exterior
width", **Length (m)** over "Nominal exterior depth", and **Height (m)** over
"Roof height from foundation datum". Keep distinctions that prevent an incorrect
answer: **Interior floor area (m²)** is clearer than an ambiguous "Area".

An adjacent information button opens help below the label: the exact technical
term, a short plain-language definition, measurement basis and any relevant
inclusions/exclusions. Use the shared `MeasurementLabel` for physical model inputs,
the placement workspace and preparation summary. Support click/tap and Enter/Space,
a meaningful accessible name, expanded state, associated help, visible focus and a
44 px target. Do not rely on hover or a browser `title` tooltip alone. Keep a short
visible hint when someone could otherwise enter the wrong kind of measurement.

Familiar labels may stay consistent across municipalities, but their legal definitions
must remain specific. Help for a rule-derived quantity must name the jurisdiction,
source clause and applicable revision, and explain its measurement basis. If that
definition or applicability is unresolved, say so; do not borrow another city's
definition. Physical provider dimensions are separately attributed product facts,
not a substitute for a local rule. The current shared help describes these physical
inputs only; it does not implement jurisdiction-specific rule mappings.

Simplifying display text must not rename or merge distinct data concepts, silently
convert values, or erase original terminology and citations. Keep decision status,
material uncertainty and required actions visible rather than hiding them in help.
Use the same plain labels in validation messages and summaries, while retaining
precise measurement meaning in detailed evidence and exported review records.

## Measurement display precision

Ordinary metric displays use **at most two decimal places for lengths** and
**one for areas**, rounded to nearest, without unnecessary trailing zeros.
For example, 3.048 m displays as 3.05 m and 13.56384384 m² as 13.6 m².
These are decimal places, not significant figures or a claim of survey accuracy.

Keep source wording, original units and full normalized values in evidence details.
Store and evaluate the original values; formatting must never become an input to
geometry, threshold comparison or serialization of the technical record. Editable
fields show full values on focus and a rounded display on blur. Focus/blur alone
must not change a value, mark a source value as edited or invalidate a result.
Allow users to enter more precision than the default display.

Never show a small nonzero overlap or shortfall as zero. Below display resolution,
use an explicit bound (for example, “< 0.1 m²”) and preserve the reported outcome.
Near thresholds, keep the direction and margin visible and the exact evidence
accessible, even if displayed measurements and limits round to the same number.
Do not round quoted rule text. Rounding everything upward is not consistently
conservative: a larger available site can overstate space. Any future directional
planning allowance must identify its purpose and remain separate from source facts.

## Palette and roles

| Role | Token | Value | Use |
|---|---|---|---|
| Canvas | `--canvas` | `#F4F7F6` | Page background |
| Surface | `--surface` | `#FFFFFF` | Cards, forms, disclosures |
| Subtle surface | `--surface-subtle` | `#EEF4F2` | Code, disclosure headings |
| Main text | `--ink` | `#203238` | Body and headings |
| Secondary text | `--ink-muted` | `#496268` | Source metadata, hints |
| Primary | `--primary` | `#245B68` | Main action, active navigation, evidence edge |
| Primary hover | `--primary-hover` | `#184752` | Hover and emphasis |
| Primary soft | `--primary-soft` | `#E5F0F1` | Hover/background emphasis |
| Copper | `--copper` | `#9A6337` | Investigation and attention edge |
| Copper soft | `--copper-soft` | `#FBF2E7` | Investigation/notice background |
| Decorative border | `--border` | `#C8D5D4` | Card and quiet dividers |
| Interactive border | `--border-strong` | `#668087` | Inputs, buttons, map frame |
| Link | `--link` | `#155B76` | External and internal links |
| Focus | `--focus` | `#176985` | Keyboard focus ring |

The supporting status and map colours are also named tokens in `index.css`.
Purple rooflines and copper zoning remain visibly different from teal parcels;
red dashed intersection outlines have a separate pattern. The legend uses words,
not swatches alone. Neither a parcel map colour nor a highlighted control means
the site is buildable.

## Borders, shape, and typography

- Cards use a 1 px `--border` outline and `--radius-card` (8 px). A very light
  shadow may separate a card from the canvas; it must not carry meaning.
- Inputs and buttons use a 1 px `--border-strong` outline, `--radius-sm` (6 px),
  and at least a 44 px high target. A visible 3 px `--focus` outline is retained.
- Status panels use a 5 px left edge plus an explicit label, reason, scope and next
  action. Copper is for investigation; neutral grey for not assessed/outside scope;
  green only for a supported candidate within stated checks; red only for a
  supported failed placement or an input error. Green never means permit approval.
- Evidence blocks use a 3 px teal left edge; correction comparisons use a 2 px
  teal top edge. Nested sections keep quiet borders and no additional shadow.
- Use the local system sans stack in `index.css`. Headings are compact; text has
  comfortable line height. Long source IDs and code wrap rather than widening a
  mobile page. Do not require a network font for the prototype.

## Component use and review

The compact `Brand` component in `frontend/src/brand/Brand.tsx` pairs a local
parcel/window mark with a text wordmark. It has no navigation behavior; the
header decides where the identity links. The mark distinguishes the existing
building from an illustrative possible addition through teal and copper, but
neither colour conveys a site result. The same local SVG is the favicon. Vite
emits it under `/assets/`, which the application serves in a production build.

`WorkflowIcon` provides small decorative site, model, review and share symbols
for labelled steps. `PropertyIllustration` is a conceptual parcel scene with
an accessible description and visible caption that explicitly rules out any
measured fit, zoning permission or approval. Keep that caption when using the
illustration. These assets use the system font and existing Civic Atlas colours;
no remote font, external image or endorsement is involved.

Use readable provenance in the default view: source/provider, record label, capture
date, source link and review status. Put raw hashes and internal identifiers in
labelled expandable technical details with complete copyable values. Provider
enquiries use readable citations; full technical evidence is separately accessible.
Preserve uncertainty and distinguish capture identity from source/design revision.
See [quality checks](quality.md#readable-provenance); shortening a hash alone does
not solve the readability problem.

The home, input and summary pages use `assessment/assessment.css`. Investigation,
evidence and draft views inherit `index.css`; the Pilot page uses its small scoped
`pilot.css`. New pages should reuse these tokens and established controls before
adding new colours or border patterns. Avoid inline style blocks that override
the theme. Keep source dates, review status, dataset/revision identity, uncertainty
and synthetic labels readable on every surface where they matter.

Before changing the status palette or map layers, check a narrow and a wide
viewport, keyboard focus, text contrast, and whether a user can identify the
status from words alone. The initial token pairs were checked for contrast by
calculation: main text on canvas 12.37:1, muted text on canvas 6.03:1, white on
primary 7.58:1, link on white 7.53:1, and the four status text/background pairs
at least 8.7:1. This is a palette check, not a full accessibility audit or user test.

Revisit the visual direction after prospective users try the preparation and
evidence tasks. Change tokens centrally and document the reason; do not infer a
new decision status from a colour preference.

The October 2 brand asset refresh passed `npm run build --prefix frontend` and
`git diff --check`. Build output confirmed the favicon's emitted `/assets/` path.
The new brand component and illustration have not yet been inspected in a
composed browser page; that remains part of header integration review.

## Verification for this application

On September 25, 2026, `npm test --prefix frontend` passed all 29 frontend
tests after the style import moved to the app entry point.
`npm run build --prefix frontend` passed TypeScript and Vite compilation; Vite's main chunk
size advisory remains. `git diff --check` passed. Browser inspection at the
default viewport covered the home, assessment inputs and examples/evidence pages.
At a temporary 390 × 844 viewport, the navigation and status text remained
readable and document scroll width equalled client width (375 px excluding the
scrollbar). The viewport override was reset. The visual preview ran without
the project API, so observation data was unavailable; no map geometry or live
result was visually verified in that session.
