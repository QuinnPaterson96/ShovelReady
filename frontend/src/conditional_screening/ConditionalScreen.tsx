import { useEffect } from 'react'
import { screeningCheckTitle, type Pathway, type ScreeningResult, type ScreeningStatus } from './model'
import { measurementWithUnit } from '../measurements'

const statusLabel: Record<ScreeningStatus, string> = {
  meets_under_assumptions: 'Meets this check under your assumptions',
  apparent_conflict_under_assumptions: 'Apparent conflict for this placement',
  needs_information: 'Needs information', not_applicable: 'Not applicable under stated facts', unsupported: 'Outside this screen',
}
const yesUnknown = (value: boolean | null) => value === null ? '' : String(value)
const names: Record<string, string> = { proposed_suite_total: 'garden suite count', floor_area: 'floor area', principal_separation: 'main building separation', flanking_presence: 'flanking street presence', legal_lot: 'legal lot', building_type: 'main building type', principal_building: 'main building selection', proposed_use: 'proposed use', foundation: 'foundation attachment', zone: 'zoning', instrument: 'zoning bylaw', waterfront: 'waterfront status', no_relevant_projections: 'projection treatment', floor_area_definition_acknowledged: 'Victoria floor area basis' }
const readable = (value: string) => value.replace(/(?:boundary|edge_role):[^\s,;]+/g, 'classified parcel edge').replace(/(?:[a-z]+_)+[a-z]+/g, match => names[match] ?? match.replace(/_/g, ' '))
const formattedQuantity = (raw: string | number, unit: string | null) => {
  const number = Number(raw)
  if (unit === 'm') return measurementWithUnit(number, 'length')
  if (unit === 'm2') return measurementWithUnit(number, 'area')
  return `${number} ${unit ?? ''}`.trim()
}

export function PathwayAssumptions({ value, onChange }: { value: Pathway; onChange: (value: Pathway) => void }) {
  useEffect(() => { void import('./conditional-screen.css') }, [])
  const change = <K extends keyof Pathway>(key: K, next: Pathway[K]) => onChange({ ...value, [key]: next })
  return <fieldset className="cs-pathway"><legend>Assume a Victoria garden-suite pathway</legend>
    <p>These choices let you explore a conditional scenario. They do not establish the legal lot, current zoning or a permit entitlement. Leave anything uncertain as unknown.</p>
    <label>Proposed use <select value={value.proposed_use ?? ''} onChange={event => change('proposed_use', event.target.value === '' ? null : event.target.value as 'garden_suite' | 'other')}><option value="">Unknown</option><option value="garden_suite">Assume new garden suite</option><option value="other">Different use</option></select></label>
    <label>Foundation <select value={yesUnknown(value.foundation_attached)} onChange={event => change('foundation_attached', event.target.value === '' ? null : event.target.value === 'true')}><option value="">Unknown</option><option value="true">Assume attached to a foundation</option><option value="false">No foundation attachment</option></select></label>
    <label>Current zoning <select value={value.confirmed_zone ?? ''} onChange={event => change('confirmed_zone', event.target.value === '' ? null : event.target.value as 'GRD-1' | 'other')}><option value="">Unknown</option><option value="GRD-1">Assume GRD-1 applies to the whole lot</option><option value="other">Different zone</option></select></label>
    <label>Applicable zoning bylaw <select value={value.confirmed_instrument ?? ''} onChange={event => change('confirmed_instrument', event.target.value === '' ? null : event.target.value as 'Zoning Bylaw 2018' | 'other')}><option value="">Unknown</option><option value="Zoning Bylaw 2018">Assume Victoria Zoning Bylaw 2018</option><option value="other">Different instrument</option></select></label>
    <label>Lot boundary <select value={yesUnknown(value.legal_lot_confirmed)} onChange={event => change('legal_lot_confirmed', event.target.value === '' ? null : event.target.value === 'true')}><option value="">Unknown</option><option value="true">Assume the captured outline matches one legal lot</option><option value="false">Known mismatch or multiple lots</option></select></label>
    <label>Projections affecting setbacks <select value={yesUnknown(value.no_relevant_projections)} onChange={event => change('no_relevant_projections', event.target.value === '' ? null : event.target.value === 'true')}><option value="">Unknown</option><option value="true">Assume no relevant eaves or other projections</option><option value="false">Relevant projections may affect distances</option></select></label>
    <label>Floor area basis <select value={yesUnknown(value.floor_area_definition_acknowledged)} onChange={event => change('floor_area_definition_acknowledged', event.target.value === '' ? null : event.target.value === 'true')}><option value="">Unknown</option><option value="true">Assume my entered area follows the Victoria definition</option><option value="false">Area does not follow that definition</option></select></label>
    <details><summary>Victoria floor area definition</summary><p>Victoria Zoning Bylaw 2018, Part 2.1 “Floor Area” (candidate PDF p16): measured to interior surfaces of exterior walls. It includes mezzanines, exterior hallways and stairs, lofts and partial storeys, with listed exclusions for balconies, verandas, decks, patios and roofs, crawlspaces and basements, rooftop structures and specified parking. This candidate source has unresolved consolidation/currentness labels. A rough interior area or Model 300 nominal footprint may use a different basis.</p></details>
    <p className="cs-note">The current packet does not resolve site-specific provisions, variances, transition permits, rear-yard location or occupancy. Those remain outside positive coverage.</p>
  </fieldset>
}

