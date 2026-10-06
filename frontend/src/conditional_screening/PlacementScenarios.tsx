import { measurementWithUnit } from '../measurements'
import { readableDate } from '../ReadableProvenance'
import { TechnicalDetails } from '../ReadableProvenance'
import type { SiteAssumptions } from '../zoning_site_assumptions/model'
import type { ScenarioRequest, ScenarioResult } from './scenarios'

type Props = {
  assumptions: SiteAssumptions | null
  request: ScenarioRequest | null
  result: ScenarioResult | null
  busy: boolean
  error: string
  streetEdge: string | null
  streetPattern: ScenarioRequest['street_pattern']
  onStreetEdge: (id: string | null) => void
  onStreetPattern: (pattern: ScenarioRequest['street_pattern']) => void
}

export function PlacementScenarios(props: Props) {
  const { assumptions, request, result, busy, error, streetEdge, streetPattern, onStreetEdge, onStreetPattern } = props
  const edges = assumptions?.edges.filter(edge => edge.ring === 0) ?? []
  const showChoice = result?.status === 'clarify' || streetEdge !== null || streetPattern !== 'unknown'
  const labels = new Map(edges.map((edge, index) => [edge.id, `Edge ${index + 1}`]))
  const xs = edges.flatMap(edge => [edge.start[0], edge.end[0]])
  const ys = edges.flatMap(edge => [edge.start[1], edge.end[1]])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const pad = Math.max(maxX - minX, maxY - minY) * 0.12
  const viewBox = `${minX - pad} ${-maxY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`
  const title = result?.status === 'bounded_pass' ? 'Supported distances pass under every tested edge scenario'
    : result?.status === 'apparent_conflict' ? 'Apparent distance conflict at this position'
      : result?.status === 'clarify' ? 'Boundary clarification could change the result'
        : 'Approximate setback screen unresolved'
  return <section className={`placement-scenarios placement-scenarios--${result?.status ?? 'unresolved'}`} aria-label="Approximate setback scenarios">
    <h3>Approximate setback screen</h3>
    <p>Automatically compares the nominal rectangle with captured parcel edges using candidate City of Victoria garden-suite side, rear and flanking distances. It does not establish legal lot lines, current zoning or all setbacks.</p>
    {busy && <p role="status">Checking plausible boundary assignments…</p>}
    {error && <p role="alert">{error}</p>}
    {!result && !busy && !error && <p role="status">Measure a placement to screen the supported captured edges.</p>}
    {result && <div role="status"><strong>{title}</strong><p>{result.reason}</p>
      <p>{`${result.scenarios.length} coherent ${result.scenarios.length === 1 ? 'scenario' : 'scenarios'} tested.`} Side and rear: {measurementWithUnit(result.thresholds_m.side_rear, 'length')} candidate minimum; flanking street: {measurementWithUnit(result.thresholds_m.flanking_street, 'length')} candidate minimum. Front and other applicable rules were not checked.</p>
      <p className="placement-scenarios__source">{result.sources.map(source => `${source.provider} · ${source.record_label} · ${source.locator} · captured ${readableDate(source.capture_date)} · ${source.review_status}`).join('; ')}. <a href={result.sources[0]?.url} target="_blank" rel="noreferrer">Candidate source</a></p>
      {Object.keys(result.edge_distances_m).length > 0 && <ul>{edges.map(edge => <li key={edge.id}>{labels.get(edge.id)}: captured edge to nominal rectangle {measurementWithUnit(result.edge_distances_m[edge.id], 'length')}. Role {edge.role.value && edge.role.value !== 'unknown' ? `manually assumed ${edge.role.value.replace('_', ' ')}` : 'unconfirmed'}.</li>)}</ul>}
      <p>Captured geometry is approximate. A street-facing edge is a scenario clue, not a legal front lot line. Full values and every scenario remain in technical evidence.</p>
      <TechnicalDetails title="Exact scenario measurements, source and assignments · copyable"><textarea readOnly aria-label="Complete approximate scenario evidence" rows={12} value={JSON.stringify({ request, result }, null, 2)} /></TechnicalDetails>
    </div>}
    {showChoice && <fieldset className="placement-scenarios__choice"><legend>Which side faces the street?</legend>
      <p>Select a numbered edge on the sketch or with the buttons. If the parcel has multiple street edges, choose that option; the legal front still needs review.</p>
      {edges.length >= 3 && Number.isFinite(pad) && pad > 0 && <svg viewBox={viewBox} className="placement-scenarios__map" role="img" aria-label="Numbered parcel edges; use the buttons below to select an edge">
        {edges.map((edge, index) => <g key={edge.id}><line x1={edge.start[0]} y1={-edge.start[1]} x2={edge.end[0]} y2={-edge.end[1]} className={streetEdge === edge.id ? 'placement-scenarios__edge placement-scenarios__edge--selected' : 'placement-scenarios__edge'} onClick={() => onStreetEdge(edge.id)}><title>{`Edge ${index + 1}`}</title></line><text x={(edge.start[0] + edge.end[0]) / 2} y={-(edge.start[1] + edge.end[1]) / 2}>{index + 1}</text></g>)}
      </svg>}
      <div className="placement-scenarios__buttons">{edges.map((edge, index) => <button key={edge.id} type="button" aria-pressed={streetEdge === edge.id} onClick={() => onStreetEdge(edge.id)}>Edge {index + 1} faces street</button>)}
        <button type="button" aria-pressed={streetEdge === null} onClick={() => { onStreetEdge(null); onStreetPattern('unknown') }}>Not sure</button>
        <button type="button" aria-pressed={streetPattern === 'corner_or_multiple'} onClick={() => onStreetPattern('corner_or_multiple')}>Corner or multiple streets</button></div>
      <label className="placement-scenarios__single"><input type="checkbox" checked={streetPattern === 'single'} onChange={event => onStreetPattern(event.target.checked ? 'single' : 'unknown')} /> I know this parcel has only one street-facing edge</label>
      {streetEdge && streetPattern !== 'single' && <p role="status">The selected street edge alone does not settle legal frontage. Other street edges remain possible; confirm a single street edge only if known.</p>}
      <p>These selections narrow tentative scenarios only. Review registered plans, street adjacency and Victoria’s front lot line definition before treating an edge as legally front or flanking.</p>
    </fieldset>}
    {result?.status === 'bounded_pass' && <p className="placement-scenarios__notice">This is a bounded approximate distance observation. Missing front, rear-yard, height and site-specific checks prevent a complete zoning pass.</p>}
  </section>
}
