import { measurementWithUnit } from '../measurements'
import type { Feature, Site } from '../occupied_lots/contract'
import { assumedMainBuilding } from '../zoning_site_assumptions/model'

type Point = [number, number]
type Polygon = Point[][]
type PlanDimensions = { widthM: number; depthM: number }
export type ReplacementTrial<T> = {
  plan: T
  status: 'suggested' | 'partial' | 'no_trial' | 'unavailable'
  reason: string
  placement: Point[] | null
  clearanceM: number | null
}

// All input rings come from the municipal adapter's validated GeoJSON in metres.
// Bound interactive work on unusually detailed parcels without dropping any obstruction.
const maxVertices = 512
const vertexBudget = () => ({ remaining: maxVertices })
function polygons(feature: Feature, budget: { remaining: number }): Polygon[] | null {
  const { type, coordinates } = feature.shape.geometry
  if (feature.shape.crs !== 'EPSG:3157' || type === 'LineString') return null
  const parts = type === 'Polygon' ? [coordinates] : coordinates
  if (!Array.isArray(parts) || !parts.length || parts.length > budget.remaining / 4) return null
  for (const polygon of parts) {
    if (!Array.isArray(polygon) || !polygon.length || polygon.length > budget.remaining / 4) return null
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4 || ring.length > budget.remaining) return null
      budget.remaining -= ring.length
      if (!ring.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) return null
      if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) return null
    }
  }
  return parts as Polygon[]
}

export function defaultRemovalId(site: Site): string | null {
  const budget = vertexBudget()
  if (site.projected_metre_crs !== 'EPSG:3157' || !polygons(site.parcel, budget) ||
      !site.buildings.every(building => polygons(building, budget))) return null
  return assumedMainBuilding({ site, case_id: site.parcel.id, label: site.parcel.id })
}

function inRing(x: number, y: number, ring: Point[]): boolean {
  let inside = false
  for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i - 1], [bx, by] = ring[i]
    if ((ay > y) !== (by > y) && x < ax + (y - ay) * (bx - ax) / (by - ay)) inside = !inside
  }
  return inside
}

function inPolygon(x: number, y: number, polygon: Polygon): boolean {
  return inRing(x, y, polygon[0]) && !polygon.slice(1).some(hole => inRing(x, y, hole))
}

type Segment = { a: Point; b: Point; dx: number; dy: number; lengthSquared: number }
function segments(ring: Point[]): Segment[] {
  return ring.slice(1).map((b, index) => {
    const a = ring[index], dx = b[0] - a[0], dy = b[1] - a[1]
    return { a, b, dx, dy, lengthSquared: dx * dx + dy * dy }
  })
}

// For an axis-aligned rectangle and segment, the separating axes are horizontal,
// vertical and perpendicular to the segment. If disjoint, a closest pair
// includes an endpoint of the segment or a corner of the rectangle.
function gapSquared(segment: Segment, x: number, y: number, halfWidth: number, halfDepth: number): number {
  const { a, b, dx, dy, lengthSquared } = segment
  const ax = a[0] - x, ay = a[1] - y, bx = b[0] - x, by = b[1] - y
  if (Math.min(ax, bx) <= halfWidth && Math.max(ax, bx) >= -halfWidth &&
      Math.min(ay, by) <= halfDepth && Math.max(ay, by) >= -halfDepth &&
      Math.abs(dx * ay - dy * ax) <= Math.abs(dx) * halfDepth + Math.abs(dy) * halfWidth) return 0
  const toBox = (px: number, py: number) =>
    Math.max(0, Math.abs(px) - halfWidth) ** 2 + Math.max(0, Math.abs(py) - halfDepth) ** 2
  let closest = Math.min(toBox(ax, ay), toBox(bx, by))
  if (lengthSquared > 0) {
    for (const cx of [-halfWidth, halfWidth]) for (const cy of [-halfDepth, halfDepth]) {
      const t = ((cx - ax) * dx + (cy - ay) * dy) / lengthSquared
      if (t > 0 && t < 1) closest = Math.min(closest, (ax + t * dx - cx) ** 2 + (ay + t * dy - cy) ** 2)
    }
  }
  return closest
}

function trialAxes(exterior: Point[]): number[] {
  const boundary = segments(exterior).sort((a, b) => b.lengthSquared - a.lengthSquared)
  const axes = [0]
  const quarterTurn = Math.PI / 2
  for (const edge of boundary) {
    const axis = (Math.atan2(edge.dy, edge.dx) + Math.PI) % quarterTurn
    if (axes.every(other => Math.min(Math.abs(axis - other), quarterTurn - Math.abs(axis - other)) > Math.PI / 180)) axes.push(axis)
    if (axes.length === 5) break
  }
  return axes
}

