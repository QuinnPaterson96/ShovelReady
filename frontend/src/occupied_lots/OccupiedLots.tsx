import { useEffect, useRef, useState } from 'react'
import { bundledCatalogue } from '../model_catalogue/model'
import { readableDate, TechnicalDetails } from '../ReadableProvenance'
import { parseResult, parseSites, path, points } from './contract'
import type { Case, Check, Result } from './contract'
import './occupied-lots.css'

type Placement = { x: string; y: string; width: string; depth: string; angle: string }
const number = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null
const show = (value: number | null) => value === null ? 'unknown' : `${Number(value.toFixed(2))} m`
const checkText = (check: Check, selected?: Case) => {
  const index = selected?.site.buildings.findIndex(b => check.source_feature_ids.includes(b.id)) ?? -1
  const roofLabel = index >= 0 ? ` ${selected!.site.buildings[index].basis} ${index + 1}` : ''
  if (check.status !== 'observed' && check.kind !== 'requirement') return `${check.kind.replace(/_/g, ' ')}: ${check.status}${check.reason ? ` · ${check.reason}` : ''}`
  switch (check.kind) {
    case 'containment': return `Parcel containment: ${check.relation ?? 'unknown'}${check.area_m2 ? ` · ${Number(check.area_m2.toFixed(2))} m² outside` : ''}`
    case 'building_overlap': return `Captured${roofLabel} outline overlap: ${check.relation ?? 'unknown'}${check.area_m2 ? ` · ${Number(check.area_m2.toFixed(2))} m²` : ''}`
    case 'parcel_boundary_distance': return `Distance to parcel boundary: ${show(check.distance_m)}`
    case 'nearest_building_distance': return `Distance to nearest captured building outline: ${show(check.distance_m)}`
    case 'building_distance': return `Distance to captured${roofLabel} outline: ${show(check.distance_m)}`
    case 'named_boundary_distance': return `Distance to named boundary: ${show(check.distance_m)}`
    case 'requirement': return `Your assumed minimum: ${check.comparison === 'meets' ? 'measured distance meets' : check.comparison === 'shortfall' ? 'measured distance falls short of' : check.status} the entered value${check.margin_m !== null ? ` by ${show(Math.abs(check.margin_m))}` : ''}. This is not a legal threshold.`
    default: return `${check.kind.replace(/_/g, ' ')}: ${check.relation ?? check.status}`
  }
}
function Map({ selected, placement, onMove }: { selected: Case; placement: Placement; onMove: (x: number, y: number) => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef(false)
  const site = selected.site
  const all = [site.parcel, ...site.buildings, ...site.named_boundaries].flatMap(points)
  const xs = all.map(p => p[0]), ys = all.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const extent = Math.max(maxX - minX, maxY - minY, 20), pad = extent * .2
  const view = `${minX - pad} ${-maxY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
  const px = number(placement.x), py = number(placement.y), w = number(placement.width), d = number(placement.depth), a = number(placement.angle)
  function move(clientX: number, clientY: number) {
    const element = svg.current
    if (!element) return
    const matrix = element.getScreenCTM()?.inverse()
    if (!matrix) return
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix)
    onMove(Number(p.x.toFixed(2)), Number((-p.y).toFixed(2)))
  }
  return <div>
    <p className="metadata">Approximate captured XY in {site.projected_metre_crs}, metres · north up. Teal is the parcel; purple outlines are captured rooflines, not walls. Copper is your nominal rectangle.</p>
    <svg ref={svg} className="occupied-map" role="img" aria-label={`Approximate map of ${selected.label}, parcel, captured building outlines and supplied rectangle`} viewBox={view}
      onPointerMove={e => { if (drag.current) move(e.clientX, e.clientY) }}
      onPointerUp={e => { drag.current = false; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }}
      onPointerCancel={() => { drag.current = false }}>
      <path d={path(site.parcel)} fill="var(--map-parcel-fill)" stroke="var(--map-parcel-stroke)" fillRule="evenodd" vectorEffect="non-scaling-stroke" strokeWidth="2" />
      {site.buildings.map(b => <path key={b.id} d={path(b)} fill="var(--map-roof-fill)" stroke="var(--map-roof-stroke)" fillRule="evenodd" vectorEffect="non-scaling-stroke" strokeWidth="2" />)}
      {site.named_boundaries.map(b => <path key={b.id} d={path(b)} fill="none" stroke="var(--map-zone-stroke)" vectorEffect="non-scaling-stroke" strokeWidth="2" />)}
      {px !== null && py !== null && w !== null && d !== null && a !== null && w > 0 && d > 0 && <g transform={`translate(${px} ${-py}) rotate(${-a})`}>
        <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="var(--map-zone-fill)" stroke="var(--map-zone-stroke)" strokeWidth="3" vectorEffect="non-scaling-stroke" style={{ cursor: 'grab', touchAction: 'none' }}
          onPointerDown={e => { drag.current = true; e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId) }} />
        <circle r={Math.min(w, d) / 12} fill="var(--map-zone-stroke)" pointerEvents="none" />
      </g>}
    </svg>
    <p className="metadata">Drag the copper rectangle, or use the position and rotation fields below. The drawing does not identify clear yard, legal boundaries or available space.</p>
  </div>
}

export default function OccupiedLots() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [caseId, setCaseId] = useState('')
  const [modelId, setModelId] = useState('')
  const [placement, setPlacement] = useState<Placement>({ x: '', y: '', width: '', depth: '', angle: '0' })
  const [assumptions, setAssumptions] = useState({ parcel: '', building: '' })
  const [result, setResult] = useState<Result | null>(null)
  const [assessing, setAssessing] = useState(false)
  const [assessmentError, setAssessmentError] = useState('')
  const version = useRef(0)
  const selected = cases.find(c => c.case_id === caseId) ?? null
  const model = bundledCatalogue.models.find(m => m.model_id === modelId)
  function invalidate() { version.current++; setResult(null); setAssessmentError(''); setAssessing(false) }
  function changePlacement(patch: Partial<Placement>) { invalidate(); setPlacement(p => ({ ...p, ...patch })) }
  function changeAssumption(key: 'parcel' | 'building', value: string) { invalidate(); setAssumptions(p => ({ ...p, [key]: value })) }
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    version.current++
    setLoading(true); setError(''); setCases([]); setCaseId(''); setResult(null)
    const timer = setTimeout(() => controller.abort(), 10000)
    void (async () => {
      try {
        const response = await fetch('/api/scouting-sites', { signal: controller.signal })
        if (!response.ok) throw new Error(`Retained site service unavailable (${response.status}).`)
        const found = parseSites(await response.json())
        if (!active) return
        setCases(found); setCaseId(found[0].case_id)
        setPlacement(current => ({ ...current, x: '', y: '' }))
      } catch (e) { if (!active) return; if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Retained sites unavailable.')
        else setError('Retained site request timed out.') }
      finally { clearTimeout(timer); if (active) setLoading(false) }
    })()
    return () => { active = false; controller.abort(); clearTimeout(timer) }
  }, [reload])
  function chooseCase(id: string) {
    invalidate(); setCaseId(id)
    setPlacement(current => ({ ...current, x: '', y: '' }))
  }
  function placeAtCentre() {
    if (!selected) return
    const p = points(selected.site.parcel)
    changePlacement({ x: String(Number(((Math.min(...p.map(v => v[0])) + Math.max(...p.map(v => v[0]))) / 2).toFixed(2))),
      y: String(Number(((Math.min(...p.map(v => v[1])) + Math.max(...p.map(v => v[1]))) / 2).toFixed(2))) })
  }
  function chooseModel(id: string) {
    invalidate(); setModelId(id)
    const model = bundledCatalogue.models.find(m => m.model_id === id)
    const measure = (name: string) => model?.measurements.find(m => m.name === name)?.quantity
    changePlacement({ width: measure('nominal_exterior_width')?.unit === 'm' ? String(Number(measure('nominal_exterior_width')!.value)) : '',
      depth: measure('nominal_exterior_depth')?.unit === 'm' ? String(Number(measure('nominal_exterior_depth')!.value)) : '' })
  }
  const x = number(placement.x), y = number(placement.y), width = number(placement.width), depth = number(placement.depth), angle = number(placement.angle)
  const valid = selected && x !== null && y !== null && width !== null && width > 0 && depth !== null && depth > 0 && angle !== null
  const parcelMinimum = assumptions.parcel.trim() ? number(assumptions.parcel) : null
  const buildingMinimum = assumptions.building.trim() ? number(assumptions.building) : null
  const assumptionsValid = (parcelMinimum === null ? !assumptions.parcel.trim() : parcelMinimum >= 0) &&
    (buildingMinimum === null ? !assumptions.building.trim() : buildingMinimum >= 0)
  async function assess() {
    if (!selected || !valid || !assumptionsValid) return
    invalidate()
    const requestVersion = version.current
    setAssessing(true)
    const request = { schema_version: 'scouting-geometry.v1', ...selected.site,
      placement: { id: 'user-supplied-placement', centre_xy: [x, y], width_m: width, depth_m: depth, angle_degrees: angle },
      requirements: [
        ...(parcelMinimum === null ? [] : [{ id: 'user-parcel-minimum', target: 'parcel_boundary', minimum_m: parcelMinimum, status: 'user_assumption' }]),
        ...(buildingMinimum === null ? [] : [{ id: 'user-building-minimum', target: 'nearest_building', minimum_m: buildingMinimum, status: 'user_assumption' }]),
      ] }
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch('/api/scouting-geometry/assess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: controller.signal })
      if (!response.ok) throw new Error(`Geometry service unavailable (${response.status}).`)
      const parsed = parseResult(await response.json())
      if (version.current === requestVersion) {
        if (parsed.input.parcel.id !== selected.site.parcel.id || parsed.input.projected_metre_crs !== selected.site.projected_metre_crs ||
            JSON.stringify(parsed.input.placement.centre_xy) !== JSON.stringify([x, y]) || parsed.input.placement.width_m !== width || parsed.input.placement.depth_m !== depth || parsed.input.placement.angle_degrees !== angle)
          throw new Error('Assessment returned a different placement.')
        setResult(parsed)
      }
    } catch (e) { if (version.current === requestVersion) setAssessmentError(controller.signal.aborted ? 'Assessment timed out. Try again.' : e instanceof Error ? e.message : 'Assessment failed.') }
    finally { clearTimeout(timer); if (version.current === requestVersion) setAssessing(false) }
  }
  const source = selected?.site.parcel.source
  const summary = result && selected ? [
    `Site: ${selected.label} (${selected.case_id}). City of Victoria captured parcel and roofline observations; ${source?.review_status}; captured ${readableDate(source?.capture_date)}.`,
    `Nominal rectangle: ${width} m wide × ${depth} m deep; centre ${x}, ${y} in ${selected.site.projected_metre_crs}; rotation ${angle}°. ${model ? `${model.provider} ${model.name}, unreviewed provider lead; current dimensions may include user edits` : 'Dimensions supplied manually by user'}.`,
    ...result.checks.map(check => checkText(check, selected)),
    `Next: verify legal parcel lines, building walls and roles, siting pathway, provider dimensions and other site constraints. This tests only this supplied placement.`,
    ...result.limitations,
  ].join('\n') : ''
  return <section className="occupied-lots" aria-labelledby="occupied-title">
    <p className="eyebrow">Occupied-lot sketch</p><h2 id="occupied-title">Try one nominal prefab placement</h2>
    <p>Choose a retained City of Victoria parcel, set a building footprint and place it on the approximate map. Measurements describe only that rectangle against captured geometry. No legal siting or permit decision is made.</p>
    {loading && <p role="status">Loading retained sites…</p>}
    {error && <p role="alert">{error} No site sketch is available. <button onClick={() => setReload(n => n + 1)}>Retry</button></p>}
    {selected && <>
      <label htmlFor="occupied-site">Retained site</label><select id="occupied-site" value={caseId} onChange={e => chooseCase(e.target.value)}>
        {cases.map(c => <option key={c.case_id} value={c.case_id}>{c.label}</option>)}</select>
      <p className="metadata">{source?.provider} · {source?.record_label} · captured {readableDate(source?.capture_date)} · {source?.review_status}. Capture: {selected.site.capture.scope}; {selected.site.capture.completeness.replace(/_/g, ' ')}.</p>
      <Map selected={selected} placement={placement} onMove={(x, y) => changePlacement({ x: String(x), y: String(y) })} />
      <button onClick={placeAtCentre}>Start rectangle at parcel bounding-box centre</button>
      <p className="metadata">This is a sketch starting point only. It does not search for a suitable placement or establish open space.</p>
      <label htmlFor="occupied-model">Prefab model or manual dimensions</label><select id="occupied-model" value={modelId} onChange={e => chooseModel(e.target.value)}>
        <option value="">Manual nominal footprint</option>{bundledCatalogue.models.map(m => <option key={m.model_id} value={m.model_id}>{m.provider} · {m.name}</option>)}</select>
      {model && <p className="metadata">{model.provider} · {model.name} · provider measurements captured {readableDate(model.sources[0]?.captured_at)} · unreviewed. <a href={model.provider_url} target="_blank" rel="noreferrer">Provider model page</a>. {model.service_area_note} Missing dimensions remain blank; edits below are user supplied nominal exterior values.</p>}
      <div className="occupied-fields">{(['width', 'depth', 'x', 'y', 'angle'] as const).map(key => <div key={key}>
        <label htmlFor={`occupied-${key}`}>{({ width: 'Nominal exterior width (m)', depth: 'Nominal exterior depth (m)', x: 'Centre X (metres)', y: 'Centre Y (metres)', angle: 'Rotation (degrees)' })[key]}</label>
        <input id={`occupied-${key}`} type="number" step="any" value={placement[key]} onChange={e => changePlacement({ [key]: e.target.value })} />
      </div>)}</div>
      <p className="metadata">Centre values are projected metre coordinates in {selected.site.projected_metre_crs}. Width and depth are nominal exterior footprint dimensions, not interior floor area or installed envelope.</p>
      <details><summary>Optional comparison with your own clearance assumption</summary>
        <p>These are user supplied what-if distances, not Victoria setbacks. Leave blank for geometry observations only.</p>
        <div className="occupied-fields"><div><label htmlFor="occupied-parcel-minimum">Assumed minimum to parcel boundary (m)</label>
          <input id="occupied-parcel-minimum" type="number" min="0" step="any" value={assumptions.parcel} onChange={e => changeAssumption('parcel', e.target.value)} /></div>
          <div><label htmlFor="occupied-building-minimum">Assumed minimum to nearest captured building outline (m)</label>
            <input id="occupied-building-minimum" type="number" min="0" step="any" value={assumptions.building} onChange={e => changeAssumption('building', e.target.value)} /></div></div>
      </details>
      {(!valid || !assumptionsValid) && <p role="status">Enter finite coordinates, positive width and depth, a rotation, and nonnegative optional minimums to assess this rectangle.</p>}
      <button className="sr-primary" disabled={!valid || !assumptionsValid || assessing} onClick={() => void assess()}>{assessing ? 'Measuring…' : 'Measure this placement'}</button>
      {assessmentError && <p role="alert">{assessmentError} Edit the sketch or try again; no result is shown.</p>}
      {result && <section aria-labelledby="occupied-results"><h3 id="occupied-results">Observations for this placement</h3>
        <p className="notice">Partial geometry observations only. No-overlap does not establish clear space. An outside or overlapping rectangle does not rule out other placements on the parcel.</p>
        <ul>{result.checks.map(c => <li key={c.id}>{checkText(c, selected)}</li>)}</ul>
        <h4>Next steps and limits</h4><p>Confirm legal parcel boundaries, principal building role and wall footprint, yard classification, current rules and controlled provider drawings before relying on a siting comparison.</p>
        <ul>{result.limitations.map((v, i) => <li key={i}>{v}</li>)}</ul>
        <label htmlFor="occupied-summary">Copyable plain-language summary</label><textarea id="occupied-summary" readOnly value={summary} rows={10} />
        <button onClick={() => void navigator.clipboard?.writeText(summary)}>Copy summary</button>
        <TechnicalDetails title="Exact sources, IDs, placement and assessment · copyable"><textarea readOnly aria-label="Complete geometry evidence record" value={JSON.stringify({ site: selected, model, assessment: result }, null, 2)} rows={14} /></TechnicalDetails>
      </section>}
      <TechnicalDetails title="Captured site source and exact identifiers"><pre>{JSON.stringify(selected, null, 2)}</pre></TechnicalDetails>
    </>}
  </section>
}
