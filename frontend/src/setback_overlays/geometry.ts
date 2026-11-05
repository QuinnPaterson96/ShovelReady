import { expectedPropertyRevision } from '../conditional_screening/model'
import { parseScenarioResult, type ScenarioRequest, type ScenarioResult } from '../conditional_screening/scenarios'
import { ordinaryFourEdgeBoundary, type BoundaryEdge } from '../zoning_site_assumptions/model'

export type SetbackContext = {
  request: ScenarioRequest | null; result: ScenarioResult | null
  guideKey?: string; illustrative?: boolean; placementOutsideParcel?: boolean
}
type GuideInputs = Pick<ScenarioRequest, 'assumptions' | 'model_revision' | 'proposal' | 'proposal_evidence' | 'street_edge_id' | 'rear_edge_id' | 'street_pattern'>
/** Position and bearing do not move a boundary. Manual wall measurements suppress
 * their edge's planning buffer, so adding or clearing an override changes this key. */
export function setbackGuideKey(municipalityKey: string, illustrative: boolean, inputs: GuideInputs): string {
  const { assumptions, model_revision, proposal, proposal_evidence, street_edge_id, rear_edge_id, street_pattern } = inputs
  const pathwayFields = ['proposed_use', 'foundation_attached', 'confirmed_zone', 'confirmed_instrument', 'legal_lot_confirmed', 'no_relevant_projections'] as const
  const pathway = pathwayFields.map(field => [proposal[field], proposal_evidence?.[field]])
  return JSON.stringify([municipalityKey, illustrative, model_revision, pathway, street_edge_id, rear_edge_id, street_pattern,
    assumptions.property, assumptions.edges, assumptions.planning_buffers_m, assumptions.street_adjacency, assumptions.boundary_role_suggestions,
    assumptions.waterfront, assumptions.waterfront_edge_ids, assumptions.building_type, Object.keys(assumptions.measurements.boundary).sort()])
}
type Point = [number, number]
type Scenario = ScenarioResult['scenarios'][number]
export type SetbackLine = {
  edgeId: string; edgeNumber: number; role: Scenario['checks'][number]['role'] | 'front'; minimum: number; buffer: number;
  candidate: [Point, Point] | null; planning: [Point, Point] | null; manualMeasurement: boolean;
}
export type SetbackDrawing = {
  status: 'ready'; parcel: Point[]; candidateArea: Point[]; planningArea: Point[]; lines: SetbackLine[];
  scenarioIndex: number; scenarioCount: number; frontEdgeNumber: number; scenarioKey: string;
  choices: { key: string; front: number }[]; sources: GuideSource[]; streetUnresolved: boolean;
  frontNote: string | null; illustrative: boolean; extent: number;
} | { status: 'pending' | 'unavailable'; reason: string }

/** A whole assignment is selected; no per-edge optimistic merging is allowed. */
export function setbackScenarioKey(scenario: { front_edge_id: string; checks: { edge_id: string; role: string }[] }): string {
  return JSON.stringify([scenario.front_edge_id, scenario.checks.map(check => [check.edge_id, check.role]).sort((a, b) => a[0].localeCompare(b[0]))])
}

const EPSILON = 1e-8
function inwardDistance(point: Point, edge: BoundaryEdge, orientation: number): number {
  const dx = edge.end[0] - edge.start[0], dy = edge.end[1] - edge.start[1]
  return orientation * (dx * (point[1] - edge.start[1]) - dy * (point[0] - edge.start[0])) / Math.hypot(dx, dy)
}

/** Convex half-plane clipping in metres, calculated relative to each edge so
 * large projected coordinates do not lose the setback's precision. */
function clip(polygon: Point[], edge: BoundaryEdge, offset: number, orientation: number): Point[] {
  const output: Point[] = []
  polygon.forEach((start, index) => {
    const end = polygon[(index + 1) % polygon.length]
    const a = inwardDistance(start, edge, orientation) - offset, b = inwardDistance(end, edge, orientation) - offset
    const startInside = a >= 0, endInside = b >= 0
    if (startInside) output.push(start)
    if (startInside !== endInside) {
      const fraction = a / (a - b)
      output.push([start[0] + fraction * (end[0] - start[0]), start[1] + fraction * (end[1] - start[1])])
    }
  })
  return output
}

