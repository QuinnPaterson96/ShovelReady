import * as React from 'react'
import { focusSummaryTarget } from './summaryNavigation'
import { StepInfo } from '../StepInfo'
export type SummaryCheck = { label: string; status: 'checked' | 'probable' | 'review' | 'conflict' | 'unknown' | 'unsupported'; detail: string; resolutions?: { detail: string; edgeId: string; bufferM: number; moveM: number }[]; parts?: SummaryCheck[]; action?: { label: string; target: string } }
export type Summary = { conclusion: string; next: string; checks: SummaryCheck[] }
export const statusLabels = { checked: 'Checked', probable: 'Likely fine', review: 'Needs review', conflict: 'Conflicts', unknown: 'Missing information', unsupported: 'Not covered' }
export function StatusIcon({ status }: { status: SummaryCheck['status'] }) {
  return <svg className="homeowner-summary__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" />{status === 'checked' || status === 'probable' ? <path d="m7 12 3 3 7-7" /> : status === 'unsupported' ? <path d="M7 12h10" /> : <><path d={status === 'conflict' ? 'M12 6v8' : 'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5'} /><circle cx="12" cy="18" r=".5" /></>}</svg>
}

export function HomeownerSummary({ summary, onNavigate, continuation, onApplyBuffer, onMove, actionsDisabled, acknowledged = [], onAcknowledge }: { summary: Summary; onNavigate: (target: string) => void; onApplyBuffer?: (edgeId: string, value: number) => void; onMove?: (edgeId: string, distance: number) => void; actionsDisabled?: boolean; acknowledged?: string[]; onAcknowledge?: (check: SummaryCheck) => void; continuation?: { label: string; hint: string; onContinue: () => void } }) {
  React.useEffect(() => { void import('./homeowner-summary.css') }, [])
  const counted = summary.checks.flatMap((check, index) => check.parts ? check.parts.map((part, partIndex) => ({ ...part, targetId: `summary-check-${index}-part-${partIndex}` })) : [{ ...check, targetId: `summary-check-${index}` }])
  const nextCheck = counted.find(check => check.status === 'conflict' && check.action)
    ?? counted.find(check => check.status === 'review' && check.action)
    ?? counted.find(check => check.status === 'unknown' && check.action)
  const nextAction = nextCheck?.action
  const checklist = React.useRef<HTMLDetailsElement>(null)
  const jumpToStatus = (status: SummaryCheck['status']) => {
    const found = counted.find(check => check.status === status)
    if (!found) return
    if (checklist.current) checklist.current.open = true
    focusSummaryTarget(document, found.targetId)
  }
  return <section className="homeowner-summary" id="builder-quick-checks" tabIndex={-1} aria-label="Placement summary">
    <h3>{summary.conclusion}</h3><p>{summary.next}</p>

    <div className="homeowner-summary__counts" aria-label="Named check counts">{(['checked', 'probable', 'review', 'unknown', 'conflict', 'unsupported'] as const).map(status => <button type="button" disabled={!counted.some(check => check.status === status)} onClick={() => jumpToStatus(status)} key={status} className={`homeowner-summary__${status}`}><StatusIcon status={status} /><strong>{counted.filter(check => check.status === status).length} {statusLabels[status]}</strong></button>)}</div>
    {nextAction && <div className="step-action"><button className="homeowner-summary__next" type="button" onClick={() => onNavigate(nextAction.target)}>{continuation ? '' : 'Next: '}{nextAction.label}</button><StepInfo label={nextAction.label}>{nextCheck?.detail} This opens the relevant control so you can review or correct the current input.</StepInfo></div>}
    <p className="homeowner-summary__scope">Preliminary screening of this placement · limited checks. Open questions and requirements not covered are listed below.</p>
    <details ref={checklist} open className="homeowner-summary__checks"><summary>Review individual checks</summary><ul>{summary.checks.map((check, index) => <li id={`summary-check-${index}`} tabIndex={-1} key={check.label} className={`homeowner-summary__${check.status}`}>
      <StatusIcon status={check.status} />
      <div><strong>{check.label} · {statusLabels[check.status]}</strong><p>{check.detail}</p>{check.resolutions && <ul>{check.resolutions.map(suggestion => <li key={suggestion.edgeId}><div><p>{suggestion.detail}</p>{onApplyBuffer && <button type="button" disabled={actionsDisabled} onClick={() => onApplyBuffer(suggestion.edgeId, suggestion.bufferM)}>Apply {suggestion.bufferM} m planning buffer</button>} {onMove && <button type="button" disabled={actionsDisabled} onClick={() => onMove(suggestion.edgeId, suggestion.moveM)}>Move {suggestion.moveM} m away from this edge &amp; recheck</button>}</div></li>)}</ul>}{check.parts && <ul>{check.parts.map((part, partIndex) => <li id={`summary-check-${index}-part-${partIndex}`} tabIndex={-1} key={part.label} className={`homeowner-summary__${part.status}`}><div><strong>{part.label} · {statusLabels[part.status]}</strong><p>{part.detail}</p>{part.action && <button type="button" onClick={() => onNavigate(part.action!.target)}>{part.action.label}</button>}</div></li>)}</ul>}
        {check.status === 'conflict' && onAcknowledge && <div>{acknowledged.includes(check.label) ? <><p role="status"><strong>Acknowledged · included in enquiry.</strong> The conflict remains unresolved; City agreement or an exception is not established.</p><button type="button" onClick={() => onAcknowledge(check)}>Remove acknowledgement</button></> : <button type="button" onClick={() => onAcknowledge(check)}>Acknowledge and include in enquiry</button>}</div>}
        {check.status === 'probable' && <StepInfo symbol="?" label={`${check.label} assumption`}>{check.detail} This is a preliminary assumption-based finding; review the inputs before relying on it.</StepInfo>}
        {check.action && <div className="step-action"><button type="button" onClick={() => onNavigate(check.action!.target)}>{check.action.label}</button><StepInfo label={check.action.label}>{check.detail} Review the current input; leave it unknown when you cannot support an answer.</StepInfo></div>}
      </div>
    </li>)}</ul></details>
  </section>
}
