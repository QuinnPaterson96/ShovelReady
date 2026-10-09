import * as React from 'react'
import { focusSummaryTarget } from './summaryNavigation'
import { StepInfo } from '../StepInfo'
export type FindingGap = { missing: string; affects: string; next: string; owner: string }
export type SummaryCheck = { label: string; status: 'checked' | 'probable' | 'review' | 'conflict' | 'unknown' | 'unsupported'; detail: string; useDependent?: boolean; gap?: FindingGap; resolutions?: { detail: string; edgeId: string; bufferM?: number; moveM: number }[]; parts?: SummaryCheck[]; action?: { label: string; target: string } }
export type Summary = { conclusion: string; next: string; checks: SummaryCheck[] }
export function FindingResolutions({ resolutions, onApplyBuffer, onMove, disabled = false }: { resolutions: NonNullable<SummaryCheck['resolutions']>; onApplyBuffer?: (edgeId: string, value: number) => void; onMove?: (edgeId: string, distance: number) => void; disabled?: boolean }) {
  return <ul>{resolutions.map(suggestion => <li key={suggestion.edgeId}><div><p>{suggestion.detail}</p>{onApplyBuffer && suggestion.bufferM !== undefined && <button type="button" disabled={disabled} onClick={() => onApplyBuffer(suggestion.edgeId, suggestion.bufferM!)}>Apply {suggestion.bufferM} m planning buffer</button>} {onMove && <button type="button" disabled={disabled} onClick={() => onMove(suggestion.edgeId, suggestion.moveM)}>Move {suggestion.moveM} m away from {suggestion.edgeId === 'main-building' ? 'the main building' : 'this edge'} &amp; recheck</button>}</div></li>)}</ul>
}
export function summaryFindings(summary: Summary) {
  return summary.checks.flatMap((check, index) => check.parts ? check.parts.map((part, partIndex) => ({ ...part, targetId: `summary-check-${index}-part-${partIndex}` })) : [{ ...check, targetId: `summary-check-${index}` }])
}
export const statusLabels = { checked: 'Checked under stated inputs', probable: 'Likely fine', review: 'Needs review', conflict: 'Preliminary concern', unknown: 'Missing information', unsupported: 'Not covered' }
export function StatusIcon({ status }: { status: SummaryCheck['status'] }) {
  return <svg className="homeowner-summary__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" />{status === 'checked' || status === 'probable' ? <path d="m7 12 3 3 7-7" /> : status === 'unsupported' ? <path d="M7 12h10" /> : <><path d={status === 'conflict' ? 'M12 6v8' : 'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5'} /><circle cx="12" cy="18" r=".5" /></>}</svg>
}