export function ConditionalScreen({ result, busy, error }: { result: ScreeningResult | null; busy: boolean; error: string }) {
  return <section className="cs-results" aria-label="Conditional zoning comparisons">
    <h3>Conditional zoning comparisons</h3>
    {busy && <p role="status">Checking the current assumptions and placement…</p>}
    {error && <p role="status">{error} Geometry measurements remain available above.</p>}
    {!result && !busy && !error && <p>Choose the pathway and property assumptions above to see which candidate checks can be compared. Unknown facts remain open.</p>}
    {result && <>
      <p className="cs-note">Candidate City of Victoria rules · supplied placement only · agent mapped and unreviewed. These comparisons are conditional, not an approval or complete bylaw review.</p>
      <p><strong>Coverage:</strong> {result.coverage.meets_under_assumptions} meet under assumptions; {result.coverage.apparent_conflict_under_assumptions} apparent conflicts; {result.coverage.needs_information} need information; {result.coverage.not_applicable} not applicable; {result.coverage.unsupported} outside scope.</p>
      {result.outstanding_prerequisites.length > 0 && <div className="cs-outstanding"><strong>Still needed:</strong><ul>{result.outstanding_prerequisites.map((item, index) => <li key={index}>{readable(item)}</li>)}</ul></div>}
      <ol className="cs-checks">{result.checks.map((check, index) => <li key={`${check.rule.logical_id}-${index}`} className={`cs-check cs-check--${check.status}`}>
        <strong>{statusLabel[check.status]}</strong><span>{screeningCheckTitle(check)}</span>
        {check.normalized_observed !== null && check.normalized_threshold !== null && <p>Supplied {formattedQuantity(check.normalized_observed, check.normalized_unit)}; candidate threshold {formattedQuantity(check.normalized_threshold, check.normalized_unit)}.</p>}
        {check.reasons.length > 0 && <p>{check.reasons.map(readable).join(' ')}</p>}
        <p className="cs-source">{check.rule.source.provider} · {check.rule.source.record_label} · {check.rule.source.locator} · captured {check.rule.source.capture_date ?? 'date unknown'} · {check.rule.source.review_status}. <a href={check.rule.source.url} target="_blank" rel="noreferrer">Source</a></p>
        <details><summary>Exact measurement and source details</summary>
          {check.normalized_observed !== null && <p>Exact supplied value: {check.normalized_observed} {check.normalized_unit ?? ''}. Exact candidate threshold: {check.normalized_threshold ?? 'unknown'} {check.normalized_unit ?? ''}. Measurement definition: {check.rule.measurement_definition ?? 'unresolved'}.</p>}
          <p>{check.rule.source.currentness_limitations.join(' ')}</p><p>Rule {check.rule.logical_id}; revision {check.rule.revision_id}; source revision {check.rule.source.source_revision ?? 'unresolved'}.</p>
        </details>
      </li>)}</ol>
      {result.limitations.length > 0 && <details><summary>All scope and source limitations</summary><ul>{result.limitations.map((item, index) => <li key={index}>{readable(item)}</li>)}</ul></details>}
    </>}
  </section>
}
