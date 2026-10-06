import type { Site } from '../occupied_lots/contract'

type Point = readonly [number, number]
export type OrientationSuggestion =
  | { status: 'suggested'; angle_degrees: number; long_axis_degrees: number; aspect_ratio: number; method: 'minimum_area_rectangle' }
  | { status: 'unavailable' | 'ambiguous'; reason: string }

const cross = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
const parallelAngle = (degrees: number) => ((degrees + 90) % 180 + 180) % 180 - 90
const axisDifference = (a: number, b: number) => Math.abs(parallelAngle(a - b))
const same = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1]
function intersects(a: Point, b: Point, c: Point, d: Point): boolean {
  const abC = cross(a, b, c), abD = cross(a, b, d)
  const cdA = cross(c, d, a), cdB = cross(c, d, b)
  if (abC === 0 && abD === 0) {
    return Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])) <= Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) &&
      Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1])) <= Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]))
  }
  return abC * abD <= 0 && cdA * cdB <= 0
}

function hull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const half = (input: Point[]) => {
    const result: Point[] = []
    for (const point of input) {
      while (result.length >= 2 && cross(result[result.length - 2], result[result.length - 1], point) <= 0) result.pop()
      result.push(point)
    }
    return result
  }
  return [...half(sorted).slice(0, -1), ...half(sorted.reverse()).slice(0, -1)]
}

/** Suggest a shape axis from a single projected-metre parcel exterior; never a fit or frontage result. */
export function suggestPlacementOrientation(site: Pick<Site, 'parcel' | 'projected_metre_crs'>): OrientationSuggestion {
  const shape = site.parcel.shape
  if (shape.crs !== site.projected_metre_crs || !site.projected_metre_crs || /(?:4326|CRS84)$/i.test(site.projected_metre_crs))
    return { status: 'unavailable', reason: 'A matching projected metre coordinate system is required.' }
  const geometry = shape.geometry
  if (geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 1)
    return { status: 'unavailable', reason: 'A single polygon without holes is required.' }
  const raw = geometry.coordinates[0]
  if (!Array.isArray(raw) || raw.length < 3 || !raw.every(p => Array.isArray(p) && p.length === 2 && p.every(v => typeof v === 'number' && Number.isFinite(v))))
    return { status: 'unavailable', reason: 'The exterior ring has invalid coordinates.' }
  const ring: Point[] = (raw as number[][]).map(p => [p[0], p[1]])
  if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop()
  const unique: Point[] = ring.filter((p, i) => i === 0 || p[0] !== ring[i - 1][0] || p[1] !== ring[i - 1][1])
  if (unique.length < 3) return { status: 'unavailable', reason: 'The exterior ring has fewer than three distinct points.' }
  // Translation keeps projected coordinates near the origin without changing the source geometry.
  const origin = unique[0]
  const local: Point[] = unique.map(p => [p[0] - origin[0], p[1] - origin[1]])
  if (local.some((p, i) => same(p, local[(i + 1) % local.length])) ||
      local.some((p, i) => local.some((q, j) => j > i + 1 && !(i === 0 && j === local.length - 1) &&
        intersects(p, local[(i + 1) % local.length], q, local[(j + 1) % local.length]))))
    return { status: 'unavailable', reason: 'The exterior ring is self-intersecting or degenerate.' }
  const twiceArea = local.reduce((sum, p, i) => {
    const q = local[(i + 1) % local.length]
    return sum + p[0] * q[1] - q[0] * p[1]
  }, 0)
  if (!Number.isFinite(twiceArea) || twiceArea === 0) return { status: 'unavailable', reason: 'The exterior ring has no planar area.' }
  const boundary = hull(local)
  if (boundary.length < 3) return { status: 'unavailable', reason: 'The parcel has no planar area.' }
  const candidates = boundary.map((p, i) => {
    const next = boundary[(i + 1) % boundary.length]
    const radians = Math.atan2(next[1] - p[1], next[0] - p[0])
    const c = Math.cos(radians), s = Math.sin(radians)
    const x = local.map(q => q[0] * c + q[1] * s)
    const y = local.map(q => -q[0] * s + q[1] * c)
    const width = Math.max(...x) - Math.min(...x)
    const height = Math.max(...y) - Math.min(...y)
    const longAxis = parallelAngle(radians * 180 / Math.PI + (height > width ? 90 : 0))
    return { area: width * height, ratio: Math.max(width, height) / Math.min(width, height), longAxis }
  })
  const bestArea = Math.min(...candidates.map(c => c.area))
  if (!Number.isFinite(bestArea) || bestArea <= 0) return { status: 'unavailable', reason: 'The parcel has no finite planar area.' }
  const nearBest = candidates.filter(c => c.area <= bestArea * 1.01)
  if (nearBest.some(c => c.ratio < 1.1)) return { status: 'ambiguous', reason: 'The enclosing shape is too close to square for a long-axis suggestion.' }
  const chosen = [...nearBest].sort((a, b) => a.area - b.area || a.longAxis - b.longAxis)[0]
  if (nearBest.some(c => axisDifference(c.longAxis, chosen.longAxis) > 2))
    return { status: 'ambiguous', reason: 'Comparable enclosing rectangles have different long axes.' }
  return { status: 'suggested', angle_degrees: parallelAngle(chosen.longAxis - 90), long_axis_degrees: chosen.longAxis,
    aspect_ratio: chosen.ratio, method: 'minimum_area_rectangle' }
}