function offsetLine(polygon: Point[], edge: BoundaryEdge, offset: number, orientation: number): [Point, Point] | null {
  const intersections: Point[] = []
  const add = (point: Point) => {
    if (!intersections.some(other => Math.hypot(other[0] - point[0], other[1] - point[1]) < EPSILON)) intersections.push(point)
  }
  polygon.forEach((start, index) => {
    const end = polygon[(index + 1) % polygon.length]
    const a = inwardDistance(start, edge, orientation) - offset, b = inwardDistance(end, edge, orientation) - offset
    if (Math.abs(a) < EPSILON) add(start)
    if (a * b < 0) {
      const fraction = a / (a - b)
      add([start[0] + fraction * (end[0] - start[0]), start[1] + fraction * (end[1] - start[1])])
    }
  })
  return intersections.length === 2 ? [intersections[0], intersections[1]] : null
}

type GuideSource = Omit<ScenarioResult['sources'][number], 'capture_date'> & { capture_date?: string | null }
type GuideCheck = { edge_id: string; role: SetbackLine['role']; minimum_m: number; buffer: number; manual: boolean }
type GuideSet = {
  status: 'ready'; key?: string; sourceKey: string; edges: BoundaryEdge[]; sources: GuideSource[]; illustrative: boolean
  scenarios: { key: string; front: string; checks: GuideCheck[] }[]; streetUnresolved: boolean; frontNote: string | null
}
type GuideState = GuideSet | Exclude<SetbackDrawing, { status: 'ready' }>

function sourceKey(result: ScenarioResult): string {
  const front = result.additional_checks?.find(check => check.id === 'front')
  return JSON.stringify([result.packet_id, result.packet_revision, result.thresholds_m, result.sources,
    result.additional_revision, front?.threshold, front?.unit, front?.source])
}

/** Project only parcel edges, source records and rule offsets. The retained
 * representation contains no measured gaps, compared outcomes or placement. */
export function resolveSetbackGuides(context: SetbackContext, previous: GuideState | null = null): GuideState {
  const { request, result } = context
  const compatible = context.guideKey && previous?.status === 'ready' && context.guideKey === previous.key &&
    !!context.illustrative === previous.illustrative ? previous : null
  if (!result || !request) return compatible ?? { status: 'pending', reason: 'Setback lines update with the current boundary checks.' }
  if (result.property_revision !== expectedPropertyRevision(request.assumptions) ||
      result.placement_revision !== request.assumptions.placement_revision || result.model_revision !== request.model_revision)
    return { status: 'unavailable', reason: 'Setback lines are waiting for checks of the current property and placement.' }
  const edges = [...request.assumptions.edges].sort((a, b) => a.segment - b.segment)
  const geometry = request.geometry.parcel.shape.geometry
  const rings = geometry.coordinates as Point[][]
  if (!ordinaryFourEdgeBoundary(edges) || geometry.type !== 'Polygon' || !Array.isArray(rings) || rings.length !== 1 ||
      rings[0].length !== 5 || edges.some((edge, index) => edge.start[0] !== rings[0][index][0] || edge.start[1] !== rings[0][index][1]))
    return { status: 'unavailable', reason: 'Setback lines are available for simple four-edge parcels. Keep exploring this outline using the measurements.' }
  try { parseScenarioResult(result, request) } catch {
    return { status: 'unavailable', reason: 'The setback drawing does not match the current boundary checks. Recheck the placement.' }
  }
  const sourceIdentity = sourceKey(result)
  if (!result.scenarios.length) {
    if (context.placementOutsideParcel && compatible?.sourceKey === sourceIdentity) return compatible
    return { status: 'unavailable', reason: 'No supported setback scenario is available for these inputs. Your placement remains editable.' }
  }
  const frontCheck = result.additional_checks?.find(check => check.id === 'front')
  const frontEdges = new Set(result.scenarios.map(scenario => scenario.front_edge_id))
  // This additional check aggregates its measured front distance across all tested
  // front choices. Only a single shared front identifies a particular mapped line.
  const showFront = frontEdges.size === 1 && frontCheck && frontCheck.observed !== null && frontCheck.unit === 'm' &&
    frontCheck.threshold !== null && ['checked', 'probable', 'review', 'conflict'].includes(frontCheck.status)
  const scenarios = result.scenarios.map(scenario => {
    const checks: GuideCheck[] = scenario.checks.map(check => ({ edge_id: check.edge_id, role: check.role,
      minimum_m: check.minimum_m, buffer: check.planning_buffer_m ?? 0, manual: check.basis === 'user_wall_to_lot_line' }))
    if (showFront) {
      const manual = !!request.assumptions.measurements.boundary[scenario.front_edge_id]
      checks.push({ edge_id: scenario.front_edge_id, role: 'front', minimum_m: frontCheck.threshold!,
        buffer: manual ? 0 : request.assumptions.planning_buffers_m?.[scenario.front_edge_id] ?? 0, manual })
    }
    return { key: setbackScenarioKey(scenario), front: scenario.front_edge_id, checks }
  })
  return { status: 'ready', key: context.guideKey, sourceKey: sourceIdentity, edges, scenarios, illustrative: !!context.illustrative,
    sources: showFront ? [...result.sources, frontCheck.source] : result.sources,
    streetUnresolved: request.assumptions.street_adjacency?.all_marked === false,
    frontNote: showFront ? null : frontEdges.size > 1 ? 'Several front edges are plausible. Mark street edges to narrow the front setback guide.'
      : 'A front setback guide needs a supported front-distance check for this edge.' }
}

