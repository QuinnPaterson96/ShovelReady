import { BoundaryRoleHelp } from '../zoning_site_assumptions/BoundaryMapTools'
import { measurementWithUnit } from '../measurements'
import { readableDate, TechnicalDetails } from '../ReadableProvenance'
import { type BoundaryMapMode, type SiteAssumptions } from '../zoning_site_assumptions/model'
import type { ScenarioRequest, ScenarioResult } from './scenarios'
import { Evidence } from './ConditionalScreen'
import type { ScreeningResult } from './model'

type Props = {
  assumptions: SiteAssumptions | null
  request: ScenarioRequest | null
  result: ScenarioResult | null
  busy: boolean
  error: string
  frontEdge: string | null
  rearEdge: string | null
  boundaryMode: BoundaryMapMode
  onBoundaryMode: (mode: BoundaryMapMode) => void
  legalResult?: ScreeningResult | null
  onRetry?: () => void
}

export function PlacementScenarios({ assumptions, request, result, busy, error, boundaryMode, onBoundaryMode, legalResult, onRetry }: Props) {
  const edges = assumptions?.edges ?? []
  const title = result?.status === 'bounded_pass' ? result.scenarios.some(s => s.checks.some(c => c.planning_meets === false)) ? 'Candidate distances met · planning margins need review' : 'Candidate boundary distances met in the tested scenarios'
    : result?.status === 'apparent_conflict' ? 'Apparent distance conflict at this position'
      : result?.status === 'clarify' ? 'Boundary clarification could change the result'
        : 'Approximate setback screen unresolved'
  const roles = new Map<string, Set<string>>()
  for (const scenario of result?.scenarios ?? []) {
    for (const [id, role] of [[scenario.front_edge_id, 'front'], ...scenario.checks.map(check => [check.edge_id, check.role])]) {
      if (!roles.has(id)) roles.set(id, new Set())
      roles.get(id)!.add(role)
    }
  }
  return <section className={`placement-scenarios placement-scenarios--${result?.status ?? 'unresolved'}`} aria-label="Approximate setback scenarios">
    <h4>Boundary distances · approximate scenarios and your entries</h4>
    <p>Automatically compares the nominal rectangle with captured parcel edges using candidate City of Victoria garden-suite side, rear and flanking distances. It does not establish legal lot lines, current zoning or all setbacks.</p>
    <BoundaryRoleHelp />
    {busy && <p role="status">Checking plausible boundary assignments…</p>}
    {error && <p role="alert">{error} {onRetry && <button type="button" onClick={onRetry}>Retry boundary checks</button>}</p>}
    {!result && !busy && !error && <p role="status">Place the footprint for an automatic check.</p>}
    {result && <div role="status"><strong>{title}</strong><p>{result.reason}</p>
      <p>{`${result.scenarios.length} coherent ${result.scenarios.length === 1 ? 'scenario' : 'scenarios'} tested.`} Candidate requirements, separate from mapped gaps: side and rear {measurementWithUnit(result.thresholds_m.side_rear, 'length')} candidate minimum; flanking street: {measurementWithUnit(result.thresholds_m.flanking_street, 'length')} candidate minimum. Front and other applicable rules were not checked.</p>
      <p className="placement-scenarios__source">{[...new Set(result.sources.map(source => `${source.provider} · ${source.record_label} · captured ${readableDate(source.capture_date)} · ${source.review_status}`))].join('; ')}. <a href={result.sources[0]?.url} target="_blank" rel="noreferrer">Candidate source</a></p>
    </div>}
      <p>Roles are derived from the current street, edge and user-role choices. They are scenario assignments, never surveyed or legal classifications. All comparisons remain within complete scenarios; individual optimistic roles are not combined.</p>
      <ul className="cs-checks">{edges.map((edge, index) => {
        const checks = result?.scenarios.flatMap(scenario => scenario.checks.filter(check => check.edge_id === edge.id)) ?? []
        const possible = [...(roles.get(edge.id) ?? [])]
        const manual = assumptions?.measurements.boundary[edge.id]
        const userRole = edge.role.value && edge.role.value !== 'unknown' ? edge.role.value.replace(/_/g, ' ') : null
        const legalChecks = legalResult?.checks.filter(check => check.rule.fact_id === `boundary:${edge.id}` || check.rule.fact_id === `edge_role:${edge.id}`) ?? []
        const outcome = !checks.length ? 'Not compared' : possible.includes('front') || checks.some(check => check.meets) && checks.some(check => !check.meets) ? 'Scenario-dependent' : checks.every(check => check.meets) ? 'Meets tested distances' : 'Distance shortfall'
        const variants = [...new Map(checks.map(check => [JSON.stringify([check.role, check.distance_m, check.minimum_m, check.basis]), check])).values()]
        return <li className="cs-check" key={edge.id} data-boundary-edge={edge.id}><details><summary><span className="cs-check-main"><strong>{edge.ring === 0 ? `Edge ${index + 1}` : `Inner ring ${edge.ring}, edge ${edge.segment + 1}`} · {outcome}</strong><span>{possible.length === 1 ? `Derived scenario role: ${possible[0].replace(/_/g, ' ')}.` : possible.length > 1 ? `Possible scenario roles: ${possible.map(role => role.replace(/_/g, ' ')).join(', ')}.` : 'Scenario role unknown.'}</span><span className="cs-measurement">{result?.edge_distances_m[edge.id] !== undefined ? `≈ ${measurementWithUnit(result.edge_distances_m[edge.id], 'length')} from captured parcel edge to nominal rectangle.` : 'Captured edge distance unresolved.'}</span></span></summary><div className="cs-evidence">
          <p><strong>Derived evidence:</strong> Current street-facing/rear choices and street pattern, constrained by your separate role entries. {possible.includes('front') && 'Front setback is not compared in those scenarios.'}</p>
          <p><strong>Your entries:</strong> {userRole ? `Your separate role entry: ${userRole} (user assumption).` : 'Legal role not entered.'} {manual ? <>Your wall-to-legal-line entry: {measurementWithUnit(manual.value, 'length')} (unverified). {checks.length ? 'Candidate comparison uses this entry; the approximate map distance remains above.' : 'No current scenario comparison uses this entry.'}</> : 'No wall-to-legal-line measurement entered. Supported candidate scenarios use the approximate captured distance.'}</p>
          {variants.map((check, i) => <p key={i}>{check.role.replace(/_/g, ' ')} scenario: {measurementWithUnit(check.distance_m, 'length')} ({check.basis === 'captured_nominal' ? 'captured edge to nominal rectangle' : 'user wall-to-legal-line entry'}), candidate minimum {measurementWithUnit(check.minimum_m, 'length')} · {check.meets ? 'meets this distance' : `shortfall ${measurementWithUnit(check.minimum_m - check.distance_m, 'length')}`}. Planning estimate {measurementWithUnit(check.planning_distance_m ?? check.distance_m, 'length')} after subtracting the optional {measurementWithUnit(check.planning_buffer_m ?? 0, 'length')} planning margin · {check.planning_meets === false && check.meets ? 'needs review, planning margin only' : check.planning_meets ? 'meets candidate minimum after that allowance' : 'see raw comparison'}. Exact compared distance {check.distance_m} m; minimum {check.minimum_m} m.</p>)}
          <details><summary>Optional legal-basis comparison and source evidence</summary><p>These comparisons require your explicit legal role and compatible wall measurement. Missing entries do not negate the approximate observation.</p>{legalChecks.length ? legalChecks.map((check, i) => <div key={i}><p><strong>{check.rule.fact_id.startsWith('edge_role:') ? 'User legal-role basis' : 'User wall/legal-line comparison'}:</strong> {check.status.replace(/_/g, ' ')}.</p><Evidence check={check} /></div>) : <p>No current legal-basis result for this edge.</p>}</details>
        </div></details></li>
      })}</ul>
      <p>Captured geometry is approximate. A street-facing edge is a scenario clue, not a legal front lot line. Full values and every scenario remain in technical evidence.</p>
      <p><strong>Keep the bases separate:</strong> A mapped gap runs from the captured parcel edge to the nominal rectangle. A candidate requirement is the distance tested for a particular scenario role. An optional planning margin is your extra allowance for uncertainty; it does not change the source requirement or establish surveyed space.</p>
    {result && <TechnicalDetails title="Exact scenario measurements, source and assignments · copyable"><textarea readOnly aria-label="Complete approximate scenario evidence" rows={12} value={JSON.stringify({ request, result }, null, 2)} /></TechnicalDetails>}
    {result?.status === 'clarify' && <div className="placement-scenarios__choice"><p>Select a possible street-facing or rear edge on the placement map if you know it. The map pauses model movement while selecting. “Not sure” remains available.</p><button type="button" onClick={() => { onBoundaryMode('front'); requestAnimationFrame(() => { const tab = document.getElementById('placement-action-front'); tab?.scrollIntoView({ block: 'center' }); tab?.focus() }) }}>Choose on placement map</button></div>}
    {boundaryMode !== 'place' && <p>Boundary selection is active on the placement map. Choose “Move unit” there to resume placement.</p>}
    <p className="placement-scenarios__notice">This is a bounded approximate distance screen. Missing front, rear-yard, height and site-specific checks prevent a complete zoning pass.</p>
  </section>
}
