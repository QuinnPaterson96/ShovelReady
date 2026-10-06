import { useEffect, useRef, useState } from 'react'
import { MeasurementInput } from '../MeasurementInput'
import { MeasurementLabel } from '../model_catalogue/MeasurementLabel'
import { measurementWithUnit } from '../measurements'
import { publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { path, points } from '../occupied_lots/contract'
import type { OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import type { Result } from '../occupied_lots/contract'
import { emptyExampleAssumptions, exampleCase, exampleOrientation, exampleObservation, exampleRequest, initialExamplePosition, parseExampleResult } from './example'
import type { ExampleAssumptions, ExamplePosition } from './example'

const source = exampleCase.site.parcel.source
const roofSource = exampleCase.site.buildings[0]?.source
const show = (value: number | null, dimension: 'length' | 'area') => measurementWithUnit(value, dimension)
const directions: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
}

export function ExampleProperty({ onMeasurement }: { onMeasurement: (value: OccupiedMeasurement | null) => void }) {
  const [position, setPosition] = useState(initialExamplePosition)
  const [assumptions, setAssumptions] = useState(emptyExampleAssumptions)
  const [result, setResult] = useState<Result | null>(null)
  const [phase, setPhase] = useState<'measuring' | 'stale' | 'unresolved' | 'current'>('measuring')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [editedDimensions, setEditedDimensions] = useState({ width: false, depth: false })
  const [step, setStep] = useState(1)
  const [rotationFocused, setRotationFocused] = useState(false)
  const version = useRef(0)
  const map = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const suppressClick = useRef(false)
  const request = exampleRequest(position, assumptions)

  function invalidate() {
    version.current += 1
    setResult(null); onMeasurement(null); setBusy(false)
    setPhase('stale')
    setMessage('Placement changed. Measure again for a current result.')
  }

  function edit(key: keyof ExamplePosition, value: string) {
    setPosition(current => ({ ...current, [key]: value }))
    if (key === 'width' || key === 'depth') setEditedDimensions(current => ({ ...current, [key]: true }))
    invalidate()
  }

  function editAssumption(key: keyof ExampleAssumptions, value: string) {
    setAssumptions(current => ({ ...current, [key]: value }))
    invalidate()
  }

  function move(x: number, y: number) {
    setPosition(current => ({ ...current, x: String(x), y: String(y) }))
    invalidate()
  }

  function moveFromPointer(clientX: number, clientY: number) {
    const matrix = map.current?.getScreenCTM()?.inverse()
    if (!matrix) return
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix)
    move(Number(point.x.toFixed(2)), Number((-point.y).toFixed(2)))
  }

  function nudge(dx: number, dy: number) {
    const x = Number(position.x), y = Number(position.y)
    if (!Number.isFinite(x) || !Number.isFinite(y) || !position.x.trim() || !position.y.trim()) return
    move(Number((x + dx * step).toFixed(6)), Number((y + dy * step).toFixed(6)))
  }

  function reset() {
    setPosition(initialExamplePosition())
    setAssumptions(emptyExampleAssumptions())
    setEditedDimensions({ width: false, depth: false })
    invalidate()
    setMessage('Illustrative starting position restored. Measure again for a current result.')
  }

  async function measure(next: ExamplePosition, minima: ExampleAssumptions) {
    const payload = exampleRequest(next, minima)
    if (!payload) { setPhase('unresolved'); setMessage('Enter a position, positive width and length, rotation, and nonnegative optional minimum distances before measuring.'); return }
    const sequence = ++version.current
    setResult(null); onMeasurement(null); setPhase('measuring')
    setBusy(true); setMessage('Measuring the saved example placement…')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch('/api/scouting-geometry/assess', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal })
      if (!response.ok) throw new Error(`Measurement service unavailable (${response.status}).`)
      const measured = parseExampleResult(await response.json(), payload)
      if (sequence !== version.current) return
      setResult(measured); setPhase('current'); setMessage('Current measurement for this illustrative placement.')
      onMeasurement({ site: exampleCase, model: null, result: measured,
        widthOrigin: editedDimensions.width ? 'user' : 'catalogue',
        depthOrigin: editedDimensions.depth ? 'user' : 'catalogue' })
    } catch (error) {
      if (sequence === version.current) { setPhase('unresolved'); setMessage(controller.signal.aborted ? 'Measurement timed out. Try again.' : error instanceof Error ? error.message : 'Measurement failed.') }
    } finally { clearTimeout(timer); if (sequence === version.current) setBusy(false) }
  }

  useEffect(() => {
    void measure(initialExamplePosition(), emptyExampleAssumptions())
    return () => { version.current += 1 }
    // The initial illustrative placement is measured once; subsequent edits require the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const all = [exampleCase.site.parcel, ...exampleCase.site.buildings].flatMap(points)
  const xs = all.map(point => point[0]), ys = all.map(point => point[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const pad = Math.max(maxX - minX, maxY - minY) * .16
  const viewBox = `${minX - pad} ${-maxY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`
  const footprint = request?.placement
  const observation = result ? exampleObservation(result) : null
  const finding = observation?.finding
  const containment = result?.checks.find(check => check.kind === 'containment')
  const boundary = result?.checks.find(check => check.kind === 'parcel_boundary_distance')
  const nearestRoof = result?.checks.find(check => check.kind === 'nearest_building_distance')
  const comparisons = observation?.comparisons ?? []
  const conflictIds = new Set(finding?.conflicts.flatMap(check => check.source_feature_ids) ?? [])
  const conflict = observation?.conflict ?? false
  const unresolved = observation?.unresolved ?? false
  const shortfall = observation?.shortfall ?? false
  const status = phase === 'stale' ? 'Placement or assumption changed — measure again' :
    phase === 'measuring' ? 'Measuring this placement' : phase === 'unresolved' ? 'Measurement unresolved' :
      conflict ? 'Observed placement conflict' : unresolved ? 'Measurement unresolved' :
        shortfall ? 'Your clearance target has a shortfall' : 'No observed conflict at this position'
  const statusTone = phase === 'current' ? conflict ? 'conflict' : unresolved || shortfall ? 'unknown' : 'clear' : 'unknown'

  return <section className="builder-example" aria-label="Saved example property">
    <div className="builder-example-status"><strong>Example property / saved data</strong>
      <p>City of Victoria {source.record_label}; parcel and mapped roofline snapshot captured {readableDate(source.capture_date)}. Source observations and Model 300 dimensions are unreviewed. The copper rectangle is an illustrative placement, not a proposed or approved building location.</p>
      <p>Contains information licensed under the <a href="https://opendata.victoria.ca/pages/open-data-licence" target="_blank" rel="noreferrer">Open Government Licence – City of Victoria</a>. <a href={publicSourceUrl(source.reference) ?? '#builder-example-evidence'} target="_blank" rel="noreferrer">Parcel source</a>{roofSource && <> · <a href={publicSourceUrl(roofSource.reference) ?? '#builder-example-evidence'} target="_blank" rel="noreferrer">Roofline source</a></>}.</p>
      <p>Unknown: legal lot lines, building walls and roles, other obstructions, zoning and setbacks, installed height and datum, current controlled provider dimensions, access and services.</p>
    </div>
    <div className={`builder-example-outcome builder-example-outcome--${statusTone}`} role="status" aria-live="polite">
      <strong>{status}</strong><p>{phase === 'stale' ? 'The previous observation no longer describes these inputs.' : phase === 'measuring' ? 'Checking the supplied rectangle against captured geometry.' : phase === 'unresolved' ? `${message} No current geometry conclusion is available.` : conflict ? 'The supplied rectangle crosses or touches a captured parcel or roofline outline. This does not test other positions.' : unresolved ? 'Some captured geometry or assumption comparisons could not be resolved. Inspect the details below.' : shortfall ? 'The observed distance falls below a minimum you entered. This is not a legal setback comparison.' : 'No parcel crossing or captured roofline overlap was observed for this supplied position. Other obstructions and legal conditions remain unknown.'}</p>
    </div>
    <div className="builder-example-layout">
      <figure className="builder-example-map"><svg ref={map} viewBox={viewBox} role="img" tabIndex={0} aria-label={`Saved City of Victoria parcel and roofline with an illustrative Model 300 nominal rectangle. Click to move its centre or drag the rectangle. Arrow keys move it ${step} ${step === 1 ? 'metre' : 'metres'}; north is up.`}
        onClick={event => { if (suppressClick.current) { suppressClick.current = false; return }; moveFromPointer(event.clientX, event.clientY) }}
        onKeyDown={event => { const direction = directions[event.key]; if (!direction) return; event.preventDefault(); nudge(...direction) }}
        onPointerMove={event => { if (dragging.current) moveFromPointer(event.clientX, event.clientY) }}
        onPointerUp={event => { dragging.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}
        onPointerCancel={() => { dragging.current = false; suppressClick.current = false }}>
        <path d={path(exampleCase.site.parcel)} fill="var(--map-parcel-fill)" stroke={conflictIds.has(exampleCase.site.parcel.id) ? 'var(--danger)' : 'var(--map-parcel-stroke)'} strokeDasharray={conflictIds.has(exampleCase.site.parcel.id) ? '7 4' : undefined} fillRule="evenodd" strokeWidth={conflictIds.has(exampleCase.site.parcel.id) ? '4' : '2'} vectorEffect="non-scaling-stroke" />
        {exampleCase.site.buildings.map((roof, index) => <path key={roof.id} d={path(roof)} fill="var(--map-roof-fill)" stroke={conflictIds.has(roof.id) ? 'var(--danger)' : 'var(--map-roof-stroke)'} strokeDasharray={conflictIds.has(roof.id) ? '7 4' : undefined} strokeWidth={conflictIds.has(roof.id) ? '4' : '2'} vectorEffect="non-scaling-stroke"><title>{`Captured roofline ${index + 1}${conflictIds.has(roof.id) ? ': observed conflict' : ''}`}</title></path>)}
        {footprint && <g transform={`translate(${footprint.centre_xy[0]} ${-footprint.centre_xy[1]}) rotate(${-footprint.angle_degrees})`}>
          <rect x={-footprint.width_m / 2} y={-footprint.depth_m / 2} width={footprint.width_m} height={footprint.depth_m} fill="var(--map-zone-fill)" stroke="var(--map-zone-stroke)" strokeWidth="3" vectorEffect="non-scaling-stroke" style={{ cursor: 'grab', touchAction: 'none' }}
            onPointerDown={event => { dragging.current = true; suppressClick.current = true; event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId) }} />
        </g>}
      </svg><figcaption>Teal: captured parcel · Purple: captured roofline, not walls · Red dashed outline: observed conflict in current measurement · Copper: illustrative nominal rectangle · North ↑ · EPSG:3157 metres. Diagram is approximate.</figcaption></figure>
      <div className="builder-example-controls"><h3>Edit the illustrative placement</h3>
        <p>The nominal rectangle starts at Model 300's unreviewed provider dimensions. Current width {show(Number(position.width), 'length')} × length {show(Number(position.depth), 'length')}. Click the map to move its centre or drag the copper rectangle. North is up; movement changes the example only. Edits need a new measurement.</p>
        <div className="builder-example-movement" aria-label="Move the illustrative placement">
          <label htmlFor="builder-example-step">Movement step</label><select id="builder-example-step" value={step} onChange={event => setStep(Number(event.target.value))}><option value="0.25">0.25 m</option><option value="1">1 m</option><option value="5">5 m</option></select>
          <div className="builder-example-directions"><button type="button" onClick={() => nudge(0, 1)}>North ↑</button><button type="button" onClick={() => nudge(-1, 0)}>West ←</button><button type="button" onClick={() => nudge(1, 0)}>East →</button><button type="button" onClick={() => nudge(0, -1)}>South ↓</button></div>
          <p>Focus the map and use arrow keys for the same steps.</p>
          <button type="button" onClick={reset}>Reset example position and dimensions</button>
        </div>
        <div className="builder-example-fields">
          <div><MeasurementLabel field="width" inputId="builder-example-width" /><MeasurementInput id="builder-example-width" dimension="length" type="number" step="any" value={position.width} onChange={event => edit('width', event.target.value)} /></div>
          <div><MeasurementLabel field="depth" inputId="builder-example-depth" /><MeasurementInput id="builder-example-depth" dimension="length" type="number" step="any" value={position.depth} onChange={event => edit('depth', event.target.value)} /></div>
          <div><label htmlFor="builder-example-angle">Rotation (degrees)</label><input id="builder-example-angle" type="number" step="any" value={rotationFocused || !position.angle.trim() || !Number.isFinite(Number(position.angle)) ? position.angle : String(Number(Number(position.angle).toFixed(2)))} onFocus={() => setRotationFocused(true)} onBlur={() => setRotationFocused(false)} onChange={event => edit('angle', event.target.value)} /></div>
        </div>
        <button type="button" disabled={exampleOrientation.status !== 'suggested'} onClick={() => { if (exampleOrientation.status === 'suggested') edit('angle', String(exampleOrientation.angle_degrees)) }}>Align to lot</button>
        <p className="metadata">{exampleOrientation.status === 'suggested' ? 'The initial rotation follows the approximate long direction of the captured lot. You can change it or align it again; alignment does not choose a clear position or establish frontage or setbacks.' : exampleOrientation.reason}</p>
        <fieldset className="builder-example-assumptions"><legend>Optional clearance targets you choose</legend>
          <p>Compare measured distances with your own minimums. Blank means no target; these are not Victoria setback rules.</p>
          <label htmlFor="builder-example-parcel-minimum">Minimum to captured parcel boundary (m)</label><MeasurementInput id="builder-example-parcel-minimum" dimension="length" type="number" min="0" step="any" value={assumptions.parcel} onChange={event => editAssumption('parcel', event.target.value)} />
          <label htmlFor="builder-example-roofline-minimum">Minimum to captured roofline (m)</label><MeasurementInput id="builder-example-roofline-minimum" dimension="length" type="number" min="0" step="any" value={assumptions.roofline} onChange={event => editAssumption('roofline', event.target.value)} />
        </fieldset>
        <button type="button" disabled={busy || !request} onClick={() => void measure(position, assumptions)}>Measure this placement</button>
        <p role="status">{message}</p>
      </div>
    </div>
    {result && <div className="builder-example-result"><h3>Measured observation for this position</h3>
      {(editedDimensions.width || editedDimensions.depth) && <p className="notice"><strong>Custom size scenario.</strong> You changed the model dimensions. These measurements describe your edited rectangle; availability of this product size is unconfirmed.</p>}
      <p>{containment?.status === 'observed' ? `Parcel containment: ${containment.relation?.replace(/_/g, ' ') ?? 'unknown'}${containment.area_m2 && containment.area_m2 > 0 ? `; ${show(containment.area_m2, 'area')} outside` : ''}.` : 'Parcel containment unresolved.'} {finding?.conflicts.length ? `${finding.conflicts.filter(check => check.kind === 'building_overlap').map(check => { const index = exampleCase.site.buildings.findIndex(roof => check.source_feature_ids.includes(roof.id)); return `Captured roofline ${index + 1}: ${check.relation === 'touches' ? 'touches the rectangle' : `${show(check.area_m2, 'area')} overlap`}` }).join('; ')}${finding.conflicts.some(check => check.kind === 'containment') ? ' Parcel boundary conflict.' : ''}` : finding?.complete ? 'No overlap with the captured roofline was observed. Other obstructions remain unknown.' : 'Captured roofline overlap remains unresolved.'}</p>
      <p>Distance to captured parcel boundary: {boundary?.status === 'observed' ? show(boundary.distance_m, 'length') : 'unresolved'}. Distance to nearest captured roofline: {nearestRoof?.status === 'observed' ? show(nearestRoof.distance_m, 'length') : 'unresolved'}.</p>
      {comparisons.length > 0 && <><h4>Your clearance target comparisons</h4><ul>{comparisons.map(check => { const parcel = check.id === 'requirement:user-parcel-minimum'; const minimum = parcel ? assumptions.parcel : assumptions.roofline; return <li key={check.id}>{parcel ? 'Captured parcel boundary' : 'Captured roofline'}: your minimum {show(Number(minimum), 'length')}; measured {show(check.distance_m, 'length')}. {check.comparison === 'shortfall' ? `Short by ${show(check.margin_m === null ? null : Math.abs(check.margin_m), 'length')}.` : check.comparison === 'meets' ? `Meets your target by ${show(check.margin_m, 'length')}.` : `Unresolved${check.reason ? `: ${check.reason.replace(/_/g, ' ')}` : '.'}`} User assumption, not a legal setback or permit result.</li> })}</ul></>}
      <p>No zoning, legal setback, installed height, access or permit eligibility was assessed. Exact distances and shortfalls are available in the source details below.</p></div>}
    <TechnicalDetails title="Saved example sources and exact projected coordinates"><pre id="builder-example-evidence">{JSON.stringify({ schema_version: 'builder-example.v1', source: exampleCase, placement: position, assumption_inputs: assumptions, request_requirements: request?.requirements ?? null, measurement: result }, null, 2)}</pre></TechnicalDetails>
  </section>
}
