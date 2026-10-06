import { useEffect, type ReactNode } from 'react'
import { screeningCheckTitle, type ScreeningCheck, type ScreeningResult, type ScreeningStatus } from './model'
import { measurementWithUnit } from '../measurements'

const names: Record<string, string> = { proposed_suite_total: 'garden suite count', floor_area: 'floor area', principal_separation: 'main building separation', flanking_presence: 'flanking street presence', legal_lot: 'legal lot', building_type: 'main building type', principal_building: 'main building selection', proposed_use: 'proposed use', foundation: 'foundation attachment', zone: 'zoning', instrument: 'zoning bylaw', waterfront: 'waterfront status', no_relevant_projections: 'projection treatment', floor_area_definition_acknowledged: 'Victoria floor area basis' }
const readable = (value: string) => value.replace(/(?:boundary|edge_role):[^\s,;]+/g, 'classified parcel edge').replace(/(?:[a-z]+_)+[a-z]+/g, match => names[match] ?? match.replace(/_/g, ' '))
const status: Record<ScreeningStatus, { icon: string; label: string }> = {
  meets_under_assumptions: { icon: '✓', label: 'Meets this check' },
  apparent_conflict_under_assumptions: { icon: '✕', label: 'Apparent conflict' },
  needs_information: { icon: '?', label: 'Unknown / clarification needed' },
  not_applicable: { icon: '—', label: 'Not applicable' },
  unsupported: { icon: '—', label: 'Outside supported scope' },
}
const formattedQuantity = (raw: string | number, unit: string | null) => {
  if (unit === 'm') return measurementWithUnit(raw, 'length')
  if (unit === 'm2') return measurementWithUnit(raw, 'area')
  return `${raw} ${unit ?? ''}`.trim()
}

// This inventory belongs to the named, bounded server packet. It is deliberately
// status-only: no omitted threshold or legal conclusion is inferred from prose.
const packetOutstanding: Record<string, { title: string; next: string }[]> = {
  'victoria-zb2018-grd1-ordinary-garden-suite-scouting@candidate-2026-10-05-1': [
    { title: 'Front setback', next: 'A reviewed front lot line, building wall basis and applicable front setback rule are needed.' },
    { title: 'Rear-yard location', next: 'Registered lot lines and a reviewed rear-yard polygon are needed.' },
    { title: 'Rear-yard occupancy', next: 'The legal rear-yard area and projection treatment are needed.' },
    { title: 'Height', next: 'Installed design height, average grade and a reviewed height rule are needed.' },
    { title: 'Other applicable provisions', next: 'A complete site-specific bylaw review is still needed.' },
  ],
}

export function Evidence({ check }: { check: ScreeningCheck }) {
  const source = check.rule.source
  return <div className="cs-evidence">
    {check.reasons.length > 0 && <p><strong>Why:</strong> {check.reasons.map(readable).join(' ')}</p>}
    <p><strong>Measurement basis:</strong> {check.rule.measurement_definition ?? 'No measured definition supplied for this check.'} Map-derived clearances are approximate; regulatory wall and lot-line bases require confirmation.</p>
    <p className="cs-source">{source.provider} · {source.record_label} · {source.locator} · captured {source.capture_date ?? 'date unknown'} · review status: {source.review_status}. <a href={source.url} target="_blank" rel="noreferrer">Read source</a></p>
    <details><summary>Exact evidence and technical identifiers</summary>
      <p>Exact supplied value: {check.normalized_observed ?? 'unknown'} {check.normalized_unit ?? ''}. Exact candidate threshold: {check.normalized_threshold ?? 'unknown'} {check.normalized_unit ?? ''}.</p>
      <p>Rule: {check.rule.logical_id}. Rule revision: {check.rule.revision_id}. Source revision: {source.source_revision ?? 'unresolved'}.</p>
      {source.currentness_limitations.map((item, index) => <p key={index}>{item}</p>)}
      <pre>{JSON.stringify({ rule: check.rule, fact: check.fact ?? null }, null, 2)}</pre>
    </details>
  </div>
}

function CheckRow({ check, assumed = false }: { check: ScreeningCheck; assumed?: boolean }) {
  const outcome = status[check.status]
  const observed = check.normalized_observed
  const threshold = check.normalized_threshold
  const compared = observed !== null && threshold !== null
  const nearThreshold = compared && Number(observed) !== Number(threshold) && formattedQuantity(observed, check.normalized_unit) === formattedQuantity(threshold, check.normalized_unit)
  return <li className={`cs-check cs-check--${assumed ? 'assumed' : check.status}`}>
    <details>
      <summary><span className="cs-check-main"><span className="cs-status"><span className="cs-icon" aria-hidden="true">{assumed ? '?' : outcome.icon}</span><span>{assumed ? (check.status === 'meets_under_assumptions' ? 'Assumed for scenario' : outcome.label) : outcome.label}</span></span><strong>{screeningCheckTitle(check)}</strong>{compared && <span className="cs-measurement">Supplied {formattedQuantity(observed, check.normalized_unit)} · candidate threshold {formattedQuantity(threshold, check.normalized_unit)}{nearThreshold && ' · exact values differ'}</span>}</span></summary>
      <Evidence check={check} />
    </details>
  </li>
}

