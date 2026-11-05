import { expectedPropertyRevision } from '../conditional_screening/model'
import { parseScenarioResult, type ScenarioRequest, type ScenarioResult } from '../conditional_screening/scenarios'
import { ordinaryFourEdgeBoundary, type BoundaryEdge } from '../zoning_site_assumptions/model'

export type SetbackContext = { request: ScenarioRequest; result: ScenarioResult | null }
type Point = [number, number]
type Scenario = ScenarioResult['scenarios'][number]
export type SetbackLine = {
  edgeId: string; edgeNumber: number; role: Scenario['checks'][number]['role']; minimum: number; buffer: number;
  candidate: [Point, Point] | null; planning: [Point, Point] | null; manualMeasurement: boolean;
}
export type SetbackDrawing = {
  status: 'ready'; parcel: Point[]; candidateArea: Point[]; planningArea: Point[]; lines: SetbackLine[];
  scenarioIndex: number; scenarioCount: number; frontEdgeNumber: number; scenarioKey: string;
  result: ScenarioResult; extent: number;
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

export function buildSetbackDrawing(context: SetbackContext, scenarioKey?: string): SetbackDrawing {
  const { request, result } = context
  if (!result) return { status: 'pending', reason: 'Setback lines update with the current boundary checks.' }
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
  if (!result.scenarios.length) return { status: 'unavailable', reason: 'No supported setback scenario is available for these inputs. Your placement remains editable.' }
  const found = result.scenarios.findIndex(scenario => setbackScenarioKey(scenario) === scenarioKey)
  const scenarioIndex = found >= 0 ? found : 0, scenario = result.scenarios[scenarioIndex]
  const parcel = edges.map(edge => edge.start)
  const first = edges[0], second = edges[1]
  const orientation = Math.sign((first.end[0] - first.start[0]) * (second.end[1] - second.start[1]) -
    (first.end[1] - first.start[1]) * (second.end[0] - second.start[0]))
  let candidateArea = parcel, planningArea = parcel
  const lines = scenario.checks.map(check => {
    const edge = edges.find(item => item.id === check.edge_id)!
    const buffer = check.planning_buffer_m ?? 0
    candidateArea = clip(candidateArea, edge, check.minimum_m, orientation)
    planningArea = clip(planningArea, edge, check.minimum_m + buffer, orientation)
    return { edgeId: edge.id, edgeNumber: edge.segment + 1, role: check.role, minimum: check.minimum_m, buffer,
      candidate: offsetLine(parcel, edge, check.minimum_m, orientation),
      planning: buffer > 0 ? offsetLine(parcel, edge, check.minimum_m + buffer, orientation) : null,
      manualMeasurement: check.basis === 'user_wall_to_lot_line' }
  })
  return { status: 'ready', parcel, candidateArea, planningArea, lines, scenarioIndex, scenarioCount: result.scenarios.length,
    frontEdgeNumber: edges.find(edge => edge.id === scenario.front_edge_id)!.segment + 1,
    scenarioKey: setbackScenarioKey(scenario), result,
    extent: Math.max(20, Math.max(...parcel.map(point => point[0])) - Math.min(...parcel.map(point => point[0])),
      Math.max(...parcel.map(point => point[1])) - Math.min(...parcel.map(point => point[1]))) }
}

export function setbackPolygonPath(points: Point[]): string {
  return points.length >= 3 ? `${points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${-y}`).join(' ')} Z` : ''
}
