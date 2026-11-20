import type { Case } from '../occupied_lots/contract'
import { parcelEdges, type BoundaryEdge } from '../zoning_site_assumptions/model'

type Point = [number, number]
export type ProjectionBasis = 'unknown' | 'wall_face' | 'includes_projection'
export type PlacedRectangle = { x: number; y: number; width: number; depth: number; angle: number }
export type ProjectionClearance = { status: 'crosses' | 'touches' | 'clear'; distance: number; edge: BoundaryEdge; edgeNumber: number }

const epsilon = 1e-8

function contains(point: Point, edges: BoundaryEdge[]): boolean {
  const [x, y] = point
  let inside = false
  for (const { start: [ax, ay], end: [bx, by] } of edges) {
    if ((ay > y) !== (by > y) && x < ax + (y - ay) * (bx - ax) / (by - ay)) inside = !inside
  }
  return inside
}

function toSegment([x, y]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - ax - t * dx, y - ay - t * dy)
}

// Clip a parcel segment to the strip in the model's own frame. A positive inset
// detects a boundary passing through the strip's interior rather than touching it.
function clip(start: Point, end: Point, minX: number, maxX: number, halfDepth: number, inset = 0): [number, number] | null {
  let from = 0, to = 1
  for (const [axis, min, max] of [[0, minX + inset, maxX - inset], [1, -halfDepth + inset, halfDepth - inset]]) {
    const a = start[axis], delta = end[axis] - a
    if (min > max) return null
    if (Math.abs(delta) <= Number.EPSILON) {
      if (a < min || a > max) return null
      continue
    }
    const first = (min - a) / delta, last = (max - a) / delta
    from = Math.max(from, Math.min(first, last))
    to = Math.min(to, Math.max(first, last))
    if (from > to) return null
  }
  return [from, to]
}

/** Check one model-local long face against the actual finite parcel segments, including holes. */
export function measureProjection(site: Case, placed: PlacedRectangle, addedDepth: number): ProjectionClearance | null {
  const { parcel, projected_metre_crs } = site.site
  if (parcel.shape.geometry.type !== 'Polygon' || parcel.shape.crs !== projected_metre_crs || projected_metre_crs !== 'EPSG:3157') return null
  const rings = parcel.shape.geometry.coordinates as unknown
  if (!Array.isArray(rings) || !rings.length || !rings.every(ring => Array.isArray(ring) && ring.length >= 4 &&
    ring[0]?.[0] === ring.at(-1)?.[0] && ring[0]?.[1] === ring.at(-1)?.[1])) return null
  const mappedEdges = parcelEdges(site, parcel.id)
  // Keep interactive checks bounded without discarding parts of detailed outlines.
  if (mappedEdges.length < 3 || mappedEdges.length > 512) return null

  const angle = placed.angle * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle)
  const local = ([x, y]: Point): Point => {
    const dx = x - placed.x, dy = y - placed.y
    return [dx * c + dy * s, dy * c - dx * s]
  }
  const face = placed.width / 2, outer = face + addedDepth, halfDepth = placed.depth / 2
  const corners: Point[] = [[face, -halfDepth], [outer, -halfDepth], [outer, halfDepth], [face, halfDepth]]
  const localEdges = mappedEdges.map(edge => ({ ...edge, start: local(edge.start), end: local(edge.end) }))
  const toStrip = ([x, y]: Point) => Math.hypot(Math.max(face - x, x - outer, 0), Math.max(Math.abs(y) - halfDepth, 0))
  const faceCuts = [-halfDepth, halfDepth]
  let nearest = 0, distance = Infinity, interiorCrossing = false
  localEdges.forEach(({ start, end }, index) => {
    const clipped = clip(start, end, face - epsilon, outer + epsilon, halfDepth + epsilon)
    if (clipped && addedDepth === 0) {
      for (const t of clipped) faceCuts.push(Math.max(-halfDepth, Math.min(halfDepth, start[1] + t * (end[1] - start[1]))))
    }
    if (addedDepth > 0 && clip(start, end, face, outer, halfDepth, epsilon)) interiorCrossing = true
    const gap = clipped ? 0 : Math.min(toStrip(start), toStrip(end), ...corners.map(corner => toSegment(corner, start, end)))
    if (gap < distance) { nearest = index; distance = gap }
  })
  const isInsideOrOnBoundary = (point: Point) => contains(point, localEdges) ||
    localEdges.some(edge => toSegment(point, edge.start, edge.end) <= epsilon * 2)
  const crosses = addedDepth > 0
    ? interiorCrossing || !isInsideOrOnBoundary([face + addedDepth / 2, 0])
    : faceCuts.sort((a, b) => a - b).some((cut, index) => index > 0 && !isInsideOrOnBoundary([face, (cut + faceCuts[index - 1]) / 2]))
  const edge = mappedEdges[nearest]
  return { status: crosses ? 'crosses' : distance === 0 ? 'touches' : 'clear', distance, edge,
    edgeNumber: mappedEdges.filter(candidate => candidate.ring === edge.ring).indexOf(edge) + 1 }
}