function trialFrame(angle: number, parcel: Polygon, buildings: Polygon[]) {
  const [ox, oy] = parcel[0][0]
  const c = Math.cos(angle), s = Math.sin(angle)
  const local = ([x, y]: Point): Point => [(x - ox) * c + (y - oy) * s, (y - oy) * c - (x - ox) * s]
  const source = (x: number, y: number): Point => [ox + x * c - y * s, oy + x * s + y * c]
  const rotate = (polygon: Polygon) => polygon.map(ring => ring.map(local))
  const lot = rotate(parcel), roofs = buildings.map(rotate)
  const edges = [lot, ...roofs].flatMap(polygon => polygon.flatMap(segments))
  const xs = lot[0].map(p => p[0]), ys = lot[0].map(p => p[1])
  return { lot, roofs, edges, source, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

type Frame = ReturnType<typeof trialFrame>
function bestPlacement(frames: Frame[], plan: PlanDimensions) {
  let bestSquared = 0
  let placement: Point[] | null = null
  for (const frame of frames) {
    for (const [width, depth] of [[plan.widthM, plan.depthM], [plan.depthM, plan.widthM]]) {
      const spareX = frame.maxX - frame.minX - width, spareY = frame.maxY - frame.minY - depth
      if (spareX <= 0 || spareY <= 0) continue
      const hw = width / 2, hd = depth / 2
      // Include the middle and sweep translations across the feasible centre range.
      // The sample is finite. An unsuccessful trial cannot rule out another position.
      for (let ix = 1; ix <= 9; ix++) for (let iy = 1; iy <= 9; iy++) {
        const x = frame.minX + hw + spareX * ix / 10, y = frame.minY + hd + spareY * iy / 10
        if (!inPolygon(x, y, frame.lot) || frame.roofs.some(roof => inPolygon(x, y, roof))) continue
        let nearest = Infinity
        for (const edge of frame.edges) {
          nearest = Math.min(nearest, gapSquared(edge, x, y, hw, hd))
          if (nearest <= bestSquared) break
        }
        // A centre inside the parcel and positive distance to every ring excludes
        // concave crossings, entirely enclosed holes and nested small rooflines.
        if (nearest <= bestSquared || nearest < 1e-16) continue
        bestSquared = nearest
        placement = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [-hw, -hd]].map(([dx, dy]) => frame.source(x + dx, y + dy))
      }
    }
  }
  return { placement, clearanceM: placement ? Math.sqrt(bestSquared) : null }
}

function unavailable<T>(plan: T, reason: string): ReplacementTrial<T> {
  return { plan, status: 'unavailable', reason, placement: null, clearanceM: null }
}

export function rankReplacementPlans<T extends PlanDimensions>(
  site: Site, plans: readonly T[], removedBuildingId: string | null,
): ReplacementTrial<T>[] {
  const budget = vertexBudget()
  const lot = polygons(site.parcel, budget)
  if (site.projected_metre_crs !== 'EPSG:3157' || !lot || lot.length !== 1 ||
      new Set(site.buildings.map(b => b.id)).size !== site.buildings.length) {
    return plans.map(plan => unavailable(plan, 'This map needs a simpler, single parcel outline with identifiable buildings before we can place plans.'))
  }
  if (removedBuildingId !== null && !site.buildings.some(b => b.id === removedBuildingId))
    return plans.map(plan => unavailable(plan, 'Choose a building on the current parcel or keep all buildings.'))

  const buildings: Polygon[] = []
  for (const building of site.buildings) {
    if (building.id === removedBuildingId) continue
    const parts = polygons(building, budget)
    if (!parts) return plans.map(plan => unavailable(plan, 'A retained building outline could not be checked. Review the map with the plan provider.'))
    buildings.push(...parts)
  }
  const frames = trialAxes(lot[0][0]).map(angle => trialFrame(angle, lot[0], buildings))
  const incomplete = site.capture.completeness !== 'complete_for_declared_scope' || !site.buildings.length
  const trials = plans.map((plan): ReplacementTrial<T> => {
    if (![plan.widthM, plan.depthM].every(n => Number.isFinite(n) && n > 0))
      return unavailable(plan, 'The plan needs published exterior dimensions before it can be placed.')
    const { placement, clearanceM } = bestPlacement(frames, plan)
    if (clearanceM === null) return { plan, status: 'no_trial', placement, clearanceM,
      reason: 'None of the sampled positions left room around this plan. A different orientation or position may work.' }
    const nearest = buildings.length ? 'the nearest mapped lot edge or retained roofline' : 'the nearest mapped lot edge'
    return { plan, placement, clearanceM, status: incomplete ? 'partial' : 'suggested',
      reason: `This position leaves about ${measurementWithUnit(clearanceM, 'length')} to ${nearest}.${incomplete ? ' Confirm the remaining buildings on site.' : ''}` }
  })
  const order = { suggested: 0, partial: 1, no_trial: 2, unavailable: 3 }
  return trials.sort((a, b) => order[a.status] - order[b.status] || (b.clearanceM ?? 0) - (a.clearanceM ?? 0))
}