export function ConditionalScreen({ result, busy, error, compact = false, boundaryEvidence, onRetry }: { result: ScreeningResult | null; busy: boolean; error: string; compact?: boolean; boundaryEvidence?: ReactNode; onRetry?: () => void }) {
  useEffect(() => { void import('./conditional-screen.css') }, [])
  const assumed = result?.checks.filter(check => check.rule.kind === 'prerequisite') ?? []
  const groupedBoundary = (check: ScreeningCheck) => !!boundaryEvidence && (check.rule.fact_id.startsWith('boundary:') || check.rule.fact_id.startsWith('edge_role:'))
  const evaluated = result?.checks.filter(check => check.rule.kind !== 'prerequisite' && !groupedBoundary(check)) ?? []
  const packetId = result?.request.packet_id
  const packetRevision = result?.request.packet_revision
  const outstanding = typeof packetId === 'string' && typeof packetRevision === 'string' ? packetOutstanding[`${packetId}@${packetRevision}`] : undefined
  const source = result?.checks[0]?.rule.source
  return <section className="cs-results" aria-label="Conditional zoning checklist">
    <h3>{boundaryEvidence ? 'Current placement checklist' : 'Legal-basis candidate checklist'}</h3>
    <p className="cs-note">{boundaryEvidence ? 'Each boundary row separates approximate scenario evidence from your optional wall/legal-line entries. Derived roles are never copied into legal facts. Candidate checks cover this placement only; source review and omitted rules remain unresolved.' : 'This checklist uses only your explicit property and wall/legal-line entries for regulatory comparisons. Derived roles and approximate map distances are separate scenario evidence, never legal facts.'}</p>
    {busy && <p role="status">Checking the current assumptions and placement…</p>}
    {error && <p role="status">{error} Geometry measurements remain available above. {onRetry && <button type="button" onClick={onRetry}>Retry candidate checks</button>}</p>}
    {boundaryEvidence}
    {!result && !busy && !error && <p>Candidate checks await a current placement. Optional property and pathway assumptions can be entered below; unknown facts remain open.</p>}
    {result && <>
      <p className="cs-note">City of Victoria candidate packet · supplied placement only · agent mapped and unreviewed. Each result applies only to its named check under the stated assumptions.</p>
      {source && <p className="cs-source">Source: {source.provider} · {source.record_label} · captured {source.capture_date ?? 'date unknown'} · review status: {source.review_status}. <a href={source.url} target="_blank" rel="noreferrer">Read source</a></p>}
      {compact && <p><strong>{evaluated.filter(check => check.status === 'meets_under_assumptions').length} candidate checks meet supplied assumptions; {evaluated.filter(check => check.status === 'apparent_conflict_under_assumptions').length} apparent conflicts; {evaluated.filter(check => check.status === 'needs_information' || check.status === 'unsupported').length} unknown or unsupported.</strong> These counts apply only to the named checks, not the full rule set.</p>}
      {compact && <div className="cs-outstanding"><strong>Known missing coverage:</strong> {outstanding ? outstanding.map(item => item.title).join(' · ') : 'Full applicable rule inventory still needs review'}.</div>}
      <details className="cs-compact-details" open={!compact}><summary>Inspect candidate checks and exact evidence</summary>
      <h4>{boundaryEvidence ? 'Other candidate checks' : 'Compared checks'}</h4><ol className="cs-checks">{evaluated.map((check, index) => <CheckRow key={`${check.rule.logical_id}-${index}`} check={check} />)}</ol>
      <h4>Scenario assumptions</h4><p className="cs-note">These are supplied choices, not independent confirmation of zoning or the legal lot.</p>
      <ol className="cs-checks">{assumed.map((check, index) => <CheckRow key={`${check.rule.logical_id}-${index}`} check={check} assumed />)}</ol>
      <h4>Still unresolved</h4>
      {outstanding ? <ul className="cs-checks">{outstanding.map(item => <li key={item.title} className="cs-check cs-check--needs_information"><details><summary><span className="cs-check-main"><span className="cs-status"><span className="cs-icon" aria-hidden="true">?</span>Unknown / clarification needed</span><strong>{item.title}</strong></span></summary><div className="cs-evidence"><p>{item.next}</p><p>No evaluated rule or candidate threshold is included for this topic in this packet.</p></div></details></li>)}</ul> : <p>The packet does not provide structured coverage for omitted topics; confirm the full applicable rule set before relying on these comparisons.</p>}
      {result.outstanding_prerequisites.length > 0 && <div className="cs-outstanding"><strong>Additional clarification:</strong><ul>{result.outstanding_prerequisites.map((item, index) => <li key={index}>{readable(item)}</li>)}</ul></div>}
      {result.limitations.length > 0 && <details className="cs-limits"><summary>All scope and source limitations</summary><ul>{result.limitations.map((item, index) => <li key={index}>{readable(item)}</li>)}</ul></details>}
      </details>
    </>}
  </section>
}
