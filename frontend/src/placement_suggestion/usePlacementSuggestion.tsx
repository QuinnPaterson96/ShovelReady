import { useEffect, useRef, useState } from 'react'
import type { ScenarioRequest, ScenarioResult } from '../conditional_screening/scenarios'
import type { Site } from '../occupied_lots/contract'
import { setbackScenarioKey } from '../setback_overlays/geometry'

export type SuggestionContext = Omit<ScenarioRequest, 'schema_version' | 'geometry'>
export type SuggestionGeometry = Site & {
  schema_version: 'scouting-geometry.v1'
  placement: { id: string; centre_xy: [number, number]; width_m: number; depth_m: number; angle_degrees: number }
  requirements: { id: string; target: string; minimum_m: number; status: string }[]
}
export type PlacementSuggestion = {
  schema_version: 'placement-suggestion.result.v1'
  status: 'suggested' | 'no_suggestion' | 'unsupported'
  basis: 'candidate_scenario' | 'mapped_geometry'
  message: string
  placement: SuggestionGeometry['placement'] | null
  selected_scenario: ScenarioResult['scenarios'][number] | null
  scenario_context_applied: boolean
  evaluated_positions: number
  capture: Site['capture']
  sources: ScenarioResult['sources']
  limitations: string[]
}

function contextForSearch(context: SuggestionContext | null | undefined, geometry: SuggestionGeometry | null): SuggestionContext | null {
  if (!context) return null
  const floor = context.assumptions.measurements.floor_area
  return { ...context, ...(context.additional_inputs && geometry ? { additional_inputs: { ...context.additional_inputs,
    nominal_footprint_area_m2: floor?.basis === 'rough_floor_area_estimate' ? floor.value : geometry.placement.width_m * geometry.placement.depth_m } } : {}),
    assumptions: { ...context.assumptions, placement_revision: 'suggestion-context',
    measurements: { boundary: {}, principal_separation: null,
      floor_area: floor ? { ...floor, placement_revision: 'suggestion-context' } : null } } }
}

function parseSuggestion(raw: unknown, geometry: SuggestionGeometry): PlacementSuggestion {
  const value = raw as PlacementSuggestion
  const p = value?.placement
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n)
  if (!value || value.schema_version !== 'placement-suggestion.result.v1' ||
      !['suggested', 'no_suggestion', 'unsupported'].includes(value.status) ||
      !['candidate_scenario', 'mapped_geometry'].includes(value.basis) || typeof value.message !== 'string' ||
      !Array.isArray(value.limitations) || !value.limitations.every(text => typeof text === 'string') ||
      !Array.isArray(value.sources) || typeof value.scenario_context_applied !== 'boolean' ||
      typeof value.capture?.scope !== 'string' || typeof value.capture?.completeness !== 'string' ||
      value.capture.scope !== geometry.capture.scope || value.capture.completeness !== geometry.capture.completeness ||
      (value.status === 'suggested' && ((value.basis === 'candidate_scenario') !== !!value.selected_scenario ||
        value.scenario_context_applied !== !!value.selected_scenario)) ||
      (value.selected_scenario !== null && (typeof value.selected_scenario?.front_edge_id !== 'string' ||
        !Array.isArray(value.selected_scenario.checks) || value.selected_scenario.checks.length !== 3 || !value.selected_scenario.checks.every(check =>
          typeof check?.edge_id === 'string' && ['side', 'rear', 'flanking_street'].includes(check.role)))) ||
      !Number.isInteger(value.evaluated_positions) || value.evaluated_positions < 0 ||
      (value.status === 'suggested' ? !p || !Array.isArray(p.centre_xy) || p.centre_xy.length !== 2 || !p.centre_xy.every(finite) ||
        !finite(p.angle_degrees) || p.width_m !== geometry.placement.width_m || p.depth_m !== geometry.placement.depth_m : p !== null))
    throw new Error('The suggestion response did not match the current footprint.')
  return value
}

