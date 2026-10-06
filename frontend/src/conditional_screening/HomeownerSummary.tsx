import * as React from 'react'
export type SummaryCheck = { label: string; status: 'checked' | 'conflict' | 'unknown' | 'unsupported'; detail: string; action?: { label: string; target: string } }
export type Summary = { conclusion: string; next: string; checks: SummaryCheck[] }

export function HomeownerSummary({ summary, onNavigate }: { summary: Summary; onNavigate: (target: string) => void }) {
  React.useEffect(() => { void import('./homeowner-summary.css') }, [])
  return <section className="homeowner-summary" aria-label="Placement summary">
    <h3>{summary.conclusion}</h3><p>{summary.next}</p>
    <p className="homeowner-summary__scope">Preliminary Model 300 scouting on the selected property. Captured geometry and candidate checks do not establish permit eligibility.</p>
    <ul>{summary.checks.map(check => <li key={check.label} className={`homeowner-summary__${check.status}`}>
      <span className="homeowner-summary__icon" aria-hidden="true">{{ checked: '✓', conflict: '!', unknown: '?', unsupported: '—' }[check.status]}</span>
      <div><strong>{check.label} · {{ checked: 'Checked', conflict: 'Conflict', unknown: 'Unknown', unsupported: 'Not yet covered' }[check.status]}</strong><p>{check.detail}</p>
        {check.action && <button type="button" onClick={() => onNavigate(check.action!.target)}>{check.action.label}</button>}
      </div>
    </li>)}</ul>
  </section>
}
