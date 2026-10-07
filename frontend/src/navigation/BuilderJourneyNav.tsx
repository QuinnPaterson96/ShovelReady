/** Workflow milestones supplied by BuilderDemo, not assessment outcomes. */
export type BuilderJourneyCompletion = Readonly<{
  model: boolean
  property: boolean
  placement: boolean
  enquiry: boolean
  streets?: boolean
  boundaries?: boolean
  checks?: boolean
  email?: boolean
  current?: JourneyStep
  mapAvailable?: boolean
}>
export type JourneyStep = 'model' | 'property' | 'placement' | 'streets' | 'boundaries' | 'checks' | 'enquiry' | 'email'

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
  { key: 'checks', label: 'Quick checks', anchor: 'builder-quick-checks' },
  { key: 'enquiry', label: 'Prepare enquiry', anchor: 'builder-next' },
  { key: 'email', label: 'Email enquiry', anchor: 'builder-email' },
]

/** Keep this inside the builder workspace's hidden-but-mounted wrapper. */
export function BuilderJourneyNav({ completion }: { completion: BuilderJourneyCompletion }) {
  return <aside className="sr-workspace-rail builder-journey-rail">
    <nav aria-label="Model 300 steps">
      <p>Model 300 journey</p>
      {steps.map(({ key, label, anchor }, index) => {
        const done = completion[key]
        const current = completion.current === key
        const unavailable = completion.mapAvailable === false && (key === 'streets' || key === 'boundaries' || key === 'checks')
        return <a key={key} href={`#${anchor}`} aria-current={current ? 'step' : undefined} aria-disabled={unavailable || undefined} onClick={event => { if (unavailable) event.preventDefault() }}>
          <span className="builder-journey-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span className="builder-journey-label">{label}</span>
          <span className={`builder-journey-state${done ? ' is-complete' : ''}`}>
            {done && <span className="builder-journey-check" aria-hidden="true">✓</span>}
            {unavailable ? 'Map unavailable' : done ? key === 'email' ? 'Draft requested' : key === 'checks' || key === 'boundaries' ? 'Reviewed' : 'Complete' : current ? 'Current step' : 'To do'}
          </span>
        </a>
      })}
      <small>Ticks show workflow progress, not passing checks. Email opens a draft; only you can send it.</small>
      {completion.mapAvailable === false && <small>Map steps need a captured parcel. You can prepare an enquiry with the facts you know.</small>}
    </nav>
  </aside>
}
