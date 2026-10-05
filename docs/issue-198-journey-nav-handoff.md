# Model 300 journey navigation handoff (issue #198)

This PR supplies `BuilderJourneyNav` and its `BuilderJourneyCompletion` contract. It is not mounted yet. The host integrator owns the two wiring edits below; the enquiry worker owns completion decisions inside `BuilderDemo`. Green checks indicate workflow completion only. Geometry findings, missing facts, legal uncertainty and source review status stay in their existing result panels.

## Host wiring

In `frontend/src/App.tsx`, import `BuilderJourneyNav`, `emptyBuilderJourneyCompletion` and type `BuilderJourneyCompletion` from `./navigation/BuilderJourneyNav`, and import `./navigation/builder-journey-nav.css` after `navigation.css`. Add state inside `App`:

```tsx
const [builderCompletion, setBuilderCompletion] = useState<BuilderJourneyCompletion>(emptyBuilderJourneyCompletion)
```

Within the existing `{builderOpened && <div hidden={page !== 'builder'} className="sr-workspace">...}` wrapper, replace only its builder `<aside>` and `<BuilderDemo />` pair with:

```tsx
<BuilderJourneyNav completion={builderCompletion} />
<BuilderDemo onProgressChange={setBuilderCompletion} />
```

Keep the wrapper's `hidden` attribute and mounted state. The current anchors `#builder-model`, `#builder-property`, `#builder-placement` and `#builder-next` remain in `BuilderDemo`. The enquiry worker should type its optional prop as `onProgressChange?: (completion: BuilderJourneyCompletion) => void`, import the type, and report state changes through that prop (for example, in an effect keyed by the four booleans). The callback must also report the initial state and every invalidation; App must not infer completion from DOM text or result colours. No global store or event bus is needed.

## Combined acceptance matrix

| Action | Model | Property | Placement | Next steps |
| --- | --- | --- | --- | --- |
| No selected model | To do | To do | To do | To do |
| Model 300 explicitly selected | Complete | To do | To do | To do |
| Live property explicitly confirmed | Complete | Complete | To do | To do |
| Labelled saved example explicitly loaded | Complete | Complete | To do | To do |
| Manual facts partly typed | Complete | To do | To do | To do |
| Manual facts explicitly confirmed with a dedicated action | Complete | Complete | To do | To do |
| Current placement measured, including overlap or unknown findings | Complete | Complete | Complete | To do |
| Enquiry explicitly marked ready for later use | Complete | Complete | Complete | Complete |
| Placement inputs edited after measurement | Complete | Complete | To do | To do |
| Property identity/facts edited after confirmation | Complete | To do | To do | To do |
| Draft answer or foundation assumption edited after ready | Complete | Complete | Preserve only a still-current measurement | To do |
| Property mode switched | Complete if model remains selected | To do until newly confirmed/loaded | To do | To do |

For retained parcel leads, apply the same explicit-confirmation rule as live sites. Importing a separate placement example must never assert that its geometry belongs to the confirmed lead. The host should clear ready whenever any enquiry text changes, including site facts, measurement, model, provider questions and foundation assumptions. A placement check means the measurement is current for the active scenario, not that it passed containment or overlap checks. Do not mark a manual property complete merely because one address or area field has text.

## Verification boundary and remaining gaps

At this isolated head, `npm test --prefix frontend` passed 88 tests and `npm run build --prefix frontend` passed. A temporary standalone Vite preview was inspected in headless Chrome at 1280 × 900 and 390 × 844: both completed and pending labels were readable; the narrow rail scrolled horizontally and page content stayed within the viewport. The preview files were removed after inspection. The component test checks links, visible and accessible completion language, pending states and rendering after invalidation. Combined browser QA must check the matrix above, keyboard links, the hidden-but-mounted page switch, and narrow-screen scrolling after the host mounts it. The component alone cannot prove BuilderDemo's state transitions. Human interpretation of these labels remains untested. Accepted real-site evaluation still requires controlled model and site facts, reviewed applicable rules, and publication; this UI work supplies none of those.
