export type Source = { provider: string; record_label: string; capture_date: string | null; review_status: string; reference: string | null }
export type Feature = { id: string; shape: { crs: string; geometry: { type: 'Polygon' | 'MultiPolygon' | 'LineString'; coordinates: unknown } }; source: Source }
export type Building = Feature & { basis: 'roofline' | 'wall' | 'unknown' }
export type Site = { projected_metre_crs: string; parcel: Feature; buildings: Building[]; named_boundaries: Feature[]; capture: { completeness: string; scope: string; limitations: string[] } }
export type Case = { case_id: string; label: string; site: Site }
export type Check = { id: string; kind: string; status: string; relation: string | null; area_m2: number | null; distance_m: number | null; margin_m: number | null; comparison: string | null; source_feature_ids: string[]; reason: string | null }
export type Result = { schema_version: 'scouting-geometry.v1'; conclusion: 'tested_placement_observations_only'; checks: Check[]; limitations: string[]; input: { parcel: Feature; projected_metre_crs: string; placement: { centre_xy: [number, number]; width_m: number; depth_m: number; angle_degrees: number } } }

const obj = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const str = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
const point = (value: unknown): value is [number, number] => Array.isArray(value) && value.length >= 2 && finite(value[0]) && finite(value[1])
function line(value: unknown): value is [number, number][] { return Array.isArray(value) && value.length >= 2 && value.every(point) }
function geometry(value: unknown): boolean {
  if (!obj(value) || !str(value.type)) return false
  if (value.type === 'LineString') return line(value.coordinates)
  if (value.type === 'Polygon') return Array.isArray(value.coordinates) && value.coordinates.length > 0 && value.coordinates.every(line)
  if (value.type === 'MultiPolygon') return Array.isArray(value.coordinates) && value.coordinates.length > 0 && value.coordinates.every(p => Array.isArray(p) && p.length > 0 && p.every(line))
  return false
}
function feature(value: unknown): value is Feature {
  return obj(value) && str(value.id) && obj(value.shape) && str(value.shape.crs) && geometry(value.shape.geometry) && obj(value.source) &&
    str(value.source.provider) && str(value.source.record_label) && str(value.source.review_status)
}
function site(value: unknown): value is Site {
  return obj(value) && str(value.projected_metre_crs) && feature(value.parcel) && value.parcel.shape.geometry.type === 'Polygon' &&
    Array.isArray(value.buildings) && value.buildings.every(b => feature(b) && ['roofline', 'wall', 'unknown'].includes((b as Record<string, unknown>).basis as string)) &&
    Array.isArray(value.named_boundaries) && value.named_boundaries.every(feature) && obj(value.capture) && str(value.capture.scope) &&
    str(value.capture.completeness) && Array.isArray(value.capture.limitations) && value.capture.limitations.every(v => typeof v === 'string') &&
    [value.parcel, ...value.buildings, ...value.named_boundaries].every(f => f.shape.crs === value.projected_metre_crs)
}
export function parseSites(value: unknown): Case[] {
  if (!obj(value) || value.schema_version !== 'scouting-sites.v1' || !Array.isArray(value.cases) ||
      !value.cases.every(c => obj(c) && str(c.case_id) && str(c.label) && site(c.site))) throw new Error('Site response is malformed or uses an unsupported version.')
  const cases = value.cases as Case[]
  if (new Set(cases.map(c => c.case_id)).size !== cases.length || !['VIC-087', 'VIC-090', 'VIC-093'].every(id => cases.some(c => c.case_id === id)))
    throw new Error('The expected retained site options are unavailable.')
  return cases.filter(c => ['VIC-087', 'VIC-090', 'VIC-093'].includes(c.case_id))
}
export function parseResult(value: unknown): Result {
  if (!obj(value) || value.schema_version !== 'scouting-geometry.v1' || value.conclusion !== 'tested_placement_observations_only' ||
      !Array.isArray(value.checks) || !value.checks.every(c => obj(c) && str(c.id) && str(c.kind) && str(c.status) &&
        (c.distance_m === null || finite(c.distance_m)) && (c.area_m2 === null || finite(c.area_m2)) && Array.isArray(c.source_feature_ids)) ||
      !Array.isArray(value.limitations) || !value.limitations.every(v => typeof v === 'string') || !obj(value.input) || !feature(value.input.parcel) ||
      !str(value.input.projected_metre_crs) || !obj(value.input.placement) || !point(value.input.placement.centre_xy) ||
      !finite(value.input.placement.width_m) || !finite(value.input.placement.depth_m) || !finite(value.input.placement.angle_degrees))
    throw new Error('Assessment response is malformed or uses an unsupported version.')
  return value as Result
}

export function points(feature: Feature): [number, number][] {
  const { type, coordinates } = feature.shape.geometry
  if (type === 'LineString') return coordinates as [number, number][]
  if (type === 'Polygon') return (coordinates as [number, number][][]).flat()
  return (coordinates as [number, number][][][]).flat(2)
}
export function path(feature: Feature): string {
  const { type, coordinates } = feature.shape.geometry
  const lines = type === 'LineString' ? [coordinates as [number, number][]] : type === 'Polygon' ? coordinates as [number, number][][] : (coordinates as [number, number][][][]).flat()
  return lines.map(line => line.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${-y}`).join(' ') + (type === 'LineString' ? '' : ' Z')).join(' ')
}
