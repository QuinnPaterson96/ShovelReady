import { EvidenceAtFooter } from '../EvidenceAtFooter'
import { MapSourceHelp } from '../zoning_site_assumptions/MapSourceHelp'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MeasurementInput } from '../MeasurementInput'
import { MeasurementLabel } from '../model_catalogue/MeasurementLabel'
import { measurementWithUnit } from '../measurements'
import { publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { path, points } from '../occupied_lots/contract'
import type { OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import type { Result } from '../occupied_lots/contract'
import { emptyExampleAssumptions, exampleCase, exampleOrientation, exampleObservation, exampleRequest, initialExamplePosition, parseExampleResult } from './example'
import type { ExampleAssumptions, ExamplePosition } from './example'
import { BoundaryActionTabs, BoundaryMapTools, BoundaryOverlay, type BoundaryMapInteraction } from '../zoning_site_assumptions/BoundaryMapTools'

const source = exampleCase.site.parcel.source
const roofSource = exampleCase.site.buildings[0]?.source
const show = (value: number | null, dimension: 'length' | 'area') => measurementWithUnit(value, dimension)
const directions: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
}

export function ExampleProperty({ onMeasurement, boundaryInteraction, placementSummary, placementContinuation, evidenceTargetId }: { onMeasurement: (value: OccupiedMeasurement | null) => void; boundaryInteraction?: BoundaryMapInteraction; placementSummary?: ReactNode; placementContinuation?: ReactNode; evidenceTargetId?: string }) {
  const [position, setPosition] = useState(initialExamplePosition)
  const [assumptions, setAssumptions] = useState(emptyExampleAssumptions)
  const [result, setResult] = useState<Result | null>(null)
  const [phase, setPhase] = useState<'measuring' | 'stale' | 'unresolved' | 'current'>('measuring')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [editedDimensions, setEditedDimensions] = useState({ width: false, depth: false })
  const [step, setStep] = useState(1)
  const [rotationFocused, setRotationFocused] = useState(false)
  const activeCheck = useRef<AbortController | null>(null)
  const version = useRef(0)
  const map = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const suppressClick = useRef(false)
  const request = exampleRequest(position, assumptions)

  function invalidate() {
    activeCheck.current?.abort()
    version.current += 1
    setResult(null); onMeasurement(null); setBusy(false)
    setPhase('stale')
    setMessage('Placement changed. Automatic check pending…')
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
    setMessage('Illustrative starting position restored. Automatic check pending…')
  }

  async function measure(next: ExamplePosition, minima: ExampleAssumptions) {
    const payload = exampleRequest(next, minima)
    if (!payload) { setPhase('unresolved'); setMessage('Enter a position, positive width and length, rotation, and nonnegative optional minimum distances before measuring.'); return }
    const sequence = ++version.current
    setResult(null); onMeasurement(null); setPhase('measuring')
    setBusy(true); setMessage('Measuring the saved example placement…')
    activeCheck.current?.abort()
    const controller = new AbortController()
    activeCheck.current = controller
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
    const timer = setTimeout(() => void measure(position, assumptions), 450)
    return () => { clearTimeout(timer); version.current += 1; activeCheck.current?.abort() }
    // Recheck only when geometry/assumptions change, not when parent callbacks rerender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, assumptions])

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
  const conflicts = finding?.conflicts ?? []
  const crossesParcel = conflicts.some(check => check.kind === 'containment')
  const overlapsRoof = conflicts.some(check => check.kind === 'building_overlap')
  const checkWarning = phase === 'unresolved' || phase === 'current' && (conflict || unresolved)

  return <section className="builder-example" aria-label="Saved example property">
    <p className="builder-example-summary"><strong>Model 300 · {show(Number(position.width), 'length')} wide × {show(Number(position.depth), 'length')} long</strong><span>Nominal exterior rectangle · saved Victoria example · {source.provider}, {source.record_label} · captured {readableDate(source.capture_date)} · {source.review_status} · <a href={publicSourceUrl(source.reference) ?? '#builder-example-evidence'} target="_blank" rel="noreferrer">Parcel source</a></span></p>
    {boundaryInteraction && <BoundaryActionTabs interaction={boundaryInteraction} />}
    <div className="builder-example-layout boundary-action-panel" data-mode={boundaryInteraction?.mode} id="placement-action-panel" role={boundaryInteraction ? 'tabpanel' : undefined} aria-labelledby={boundaryInteraction ? `placement-action-${boundaryInteraction.mode}` : undefined}>
      <figure className="builder-example-map" id="placement-map">
        <svg ref={map} viewBox={viewBox} role="img" tabIndex={0} aria-label={boundaryInteraction?.mode !== 'place' && boundaryInteraction ? 'Saved parcel boundary selection map. Choose a boundary mark and click an edge, or use Edge to mark in the panel. The model cannot move in this mode.' : `Saved City of Victoria parcel and roofline with an illustrative Model 300 nominal rectangle. Click to move its centre or drag the rectangle. Arrow keys move it ${step} ${step === 1 ? 'metre' : 'metres'}; north is up.`}
        onClick={event => { if (boundaryInteraction && boundaryInteraction.mode !== 'place') return; if (suppressClick.current) { suppressClick.current = false; return }; moveFromPointer(event.clientX, event.clientY) }}
        onKeyDown={event => { if (boundaryInteraction && boundaryInteraction.mode !== 'place') return; const direction = directions[event.key]; if (!direction) return; event.preventDefault(); nudge(...direction) }}
        onPointerMove={event => { if ((!boundaryInteraction || boundaryInteraction.mode === 'place') && dragging.current) moveFromPointer(event.clientX, event.clientY) }}
        onPointerUp={event => { dragging.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}
        onPointerCancel={() => { dragging.current = false; suppressClick.current = false }}>
        <path d={path(exampleCase.site.parcel)} fill="var(--map-parcel-fill)" stroke={conflictIds.has(exampleCase.site.parcel.id) ? 'var(--danger)' : 'var(--map-parcel-stroke)'} strokeDasharray={conflictIds.has(exampleCase.site.parcel.id) ? '7 4' : undefined} fillRule="evenodd" strokeWidth={conflictIds.has(exampleCase.site.parcel.id) ? '4' : '2'} vectorEffect="non-scaling-stroke" />
        {exampleCase.site.buildings.map((roof, index) => <path key={roof.id} d={path(roof)} fill="var(--map-roof-fill)" stroke={conflictIds.has(roof.id) ? 'var(--danger)' : 'var(--map-roof-stroke)'} strokeDasharray={conflictIds.has(roof.id) ? '7 4' : undefined} strokeWidth={conflictIds.has(roof.id) ? '4' : '2'} vectorEffect="non-scaling-stroke"><title>{`Captured roofline ${index + 1}${conflictIds.has(roof.id) ? ': observed conflict' : ''}`}</title></path>)}
        {footprint && <g transform={`translate(${footprint.centre_xy[0]} ${-footprint.centre_xy[1]}) rotate(${-footprint.angle_degrees})`}>
          <rect x={-footprint.width_m / 2} y={-footprint.depth_m / 2} width={footprint.width_m} height={footprint.depth_m} fill="var(--map-zone-fill)" stroke="var(--map-zone-stroke)" strokeWidth="3" vectorEffect="non-scaling-stroke" style={{ cursor: 'grab', touchAction: 'none' }}
            onPointerDown={event => { if (boundaryInteraction && boundaryInteraction.mode !== 'place') return; dragging.current = true; suppressClick.current = true; event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId) }} />
        </g>}
        {boundaryInteraction && <BoundaryOverlay interaction={boundaryInteraction} />}
      </svg><figcaption>Teal: captured parcel · Purple: captured roofline, not walls · Red dashed outline: observed conflict in current measurement · Copper: illustrative nominal rectangle · North ↑ · EPSG:3157 metres. Diagram is approximate.{!!boundaryInteraction?.streetIds?.length && <> Grey road bands · your marks, diagram only.</>}<MapSourceHelp site={exampleCase} /></figcaption></figure>

      {placementContinuation && <div className="builder-placement-next">{placementContinuation}</div>}
      <div className="builder-example-controls">{boundaryInteraction && <BoundaryMapTools interaction={boundaryInteraction} />}<div hidden={!!boundaryInteraction && boundaryInteraction.mode !== 'place'}><h3>Adjust the footprint</h3>
        <p>Click the map or drag the rectangle. Arrow keys move it when the map has focus. Checks update automatically after movement settles.</p>
        <div className="builder-example-main-actions"><div><label htmlFor="builder-example-angle">Rotation (degrees)</label><input id="builder-example-angle" type="number" step="any" value={rotationFocused || !position.angle.trim() || !Number.isFinite(Number(position.angle)) ? position.angle : String(Number(Number(position.angle).toFixed(2)))} onFocus={() => setRotationFocused(true)} onBlur={() => setRotationFocused(false)} onChange={event => edit('angle', event.target.value)} /></div>
        <button type="button" disabled={exampleOrientation.status !== 'suggested'} onClick={() => { if (exampleOrientation.status === 'suggested') edit('angle', String(exampleOrientation.angle_degrees)) }}>Align to lot</button>
        <button type="button" onClick={reset}>Reset placement</button></div>
        <details className="builder-example-movement"><summary>Fine adjustment</summary>
          <label htmlFor="builder-example-step">Movement step</label><select id="builder-example-step" value={step} onChange={event => setStep(Number(event.target.value))}><option value="0.25">0.25 m</option><option value="1">1 m</option><option value="5">5 m</option></select>
          <div className="builder-example-directions"><button type="button" onClick={() => nudge(0, 1)}>North ↑</button><button type="button" onClick={() => nudge(-1, 0)}>West ←</button><button type="button" onClick={() => nudge(1, 0)}>East →</button><button type="button" onClick={() => nudge(0, -1)}>South ↓</button></div>
          <p>Focus the map and use arrow keys for the same steps.</p>
        </details>
        <details><summary>Details and edit dimensions</summary><p>Model 300 provider dimensions are unreviewed. Edits make this a custom size scenario.</p><div className="builder-example-fields">
          <div><MeasurementLabel field="width" inputId="builder-example-width" /><MeasurementInput id="builder-example-width" dimension="length" type="number" step="any" value={position.width} onChange={event => edit('width', event.target.value)} /></div>
          <div><MeasurementLabel field="depth" inputId="builder-example-depth" /><MeasurementInput id="builder-example-depth" dimension="length" type="number" step="any" value={position.depth} onChange={event => edit('depth', event.target.value)} /></div>
        </div>
        </details>
        <p className="metadata">{exampleOrientation.status === 'suggested' ? 'The initial rotation follows the approximate long direction of the captured lot. You can change it or align it again; alignment does not choose a clear position or establish frontage or setbacks.' : exampleOrientation.reason}</p>
        <details><summary>Optional clearance targets</summary><fieldset className="builder-example-assumptions"><legend>Minimum distances you choose</legend>
          <p>Compare measured distances with your own minimums. Blank means no target; these are not Victoria setback rules.</p>
          <label htmlFor="builder-example-parcel-minimum">Minimum to captured parcel boundary (m)</label><MeasurementInput id="builder-example-parcel-minimum" dimension="length" type="number" min="0" step="any" value={assumptions.parcel} onChange={event => editAssumption('parcel', event.target.value)} />
          <label htmlFor="builder-example-roofline-minimum">Minimum to captured roofline (m)</label><MeasurementInput id="builder-example-roofline-minimum" dimension="length" type="number" min="0" step="any" value={assumptions.roofline} onChange={event => editAssumption('roofline', event.target.value)} />
        </fieldset></details>
        <button type="button" disabled={busy || !request} onClick={() => void measure(position, assumptions)}>{busy ? 'Checking…' : phase === 'unresolved' ? 'Retry placement check' : 'Recheck placement'}</button>
      </div></div>
      {placementSummary && <div className="builder-map-summary">{placementSummary}</div>}
    </div>
    {checkWarning && <div className={`builder-example-outcome builder-example-outcome--${conflict ? 'conflict' : 'unknown'}`} role="alert">
      <strong>{phase === 'unresolved' || unresolved && !conflict ? 'Placement could not be fully checked' : 'Conflict at this position'}</strong>
      <p>{phase === 'unresolved' ? `${message} ${request ? 'Try again or edit the placement.' : 'Correct the placement inputs to check again.'}` : conflict ? `${crossesParcel ? 'The unit crosses or touches the mapped parcel boundary. ' : ''}${overlapsRoof ? 'The unit overlaps or touches a mapped roofline. ' : ''}Move the unit on the map and recheck. This finding applies to this position only.${unresolved ? ' Some measurements also remain unresolved; review Sources & technical evidence.' : ''}` : 'Some mapped geometry or your comparison could not be checked. Review Sources & technical evidence and try another position.'}</p>
    </div>}
    {result && (editedDimensions.width || editedDimensions.depth) && <p className="notice builder-example-custom-size"><strong>Custom size scenario.</strong> You changed the model dimensions. These measurements describe your edited rectangle; availability of this product size is unconfirmed.</p>}
    <EvidenceAtFooter targetId={evidenceTargetId}>{result && <details className="builder-example-result"><summary>Geometry measurements and evidence</summary>
      <p>{containment?.status === 'observed' ? `Parcel containment: ${containment.relation?.replace(/_/g, ' ') ?? 'unknown'}${containment.area_m2 && containment.area_m2 > 0 ? `; ${show(containment.area_m2, 'area')} outside` : ''}.` : 'Parcel containment unresolved.'} {finding?.conflicts.length ? `${finding.conflicts.filter(check => check.kind === 'building_overlap').map(check => { const index = exampleCase.site.buildings.findIndex(roof => check.source_feature_ids.includes(roof.id)); return `Captured roofline ${index + 1}: ${check.relation === 'touches' ? 'touches the rectangle' : `${show(check.area_m2, 'area')} overlap`}` }).join('; ')}${finding.conflicts.some(check => check.kind === 'containment') ? ' Parcel boundary conflict.' : ''}` : finding?.complete ? 'No overlap with the captured roofline was observed. Other obstructions remain unknown.' : 'Captured roofline overlap remains unresolved.'}</p>
      <p>Distance to captured parcel boundary: {boundary?.status === 'observed' ? show(boundary.distance_m, 'length') : 'unresolved'}. Distance to nearest captured roofline: {nearestRoof?.status === 'observed' ? show(nearestRoof.distance_m, 'length') : 'unresolved'}.</p>
      {comparisons.length > 0 && <><h4>Your clearance target comparisons</h4><ul>{comparisons.map(check => { const parcel = check.id === 'requirement:user-parcel-minimum'; const minimum = parcel ? assumptions.parcel : assumptions.roofline; return <li key={check.id}>{parcel ? 'Captured parcel boundary' : 'Captured roofline'}: your minimum {show(Number(minimum), 'length')}; measured {show(check.distance_m, 'length')}. {check.comparison === 'shortfall' ? `Short by ${show(check.margin_m === null ? null : Math.abs(check.margin_m), 'length')}.` : check.comparison === 'meets' ? `Meets your target by ${show(check.margin_m, 'length')}.` : `Unresolved${check.reason ? `: ${check.reason.replace(/_/g, ' ')}` : '.'}`} User assumption, not a legal setback or permit result.</li> })}</ul></>}
      <p>This geometry observation does not establish zoning, legal setbacks, installed height, access or permit eligibility. Exact distances and shortfalls are available in the source details below.</p></details>}
    <details className="builder-example-status"><summary>Site source and limits</summary>
      <p>City of Victoria {source.record_label}; parcel and mapped roofline snapshot captured {readableDate(source.capture_date)}. Source observations and Model 300 dimensions are unreviewed. The copper rectangle is an illustrative placement, not a proposed or approved building location.</p>
      <p>Contains information licensed under the <a href="https://opendata.victoria.ca/pages/open-data-licence" target="_blank" rel="noreferrer">Open Government Licence – City of Victoria</a>. <a href={publicSourceUrl(source.reference) ?? '#builder-example-evidence'} target="_blank" rel="noreferrer">Parcel source</a>{roofSource && <> · <a href={publicSourceUrl(roofSource.reference) ?? '#builder-example-evidence'} target="_blank" rel="noreferrer">Roofline source</a></>}.</p>
      <p>Unknown: legal lot lines, building walls and roles, other obstructions, zoning and setbacks, installed height and datum, current controlled provider dimensions, access and services.</p>
    </details>
    <TechnicalDetails title="Saved example sources and exact projected coordinates"><pre id="builder-example-evidence">{JSON.stringify({ schema_version: 'builder-example.v1', source: exampleCase, placement: position, assumption_inputs: assumptions, request_requirements: request?.requirements ?? null, measurement: result }, null, 2)}</pre></TechnicalDetails>
    </EvidenceAtFooter>
  </section>
}
