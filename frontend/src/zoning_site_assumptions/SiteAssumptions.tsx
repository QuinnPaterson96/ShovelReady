import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Case } from '../occupied_lots/contract'
import { MeasurementInput } from '../MeasurementInput'
import { StepInfo } from '../StepInfo'
import { assumptionsKey, initialAssumptions, suiteCountFact, inferBoundaryRoles, suggestedBoundaryRoles, withPlacementRevision, type EdgeRole, type SiteAssumptions, type UserMeasurement } from './model'

type Props = { onWaterfrontChange?: (value: boolean | null) => void; waterfrontMarks?: string[]; onBoundaryDismiss?: () => void; edgeDistances?: Record<string, number>; streetAdjacency?: import('./model').StreetAdjacency; markingRole?: EdgeRole | null; onMarkingRoleChange?: (role: EdgeRole) => void; boundaryMark?: { id: string; role: EdgeRole } | null; sharedMode?: import('./model').BoundaryMapMode; selectedBoundary?: string | null; onBoundarySelect?: (id: string) => void; homeownerDefaults?: boolean; site: Case; geometryRevision: string; placementRevision: string; frontEdge?: string | null; rearEdge?: string | null; streetPattern?: 'unknown' | 'single' | 'corner_or_multiple'; onChange: (value: SiteAssumptions | null) => void }
const roleNames: Record<EdgeRole, string> = { unknown: 'Unknown', front: 'Front', rear: 'Rear', side: 'Side', flanking_street: 'Flanking street' }
function AnswerChoices({ id, label, value, onChange }: { id: string; label: string; value: 'yes' | 'no' | 'maybe'; onChange: (value: 'yes' | 'no' | 'maybe') => void }) {
  return <div className="zsa__answer" id={id} tabIndex={-1} role="group" aria-label={label}><strong>{label}</strong><div className="zsa__answer-buttons">{(['yes', 'no', 'maybe'] as const).map(choice => <button type="button" key={choice} aria-pressed={value === choice} onClick={() => onChange(choice)}>{choice === 'maybe' ? 'Not sure' : choice === 'yes' ? 'Yes' : 'No'}</button>)}</div></div>
}

function measure(raw: string, basis: UserMeasurement['basis'], placementRevision: string): UserMeasurement | null {
  if (!raw.trim()) return null
  const number = Number(raw)
  return Number.isFinite(number) && number >= 0 ? { value: number, unit: basis === 'regulatory_floor_area' || basis === 'rough_floor_area_estimate' ? 'm2' : 'm', basis, origin: 'user', note: null, placement_revision: placementRevision } : null
}

