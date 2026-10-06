import { useEffect, useRef, useState } from 'react'
import type { Case } from '../occupied_lots/contract'
import { MeasurementInput } from '../MeasurementInput'
import { assumptionsKey, initialAssumptions, suggestedBoundaryRoles, withPlacementRevision, type EdgeRole, type SiteAssumptions, type UserMeasurement } from './model'

type Props = { site: Case; geometryRevision: string; placementRevision: string; frontEdge?: string | null; rearEdge?: string | null; streetPattern?: 'unknown' | 'single' | 'corner_or_multiple'; onChange: (value: SiteAssumptions | null) => void }
const roleNames: Record<EdgeRole, string> = { unknown: 'Unknown', front: 'Front', rear: 'Rear', side: 'Side', flanking_street: 'Flanking street' }

function measure(raw: string, basis: UserMeasurement['basis'], placementRevision: string): UserMeasurement | null {
  if (!raw.trim()) return null
  const number = Number(raw)
  return Number.isFinite(number) && number >= 0 ? { value: number, unit: basis === 'regulatory_floor_area' ? 'm2' : 'm', basis, origin: 'user', note: null, placement_revision: placementRevision } : null
}

function Editor({ site, geometryRevision, placementRevision, frontEdge = null, rearEdge = null, streetPattern = 'unknown', onChange }: Props) {
  useEffect(() => { void import('./site-assumptions.css') }, [])
  const notify = useRef(onChange)
  notify.current = onChange
  const [value, setValue] = useState(() => initialAssumptions(site, geometryRevision, placementRevision))
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)
  const [distanceDraft, setDistanceDraft] = useState<Record<string, string>>({})
  const [separationDraft, setSeparationDraft] = useState('')
  const [areaDraft, setAreaDraft] = useState('')
  const [manualBasis, setManualBasis] = useState(false)

  useEffect(() => { if (placementRevision === value.placement_revision) notify.current(value) }, [value, placementRevision])
  useEffect(() => {
    if (placementRevision !== value.placement_revision) {
      notify.current(null)
      setValue(previous => withPlacementRevision(previous, placementRevision))
      setDistanceDraft({}); setSeparationDraft(''); setAreaDraft('')
    }
  }, [placementRevision, value.placement_revision])

  const suggested = suggestedBoundaryRoles(value.edges, frontEdge, rearEdge, streetPattern)
  const edgeLabel = (edge: SiteAssumptions['edges'][number]) => `Edge ${edge.segment + 1}`
  const setRole = (id: string, role: EdgeRole) => setValue(previous => ({ ...previous, edges: previous.edges.map(edge => edge.id === id ? { ...edge, role: { value: role, origin: 'user', note: null } } : edge) }))
  const setFact = <K extends 'building_type' | 'existing_garden_suites' | 'principal_building_id' | 'waterfront'>(key: K, raw: SiteAssumptions[K]['value']) =>
    setValue(previous => ({ ...previous, [key]: { value: raw, origin: 'user', note: null } }))
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
    const basis = kind === 'principal_separation' ? 'principal_wall_to_proposed_wall' : 'regulatory_floor_area'
    setValue(previous => ({ ...previous, measurements: { ...previous.measurements, [kind]: measure(raw, basis, placementRevision) } }))
  }

  return <section className="zsa" aria-label="Property assumptions">
    <h3>Property details for a preliminary check</h3>
    <p>These are your assumptions. Unknown is fine. The captured parcel and rooflines have not been checked against legal survey or building walls.</p>
    <details><summary>Source and geometry details</summary><p>{value.property.source.provider} · {value.property.source.record_label} · captured {value.property.source.capture_date ?? 'date unknown'} · {value.property.source.review_status}. Geometry revision: {geometryRevision}. Rooflines are mapped outlines, not walls.</p></details>
    <fieldset><legend>Existing property</legend>
      <label>Existing main building <select value={value.building_type.value ?? ''} onChange={event => setFact('building_type', event.target.value === '' ? null : event.target.value as 'single_detached' | 'duplex' | 'other')}><option value="">Unknown</option><option value="single_detached">Single detached home</option><option value="duplex">Duplex</option><option value="other">Other</option></select></label>
      <label>Existing garden suites <select value={value.existing_garden_suites.value ?? ''} onChange={event => setFact('existing_garden_suites', event.target.value === '' ? null : event.target.value === 'two_or_more' ? 'two_or_more' : Number(event.target.value) as 0 | 1)}><option value="">Unknown</option><option value="0">None known</option><option value="1">One</option><option value="two_or_more">Two or more</option></select></label>
      <label>Main building on map <select value={value.principal_building_id.value ?? ''} onChange={event => setFact('principal_building_id', event.target.value || null)}><option value="">Unknown or not mapped</option>{value.observed_buildings.map((building, index) => <option key={building.id} value={building.id}>Outline {index + 1} ({building.basis})</option>)}</select></label>
      <label>Waterfront lot <select value={value.waterfront.value === null ? '' : String(value.waterfront.value)} onChange={event => setFact('waterfront', event.target.value === '' ? null : event.target.value === 'true')}><option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option></select></label>
      <p className="zsa__hint">Selecting a mapped roofline identifies a possible main building; it does not turn that roofline into wall geometry.</p>
    </fieldset>
    <fieldset><legend>Parcel edge roles</legend>
      <p>Choose each edge’s role only if you know it. Street access and legal lot lines can change the answer, especially at corners and through lots.</p>
      {Object.keys(suggested).length > 0 && <p role="status">For this ordinary four-edge single-street sketch, the selected edge suggests an opposite rear and two sides. These are editable assumptions, not verified legal roles.</p>}
      {value.edges.length === 0 && <p role="status">This parcel outline cannot be divided into supported edges. Record roles as unknown and use a reviewed plan.</p>}
      {value.edges.some(edge => edge.ring > 0) && <p role="status">This outline has inner rings. Their roles need manual review.</p>}
      <div className="zsa__edge-list">{value.edges.map(edge => <div key={edge.id} className={selectedEdge === edge.id ? 'zsa__edge-row zsa__edge-row--selected' : 'zsa__edge-row'}>
        <button type="button" onClick={() => setSelectedEdge(edge.id)} aria-pressed={selectedEdge === edge.id}>{edge.ring === 0 ? edgeLabel(edge) : `Inner ring ${edge.ring}, edge ${edge.segment + 1}`}</button>
        <label>Role <select aria-label={`${edgeLabel(edge)} role`} value={edge.role.value ?? 'unknown'} onChange={event => setRole(edge.id, event.target.value as EdgeRole)}>{Object.entries(roleNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        {suggested[edge.id] && <span>Suggested: {roleNames[suggested[edge.id]]}; choose a role above only if you can support it.</span>}
        <details><summary>Use my measurement</summary><label>Wall to legal lot line (m), if measured <MeasurementInput dimension="length" type="number" min="0" step="any" aria-label={`${edgeLabel(edge)} wall to lot line in metres`} value={distanceDraft[edge.id] ?? ''} onChange={event => setBoundaryDistance(edge.id, event.target.value)} placeholder="Unknown" /></label><p>Your wall-based value replaces this edge’s approximate comparison only. It is unverified and stays distinct from the captured edge-to-nominal-rectangle distance.</p>{distanceDraft[edge.id] && !value.measurements.boundary[edge.id] && <span className="zsa__error">Enter a nonnegative number or leave blank.</span>}</details>
      </div>)}</div>
      <details><summary>How should I identify edges?</summary><p>Use a survey or reliable property plan and identify street edges first. A long edge is not automatically the front. If a corner, through lot, triangle, easement or unusual boundary makes the roles unclear, leave them unknown for review.</p></details>
    </fieldset>
    <fieldset><legend>Measurements you can supply</legend>
      <label className="zsa__check"><input type="checkbox" checked={manualBasis} onChange={event => { setManualBasis(event.target.checked); if (!event.target.checked) { setSeparationDraft(''); setAreaDraft(''); setValue(previous => ({ ...previous, measurements: { ...previous.measurements, principal_separation: null, floor_area: null } })) } }} /> I have measurements based on building walls or the applicable floor-area definition</label>
      {manualBasis && <><label>Wall to wall separation (m) <input inputMode="decimal" value={separationDraft} onChange={event => setSpecialMeasurement('principal_separation', event.target.value)} placeholder="Unknown" /></label><label>Victoria floor area (m²) <input inputMode="decimal" value={areaDraft} onChange={event => setSpecialMeasurement('floor_area', event.target.value)} placeholder="Unknown" /></label><p className="zsa__hint">Enter measured wall separation and area only when you know the applicable definition. Roofline gaps and nominal product footprint do not supply these values. See the Victoria floor-area definition in the pathway section above.</p></>}
      {((separationDraft && !value.measurements.principal_separation) || (areaDraft && !value.measurements.floor_area)) && <p className="zsa__error">Measurements must be nonnegative numbers; invalid entries remain unknown.</p>}
    </fieldset>
    <p className="zsa__hint">Changing the property, geometry or placement requires fresh measurements. No zoning result is produced here.</p>
  </section>
}

/** Mount by property and geometry identity; a changed placement clears its measurements. */
export function SiteAssumptionsEditor(props: Props) {
  const propertyKey = assumptionsKey(props.site, props.geometryRevision, '')
  return <Editor key={propertyKey} {...props} />
}
