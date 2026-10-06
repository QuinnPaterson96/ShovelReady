import * as React from 'react'
import type { Result as GeometryResult } from '../occupied_lots/contract'
import type { ScreeningResult } from './model'
import type { ScenarioResult } from './scenarios'
import type { MappedZoning, ProjectSettings } from './projectSettings'
import type { ZoningLookup } from './victoriaZoning'
import type { SiteAssumptions } from '../zoning_site_assumptions/model'

export type SummaryCheck = { label: string; status: 'checked' | 'conflict' | 'unknown' | 'unsupported'; detail: string; action?: { label: string; target: string } }
export type Summary = { conclusion: string; next: string; checks: SummaryCheck[] }

export function homeownerSummary(input: {
  geometry: GeometryResult | null; geometryComplete: boolean; scenario: ScenarioResult | null; screening: ScreeningResult | null
  assumptions: SiteAssumptions | null; settings: ProjectSettings; mapped: MappedZoning | null; lookup: ZoningLookup | null
  zoningBusy: boolean; zoningError: string; scenarioError: string; screeningError: string; onRetryAvailable: boolean
}): Summary {
  const { geometry, geometryComplete, scenario, screening, assumptions, settings, mapped, lookup, zoningBusy, zoningError, scenarioError, screeningError, onRetryAvailable } = input
  const checks: SummaryCheck[] = []
  const geometryConflict = geometry?.checks.some(check => check.relation === 'outside' || check.relation === 'touches' || check.relation === 'positive_area_overlap' || check.comparison === 'shortfall') ?? false
  const contained = geometry?.checks.some(check => check.kind === 'containment' && check.relation === 'contained') ?? false
  checks.push(geometryConflict
    ? { label: 'Space within the property', status: 'conflict', detail: 'The current approximate placement has a parcel, roofline or chosen clearance conflict.', action: { label: 'Adjust placement', target: 'placement-map' } }
    : contained && geometryComplete ? { label: 'Space within the property', status: 'checked', detail: 'The footprint is inside the captured parcel and no overlap with captured rooflines was observed. Captured geometry is approximate.' }
      : { label: 'Space within the property', status: 'unknown', detail: geometry ? 'The parcel or roofline observation is incomplete.' : 'Place the model to check the captured parcel and rooflines.', action: { label: geometry ? 'Review placement' : 'Place model', target: 'placement-map' } })

  const legalDistanceConflict = screening?.checks.some(check => check.rule.kind === 'boundary_min' && check.status === 'apparent_conflict_under_assumptions') ?? false
  checks.push(legalDistanceConflict || scenario?.status === 'apparent_conflict'
    ? { label: 'Distance to boundaries', status: 'conflict', detail: 'At least one candidate distance conflicts under the stated assumptions.', action: { label: 'Review boundary measurements', target: 'boundary-roles' } }
    : scenarioError ? { label: 'Distance to boundaries', status: 'unknown', detail: 'The distance comparison could not be loaded. The captured geometry remains separate.', action: { label: 'Retry distance check', target: 'retry-scenario' } }
    : scenario?.status === 'bounded_pass'
      ? { label: 'Distance to boundaries', status: 'checked', detail: 'Tested side and rear distances pass in coherent approximate scenarios. Front and legal-line distances remain unchecked.' }
      : { label: 'Distance to boundaries', status: 'unknown', detail: scenario?.status === 'clarify' ? 'The possible boundary roles change the result.' : 'A useful boundary comparison needs a current placement and boundary context.', action: { label: 'Review boundary roles', target: 'boundary-roles' } })

  const suiteCount = assumptions?.existing_garden_suites.value
  const countConflict = screening?.checks.some(check => check.rule.kind === 'count_max' && check.status === 'apparent_conflict_under_assumptions') ?? false
  const countChecked = screening?.checks.some(check => check.rule.kind === 'count_max' && check.status === 'meets_under_assumptions') ?? false
  checks.push(countConflict
    ? { label: 'Existing garden suite', status: 'conflict', detail: 'The supplied suite count conflicts with the candidate count check.', action: { label: 'Review suite count', target: 'existing-suites' } }
    : suiteCount === null || suiteCount === undefined
      ? { label: 'Existing garden suite', status: 'unknown', detail: 'Tell us if there is already a garden suite on the property.', action: { label: 'Enter suite count', target: 'existing-suites' } }
      : countChecked ? { label: 'Existing garden suite', status: 'checked', detail: 'Your stated count meets this candidate check under its assumptions.' }
        : { label: 'Existing garden suite', status: 'unknown', detail: 'Your stated count is recorded; a supported comparison is not available for these inputs.' })

  checks.push({ label: 'Height', status: 'unsupported', detail: 'Not yet covered: installed height, grade and a reviewed applicable height rule are missing.' })
  if (screeningError) checks.push({ label: 'Candidate rule checks', status: 'unknown', detail: 'The rule comparison could not be loaded for the current inputs.', action: { label: 'Retry rule checks', target: 'retry-screening' } })
  const mappedOutside = mapped?.status === 'single' && (mapped.zone !== 'GRD-1' || mapped.instrument !== 'Zoning Bylaw 2018 (No. 18-072)')
  const enteredOutside = settings.evidence.confirmed_zone.origin === 'user' && settings.proposal.confirmed_zone === 'other' ||
    settings.evidence.confirmed_instrument.origin === 'user' && settings.proposal.confirmed_instrument === 'other'
  const outsideScope = mappedOutside || enteredOutside
  checks.push(outsideScope
    ? { label: 'Zoning coverage', status: 'unsupported', detail: mappedOutside ? `Mapped ${mapped?.zone ?? 'unknown zone'} is outside this tool’s supported Victoria GRD-1 packet. This does not mean a garden suite is prohibited.` : 'Your entered zone or bylaw is outside this tool’s Victoria GRD-1 packet. This does not mean a garden suite is prohibited.' }
    : zoningError || lookup?.status === 'unavailable'
      ? { label: 'Zoning coverage', status: 'unknown', detail: 'The municipal zoning source is unavailable. No current zone was verified.', ...(onRetryAvailable ? { action: { label: 'Retry zoning lookup', target: 'zoning-retry' } } : {}) }
      : zoningBusy ? { label: 'Zoning coverage', status: 'unknown', detail: 'Checking the municipal zoning map.' }
        : mapped?.status === 'single' && mapped.zone === 'GRD-1'
          ? { label: 'Zoning coverage', status: 'checked', detail: 'The selected parcel maps to GRD-1 in an unreviewed City observation; applicability still needs review.' }
          : { label: 'Zoning coverage', status: 'unknown', detail: 'A single supported zone is not established for this property.', action: { label: 'Review zoning', target: 'zoning-settings' } })

  const supportedConflict = screening?.checks.some(check => check.rule.kind !== 'prerequisite' && check.rule.kind !== 'boundary_min' && check.status === 'apparent_conflict_under_assumptions') ?? false
  const conflict = geometryConflict || legalDistanceConflict || scenario?.status === 'apparent_conflict' || countConflict || supportedConflict
  return {
    conclusion: conflict ? 'This placement has a problem' : geometry ? 'This placement needs a closer look' : 'Insufficient information for a placement answer',
    next: conflict ? 'Review the flagged position or supplied facts, then check the remaining unknowns.' : geometry ? 'The captured placement is a starting point. Confirm the unknowns and missing rule coverage before relying on it.' : 'Place the model on a property to start the approximate checks.',
    checks,
  }
}

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
