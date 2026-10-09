/** Workflow milestones supplied by BuilderDemo, not assessment outcomes. */
export type BuilderJourneyCompletion = Readonly<{
  reviewReadiness?: { total: number; addressed: number; busy: boolean; ready: boolean; targetId?: string }
  model: boolean
  property: boolean
  placement: boolean
  enquiry: boolean
  streets?: boolean
  boundaries?: boolean
  details?: boolean
  purpose?: boolean
  checks?: boolean
  handoff?: 'website' | 'email'
  email?: boolean
  current?: JourneyStep
  mapAvailable?: boolean
}>
export type JourneyStep = 'model' | 'property' | 'placement' | 'streets' | 'boundaries' | 'details' | 'purpose' | 'checks' | 'enquiry' | 'email'

export const emptyBuilderJourneyCompletion: BuilderJourneyCompletion = {
  model: false,
  property: false,
  placement: false,
  enquiry: false,
}

type Step = { key: JourneyStep; label: string; anchor: string }

const steps: readonly Step[] = [
  { key: 'model', label: 'Model', anchor: 'builder-model' },
  { key: 'property', label: 'Property', anchor: 'builder-property' },
  { key: 'placement', label: 'Placement', anchor: 'builder-placement' },
  { key: 'streets', label: 'Street edges', anchor: 'placement-action-front' },
  { key: 'boundaries', label: 'Boundaries', anchor: 'placement-action-rear' },
  { key: 'details', label: 'Property details', anchor: 'builder-property-details' },
  { key: 'purpose', label: 'Intended purpose', anchor: 'builder-purpose' },
  { key: 'checks', label: 'Quick checks', anchor: 'builder-quick-checks' },
  { key: 'enquiry', label: 'Prepare enquiry', anchor: 'builder-next' },
  { key: 'email', label: 'Contact provider', anchor: 'builder-email' },
]

/** Keep this inside the builder workspace's hidden-but-mounted wrapper. */
export function BuilderJourneyNav({ completion }: { completion: BuilderJourneyCompletion }) {
  return <aside className="sr-workspace-rail builder-journey-rail">
    <nav aria-label="Prefab model steps">
      <p>Prefab model journey</p>
      {!completion.property && <div className="builder-entry-stages">
        <a href="#builder-property" aria-current="step">1 · Find property</a>
        <span>2 · Place unit</span><span>3 · Review</span><span>4 · Contact provider</span>
        <a href="#builder-model">Change model</a>
      </div>}
      {completion.property && steps.map(({ key, label, anchor }, index) => {
        const done = completion[key]
        const current = completion.current === key
        const unavailable = completion.mapAvailable === false && (key === 'streets' || key === 'boundaries' || key === 'checks' || key === 'details')
        return <a key={key} href={`#${anchor}`} aria-current={current ? 'step' : undefined} aria-disabled={unavailable || undefined} onClick={event => { if (unavailable) event.preventDefault() }}>
          <span className="builder-journey-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span className="builder-journey-label">{label}</span>
          <span className={`builder-journey-state${done ? ' is-complete' : ''}`}>
            {done && <span className="builder-journey-check" aria-hidden="true">✓</span>}
            {unavailable ? 'Map unavailable' : done ? key === 'email' ? completion.handoff === 'website' ? 'Website requested' : 'Draft requested' : key === 'checks' || key === 'boundaries' || key === 'details' || key === 'purpose' ? 'Reviewed' : 'Complete' : current ? 'Current step' : 'To do'}
          </span>
        </a>
      })}
      <small>Ticks show workflow progress, not passing checks. You submit the provider form or send the email yourself.</small>
      {completion.mapAvailable === false && <small>Map steps need a captured parcel. You can prepare an enquiry with the facts you know.</small>}
      {completion.reviewReadiness && <section className={`builder-review-readiness${completion.reviewReadiness.ready ? ' is-ready' : ''}`} key={completion.reviewReadiness.ready ? 'ready' : 'pending'} aria-label="Review readiness">
        {completion.reviewReadiness.ready ? <>
          <strong>✓ Review complete</strong>
          <p role="status">You’ve addressed all {completion.reviewReadiness.total} items. Your questions and acknowledged risks are included.</p>
          <a className="builder-readiness-continue" href="#builder-next">Prepare your enquiry →</a>
          <p>Next: review your draft before sending.</p>
          <small>Review complete means ready for discussion; unresolved findings remain.</small>
        </> : <>
          <strong>Review readiness · {completion.reviewReadiness.addressed} of {completion.reviewReadiness.total} addressed</strong>
          <p role="status">{completion.reviewReadiness.busy ? 'Checks updating…' : `${completion.reviewReadiness.total - completion.reviewReadiness.addressed} items still need your attention`}</p>
          {completion.reviewReadiness.targetId && <a href={`#${completion.reviewReadiness.targetId}`}>Review outstanding items →</a>}
          <small>Review completion only. Findings and open questions stay in your enquiry; unresolved conflicts remain conflicts.</small>
        </>}

      </section>}
    </nav>
  </aside>
}
