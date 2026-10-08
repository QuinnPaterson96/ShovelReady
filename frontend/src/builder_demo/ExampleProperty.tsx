import { OccupiedLotPreview, PlacementConcerns } from '../occupied_lots/OccupiedLots'
import { EvidenceAtFooter } from '../EvidenceAtFooter'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MeasurementInput } from '../MeasurementInput'
import { MeasurementLabel } from '../model_catalogue/MeasurementLabel'
import { measurementWithUnit } from '../measurements'
import { publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import type { OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import type { Result } from '../occupied_lots/contract'
import { emptyExampleAssumptions, exampleCase, exampleOrientation, exampleObservation, exampleRequest, initialExamplePosition, parseExampleResult } from './example'
import type { ExampleAssumptions, ExamplePosition } from './example'
import { type BoundaryMapInteraction } from '../zoning_site_assumptions/BoundaryMapTools'

const source = exampleCase.site.parcel.source
const roofSource = exampleCase.site.buildings[0]?.source
const show = (value: number | null, dimension: 'length' | 'area') => measurementWithUnit(value, dimension)


export function ExampleProperty({ onMeasurement, boundaryInteraction, placementSummary, placementContinuation, evidenceTargetId, moveSuggestion, placementConcerns, onContinueUnresolved }: { placementConcerns?: ReactNode; onContinueUnresolved?: () => void; onMeasurement: (value: OccupiedMeasurement | null) => void; boundaryInteraction?: BoundaryMapInteraction; placementSummary?: ReactNode; placementContinuation?: ReactNode; evidenceTargetId?: string; moveSuggestion?: { dx: number; dy: number; token: number } }) {
  const [position, setPosition] = useState(initialExamplePosition)
  const appliedMove = useRef<number | null>(null)
  useEffect(() => {
    if (!moveSuggestion || appliedMove.current === moveSuggestion.token) return
    appliedMove.current = moveSuggestion.token
    invalidate()
    setPosition(current => ({ ...current, x: String(Number(current.x) + moveSuggestion.dx), y: String(Number(current.y) + moveSuggestion.dy) }))
  }, [moveSuggestion])
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
    <OccupiedLotPreview selected={exampleCase} placement={position} modelLabel="Model 300" onMove={move} nudgeMetres={step} conflictIds={conflictIds} boundaryInteraction={boundaryInteraction} placementSummary={placementSummary} placementContinuation={placementContinuation} placementControls={<div className="builder-footprint-controls" hidden={!!boundaryInteraction && boundaryInteraction.mode !== 'place'}><h3>Adjust the footprint</h3>
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
      </div>} placementConcerns={<PlacementConcerns site={exampleCase} result={result} additional={placementConcerns} onContinueUnresolved={onContinueUnresolved} />} />
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