export function drawSetbackGuides(guides: GuideState, scenarioKey?: string): SetbackDrawing {
  if (guides.status !== 'ready') return guides
  const { edges, scenarios } = guides
  const found = scenarios.findIndex(scenario => scenario.key === scenarioKey)
  const scenarioIndex = found >= 0 ? found : 0, scenario = scenarios[scenarioIndex]
  const parcel = edges.map(edge => edge.start)
  const first = edges[0], second = edges[1]
  const orientation = Math.sign((first.end[0] - first.start[0]) * (second.end[1] - second.start[1]) -
    (first.end[1] - first.start[1]) * (second.end[0] - second.start[0]))
  let candidateArea = parcel, planningArea = parcel
  const lines = scenario.checks.map(check => {
    const edge = edges.find(item => item.id === check.edge_id)!
    const buffer = check.buffer
    candidateArea = clip(candidateArea, edge, check.minimum_m, orientation)
    planningArea = clip(planningArea, edge, check.minimum_m + buffer, orientation)
    return { edgeId: edge.id, edgeNumber: edge.segment + 1, role: check.role, minimum: check.minimum_m, buffer,
      candidate: offsetLine(parcel, edge, check.minimum_m, orientation),
      planning: buffer > 0 ? offsetLine(parcel, edge, check.minimum_m + buffer, orientation) : null,
      manualMeasurement: check.manual }
  })
  const choices = scenarios.map(item => ({ key: item.key, front: edges.find(edge => edge.id === item.front)!.segment + 1 }))
  return { status: 'ready', parcel, candidateArea, planningArea, lines, scenarioIndex, scenarioCount: scenarios.length,
    frontEdgeNumber: choices[scenarioIndex].front, scenarioKey: scenario.key, choices, sources: guides.sources,
    frontNote: guides.frontNote, illustrative: guides.illustrative, streetUnresolved: guides.streetUnresolved,
    extent: Math.max(20, Math.max(...parcel.map(point => point[0])) - Math.min(...parcel.map(point => point[0])),
      Math.max(...parcel.map(point => point[1])) - Math.min(...parcel.map(point => point[1]))) }
}

export function buildSetbackDrawing(context: SetbackContext, scenarioKey?: string): SetbackDrawing {
  return drawSetbackGuides(resolveSetbackGuides(context), scenarioKey)
}

export function setbackPolygonPath(points: Point[]): string {
  return points.length >= 3 ? `${points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${-y}`).join(' ')} Z` : ''
}
