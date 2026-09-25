import { useId } from 'react'

export type AssessmentStatus = 'not_assessed' | 'outside_coverage' | 'needs_investigation' | 'candidate' | 'failed_placement'
export interface StatusContent {
  status: AssessmentStatus
  reason: string
  coverage: string
  unresolved: string[]
  nextAction: string
  synthetic?: boolean
}
const presentation = {
  not_assessed: ['○', 'Not assessed', 'neutral'],
  outside_coverage: ['○', 'Outside coverage', 'neutral'],
  needs_investigation: ['!', 'Needs investigation', 'amber'],
  candidate: ['✓', 'Candidate within evaluated scope', 'green'],
  failed_placement: ['×', 'Supplied placement fails evaluated checks', 'red'],
} as const

/** Callers may use candidate/failed_placement only for supported evaluation results. */
export default function StatusBanner({ status, reason, coverage, unresolved, nextAction, synthetic }: StatusContent) {
  const id = useId()
  const [icon, label, tone] = presentation[status]
  return <section className={`sr-status sr-status-${tone}`} aria-labelledby={id} role="status" aria-live="polite" aria-atomic="true">
    <h2 id={id}><span aria-hidden="true">{icon} </span>{label}</h2>
    {synthetic && <p><strong>Synthetic example · invented inputs, no real-site finding</strong></p>}
    <p>{reason}</p>
    <p><strong>Checks and coverage:</strong> {coverage}</p>
    <p><strong>Unresolved:</strong></p>
    {unresolved.length ? <ul>{unresolved.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>None reported within these checks; excluded matters remain unassessed.</p>}
    <p><strong>Next action:</strong> {nextAction}</p>
    <p>Approval is separate. This status grants no permit or legal approval.</p>
  </section>
}