function Editor({ onWaterfrontChange, waterfrontMarks, onBoundaryDismiss, edgeDistances, streetAdjacency, site, geometryRevision, placementRevision, frontEdge = null, rearEdge = null, streetPattern = 'unknown', markingRole, onMarkingRoleChange, boundaryMark, sharedMode, selectedBoundary, onBoundarySelect, homeownerDefaults = false, onChange }: Props) {
  useEffect(() => { void import('./site-assumptions.css') }, [])
  const notify = useRef(onChange)
  notify.current = onChange
  const [value, setValue] = useState(() => initialAssumptions(site, geometryRevision, placementRevision, homeownerDefaults))
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)
  const [distanceDraft, setDistanceDraft] = useState<Record<string, string>>({})
  const [separationDraft, setSeparationDraft] = useState('')
  const [areaDraft, setAreaDraft] = useState('')
  const [manualBasis, setManualBasis] = useState(false)
  const [areaBasis, setAreaBasis] = useState<'rough_floor_area_estimate' | 'regulatory_floor_area'>('rough_floor_area_estimate')
  const [floorHelpOpen, setFloorHelpOpen] = useState(false)
  const floorHelpId = useId()

  const inference = useMemo(() => streetAdjacency ? inferBoundaryRoles(value.edges, streetAdjacency) : { roles: suggestedBoundaryRoles(value.edges, frontEdge, rearEdge, streetPattern), conflicts: [], basis: 'user_marks' as const }, [value.edges, streetAdjacency, streetPattern, frontEdge, rearEdge])
  useEffect(() => { if (placementRevision === value.placement_revision) notify.current({ ...value, boundary_role_suggestions: inference }) }, [value, placementRevision, inference])
  useEffect(() => {
    if (placementRevision !== value.placement_revision) {
      notify.current(null)
      setValue(previous => withPlacementRevision(previous, placementRevision))
      setDistanceDraft({}); setSeparationDraft(''); setAreaDraft(''); setAreaBasis('rough_floor_area_estimate')
    }
  }, [placementRevision, value.placement_revision])

  useEffect(() => {
    if (boundaryMark) setValue(previous => ({ ...previous, edges: previous.edges.map(edge => edge.id === boundaryMark.id ? { ...edge, role: { value: boundaryMark.role, origin: 'user', note: null } } : edge) }))
  }, [boundaryMark])

  useEffect(() => {
    if (streetAdjacency) setValue(previous => ({ ...previous, street_adjacency: streetAdjacency }))
  }, [streetAdjacency])

  useEffect(() => { if (waterfrontMarks) setValue(previous => JSON.stringify(previous.waterfront_edge_ids) === JSON.stringify(waterfrontMarks) ? previous : ({ ...previous, waterfront_edge_ids: waterfrontMarks })) }, [waterfrontMarks])

  const activeEdge = sharedMode !== undefined ? selectedBoundary : selectedEdge
  const suggested = inference.roles
  const edgeLabel = (edge: SiteAssumptions['edges'][number]) => edge.ring ? `Inner ring ${edge.ring}, edge ${edge.segment + 1}` : `Edge ${edge.segment + 1}`
  const setRole = (id: string, role: EdgeRole) => setValue(previous => ({ ...previous, edges: previous.edges.map(edge => edge.id === id ? { ...edge, role: { value: role, origin: 'user', note: null } } : edge) }))
  const setFact = <K extends 'building_type' | 'existing_garden_suites' | 'principal_building_id' | 'waterfront'>(key: K, raw: SiteAssumptions[K]['value']) =>
    setValue(previous => ({ ...previous, [key]: key === 'existing_garden_suites' ? suiteCountFact(raw as 0 | 1 | 'two_or_more' | null) : { value: raw, origin: 'user', evidence_state: raw === null ? 'unknown' : 'user_confirmed', note: raw === null ? null : 'Your selected answer; not independently verified.' }, ...(key === 'principal_building_id' ? { infer_principal_building: false } : {}) }))
  const setBoundaryDistance = (edgeId: string, raw: string) => {
    setDistanceDraft(previous => ({ ...previous, [edgeId]: raw }))
    setValue(previous => {
      const boundary = { ...previous.measurements.boundary }
      const parsed = measure(raw, 'proposed_wall_to_lot_line', placementRevision)
      if (parsed) boundary[edgeId] = parsed
      else delete boundary[edgeId]
      return { ...previous, measurements: { ...previous.measurements, boundary } }
    })
  }
  const setSpecialMeasurement = (kind: 'principal_separation' | 'floor_area', raw: string) => {
    if (kind === 'principal_separation') setSeparationDraft(raw); else setAreaDraft(raw)
    const basis = kind === 'principal_separation' ? 'principal_wall_to_proposed_wall' : areaBasis
    setValue(previous => ({ ...previous, measurements: { ...previous.measurements, [kind]: measure(raw, basis, placementRevision) } }))
  }
  const changeAreaBasis = (basis: typeof areaBasis) => {
    setAreaBasis(basis)
    setValue(previous => ({ ...previous, measurements: { ...previous.measurements,
      floor_area: measure(areaDraft, basis, placementRevision) } }))
  }

  return <section className={`zsa${sharedMode === 'rear' ? ' zsa--marking' : ''}`} aria-label="Property assumptions">
    {sharedMode === undefined && <h3>Property details for a preliminary check</h3>}
    <p hidden={sharedMode !== undefined}>These are your assumptions. Unknown is fine. The captured parcel and rooflines have not been checked against legal survey or building walls.</p>
    <details><summary>Source and geometry details</summary><p>{value.property.source.provider} · {value.property.source.record_label} · captured {value.property.source.capture_date ?? 'date unknown'} · {value.property.source.review_status}. Geometry revision: {geometryRevision}. Rooflines are mapped outlines, not walls.</p></details>
    <details><summary>Property facts · {value.existing_garden_suites.value === null ? 'existing suite count unknown' : value.existing_garden_suites.evidence_state === 'user_confirmed' ? 'suite count user-confirmed' : value.existing_garden_suites.value === 0 ? 'assuming none already exist' : 'assuming one or more existing'}</summary><fieldset><legend>Existing property</legend>
      <AnswerChoices id="building-type" label="Is the main home single-family (detached)?" value={value.building_type.value === null ? 'maybe' : value.building_type.value === 'single_detached' ? 'yes' : 'no'} onChange={answer => setFact('building_type', answer === 'maybe' ? null : answer === 'yes' ? 'single_detached' : value.building_type.value === 'duplex' ? 'duplex' : 'other')} />
      {value.building_type.value !== null && value.building_type.value !== 'single_detached' && <label>Other main home type <select value={value.building_type.value} onChange={event => setFact('building_type', event.target.value as 'duplex' | 'other')}><option value="duplex">Duplex</option><option value="other">Other</option></select></label>}
      <p className="zsa__hint">Your answer applies immediately and can be changed. A mapped roofline does not establish home type.</p>
      <div className="zsa__answer" id="existing-suites" tabIndex={-1} role="group" aria-label="Existing garden suites"><strong>Existing garden suites</strong><div className="zsa__answer-buttons">{([{ value: 0, label: 'None' }, { value: 1, label: 'One' }, { value: 'two_or_more', label: 'Two or more' }, { value: null, label: 'Not sure' }] as const).map(choice => <button type="button" key={choice.label} aria-pressed={value.existing_garden_suites.value === choice.value} onClick={() => setFact('existing_garden_suites', choice.value)}>{choice.label}</button>)}</div></div>
      <p role="status">{value.existing_garden_suites.value === null ? 'Existing count unknown' : value.existing_garden_suites.evidence_state === 'user_confirmed' ? 'Count user-confirmed · not independently verified' : value.existing_garden_suites.value === 0 ? 'Assuming none already exist' : 'Assuming one or more already exist'}</p>
      <div className="zsa__answer" id="principal-building" tabIndex={-1} role="group" aria-label="Main building on map"><strong>Main building on map</strong><div className="zsa__answer-buttons">{value.observed_buildings.map((building, index) => <button key={building.id} type="button" aria-pressed={value.principal_building_id.value === building.id} onClick={() => setFact('principal_building_id', building.id)}>Outline {index + 1} ({building.basis})</button>)}<button type="button" aria-pressed={value.principal_building_id.value === null} onClick={() => setFact('principal_building_id', null)}>Not sure</button></div></div>
      <p role="status">{value.principal_building_id.origin === 'journey_default' ? 'Main building · assumed from the unique largest usable outline. Change the selection or choose Not sure.' : value.principal_building_id.value ? 'Main building · your selection, not independently verified.' : 'Main building unknown.'}</p>
      <AnswerChoices id="waterfront-lot" label="Does the property adjoin water?" value={value.waterfront.value === null ? 'maybe' : value.waterfront.value ? 'yes' : 'no'} onChange={answer => { const next = answer === 'maybe' ? null : answer === 'yes'; setFact('waterfront', next); onWaterfrontChange?.(next) }} />
      <p role="status">{value.waterfront.origin === 'journey_default' ? 'Assuming not waterfront · Likely fine' : value.waterfront.value === null ? 'Waterfront status unknown' : value.waterfront.value ? 'Your answer: waterfront' : 'Your answer: not waterfront'}</p>
      <div className="step-action"><p className="zsa__hint">If it adjoins water, choose Yes and mark those edges.</p><StepInfo symbol="?" label="Waterfront assumption">The default No is an editable planning assumption. Choosing an answer confirms your observation, not legal waterfront status. Waterfront front-line classification and special rules need a reviewed property plan.</StepInfo></div>
      <p className="zsa__hint">Selecting a mapped roofline identifies a possible main building; it does not turn that roofline into wall geometry.</p>
    </fieldset>
    </details>
    <fieldset className="zsa__boundaries" hidden={sharedMode !== undefined && sharedMode !== 'rear'}><legend>Parcel edge roles</legend>
      <p hidden={sharedMode !== undefined}>Choose each edge’s role only if you know it. Street access and legal lot lines can change the answer, especially at corners and through lots.</p>
      {Object.keys(suggested).length > 0 && <p role="status">Roles suggested from your street/front/rear marks. Review or override below.</p>}
      {inference.conflicts.map(message => <p role="status" key={message}>{message}</p>)}
      {value.edges.length === 0 && <p role="status">This parcel outline cannot be divided into supported edges. Record roles as unknown and use a reviewed plan.</p>}
      {value.edges.some(edge => edge.ring > 0) && <p role="status">This outline has inner rings. Their roles need manual review.</p>}
      {sharedMode !== undefined && <div id="boundary-roles" tabIndex={-1} role="group" aria-label="Mark a boundary">
        <strong>Mark an edge as</strong>
        <div className="zsa__mark-buttons">{(['side', 'rear', 'front', 'flanking_street'] as const).map(role => <button key={role} type="button" aria-label={`Mark ${role === 'flanking_street' ? 'flanking' : role}`} aria-pressed={markingRole === role} onClick={() => onMarkingRoleChange?.(role)}>{role === 'flanking_street' ? 'Flanking' : roleNames[role]}</button>)}</div>
        <p role="status">{markingRole ? `Click an edge on the map to mark it ${markingRole === 'flanking_street' ? 'flanking' : markingRole}.` : 'Choose a mark, then click an edge on the map.'}</p>
        <details><summary>Mark with keyboard</summary><label>Edge to mark <select aria-label="Edge to mark" value={activeEdge ?? ''} onChange={event => onBoundarySelect?.(event.target.value)}><option value="">Choose an edge</option>{value.edges.map(edge => <option key={edge.id} value={edge.id}>{edgeLabel(edge)} · {roleNames[edge.role.value ?? 'unknown']}</option>)}</select></label>
        <button type="button" disabled={!markingRole || !activeEdge} onClick={() => { if (activeEdge) onBoundarySelect?.(activeEdge) }}>Mark selected edge</button></details>
      </div>}
      <div id="boundary-offsets" tabIndex={-1} className="zsa__offset-grid" role="group" aria-label="Boundary planning buffers in metres">
        <strong>Planning buffers (m)</strong><p>Subtracts 1 m from captured gaps for conservative planning. Select an edge to enter a measured override.</p>
        {value.edges.map(edge => <label key={edge.id}><span>{edgeLabel(edge)} · {roleNames[edge.role.value && edge.role.value !== 'unknown' ? edge.role.value : suggested[edge.id] ?? 'unknown']}{suggested[edge.id] ? ' (suggested)' : ''}<small>{value.measurements.boundary[edge.id] ? `Measured override: ${value.measurements.boundary[edge.id].value.toFixed(2)} m · buffer not applied` : edgeDistances?.[edge.id] !== undefined ? <>Captured ≈ {edgeDistances[edge.id].toFixed(2)} m<br />Planning ≈ {Math.max(0, edgeDistances[edge.id] - (value.planning_buffers_m?.[edge.id] ?? 0)).toFixed(2)} m</> : 'Distance unavailable · review placement'}</small></span><MeasurementInput dimension="length" type="number" min="0" step="any" aria-label={`${edgeLabel(edge)} planning buffer in metres`} value={String(value.planning_buffers_m?.[edge.id] ?? 0)} onChange={event => { const raw = event.target.value; if (raw.trim() && Number.isFinite(Number(raw)) && Number(raw) >= 0) setValue(previous => ({ ...previous, planning_buffers_m: { ...previous.planning_buffers_m, [edge.id]: Number(raw) } })) }} /></label>)}
      </div>
      <div className="zsa__edge-list">{value.edges.map(edge => <div key={edge.id} hidden={sharedMode !== undefined && activeEdge !== edge.id} className={activeEdge === edge.id ? 'zsa__edge-row zsa__edge-row--selected' : 'zsa__edge-row'}>
        {sharedMode === undefined ? <button type="button" onClick={() => setSelectedEdge(edge.id)} aria-pressed={activeEdge === edge.id}>{edge.ring === 0 ? edgeLabel(edge) : `Inner ring ${edge.ring}, edge ${edge.segment + 1}`}</button> : <div className="zsa__edge-heading"><strong>{edgeLabel(edge)}</strong><button type="button" aria-label="Close edge details" onClick={() => { onBoundaryDismiss?.(); setSelectedEdge(null) }}>× Close</button></div>}
        {sharedMode === undefined && <label>Role <select id={activeEdge ? edge.id === activeEdge ? 'boundary-roles' : undefined : edge === value.edges[0] ? 'boundary-roles' : undefined} aria-label={`${edgeLabel(edge)} role`} value={edge.role.value ?? 'unknown'} onChange={event => setRole(edge.id, event.target.value as EdgeRole)}>{Object.entries(roleNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
        {sharedMode !== undefined && <><span role="status">{edgeLabel(edge)} · {roleNames[edge.role.value ?? 'unknown']} · your assumption</span><button type="button" onClick={() => setRole(edge.id, 'unknown')}>Clear this mark</button></>}
        {suggested[edge.id] && <><span>Suggested: {roleNames[suggested[edge.id]]} · from your marks</span><button type="button" onClick={() => setRole(edge.id, suggested[edge.id])}>Use suggested {roleNames[suggested[edge.id]].toLowerCase()}</button></>}
        <details><summary>Use my measurement</summary><label>Wall to legal lot line (m), if measured <MeasurementInput dimension="length" type="number" min="0" step="any" aria-label={`${edgeLabel(edge)} wall to lot line in metres`} value={distanceDraft[edge.id] ?? ''} onChange={event => setBoundaryDistance(edge.id, event.target.value)} placeholder="Unknown" /></label><p>Your wall-based value replaces this edge’s approximate comparison only. It is unverified and stays distinct from the captured edge-to-nominal-rectangle distance.</p>{distanceDraft[edge.id] && !value.measurements.boundary[edge.id] && <span className="zsa__error">Enter a nonnegative number or leave blank.</span>}</details>
      </div>)}</div>
      <details><summary>How should I identify edges?</summary><p>Use a survey or reliable property plan and identify street edges first. A long edge is not automatically the front. If a corner, through lot, triangle, easement or unusual boundary makes the roles unclear, leave them unknown for review.</p></details>
    </fieldset>
    <details><summary>Detailed measurements</summary><fieldset><legend>Measurements you can supply</legend>
      <label className="zsa__check"><input id="separation-measurement-choice" type="checkbox" checked={manualBasis} onChange={event => { setManualBasis(event.target.checked); if (!event.target.checked) { setSeparationDraft(''); setValue(previous => ({ ...previous, measurements: { ...previous.measurements, principal_separation: null } })) } }} /> I have a wall-to-wall separation measurement</label>
      {manualBasis && <><label>Wall to wall separation (m) <input inputMode="decimal" value={separationDraft} onChange={event => setSpecialMeasurement('principal_separation', event.target.value)} placeholder="Unknown" /></label><p className="zsa__hint">Roofline gaps are not surveyed wall-to-wall separation. The candidate clause's endpoints still need source review.</p></>}
      <div className="zsa__field-label"><label htmlFor="zsa-floor-area">Floor area (m²)</label><button type="button" className="zsa__info" aria-label="About City of Victoria floor area measurement" aria-expanded={floorHelpOpen} aria-controls={floorHelpId} onClick={() => setFloorHelpOpen(open => !open)}>i</button></div>
      <p className="zsa__hint">Interior area; Model 300's advertised footprint is a different quantity. Choose the basis below if you enter a number.</p>
      <MeasurementInput id="zsa-floor-area" dimension="area" type="number" min="0" step="any" value={areaDraft} onChange={event => setSpecialMeasurement('floor_area', event.target.value)} placeholder="Unknown" />
      <div id={floorHelpId} hidden={!floorHelpOpen} className="zsa__help"><p><strong>Candidate City of Victoria Zoning Bylaw 2018, Part 2.1 “Floor Area” (PDF p16), rule revision candidate-2026-10-05-1.</strong> Measured to interior surfaces of exterior walls, with specified inclusions and exclusions across applicable levels. The source has conflicting consolidation labels and site applicability is unresolved. This is not a universal definition; if the applicable jurisdiction or rule differs, leave the regulatory basis unknown.</p><p>Published Model 300 nominal footprint and advertised 300 ft² are not regulatory floor area. A rough estimate is retained as an estimate but does not satisfy the candidate area check. <a href="https://www.victoria.ca/media/file/zoning-bylaw-2018" target="_blank" rel="noreferrer">Candidate City source</a>.</p></div>
      {areaDraft.trim() && <fieldset className="zsa__area-basis"><legend>What is this number based on?</legend><label><input type="radio" name="zsa-area-basis" checked={areaBasis === 'rough_floor_area_estimate'} onChange={() => changeAreaBasis('rough_floor_area_estimate')} /> Rough interior estimate · not used for candidate area check</label><label><input type="radio" name="zsa-area-basis" checked={areaBasis === 'regulatory_floor_area'} onChange={() => changeAreaBasis('regulatory_floor_area')} /> Measured to the candidate Victoria definition above · unverified</label></fieldset>}
      {((separationDraft && !value.measurements.principal_separation) || (areaDraft && !value.measurements.floor_area)) && <p className="zsa__error">Measurements must be nonnegative numbers; invalid entries remain unknown.</p>}
    </fieldset>
    </details>
    <p hidden={sharedMode !== undefined} className="zsa__hint">Changing the property, geometry or placement requires fresh measurements. No zoning result is produced here.</p>
  </section>
}

/** Mount by property and geometry identity; a changed placement clears its measurements. */
export function SiteAssumptionsEditor(props: Props) {
  const propertyKey = assumptionsKey(props.site, props.geometryRevision, '')
  return <Editor key={propertyKey} {...props} />
}
