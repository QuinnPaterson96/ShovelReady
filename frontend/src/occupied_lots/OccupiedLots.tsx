import { MapSourceHelp } from '../zoning_site_assumptions/MapSourceHelp'
import { suggestPlacementOrientation } from '../placement_orientation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { bundledCatalogue } from '../model_catalogue/model'
import { PublishedDimensions } from '../model_catalogue/PublishedDimensions'
import { MeasurementLabel } from '../model_catalogue/MeasurementLabel'
import { MeasurementInput } from '../MeasurementInput'
import { measurementWithUnit } from '../measurements'
import { CopyableRecord, publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { parseResult, parseSites, path, points } from './contract'
import { overlapFinding } from './observations'
import type { Case, Check, Result } from './contract'
import ScenarioHandoff from '../scenario_handoff/ScenarioHandoff'
import { BoundaryActionTabs, BoundaryMapTools, BoundaryOverlay, type BoundaryMapInteraction } from '../zoning_site_assumptions/BoundaryMapTools'

type Placement = { x: string; y: string; width: string; depth: string; angle: string }
const number = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null
const show = (value: number | null) => measurementWithUnit(value, 'length')
const roofName = (selected: Case, id: string) => {
  const index = selected.site.buildings.findIndex(b => b.id === id)
  return index < 0 ? 'captured outline' : `Roof ${index + 1}`
}
const checkText = (check: Check, selected?: Case) => {
  const index = selected?.site.buildings.findIndex(b => check.source_feature_ids.includes(b.id)) ?? -1
  const roofLabel = index >= 0 ? `Roof ${index + 1}` : 'captured outline'
  if (check.status !== 'observed' && check.kind !== 'requirement') return `${check.kind.replace(/_/g, ' ')}: ${check.status}${check.reason ? ` · ${check.reason}` : ''}`
  switch (check.kind) {
    case 'containment': return `Parcel containment: ${check.relation?.replace(/_/g, ' ') ?? 'unknown'}${check.area_m2 ? ` · ${measurementWithUnit(check.area_m2, 'area')} outside` : ''}`
    case 'building_overlap': return `${roofLabel}: ${check.relation === 'positive_area_overlap' ? `${measurementWithUnit(check.area_m2, 'area')} overlap` : check.relation === 'touches' ? 'rectangle touches outline' : check.relation === 'separate' ? 'no observed overlap' : 'relation unknown'}`
    case 'parcel_boundary_distance': return `Distance to parcel boundary: ${show(check.distance_m)}`
    case 'nearest_building_distance': return `Nearest captured roofline (${check.source_feature_ids.map(id => selected ? roofName(selected, id) : 'roofline').join(', ')}): ${show(check.distance_m)}`
    case 'building_distance': return `Distance to ${roofLabel}: ${show(check.distance_m)}`
    case 'named_boundary_distance': return `Distance to named boundary: ${show(check.distance_m)}`
    case 'requirement': return `Your assumed minimum ${check.id.includes('parcel') ? 'to the parcel boundary' : 'to the nearest captured roofline'}: ${check.comparison === 'meets' ? 'measured distance meets' : check.comparison === 'shortfall' ? 'measured distance falls short of' : check.status} the entered value${check.margin_m !== null ? ` by ${show(Math.abs(check.margin_m))}` : ''}. This is not a legal threshold.`
    default: return `${check.kind.replace(/_/g, ' ')}: ${check.relation ?? check.status}`
  }
}
function Map({ selected, placement, onMove, nudgeMetres, conflictIds, boundaryInteraction, placementSummary, placementContinuation, showBoundaryTools = true }: { placementSummary?: ReactNode; placementContinuation?: ReactNode; showBoundaryTools?: boolean; selected: Case; placement: Placement; onMove: (x: number, y: number) => void; nudgeMetres: number; conflictIds?: Set<string>; boundaryInteraction?: BoundaryMapInteraction }) {
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef(false)
  const suppressClick = useRef(false)
  const site = selected.site
  const all = [site.parcel, ...site.buildings, ...site.named_boundaries].flatMap(points)
  const xs = all.map(p => p[0]), ys = all.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const extent = Math.max(maxX - minX, maxY - minY, 20), pad = extent * .2
  const view = `${minX - pad} ${-maxY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
  const scale = extent < 50 ? 5 : extent < 100 ? 10 : 20
  const scaleX = minX - pad * .65, scaleY = -minY + pad * .55
  const px = number(placement.x), py = number(placement.y), w = number(placement.width), d = number(placement.depth), a = number(placement.angle)
  function move(clientX: number, clientY: number) {
    const element = svg.current
    if (!element) return
    const matrix = element.getScreenCTM()?.inverse()
    if (!matrix) return
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix)
    onMove(Number(p.x.toFixed(2)), Number((-p.y).toFixed(2)))
  }
  return <div className="occupied-map-panel" id={boundaryInteraction ? 'placement-map' : undefined}>
    {boundaryInteraction && <BoundaryActionTabs interaction={boundaryInteraction} />}
    <div className="boundary-action-panel" data-mode={boundaryInteraction?.mode} id="placement-action-panel" role={boundaryInteraction ? 'tabpanel' : undefined} aria-labelledby={boundaryInteraction ? `placement-action-${boundaryInteraction.mode}` : undefined}>
    <div className="occupied-map-heading"><h3>{boundaryInteraction?.mode === 'waterfront' ? 'Mark waterfront edges' : boundaryInteraction?.mode === 'front' ? 'Mark street edges' : boundaryInteraction?.mode === 'rear' ? 'Adjust boundary facts' : 'Place the footprint'}</h3><p className="metadata">{boundaryInteraction && boundaryInteraction.mode !== 'place' ? boundaryInteraction.mode === 'waterfront' ? 'Mark the edges adjoining water. Your placement stays in position.' : boundaryInteraction.mode === 'rear' ? 'Choose a mark on the right, then click an edge. Your placement stays in position.' : 'Click every edge that borders a street. Your placement stays in position.' : 'Click the map to place its centre. Drag the copper rectangle to adjust it.'}</p></div>
    <svg ref={svg} className="occupied-map" role="img" tabIndex={0} aria-label={boundaryInteraction?.mode !== 'place' && boundaryInteraction ? `Boundary selection map of ${selected.label}. Choose a boundary mark and click an edge, or use Edge to mark in the panel. The model cannot move in this mode.` : `Approximate map of ${selected.label}. Click to place. Arrow keys move the rectangle ${nudgeMetres} ${nudgeMetres === 1 ? 'metre' : 'metres'}. Parcel and Roof 1 through Roof ${site.buildings.length} are captured outlines.`} viewBox={view}
      onClick={e => { if (boundaryInteraction && boundaryInteraction.mode !== 'place') return; if (suppressClick.current) { suppressClick.current = false; return }; move(e.clientX, e.clientY) }}
      onKeyDown={e => {
        const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }
        const direction = directions[e.key]
        if ((boundaryInteraction && boundaryInteraction.mode !== 'place') || !direction || px === null || py === null) return
        e.preventDefault(); onMove(Number((px + direction[0] * nudgeMetres).toFixed(2)), Number((py + direction[1] * nudgeMetres).toFixed(2)))
      }}
      onPointerMove={e => { if ((!boundaryInteraction || boundaryInteraction.mode === 'place') && drag.current) move(e.clientX, e.clientY) }}
      onPointerUp={e => { drag.current = false; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }}
      onPointerCancel={() => { drag.current = false; suppressClick.current = false }}>
      <path d={path(site.parcel)} fill="var(--map-parcel-fill)" stroke={conflictIds?.has(site.parcel.id) ? 'var(--danger)' : 'var(--map-parcel-stroke)'} strokeDasharray={conflictIds?.has(site.parcel.id) ? '7 4' : undefined} fillRule="evenodd" vectorEffect="non-scaling-stroke" strokeWidth={conflictIds?.has(site.parcel.id) ? '4' : '2'} />
      {site.buildings.map((b, i) => {
        const coords = points(b), left = Math.min(...coords.map(p => p[0])), top = Math.max(...coords.map(p => p[1]))
        return <g key={b.id}><path d={path(b)} fill="var(--map-roof-fill)" stroke={conflictIds?.has(b.id) ? 'var(--danger)' : 'var(--map-roof-stroke)'} strokeDasharray={conflictIds?.has(b.id) ? '7 4' : undefined} fillRule="evenodd" vectorEffect="non-scaling-stroke" strokeWidth={conflictIds?.has(b.id) ? '4' : '2'}><title>{`Captured roofline ${i + 1}${conflictIds?.has(b.id) ? ': observed conflict' : ''}`}</title></path>
          {b.id !== boundaryInteraction?.mainBuilding?.id && <text x={left} y={-top - extent * .015} className="occupied-roof-label" fontSize={extent * .034}>Roof {i + 1}</text>}</g>
      })}
      {site.named_boundaries.map(b => <path key={b.id} d={path(b)} fill="none" stroke="var(--map-zone-stroke)" vectorEffect="non-scaling-stroke" strokeWidth="2" />)}
      {px !== null && py !== null && w !== null && d !== null && a !== null && w > 0 && d > 0 && <g transform={`translate(${px} ${-py}) rotate(${-a})`}>
        <rect x={-w / 2} y={-d / 2} width={w} height={d} fill="var(--map-zone-fill)" stroke="var(--map-zone-stroke)" strokeWidth="3" vectorEffect="non-scaling-stroke" style={{ cursor: 'grab', touchAction: 'none' }}
          onPointerDown={e => { if (boundaryInteraction && boundaryInteraction.mode !== 'place') return; drag.current = true; suppressClick.current = true; e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId) }} />
        <circle r={Math.min(w, d) / 12} fill="var(--map-zone-stroke)" pointerEvents="none" />
      </g>}
      <g className="occupied-scale" aria-hidden="true"><path d={`M${scaleX} ${scaleY} h${scale} m${-scale} -2 v4 m${scale} -4 v4`} fill="none" stroke="var(--ink)" vectorEffect="non-scaling-stroke" strokeWidth="2" />
        <text x={scaleX} y={scaleY - 3} fontSize={extent * .034}>{scale} m</text></g>
      {boundaryInteraction && <BoundaryOverlay interaction={boundaryInteraction} />}
    </svg>
    <p className="occupied-map-legend"><span>Teal · captured parcel</span><span>Purple · captured rooflines, not walls</span>{conflictIds && <span>Red dashed outline · current conflict</span>}<span>Copper · your nominal footprint</span><span>North ↑ · {site.projected_metre_crs}</span>{!!boundaryInteraction?.streetIds?.length && <span>Grey road bands · your marks, diagram only</span>}</p>
    <MapSourceHelp site={selected} />
    {placementContinuation && <div className="builder-placement-next">{placementContinuation}</div>}
    {showBoundaryTools && boundaryInteraction && <BoundaryMapTools interaction={boundaryInteraction} />}
    {placementSummary && <div className="builder-map-summary">{placementSummary}</div>}
    </div>
  </div>
}

export type OccupiedMeasurement = { site: Case; model: (typeof bundledCatalogue.models)[number] | null; result: Result; widthOrigin: 'catalogue' | 'user'; depthOrigin: 'catalogue' | 'user' }
export type OccupiedLotsProps = {
  placementSummary?: ReactNode
  placementContinuation?: ReactNode
  compactPlacement?: boolean
  allowedModelIds?: readonly string[]
  initialModelId?: string
  onMeasurement?: (measurement: OccupiedMeasurement | null) => void
  showHandoff?: boolean
  suppliedCase?: Case
  boundaryInteraction?: BoundaryMapInteraction
}

export default function OccupiedLots({ allowedModelIds, initialModelId = '', onMeasurement, showHandoff = true, suppliedCase, boundaryInteraction, compactPlacement = false, placementSummary, placementContinuation }: OccupiedLotsProps) {
  const initialModel = bundledCatalogue.models.find(m => m.model_id === initialModelId && (!allowedModelIds || allowedModelIds.includes(m.model_id)))
  const initialDimension = (name: string) => {
    const quantity = initialModel?.measurements.find(m => m.name === name)?.quantity
    return quantity?.unit === 'm' ? String(Number(quantity.value)) : ''
  }
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [caseId, setCaseId] = useState('')
  const [modelId, setModelId] = useState(initialModel?.model_id ?? '')
  const [placement, setPlacement] = useState<Placement>({ x: '', y: '', width: initialDimension('nominal_exterior_width'), depth: initialDimension('nominal_exterior_depth'), angle: '0' })
  const [dimensionOrigins, setDimensionOrigins] = useState<{ width: 'catalogue' | 'user'; depth: 'catalogue' | 'user' }>({ width: initialModel ? 'catalogue' : 'user', depth: initialModel ? 'catalogue' : 'user' })
  const [assumptions, setAssumptions] = useState({ parcel: '', building: '' })
  const [nudgeMetres, setNudgeMetres] = useState(1)
  const [result, setResult] = useState<Result | null>(null)
  const [assessing, setAssessing] = useState(false)
  const [assessmentError, setAssessmentError] = useState('')
  const [rotationFocused, setRotationFocused] = useState(false)
  const activeCheck = useRef<AbortController | null>(null)
  const version = useRef(0)
  const selected = cases.find(c => c.case_id === caseId) ?? null
  const orientation = selected ? suggestPlacementOrientation(selected.site) : null
  const startingAngle = (site: Case) => { const suggestion = suggestPlacementOrientation(site.site); return suggestion.status === 'suggested' ? String(suggestion.angle_degrees) : '0' }
  const allowedModels = bundledCatalogue.models.filter(m => !allowedModelIds || allowedModelIds.includes(m.model_id))
  const model = allowedModels.find(m => m.model_id === modelId)
  function invalidate() { activeCheck.current?.abort(); version.current++; setResult(null); onMeasurement?.(null); setAssessmentError(''); setAssessing(false) }
  function changePlacement(patch: Partial<Placement>) { invalidate(); setPlacement(p => ({ ...p, ...patch })) }
  function changeAssumption(key: 'parcel' | 'building', value: string) { invalidate(); setAssumptions(p => ({ ...p, [key]: value })) }
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    version.current++
    setLoading(true); setError(''); setCases([]); setCaseId(''); setResult(null); onMeasurement?.(null)
    if (suppliedCase) {
      setCases([suppliedCase]); setCaseId(suppliedCase.case_id); setLoading(false)
      setPlacement(current => ({ ...current, x: '', y: '', angle: startingAngle(suppliedCase) }))
      return () => { active = false; version.current++ }
    }
    const timer = setTimeout(() => controller.abort(), 10000)
    void (async () => {
      try {
        const response = await fetch('/api/scouting-sites', { signal: controller.signal })
        if (!response.ok) throw new Error(`Retained site service unavailable (${response.status}).`)
        const found = parseSites(await response.json())
        if (!active) return
        setCases(found); setCaseId(found[0].case_id)
        setPlacement(current => ({ ...current, x: '', y: '', angle: startingAngle(found[0]) }))
      } catch (e) { if (!active) return; if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Retained sites unavailable.')
        else setError('Retained site request timed out.') }
      finally { clearTimeout(timer); if (active) setLoading(false) }
    })()
    return () => { active = false; version.current++; controller.abort(); clearTimeout(timer) }
  }, [reload, suppliedCase])
  function chooseCase(id: string) {
    invalidate(); setCaseId(id)
    const next = cases.find(item => item.case_id === id)
    setPlacement(current => ({ ...current, x: '', y: '', angle: next ? startingAngle(next) : '0' }))
  }
  function placeAtCentre() {
    if (!selected) return
    const p = points(selected.site.parcel)
    changePlacement({ x: String(Number(((Math.min(...p.map(v => v[0])) + Math.max(...p.map(v => v[0]))) / 2).toFixed(2))),
      y: String(Number(((Math.min(...p.map(v => v[1])) + Math.max(...p.map(v => v[1]))) / 2).toFixed(2))) })
  }
  function nudge(dx: number, dy: number) {
    const x = number(placement.x), y = number(placement.y)
    if (x === null || y === null) return
    changePlacement({ x: String(Number((x + dx * nudgeMetres).toFixed(2))), y: String(Number((y + dy * nudgeMetres).toFixed(2))) })
  }
  const nominal = (name: string) => model?.measurements.find(m => m.name === name)?.quantity?.value ?? null
  const dimensionOrigin = (key: 'width' | 'depth') => {
    if (dimensionOrigins[key] === 'catalogue') return 'Catalogue nominal · unreviewed'
    return model ? 'User edited' : 'User entered'
  }
  function chooseModel(id: string) {
    invalidate(); setModelId(id)
    const model = allowedModels.find(m => m.model_id === id)
    const measure = (name: string) => model?.measurements.find(m => m.name === name)?.quantity
    setDimensionOrigins({ width: measure('nominal_exterior_width')?.unit === 'm' ? 'catalogue' : 'user',
      depth: measure('nominal_exterior_depth')?.unit === 'm' ? 'catalogue' : 'user' })
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
    activeCheck.current = controller
    try {
      const response = await fetch('/api/scouting-geometry/assess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: controller.signal })
      if (!response.ok) throw new Error(`Geometry service unavailable (${response.status}).`)
      const parsed = parseResult(await response.json())
      if (version.current === requestVersion) {
        if (parsed.input.parcel.id !== selected.site.parcel.id || parsed.input.projected_metre_crs !== selected.site.projected_metre_crs ||
            JSON.stringify(parsed.input.placement.centre_xy) !== JSON.stringify([x, y]) || parsed.input.placement.width_m !== width || parsed.input.placement.depth_m !== depth || parsed.input.placement.angle_degrees !== angle)
          throw new Error('Assessment returned a different placement.')
        setResult(parsed)
        onMeasurement?.({ site: selected, model: model ?? null, result: parsed, widthOrigin: dimensionOrigins.width, depthOrigin: dimensionOrigins.depth })
      }
    } catch (e) { if (version.current === requestVersion) setAssessmentError(controller.signal.aborted ? 'Assessment timed out. Try again.' : e instanceof Error ? e.message : 'Assessment failed.') }
    finally { clearTimeout(timer); if (version.current === requestVersion) setAssessing(false) }
  }
  useEffect(() => {
    const timer = setTimeout(() => { if (valid && assumptionsValid) void assess() }, 450)
    return () => { clearTimeout(timer); version.current++; activeCheck.current?.abort() }
    // Geometry edits trigger checks; results and callback identity do not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, assumptions, selected])
  const source = selected?.site.parcel.source
  const overlap = result && selected ? overlapFinding(selected, result) : null
  const observedConflicts = overlap?.conflicts ?? []
  const conflictIds = new Set(observedConflicts.flatMap(check => check.source_feature_ids))
  const crossesParcel = observedConflicts.some(check => check.kind === 'containment')
  const overlapsRoof = observedConflicts.some(check => check.kind === 'building_overlap')
  const clearances = result?.checks.filter(c => c.status === 'observed' && ['parcel_boundary_distance', 'nearest_building_distance', 'building_distance', 'named_boundary_distance'].includes(c.kind)) ?? []
  const comparisons = result?.checks.filter(c => c.kind === 'requirement') ?? []
  const otherChecks = result?.checks.filter(c => !['containment', 'building_overlap', 'parcel_boundary_distance', 'nearest_building_distance', 'building_distance', 'named_boundary_distance', 'requirement'].includes(c.kind) || c.status !== 'observed' && c.kind !== 'requirement') ?? []
  const observationIncomplete = otherChecks.length > 0 || overlap?.complete === false
  const geometryTone = observedConflicts.length ? 'conflict' : observationIncomplete || comparisons.some(c => c.comparison !== 'meets') ? 'unknown' : 'clear'
  const summary = result && selected ? [
    `Site: ${selected.label}. ${source?.provider} parcel and roofline observations; ${source?.review_status}; captured ${readableDate(source?.capture_date)}.`,
    `Nominal rectangle: ${show(width)} wide (${dimensionOrigin('width')}) × ${show(depth)} deep (${dimensionOrigin('depth')}); centre ${x}, ${y} in ${selected.site.projected_metre_crs}; rotation ${angle}°. ${model ? `${model.provider} ${model.name}, unreviewed provider lead; provider measurements captured ${readableDate(model.sources[0]?.captured_at)}; source ${model.provider_url}; manufacturer revision ${model.source_revision ?? 'not supplied'}. ${model.service_area_note} ${model.footprint_note}` : 'Dimensions supplied manually by user.'}`,
    `Observed conflicts: ${observedConflicts.length ? observedConflicts.map(check => checkText(check, selected)).join('; ') : observationIncomplete ? 'Some measurements are unresolved; no clear-space conclusion.' : 'No parcel crossing or captured roofline overlap observed at this position; clear space is not established.'}`,
    `Measured clearances: ${clearances.map(check => checkText(check, selected)).join('; ')}`,
    ...comparisons.map(check => `${check.id.includes('parcel') ? 'Parcel boundary' : 'Nearest captured roofline'}: your entered minimum ${show(check.id.includes('parcel') ? parcelMinimum : buildingMinimum)}; measured ${show(check.distance_m)}; ${check.comparison ?? check.status}. This is a user assumption, not a legal threshold.`),
    `Coverage: ${selected.site.capture.scope}; ${selected.site.capture.completeness.replace(/_/g, ' ')}. Captured rooflines are not walls; unmapped obstructions and legal conditions remain unknown. This tests only the supplied placement.`,
    `Next: verify legal parcel lines, building walls and roles, siting pathway, provider dimensions and other site constraints.`,
  ].join('\n') : ''
  return <section className={`occupied-lots${compactPlacement ? ' occupied-lots--compact' : ''}`} aria-labelledby={compactPlacement ? undefined : 'occupied-title'} aria-label={compactPlacement ? 'Model 300 placement map' : undefined}>
    {!compactPlacement && <><p className="eyebrow">Occupied-lot workspace</p><h2 id="occupied-title">See what this footprint meets on a captured lot</h2></>}
    <p className="occupied-intro">{compactPlacement ? 'Click the map or drag the rectangle. Captured geometry is checked after edits settle.' : `${suppliedCase ? 'Use your selected property observation and set the nominal footprint.' : 'Choose a retained Victoria parcel and set the nominal footprint.'} Click to place it. Observed overlaps and distances are checked automatically after edits settle.`}</p>
    {compactPlacement ? <details><summary>Map scope and limitations</summary><p className="notice">Approximate, parcel-intersecting captures only. Rooflines are not walls; no observed overlap does not certify clear space. Legal boundaries, setbacks, other obstructions and provider dimensions need separate review. This does not establish site fit or permit eligibility.</p></details> : <p className="notice">Approximate, parcel-intersecting captures only. Rooflines are not walls; no observed overlap does not certify clear space. Legal boundaries, setbacks, other obstructions and provider dimensions need separate review. This does not establish site fit or permit eligibility.</p>}
    {loading && <p role="status">Loading retained sites…</p>}
    {error && <p role="alert">{error} No site sketch is available. <button onClick={() => setReload(n => n + 1)}>Retry</button></p>}
    {selected && <>
      {(!compactPlacement || !suppliedCase) && <div className="occupied-site-select"><label htmlFor="occupied-site">Captured parcel</label><select id="occupied-site" value={caseId} onChange={e => chooseCase(e.target.value)}>
        {cases.map(c => <option key={c.case_id} value={c.case_id}>{c.label}</option>)}</select>
        <p className="metadata">{source?.provider} · {source?.record_label} · captured {readableDate(source?.capture_date)} · {source?.review_status}.
          {publicSourceUrl(source?.reference) && <> {' '}<a href={publicSourceUrl(source?.reference)!} target="_blank" rel="noreferrer">Parcel source</a></>}</p></div>}
      {compactPlacement && <div className="occupied-compact-summary"><strong>{model ? `${model.name} · ` : 'Manual footprint · '}{show(width)} wide × {show(depth)} long</strong><span>Nominal exterior rectangle · {dimensionOrigin('width').toLowerCase()} width, {dimensionOrigin('depth').toLowerCase()} length.</span><span>{source?.provider} · {source?.record_label} · captured {readableDate(source?.capture_date)} · {source?.review_status}. {publicSourceUrl(source?.reference) && <a href={publicSourceUrl(source?.reference)!} target="_blank" rel="noreferrer">Parcel source</a>}</span></div>}
      <div className="occupied-workspace">
        <div className="occupied-map-column">
          <Map placementContinuation={placementContinuation} placementSummary={placementSummary} showBoundaryTools selected={selected} placement={placement} nudgeMetres={nudgeMetres} conflictIds={compactPlacement ? conflictIds : undefined} onMove={(x, y) => changePlacement({ x: String(x), y: String(y) })} boundaryInteraction={boundaryInteraction} />
          <div className="occupied-map-actions" hidden={!!boundaryInteraction && boundaryInteraction.mode !== 'place'}><button onClick={placeAtCentre}>{compactPlacement ? 'Place or reset at parcel centre' : 'Recenter rectangle on parcel'}</button>
            <button disabled={number(placement.x) === null && number(placement.y) === null} onClick={() => changePlacement({ x: '', y: '' })}>Clear placement</button></div>
          <details><summary>About the starting position</summary><p>Recenter uses the parcel drawing's bounding-box centre as a sketch starting point. It does not search for a suitable location.</p></details>
        </div>
        <div className="occupied-side">
          <div className="occupied-controls" hidden={!!boundaryInteraction && boundaryInteraction.mode !== 'place'}>
            <details className="occupied-model-settings" open={!compactPlacement ? true : undefined}><summary>{compactPlacement ? 'Details and edit dimensions' : 'Set the nominal footprint'}</summary>
            <label htmlFor="occupied-model">Prefab model or manual dimensions</label><select id="occupied-model" value={modelId} onChange={e => chooseModel(e.target.value)}>
              {!allowedModelIds && <option value="">Manual nominal footprint</option>}{allowedModels.map(m => <option key={m.model_id} value={m.model_id}>{m.provider} · {m.name}</option>)}</select>
            {model && <p className="metadata">{model.provider} · {model.name} · provider measurements captured {readableDate(model.sources[0]?.captured_at)} · unreviewed. <a href={model.provider_url} target="_blank" rel="noreferrer">Provider model page</a>. Manufacturer revision {model.source_revision ?? 'not supplied'}. {model.service_area_note} {model.footprint_note}</p>}
            {model && <PublishedDimensions model={model} />}
            <div className="occupied-fields">{(['width', 'depth'] as const).map(key => <div key={key}>
              <MeasurementLabel field={key} inputId={`occupied-${key}`} />
              <MeasurementInput id={`occupied-${key}`} dimension="length" type="number" step="any" value={placement[key]} onChange={e => { setDimensionOrigins(p => ({ ...p, [key]: 'user' })); changePlacement({ [key]: e.target.value }) }} />
              <small>{dimensionOrigin(key)}{model && nominal(key === 'width' ? 'nominal_exterior_width' : 'nominal_exterior_depth') ? ` · catalogue ${measurementWithUnit(nominal(key === 'width' ? 'nominal_exterior_width' : 'nominal_exterior_depth'), 'length')}` : ''}</small>
            </div>)}</div>
            <p className="metadata">These values describe a nominal exterior rectangle, not an installed envelope. This placement sketch measures width and length only; it does not check height.</p>
            <p className="metadata">Lengths display to two decimal places and areas to one. Focus a field to edit its full value. Comparisons use stored values; full measurements remain in the evidence export.</p>
            </details>
            <h3>{compactPlacement ? 'Adjust the footprint' : '2 · Adjust the position'}</h3>
            <p className="metadata">Click the map or drag the rectangle. Checks update automatically after movement settles.</p>
            <div className="occupied-main-actions"><label htmlFor="occupied-angle">Rotation (degrees)</label><input id="occupied-angle" type="number" step="any" value={rotationFocused || !placement.angle.trim() || !Number.isFinite(Number(placement.angle)) ? placement.angle : String(Number(Number(placement.angle).toFixed(2)))} onFocus={() => setRotationFocused(true)} onBlur={() => setRotationFocused(false)} onChange={e => changePlacement({ angle: e.target.value })} />
            <button type="button" disabled={orientation?.status !== 'suggested'} onClick={() => { if (orientation?.status === 'suggested') changePlacement({ angle: String(orientation.angle_degrees) }) }}>Align to lot</button></div>
            <p className="metadata">{orientation?.status === 'suggested' ? 'Alignment follows the approximate long direction; it does not choose a clear position or establish legal frontage.' : orientation?.reason}</p>
            <details className="occupied-fine-adjustment" open={!compactPlacement}><summary>Fine adjustment</summary>
            <div className="occupied-nudge"><label htmlFor="occupied-step">Move by</label><select id="occupied-step" value={nudgeMetres} onChange={e => setNudgeMetres(Number(e.target.value))}>
              <option value={0.25}>0.25 m</option><option value={1}>1 m</option><option value={5}>5 m</option></select>
              <div className="occupied-direction"><button disabled={x === null || y === null} onClick={() => nudge(0, 1)} aria-label={`Move north ${nudgeMetres} ${nudgeMetres === 1 ? 'metre' : 'metres'}`}>↑ North</button>
                <button disabled={x === null || y === null} onClick={() => nudge(-1, 0)} aria-label={`Move west ${nudgeMetres} ${nudgeMetres === 1 ? 'metre' : 'metres'}`}>← West</button>
                <button disabled={x === null || y === null} onClick={() => nudge(1, 0)} aria-label={`Move east ${nudgeMetres} ${nudgeMetres === 1 ? 'metre' : 'metres'}`}>East →</button>
                <button disabled={x === null || y === null} onClick={() => nudge(0, -1)} aria-label={`Move south ${nudgeMetres} ${nudgeMetres === 1 ? 'metre' : 'metres'}`}>↓ South</button></div>
              <p className="metadata">Focus the map and use arrow keys for the same metre increments.</p></div>
            <details><summary>Advanced position · projected XY</summary><p className="metadata">Centre coordinates in {selected.site.projected_metre_crs}, metres.</p>
              <div className="occupied-fields">{(['x', 'y'] as const).map(key => <div key={key}><label htmlFor={`occupied-${key}`}>Centre {key.toUpperCase()} (m)</label>
                <input id={`occupied-${key}`} type="number" step="any" value={placement[key]} onChange={e => changePlacement({ [key]: e.target.value })} /></div>)}</div></details>
            <details><summary>Compare your own clearance assumptions</summary>
              <p className="metadata">Optional what-if targets entered by you; these are not Victoria setbacks.</p>
              <div className="occupied-fields"><div><label htmlFor="occupied-parcel-minimum">Minimum to parcel boundary (m)</label>
                <MeasurementInput id="occupied-parcel-minimum" dimension="length" type="number" min="0" step="any" value={assumptions.parcel} onChange={e => changeAssumption('parcel', e.target.value)} /></div>
                <div><label htmlFor="occupied-building-minimum">Minimum to nearest captured roofline (m)</label>
                  <MeasurementInput id="occupied-building-minimum" dimension="length" type="number" min="0" step="any" value={assumptions.building} onChange={e => changeAssumption('building', e.target.value)} /></div></div>
            </details>
            </details>
            {(!valid || !assumptionsValid) && <p role="status">Place the rectangle, enter positive width and depth, a finite rotation, and nonnegative optional minimums to measure.</p>}
            <button className="sr-primary" disabled={!valid || !assumptionsValid || assessing} onClick={() => void assess()}>{assessing ? 'Checking…' : assessmentError ? 'Retry placement check' : 'Recheck placement'}</button>
            {assessmentError && <p role="alert">{assessmentError} Edit the sketch or try again; no result is shown.</p>}
          </div>
          {compactPlacement ? result && (observedConflicts.length > 0 || observationIncomplete || comparisons.some(c => c.comparison === null)) && <div className={`placement-check placement-check--${observedConflicts.length ? 'conflict' : 'unknown'}`} role="alert">
            <strong>{observedConflicts.length ? 'Conflict at this position' : 'Placement could not be fully checked'}</strong>
            <p>{observedConflicts.length ? `${crossesParcel ? 'The unit crosses or touches the mapped parcel boundary. ' : ''}${overlapsRoof ? 'The unit overlaps or touches a mapped roofline. ' : ''}Move the unit on the map and recheck. This finding applies to this position only.` : 'Some mapped geometry or your comparison could not be checked. Review How we checked and try another position.'}</p>
          </div> : <div className={`placement-check placement-check--${result ? geometryTone : 'unknown'}`} role="status">
            <strong><span aria-hidden="true">{result ? geometryTone === 'conflict' ? '✕ ' : geometryTone === 'clear' ? '✓ ' : '… ' : '… '}</span>{result ? geometryTone === 'conflict' ? 'Observed geometry conflict' : geometryTone === 'clear' ? 'No observed geometry conflict' : 'Clearance or geometry needs review' : assessing ? 'Checking placement…' : assessmentError ? 'Check unavailable' : 'Place or edit the rectangle for an automatic check'}</strong>
            <p>Approximate captured geometry only. Zoning legality, other obstructions and permit eligibility remain unassessed.</p>
          </div>}
          {result && <details className="occupied-results" open={!compactPlacement}><summary>{compactPlacement ? 'How we checked · geometry measurements and evidence' : 'Geometry observations and exact evidence'}</summary><section aria-labelledby="occupied-results"><p className="eyebrow">Measured position only</p><h3 id="occupied-results">{observedConflicts.length ? 'Observed conflicts at this position' : observationIncomplete ? 'Some measurements unresolved' : 'No overlap observed at this position'}</h3>
            <p>These observations cover the supplied rectangle and mapped features only. Another position could differ.</p>
            <h4>Observed conflicts</h4>{observedConflicts.length ? <ul>{observedConflicts.map(c => <li key={c.id}>{checkText(c, selected)}</li>)}</ul> : <p>{observationIncomplete ? 'Some measurements are unresolved; inspect them below before drawing an overlap conclusion.' : 'No parcel crossing or captured roofline overlap was observed for this placement. This does not establish clear space.'}</p>}
            <h4>Measured clearances</h4><ul>{clearances.map(c => <li key={c.id}>{checkText(c, selected)}</li>)}</ul>
            {comparisons.length > 0 && <><h4>Your assumption comparisons</h4><ul>{comparisons.map(c => {
              const parcel = c.id.includes('parcel'), entered = parcel ? parcelMinimum : buildingMinimum
              return <li key={c.id}>{parcel ? 'Parcel boundary' : 'Nearest captured roofline'}: you entered {show(entered)} minimum; measured {show(c.distance_m)}. {c.comparison === 'meets' ? `Meets your target by ${show(c.margin_m)}.` : c.comparison === 'shortfall' ? `Short by ${show(c.margin_m === null ? null : Math.abs(c.margin_m))}.` : `Comparison ${c.status.replace(/_/g, ' ')}${c.reason ? ` (${c.reason.replace(/_/g, ' ')})` : ''}.`} User assumption, not a legal threshold.</li>
            })}</ul></>}
            {otherChecks.length > 0 && <><h4>Unresolved measurements</h4><ul>{otherChecks.map(c => <li key={c.id}>{checkText(c, selected)}</li>)}</ul></>}
            <h4>Remaining questions</h4><ul><li>Are legal parcel lines and current siting rules different from this capture?</li><li>Where are the walls, principal building and other unmapped obstructions?</li><li>Are the provider footprint and installed clearances confirmed for this configuration?</li></ul>
            <p className="metadata">Capture: {selected.site.capture.scope}; {selected.site.capture.completeness.replace(/_/g, ' ')}. {selected.site.capture.limitations.join(' ')}</p>
            <CopyableRecord id="occupied-summary" label="Copyable plain-language summary" value={summary} />
            <TechnicalDetails title="Exact sources, IDs, placement and assessment · copyable"><textarea readOnly aria-label="Complete geometry evidence record" value={JSON.stringify({ site: selected, model, assessment: result }, null, 2)} rows={14} /></TechnicalDetails>
          </section></details>}
          {showHandoff && <ScenarioHandoff site={selected} model={model ?? null} assessment={result} />}
        </div>
      </div>
      <TechnicalDetails title="Captured site source and exact identifiers"><pre>{JSON.stringify(selected, null, 2)}</pre></TechnicalDetails>
    </>}
  </section>
}
