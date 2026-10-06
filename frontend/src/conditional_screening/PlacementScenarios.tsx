import { measurementWithUnit } from '../measurements'
import { readableDate, TechnicalDetails } from '../ReadableProvenance'
import { suggestedBoundaryRoles, type BoundaryMapMode, type SiteAssumptions } from '../zoning_site_assumptions/model'
import type { ScenarioRequest, ScenarioResult } from './scenarios'

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
}

export function PlacementScenarios({ assumptions, request, result, busy, error, frontEdge, rearEdge, boundaryMode, onBoundaryMode }: Props) {
  const edges = assumptions?.edges.filter(edge => edge.ring === 0) ?? []
  const suggestions = suggestedBoundaryRoles(assumptions?.edges ?? [], frontEdge, rearEdge, request?.street_pattern ?? 'unknown')
  const title = result?.status === 'bounded_pass' ? 'Supported distances pass under every tested edge scenario'
    : result?.status === 'apparent_conflict' ? 'Apparent distance conflict at this position'
      : result?.status === 'clarify' ? 'Boundary clarification could change the result'
        : 'Approximate setback screen unresolved'
  const checked = new Map(result?.scenarios.flatMap(scenario => scenario.checks).map(check => [check.edge_id, check]) ?? [])
  return <section className={`placement-scenarios placement-scenarios--${result?.status ?? 'unresolved'}`} aria-label="Approximate setback scenarios">
    <h3>Approximate setback screen</h3>
    <p>Automatically compares the nominal rectangle with captured parcel edges using candidate City of Victoria garden-suite side, rear and flanking distances. It does not establish legal lot lines, current zoning or all setbacks.</p>
    {busy && <p role="status">Checking plausible boundary assignments…</p>}
    {error && <p role="alert">{error}</p>}
    {!result && !busy && !error && <p role="status">Measure a placement to screen the supported captured edges.</p>}
    {result && <div role="status"><strong>{title}</strong><p>{result.reason}</p>
      <p>{`${result.scenarios.length} coherent ${result.scenarios.length === 1 ? 'scenario' : 'scenarios'} tested.`} Side and rear: {measurementWithUnit(result.thresholds_m.side_rear, 'length')} candidate minimum; flanking street: {measurementWithUnit(result.thresholds_m.flanking_street, 'length')} candidate minimum. Front and other applicable rules were not checked.</p>
      <p className="placement-scenarios__source">{result.sources.map(source => `${source.provider} · ${source.record_label} · ${source.locator} · captured ${readableDate(source.capture_date)} · ${source.review_status}`).join('; ')}. <a href={result.sources[0]?.url} target="_blank" rel="noreferrer">Candidate source</a></p>
      {Object.keys(result.edge_distances_m).length > 0 && <details><summary>Distance to boundary · approximate</summary><ul>{edges.map((edge, index) => {
        const check = checked.get(edge.id)
        return <li key={edge.id}>Edge {index + 1}: ≈ {measurementWithUnit(result.edge_distances_m[edge.id], 'length')} from captured parcel edge to nominal rectangle. {check?.basis === 'user_wall_to_lot_line' && <>Comparison uses your {measurementWithUnit(check.distance_m, 'length')} wall-to-line measurement, unverified. </>}{suggestions[edge.id] ? `Suggested ${suggestions[edge.id]} role, conditional on the single-street assumption.` : 'Role not established.'}</li>
      })}</ul></details>}
      <p>Captured geometry is approximate. A street-facing edge is a scenario clue, not a legal front lot line. Full values and every scenario remain in technical evidence.</p>
      <TechnicalDetails title="Exact scenario measurements, source and assignments · copyable"><textarea readOnly aria-label="Complete approximate scenario evidence" rows={12} value={JSON.stringify({ request, result }, null, 2)} /></TechnicalDetails>
    </div>}
    {result?.status === 'clarify' && <div className="placement-scenarios__choice"><p>Select a possible street-facing or rear edge on the placement map if you know it. The map pauses model movement while selecting. “Not sure” remains available.</p><button type="button" onClick={() => { onBoundaryMode('front'); document.getElementById('placement-map')?.scrollIntoView({ block: 'center' }) }}>Choose on placement map</button></div>}
    {boundaryMode !== 'place' && <p>Boundary selection is active on the placement map. Choose “Move model” there to resume placement.</p>}
    {result?.status === 'bounded_pass' && <p className="placement-scenarios__notice">This is a bounded approximate distance observation. Missing front, rear-yard, height and site-specific checks prevent a complete zoning pass.</p>}
  </section>
}
