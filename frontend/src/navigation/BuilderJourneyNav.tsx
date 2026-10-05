/** Workflow milestones supplied by BuilderDemo, not assessment outcomes. */
export type BuilderJourneyCompletion = Readonly<{
  model: boolean
  property: boolean
  placement: boolean
  enquiry: boolean
}>

export const emptyBuilderJourneyCompletion: BuilderJourneyCompletion = {
  model: false,
  property: false,
  placement: false,
  enquiry: false,
}

type Step = { key: keyof BuilderJourneyCompletion; label: string; anchor: string }

const steps: readonly Step[] = [
  { key: 'model', label: 'Model', anchor: 'builder-model' },
  { key: 'property', label: 'Property', anchor: 'builder-property' },
  { key: 'placement', label: 'Placement', anchor: 'builder-placement' },
  { key: 'enquiry', label: 'Next steps', anchor: 'builder-next' },
]

/** Keep this inside the builder workspace's hidden-but-mounted wrapper. */
export function BuilderJourneyNav({ completion }: { completion: BuilderJourneyCompletion }) {
  return <aside className="sr-workspace-rail builder-journey-rail">
    <nav aria-label="Model 300 steps">
      <p>Model 300 journey</p>
      {steps.map(({ key, label, anchor }, index) => {
        const done = completion[key]
        return <a key={key} href={`#${anchor}`}>
          <span className="builder-journey-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span className="builder-journey-label">{label}</span>
          <span className={`builder-journey-state${done ? ' is-complete' : ''}`}>
            {done && <span className="builder-journey-check" aria-hidden="true">✓</span>}
            {done ? 'Complete' : 'To do'}
          </span>
        </a>
      })}
      <small>Checks mark completed journey steps, not site feasibility or permit approval.</small>
    </nav>
  </aside>
}