export function HomeownerSummary({ summary, updating = false, useQualification, onNavigate, continuation, onApplyBuffer, onMove, actionsDisabled, acknowledged = [], onAcknowledge }: { summary: Summary; updating?: boolean; useQualification?: string; onNavigate: (target: string) => void; onApplyBuffer?: (edgeId: string, value: number) => void; onMove?: (edgeId: string, distance: number) => void; actionsDisabled?: boolean; acknowledged?: string[]; onAcknowledge?: (check: SummaryCheck) => void; continuation?: { label: string; hint: string; onContinue: () => void } }) {
  React.useEffect(() => { void import('./homeowner-summary.css') }, [])
  const counted = summaryFindings(summary)
  const groups: { label: string; statuses: SummaryCheck['status'][]; icon: SummaryCheck['status'] }[] = [
    { label: 'Placement concerns', statuses: ['conflict'], icon: 'conflict' },
    { label: 'Questions to resolve', statuses: ['review', 'unknown', 'unsupported'], icon: 'review' },
    { label: 'Checks looking plausible', statuses: ['checked', 'probable'], icon: 'probable' },
  ]
  const priority = counted.filter(check => check.status === 'conflict')
  const questions = counted.filter(check => ['review', 'unknown'].includes(check.status))
  const nextCheck = counted.find(check => check.status === 'conflict' && check.action)
    ?? counted.find(check => check.status === 'review' && check.action)
    ?? counted.find(check => check.status === 'unknown' && check.action)
  const nextAction = nextCheck?.action
  const checklist = React.useRef<HTMLDetailsElement>(null)
  const jumpToStatuses = (statuses: SummaryCheck['status'][]) => {
    const found = counted.find(check => statuses.includes(check.status))
    if (!found) return
    if (checklist.current) checklist.current.open = true
    focusSummaryTarget(document, found.targetId)
  }
  const renderFinding = (check: SummaryCheck, targetId: string): React.ReactNode => {
    const included = check.parts ? check.parts.some(part => !['checked', 'probable'].includes(part.status)) && check.parts.every(part => ['checked', 'probable'].includes(part.status) || acknowledged.includes(part.label)) : acknowledged.includes(check.label)
    const unresolved = !check.parts && !['checked', 'probable'].includes(check.status)
    return <li id={targetId} tabIndex={-1} key={check.label} className={`homeowner-summary__${check.status}${included ? ' homeowner-summary__acknowledged' : ''}${included && check.status === 'conflict' ? ' homeowner-summary__acknowledged-conflict' : ''}`}>
      <StatusIcon status={check.status} /><div>
        <strong>{check.label} · {statusLabels[check.status]}</strong><p>{check.detail}</p>
        {included && <p className="homeowner-summary__workflow">Enquiry workflow: included for discussion. Evidence status above is unchanged.</p>}
        {check.gap && <dl className="homeowner-summary__gap"><dt>Still needed</dt><dd>{check.gap.missing}</dd><dt>Why it matters</dt><dd>{check.gap.affects}</dd><dt>Next action · {check.gap.owner}</dt><dd>{check.gap.next}</dd></dl>}
        {check.parts && included && <p role="status">All open findings in this section are included for discussion. Their original statuses remain.</p>}
        {check.parts && <ul>{check.parts.map((part, index) => renderFinding(part, `${targetId}-part-${index}`))}</ul>}
        {check.resolutions && <FindingResolutions resolutions={check.resolutions} onApplyBuffer={onApplyBuffer} onMove={onMove} disabled={actionsDisabled || updating} />}
        {unresolved && onAcknowledge && <div>{included ? <><p role="status"><strong>{check.status === 'conflict' ? 'Acknowledged · included in enquiry.' : 'Included as an open question in enquiry.'}</strong> {check.status === 'conflict' ? 'The conflict remains unresolved; City agreement or an exception is not established.' : 'This finding remains unresolved; inclusion does not confirm an answer.'}</p><button type="button" disabled={updating} onClick={() => onAcknowledge(check)}>Remove {check.status === 'conflict' ? 'acknowledgement' : 'open question'}</button></> : <button type="button" disabled={updating} onClick={() => onAcknowledge(check)}>{check.status === 'conflict' ? 'Acknowledge and include in enquiry' : check.useDependent ? 'Recognize and include in enquiry' : 'Include as an open question in enquiry'}</button>}</div>}
        {check.status === 'probable' && <StepInfo symbol="?" label={`${check.label} assumption`}>{check.detail} This is a preliminary assumption-based finding; review the inputs before relying on it.</StepInfo>}
        {check.action && <div className="step-action"><button type="button" onClick={() => onNavigate(check.action!.target)}>{check.action.label}</button><StepInfo label={check.action.label}>{check.detail} Review the current input; leave it unknown when you cannot support an answer.</StepInfo></div>}
      </div>
    </li>
  }
  return <section className="homeowner-summary" id="builder-quick-checks" tabIndex={-1} aria-label="Placement summary" aria-busy={updating}>
    {updating && <p className="homeowner-summary__updating" role="status"><strong>Updating checks</strong> · showing the previous result for this property and model. It cannot be saved as the current assessment.</p>}
    <h3>{summary.conclusion}</h3><p>{summary.next}</p>
    {useQualification && <p className="homeowner-summary__scope">{useQualification}</p>}
    {priority.length > 0 && <p><strong>Placement concerns:</strong> {priority.map(check => check.label).join('; ')}.</p>}
    {questions.length > 0 && <p><strong>Priority questions:</strong> {questions.slice(0, 3).map(check => check.label).join('; ')}{questions.length > 3 ? `; ${questions.length - 3} more in the checks below` : ''}.</p>}
    <div className="homeowner-summary__counts" aria-label="Named check counts">{groups.map(group => {
      const count = counted.filter(check => group.statuses.includes(check.status)).length
      return <button type="button" disabled={!count} onClick={() => jumpToStatuses(group.statuses)} key={group.label} className={`homeowner-summary__${group.icon}`}><StatusIcon status={group.icon} /><strong>{count} {group.label}</strong></button>
    })}</div>
    {nextAction && <div className="step-action"><button className="homeowner-summary__next" type="button" onClick={() => onNavigate(nextAction.target)}>{continuation ? '' : 'Next: '}{nextAction.label}</button><StepInfo label={nextAction.label}>{nextCheck?.detail} This opens the relevant control so you can review or correct the current input.</StepInfo></div>}
    <p className="homeowner-summary__scope">Preliminary screening of this placement · limited checks. Open questions and requirements not covered are listed below.</p>
    <details ref={checklist} open className="homeowner-summary__checks"><summary>Review individual checks</summary><ul>{summary.checks.map((check, index) => ({ check, index })).sort((a, b) => {
      const rank = (check: SummaryCheck) => check.status === 'conflict' ? 0 : check.status === 'review' || check.status === 'unknown' ? 1 : check.status === 'unsupported' ? 2 : 3
      return rank(a.check) - rank(b.check)
    }).map(({ check, index }) => renderFinding(check, `summary-check-${index}`))}</ul></details>
  </section>
}