/** Auto-run once per property; every deliberate edit cancels pending movement. */
export function usePlacementSuggestion({ geometry, context, propertyKey, enabled = true, auto = true, onApply }: {
  geometry: SuggestionGeometry | null
  context?: SuggestionContext | null
  propertyKey: string | null
  enabled?: boolean
  auto?: boolean
  onApply: (placement: SuggestionGeometry['placement'], evidence: PlacementSuggestion) => void
}) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<PlacementSuggestion | null>(null)
  const [error, setError] = useState('')
  const sequence = useRef(0)
  const active = useRef<AbortController | null>(null)
  const automaticRequest = useRef(false)
  const started = useRef<string | null>(null)
  const edited = useRef<string | null>(null)
  const latest = useRef({ geometry, context, onApply })
  latest.current = { geometry, context, onApply }
  const cleanContext = contextForSearch(context, geometry)
  // A suggestion's own centre/rotation and subsequent measurement revision do
  // not change its evidence. Dimensions, outlines and boundary inputs do.
  const evidenceKey = JSON.stringify([geometry && { ...geometry, placement: {
    width_m: geometry.placement.width_m, depth_m: geometry.placement.depth_m } }, cleanContext])

  function cancel() {
    edited.current = propertyKey
    sequence.current++; active.current?.abort(); active.current = null; setBusy(false); setResult(null); setError('')
  }
  async function run(automatic = false) {
    const current = latest.current
    if (!enabled || !current.geometry) return
    started.current = propertyKey
    active.current?.abort()
    const controller = new AbortController(), requestSequence = ++sequence.current
    active.current = controller
    automaticRequest.current = automatic
    setBusy(true); setError(''); setResult(null)
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch('/api/placement-suggestions/v1/suggest', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ schema_version: 'placement-suggestion.request.v1', geometry: current.geometry,
          scenario_context: contextForSearch(current.context, current.geometry) }) })
      if (!response.ok) throw new Error('Placement suggestion unavailable. Try again or place the unit manually.')
      const suggested = parseSuggestion(await response.json(), current.geometry)
      if (sequence.current !== requestSequence) return
      setResult(suggested)
      if (suggested.placement) current.onApply(suggested.placement, suggested)
    } catch (error) {
      if (sequence.current === requestSequence) setError(controller.signal.aborted
        ? 'Placement suggestion timed out. Try again or place the unit manually.'
        : error instanceof Error ? error.message : 'Placement suggestion unavailable. Continue manually.')
    } finally {
      clearTimeout(timer)
      if (sequence.current === requestSequence) { active.current = null; setBusy(false) }
    }
  }
  useEffect(() => {
    // A municipal lookup may finish while the first untouched search is pending.
    // Retry it against the arriving context; never move an already placed unit.
    if (active.current && automaticRequest.current) started.current = null
    sequence.current++; active.current?.abort(); active.current = null; setBusy(false); setResult(null); setError('')
    if (!auto || !enabled || !geometry || !propertyKey || started.current === propertyKey || edited.current === propertyKey) return
    const timer = setTimeout(() => { if (edited.current !== propertyKey) void run(true) }, 180)
    return () => clearTimeout(timer)
    // Requests read the latest closure; keys deliberately exclude the position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceKey, propertyKey, enabled, auto])
  useEffect(() => () => { sequence.current++; active.current?.abort() }, [])
  const scenario = result?.selected_scenario
  const preferredScenarioKey = scenario ? setbackScenarioKey(scenario) : undefined
  return { busy, result, error, cancel, run, preferredScenarioKey, available: !!geometry && enabled }
}

export function SuggestionControls({ suggestion }: { suggestion: ReturnType<typeof usePlacementSuggestion> }) {
  return <div className="placement-suggestion">
    <button type="button" disabled={suggestion.busy || !suggestion.available} onClick={() => void suggestion.run()}>
      {suggestion.busy ? 'Finding a starting position…' : 'Suggest a placement'}
    </button>
    {(suggestion.error || suggestion.result) && <p role="status">{suggestion.error || suggestion.result?.message}</p>}
    {suggestion.result?.status === 'suggested' && <details><summary>About this starting suggestion</summary>
      <p>{suggestion.result.basis === 'candidate_scenario' ? 'Uses the candidate boundary scenario shown on the map, with your extra planning margins.' : 'Uses mapped geometry only; city setback rules were not applied.'} It does not move again when you adjust the unit.</p>
      <p>Captured outlines: {suggestion.result.capture.scope}. Coverage: {suggestion.result.capture.completeness.replace(/_/g, ' ')}.</p>
      <p>{suggestion.result.limitations.join(' ')}</p>
      <details><summary>Exact suggestion evidence</summary><pre>{JSON.stringify(suggestion.result, null, 2)}</pre></details>
    </details>}
  </div>
}
