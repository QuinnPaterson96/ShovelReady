import { useEffect, useRef, useState } from 'react'
import { buildPlacement, buildSite, metres, type ManualAssessment, type ManualFacts, type ManualSiteOutput, type PlacementDraft, type RectangleDraft } from './model'
import './manual-site.css'

export type ManualSiteInputProps = {
  onChange: (output: ManualSiteOutput) => void
  footprint?: { widthM: number | null; depthM: number | null; label?: string }
}

const emptyFacts: ManualFacts = { address: '', statedAreaM2: '', notes: '' }
const emptyPlacement: PlacementDraft = { x: '', y: '', width: '', depth: '', angle: '0' }
const blankBuilding = (): RectangleDraft => ({ label: '', x: '', y: '', width: '', depth: '' })
const validFootprint = (n: number | null | undefined) => typeof n === 'number' && Number.isFinite(n) && n > 0 ? String(n) : ''

export function ManualSiteInput({ onChange, footprint }: ManualSiteInputProps) {
  const [facts, setFacts] = useState(emptyFacts)
  const [siteWidth, setSiteWidth] = useState('')
  const [siteDepth, setSiteDepth] = useState('')
  const [buildings, setBuildings] = useState<RectangleDraft[]>([])
  const [coverage, setCoverage] = useState<'unknown' | 'partial'>('unknown')
  const [placement, setPlacement] = useState<PlacementDraft>({ ...emptyPlacement, width: validFootprint(footprint?.widthM), depth: validFootprint(footprint?.depthM) })
  const [assessment, setAssessment] = useState<ManualAssessment | null>(null)
  const [error, setError] = useState('')
  const [measuring, setMeasuring] = useState(false)
  const revision = useRef(0)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const site = buildSite(siteWidth, siteDepth, buildings, coverage)
  const placed = buildPlacement(placement)

  function invalidate() { revision.current++; setAssessment(null); setError(''); setMeasuring(false) }
  function editFacts(key: keyof ManualFacts, value: string) { invalidate(); setFacts(old => ({ ...old, [key]: value })) }
  function editPlacement(key: keyof PlacementDraft, value: string) { invalidate(); setPlacement(old => ({ ...old, [key]: value })) }
  function editBuilding(index: number, key: keyof RectangleDraft, value: string) { invalidate(); setBuildings(old => old.map((b, i) => i === index ? { ...b, [key]: value } : b)) }

  useEffect(() => {
    invalidate()
    setPlacement(old => ({ ...old, width: validFootprint(footprint?.widthM), depth: validFootprint(footprint?.depthM) }))
  }, [footprint?.widthM, footprint?.depthM, footprint?.label])

  useEffect(() => { onChangeRef.current({ facts, site, placement: site ? placed : null, assessment }) }, [facts, siteWidth, siteDepth, buildings, coverage, placement, assessment])

  async function measure() {
    if (!site || !placed) return
    invalidate()
    const requestRevision = revision.current
    setMeasuring(true)
    const request = { schema_version: 'scouting-geometry.v1', ...site, placement: placed, requirements: [] }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch('/api/scouting-geometry/assess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: controller.signal })
      if (!response.ok) throw new Error(`Measurement service unavailable (${response.status}).`)
      const result = await response.json() as ManualAssessment
      if (revision.current !== requestRevision) return
      if (result.schema_version !== 'scouting-geometry.v1' || result.conclusion !== 'tested_placement_observations_only' ||
          !Array.isArray(result.checks) || !Array.isArray(result.limitations) ||
          JSON.stringify(result.input) !== JSON.stringify(request)) throw new Error('Measurement response does not match this sketch.')
      setAssessment(result)
    } catch (caught) {
      if (revision.current === requestRevision) setError(controller.signal.aborted ? 'Measurement timed out. Try again.' : caught instanceof Error ? caught.message : 'Measurement failed.')
    } finally { clearTimeout(timer); if (revision.current === requestRevision) setMeasuring(false) }
  }

  const containment = assessment?.checks.find(c => c.id === 'containment')
  const boundary = assessment?.checks.find(c => c.id === 'parcel_boundary')
  const overlaps = assessment?.checks.filter(c => c.kind === 'building_overlap') ?? []
  const unresolved = assessment?.checks.filter(c => c.status === 'invalid' || c.status === 'missing' || c.status === 'unsupported') ?? []
  const width = metres(siteWidth), depth = metres(siteDepth)
  const drawing = width !== null && width > 0 && depth !== null && depth > 0
  const viewWidth = width && width > 0 ? width : 1, viewDepth = depth && depth > 0 ? depth : 1

  return <section className="manual-site" aria-labelledby="manual-site-title">
    <p className="eyebrow">User supplied site</p><h2 id="manual-site-title">Describe or sketch your property</h2>
    <p>Facts can travel with an enquiry even if you cannot draw the lot. Distances require dimensions you enter in metres. This local sketch has no verified address, orientation or survey position.</p>
    <div className="manual-grid">
      <div>
        <h3>1 · Facts you know</h3>
        <label htmlFor="manual-address">Address or site description (optional)</label><input id="manual-address" type="text" value={facts.address} onChange={e => editFacts('address', e.target.value)} />
        <label htmlFor="manual-area">Stated lot area in m² (optional)</label><input id="manual-area" type="number" min="0" step="any" value={facts.statedAreaM2} onChange={e => editFacts('statedAreaM2', e.target.value)} />
        <p className="metadata">An address or area does not produce a parcel outline or locate it on a map.</p>
        <label htmlFor="manual-notes">Site facts or questions (optional)</label><textarea id="manual-notes" rows={3} value={facts.notes} onChange={e => editFacts('notes', e.target.value)} />
        <h3>2 · Approximate parcel rectangle</h3>
        <p className="metadata">Set a local metre frame: lower-left corner is (0, 0); X runs along your width and Y along your depth. These are sketch directions, not compass bearings.</p>
        <div className="manual-fields"><div><label htmlFor="manual-width">Parcel width (m)</label><input id="manual-width" type="number" min="0" step="any" value={siteWidth} onChange={e => { invalidate(); setSiteWidth(e.target.value) }} /></div>
          <div><label htmlFor="manual-depth">Parcel depth (m)</label><input id="manual-depth" type="number" min="0" step="any" value={siteDepth} onChange={e => { invalidate(); setSiteDepth(e.target.value) }} /></div></div>
        {!site && <p role="status">Enter positive width and depth for a measurable rectangle. Your facts remain available without one.</p>}
        <h3>3 · Existing structures you can locate</h3>
        <p className="metadata">Add approximate rectangles using their lower-left X/Y position in the same frame. The outline basis is unknown; no structures entered means obstruction coverage is unknown.</p>
        {buildings.map((b, i) => <fieldset key={i}><legend>Structure {i + 1}</legend><label htmlFor={`manual-building-${i}-label`}>Description</label><input id={`manual-building-${i}-label`} type="text" value={b.label} onChange={e => editBuilding(i, 'label', e.target.value)} />
          <div className="manual-fields">{(['x', 'y', 'width', 'depth'] as const).map(key => <div key={key}><label htmlFor={`manual-building-${i}-${key}`}>{key.toUpperCase()} (m)</label><input id={`manual-building-${i}-${key}`} type="number" step="any" value={b[key]} onChange={e => editBuilding(i, key, e.target.value)} /></div>)}</div>
          <button type="button" onClick={() => { invalidate(); setBuildings(old => old.filter((_, j) => j !== i)) }}>Remove structure</button></fieldset>)}
        <button type="button" onClick={() => { invalidate(); setBuildings(old => [...old, blankBuilding()]) }}>Add existing structure</button>
        <label htmlFor="manual-coverage">Other obstruction coverage</label><select id="manual-coverage" value={coverage} onChange={e => { invalidate(); setCoverage(e.target.value as 'unknown' | 'partial') }}><option value="unknown">Unknown</option><option value="partial">Partial: I have entered some structures</option></select>
      </div>
      <div>
        <h3>4 · Test one placement</h3>
        <p className="metadata">Position is the proposed building rectangle’s centre X/Y in this same local frame. Dimensions are nominal unless separately verified. Editing any field clears the earlier result.</p>
        {footprint?.label && <p className="metadata">Initial footprint: {footprint.label}. Changing model dimensions resets these two fields.</p>}
        <div className="manual-fields">{(['x', 'y', 'width', 'depth', 'angle'] as const).map(key => <div key={key}><label htmlFor={`manual-placement-${key}`}>{key === 'angle' ? 'Rotation (degrees)' : `${key.toUpperCase()} (m)`}</label><input id={`manual-placement-${key}`} type="number" step="any" value={placement[key]} onChange={e => editPlacement(key, e.target.value)} /></div>)}</div>
        {drawing && site && <svg className="manual-drawing" viewBox={`${-viewWidth * .05} ${-viewDepth * .05} ${viewWidth * 1.1} ${viewDepth * 1.1}`} role="img" aria-label="Approximate parcel and user entered structure rectangles; measurements are shown in text below"><rect x="0" y="0" width={viewWidth} height={viewDepth} className="manual-parcel" />{site.buildings.map(b => { const ring = b.shape.geometry.coordinates as number[][][]; const [x, y] = ring[0][0], width = ring[0][1][0] - x, depth = ring[0][2][1] - y; return <rect key={b.id} x={x} y={viewDepth - y - depth} width={width} height={depth} className="manual-building" /> })}{placed && <rect x={placed.centre_xy[0] - placed.width_m / 2} y={viewDepth - placed.centre_xy[1] - placed.depth_m / 2} width={placed.width_m} height={placed.depth_m} transform={`rotate(${-placed.angle_degrees} ${placed.centre_xy[0]} ${viewDepth - placed.centre_xy[1]})`} className="manual-placement" />}</svg>}
        <p className="metadata">Diagram is schematic. Coordinates and measurements, not its screen size, set scale.</p>
        <button type="button" className="manual-measure" disabled={!site || !placed || measuring} onClick={() => void measure()}>{measuring ? 'Measuring…' : 'Measure this placement'}</button>
        {error && <p role="alert">{error}</p>}
        {assessment && <section aria-label="Manual placement measurements"><p className="eyebrow">Measured local sketch only</p><h3>{containment?.relation === 'outside' || overlaps.some(c => c.relation === 'positive_area_overlap') ? 'Conflict at this placement' : 'Placement to investigate'}</h3>
          <p>Parcel containment: {containment?.status === 'observed' ? `${containment.relation}; ${containment.area_m2?.toFixed(2)} m² outside` : 'unresolved'}. Distance to parcel boundary: {boundary?.status === 'observed' ? `${boundary.distance_m?.toFixed(2)} m` : 'unresolved'}.</p>
          <ul>{overlaps.map(c => { const feature = site?.buildings.find(b => c.id === `building:${b.id}:overlap`); return <li key={c.id}>{feature?.source.record_label || c.id}: {c.status === 'observed' ? `${c.relation?.replace(/_/g, ' ')}; ${c.area_m2?.toFixed(2)} m² overlap` : `unresolved (${c.reason})`}</li> })}</ul>
          {site?.capture.limitations.some(l => l.startsWith('Incomplete structure')) && <p>Incomplete structure entries were omitted; parcel measurements remain usable, but those structures were not checked.</p>}
          {unresolved.length > 0 && <p>Unresolved measurements: {unresolved.map(c => c.id).join(', ')}.</p>}
          <p className="notice">Other obstruction coverage is {coverage}. No observed overlap with entered rectangles does not establish clear space. No zoning, legal setback, geolocation or overall site fit was evaluated.</p>
        </section>}
      </div>
    </div>
  </section>
}
