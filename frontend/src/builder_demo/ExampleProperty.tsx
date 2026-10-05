import { useEffect, useRef, useState } from 'react'
import { MeasurementInput } from '../MeasurementInput'
import { MeasurementLabel } from '../model_catalogue/MeasurementLabel'
import { measurementWithUnit } from '../measurements'
import { publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { path, points } from '../occupied_lots/contract'
import { overlapFinding } from '../occupied_lots/observations'
import type { OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import type { Result } from '../occupied_lots/contract'
import { exampleCase, exampleRequest, initialExamplePosition, parseExampleResult } from './example'
import type { ExamplePosition } from './example'

const source = exampleCase.site.parcel.source
const roofSource = exampleCase.site.buildings[0]?.source
const show = (value: number | null, dimension: 'length' | 'area') => measurementWithUnit(value, dimension)
const directions: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
}

export function ExampleProperty({ onMeasurement }: { onMeasurement: (value: OccupiedMeasurement | null) => void }) {
  const [position, setPosition] = useState(initialExamplePosition)
  const [result, setResult] = useState<Result | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [editedDimensions, setEditedDimensions] = useState({ width: false, depth: false })
  const [step, setStep] = useState(1)
  const version = useRef(0)
  const map = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const suppressClick = useRef(false)
  const request = exampleRequest(position)

  function invalidate() {
    version.current += 1
    setResult(null); onMeasurement(null); setBusy(false)
    setMessage('Placement changed. Measure again for a current result.')
  }

  function edit(key: keyof ExamplePosition, value: string) {
    setPosition(current => ({ ...current, [key]: value }))
    if (key === 'width' || key === 'depth') setEditedDimensions(current => ({ ...current, [key]: true }))
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
    setEditedDimensions({ width: false, depth: false })
    invalidate()
    setMessage('Illustrative starting position restored. Measure again for a current result.')
  }

  async function measure(next: ExamplePosition) {
    const payload = exampleRequest(next)
    if (!payload) { setMessage('Enter a position, positive width and length, and rotation before measuring.'); return }
    const sequence = ++version.current
    setBusy(true); setMessage('Measuring the saved example placement…')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch('/api/scouting-geometry/assess', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal })
      if (!response.ok) throw new Error(`Measurement service unavailable (${response.status}).`)
      const measured = parseExampleResult(await response.json(), payload)
      if (sequence !== version.current) return
      setResult(measured); setMessage('Current measurement for this illustrative placement.')
      onMeasurement({ site: exampleCase, model: null, result: measured,
        widthOrigin: editedDimensions.width ? 'user' : 'catalogue',
        depthOrigin: editedDimensions.depth ? 'user' : 'catalogue' })
    } catch (error) {
      if (sequence === version.current) setMessage(controller.signal.aborted ? 'Measurement timed out. Try again.' : error instanceof Error ? error.message : 'Measurement failed.')
    } finally { clearTimeout(timer); if (sequence === version.current) setBusy(false) }
  }

  useEffect(() => {
    void measure(initialExamplePosition())
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
  const finding = result ? overlapFinding(exampleCase, result) : null
  const containment = result?.checks.find(check => check.kind === 'containment')
  const boundary = result?.checks.find(check => check.kind === 'parcel_boundary_distance')
  const nearestRoof = result?.checks.find(check => check.kind === 'nearest_building_distance')

  return <section className="builder-example" aria-label="Saved example property">
    <div className="builder-example-status"><strong>Example property / saved data</strong>
      <p>City of Victoria {source.record_label}; parcel and mapped roofline snapshot captured {readableDate(source.capture_date)}. Source observations and Model 300 dimensions are unreviewed. The copper rectangle is an illustrative placement, not a proposed or approved building location.</p>
      <p>Contains information licensed under the <a href="https://opendata.victoria.ca/pages/open-data-licence" target="_blank" rel="noreferrer">Open Government Licence – City of Victoria</a>. <a href={publicSourceUrl(source.reference) ?? '#builder-example-evidence'} target="_blank" rel="noreferrer">Parcel source</a>{roofSource && <> · <a href={publicSourceUrl(roofSource.reference) ?? '#builder-example-evidence'} target="_blank" rel="noreferrer">Roofline source</a></>}.</p>
      <p>Unknown: legal lot lines, building walls and roles, other obstructions, zoning and setbacks, installed height and datum, current controlled provider dimensions, access and services.</p>
    </div>
    <div className="builder-example-layout">
      <figure className="builder-example-map"><svg ref={map} viewBox={viewBox} role="img" tabIndex={0} aria-label={`Saved City of Victoria parcel and roofline with an illustrative Model 300 nominal rectangle. Click to move its centre or drag the rectangle. Arrow keys move it ${step} ${step === 1 ? 'metre' : 'metres'}; north is up.`}
        onClick={event => { if (suppressClick.current) { suppressClick.current = false; return }; moveFromPointer(event.clientX, event.clientY) }}
        onKeyDown={event => { const direction = directions[event.key]; if (!direction) return; event.preventDefault(); nudge(...direction) }}
        onPointerMove={event => { if (dragging.current) moveFromPointer(event.clientX, event.clientY) }}
        onPointerUp={event => { dragging.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}
        onPointerCancel={() => { dragging.current = false; suppressClick.current = false }}>
        <path d={path(exampleCase.site.parcel)} fill="var(--map-parcel-fill)" stroke="var(--map-parcel-stroke)" fillRule="evenodd" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {exampleCase.site.buildings.map(roof => <path key={roof.id} d={path(roof)} fill="var(--map-roof-fill)" stroke="var(--map-roof-stroke)" fillRule="evenodd" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
        {footprint && <g transform={`translate(${footprint.centre_xy[0]} ${-footprint.centre_xy[1]}) rotate(${-footprint.angle_degrees})`}>
          <rect x={-footprint.width_m / 2} y={-footprint.depth_m / 2} width={footprint.width_m} height={footprint.depth_m} fill="var(--map-zone-fill)" stroke="var(--map-zone-stroke)" strokeWidth="3" vectorEffect="non-scaling-stroke" style={{ cursor: 'grab', touchAction: 'none' }}
            onPointerDown={event => { dragging.current = true; suppressClick.current = true; event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId) }} />
        </g>}
      </svg><figcaption>Teal: captured parcel · Purple: captured roofline, not walls · Copper: illustrative nominal rectangle · North ↑ · EPSG:3157 metres. Diagram is approximate.</figcaption></figure>
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
          <div><label htmlFor="builder-example-angle">Rotation (degrees)</label><input id="builder-example-angle" type="number" step="any" value={position.angle} onChange={event => edit('angle', event.target.value)} /></div>
        </div>
        <button type="button" disabled={busy || !request} onClick={() => void measure(position)}>Measure this placement</button>
        <p role="status">{message}</p>
      </div>
    </div>
    {result && <div className="builder-example-result"><h3>Measured observation for this position</h3>
      <p>{containment?.status === 'observed' ? `Parcel containment: ${containment.relation?.replace(/_/g, ' ') ?? 'unknown'}.` : 'Parcel containment unresolved.'} {finding?.conflicts.length ? 'A captured outline conflicts with this placement.' : finding?.complete ? 'No overlap with the captured roofline was observed. Other obstructions remain unknown.' : 'Captured roofline overlap remains unresolved.'}</p>
      <p>Distance to captured parcel boundary: {boundary?.status === 'observed' ? show(boundary.distance_m, 'length') : 'unresolved'}. Distance to nearest captured roofline: {nearestRoof?.status === 'observed' ? show(nearestRoof.distance_m, 'length') : 'unresolved'}.</p>
      <p>No zoning, legal setback, installed height, access or permit eligibility was assessed.</p></div>}
    <TechnicalDetails title="Saved example sources and exact projected coordinates"><pre id="builder-example-evidence">{JSON.stringify({ schema_version: 'builder-example.v1', source: exampleCase, placement: position, measurement: result }, null, 2)}</pre></TechnicalDetails>
  </section>
}
