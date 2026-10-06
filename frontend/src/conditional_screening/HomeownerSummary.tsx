import * as React from 'react'
import { StepInfo } from '../StepInfo'
export type SummaryCheck = { label: string; status: 'checked' | 'conflict' | 'unknown' | 'unsupported'; detail: string; action?: { label: string; target: string } }
export type Summary = { conclusion: string; next: string; checks: SummaryCheck[] }
const statusLabels = { checked: 'Checked', conflict: 'Conflicts', unknown: 'Missing information', unsupported: 'Not covered' }
export function StatusIcon({ status }: { status: SummaryCheck['status'] }) {
  return <svg className="homeowner-summary__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" />{status === 'checked' ? <path d="m7 12 3 3 7-7" /> : status === 'unsupported' ? <path d="M7 12h10" /> : <><path d={status === 'conflict' ? 'M12 6v8' : 'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5'} /><circle cx="12" cy="18" r=".5" /></>}</svg>
}

export function HomeownerSummary({ summary, onNavigate }: { summary: Summary; onNavigate: (target: string) => void }) {
  React.useEffect(() => { void import('./homeowner-summary.css') }, [])
  const nextCheck = summary.checks.find(check => check.status === 'conflict' && check.action)
    ?? summary.checks.find(check => check.status === 'unknown' && check.action)
  const nextAction = nextCheck?.action
  return <section className="homeowner-summary" id="builder-quick-checks" tabIndex={-1} aria-label="Placement summary">
    <h3>{summary.conclusion}</h3><p>{summary.next}</p>
    <div className="homeowner-summary__counts" aria-label="Named check counts">{(['checked', 'unknown', 'conflict', 'unsupported'] as const).map(status => <span key={status} className={`homeowner-summary__${status}`}><StatusIcon status={status} /><strong>{summary.checks.filter(check => check.status === status).length} {statusLabels[status]}</strong></span>)}</div>
    {nextAction && <div className="step-action"><button className="homeowner-summary__next" type="button" onClick={() => onNavigate(nextAction.target)}>Next: {nextAction.label}</button><StepInfo label={nextAction.label}>{nextCheck?.detail} This opens the relevant control so you can review or correct the current input.</StepInfo></div>}
    <p className="homeowner-summary__scope">Preliminary screening of this placement · limited checks. Open questions and requirements not covered are listed below.</p>
    <details className="homeowner-summary__checks"><summary>Review individual checks</summary><ul>{summary.checks.map(check => <li key={check.label} className={`homeowner-summary__${check.status}`}>
      <StatusIcon status={check.status} />
      <div><strong>{check.label} · {statusLabels[check.status]}</strong><p>{check.detail}</p>
        {check.action && <div className="step-action"><button type="button" onClick={() => onNavigate(check.action!.target)}>{check.action.label}</button><StepInfo label={check.action.label}>{check.detail} Review the current input; leave it unknown when you cannot support an answer.</StepInfo></div>}
      </div>
    </li>)}</ul></details>
  </section>
}
