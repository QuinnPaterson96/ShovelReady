import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import schema from './schema.json'

type XY = number[]
export type Geometry = { type: string; coordinates?: unknown; geometries?: Geometry[] }
export type Observation = {
  source_id: string
  snapshot_id: string
  metadata_snapshot_id: string
  catalogue_snapshot_id: string
  layer_url: string
  request_url: string
  attribution: string
  response: {
    features: { attributes: Record<string, unknown>; geometry: { rings: XY[][] } | null }[]
  }
}
export type Investigation = {
  schema_version: 'sr-12.observations.v1'
  screening_status: 'not_performed'
  sources: {
    source_id: string
    snapshot_id: string
    source_url: string
    sha256: string
    captured_at: string
    printed_revision: string | null
    original_crs: string | null
    original_units: string[]
    attribution: string
  }[]
  spatial: {
    identity: { logical_id: string; revision_id: string }
    source_crs: 'EPSG:3157'
    geographic_crs: 'EPSG:4617'
    observations: Observation[]
    features: {
      snapshot_id: string
      feature_index: number
      geometric_area_m2: number | null
      issues: string[]
    }[]
    parcels: {
      parcel_snapshot_id: string
      parcel_feature_index: number | null
      zoning_snapshot_id: string
      status: 'needs_investigation'
      issues: string[]
      uncovered_area_m2: number | null
      overlapping_zone_area_m2: number | null
      intersections: {
        zoning_snapshot_id: string
        zoning_feature_index: number
        area_m2: number
        classification: string
        geometry: Geometry
      }[]
    }[]
  }
}
const ajv = new Ajv({ strict: false, allErrors: true })
addFormats(ajv)
const validate = ajv.compile(schema)
export function safeUrl(value: string): string | undefined {
  try {
    const url = new URL(value)
    if (
      url.protocol === 'https:' &&
      ['maps.victoria.ca', 'opendata.victoria.ca', 'www.arcgis.com'].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      !/[\s\\]/.test(value)
    )
      return value
  } catch {
    /* source text remains inert */
  }
}
export function parseInvestigation(value: unknown): Investigation {
  if (!validate(value)) throw new Error('Invalid or unsupported investigation response')
  const data = value as Investigation
  if (
    data.spatial.identity.logical_id !== 'victoria-pilot-three-leads' ||
    data.sources.some((s) => !safeUrl(s.source_url)) ||
    data.spatial.observations.some((o) => !safeUrl(o.layer_url) || !safeUrl(o.request_url))
  ) {
    throw new Error('Invalid investigation source scope')
  }
  const ids = new Set(data.sources.map((s) => s.snapshot_id))
  if (ids.size !== data.sources.length) throw new Error('Duplicate sources')
  const features = new Set<string>()
  for (const o of data.spatial.observations) {
    if (
      ![o.snapshot_id, o.metadata_snapshot_id, o.catalogue_snapshot_id].every((id) => ids.has(id))
    )
      throw new Error('Missing source reference')
    if (!Array.isArray(o.response.features)) throw new Error('Invalid feature array')
    for (const [i, f] of o.response.features.entries()) {
      if (!f || !f.attributes || typeof f.attributes !== 'object' || Array.isArray(f.attributes))
        throw new Error('Invalid attributes')
      if (f.geometry !== null && (!f.geometry || !validRings(f.geometry.rings)))
        throw new Error('Invalid original geometry')
      features.add(`${o.snapshot_id}/${i}`)
    }
  }
  const assessed = new Set(data.spatial.features.map((f) => `${f.snapshot_id}/${f.feature_index}`))
  if (
    assessed.size !== data.spatial.features.length ||
    assessed.size !== features.size ||
    [...features].some((k) => !assessed.has(k))
  )
    throw new Error('Missing feature assessment')
  for (const p of data.spatial.parcels) {
    if (
      !ids.has(p.parcel_snapshot_id) ||
      !ids.has(p.zoning_snapshot_id) ||
      (p.parcel_feature_index !== null &&
        !features.has(`${p.parcel_snapshot_id}/${p.parcel_feature_index}`))
    )
      throw new Error('Invalid parcel reference')
    for (const i of p.intersections) {
      if (
        i.zoning_snapshot_id !== p.zoning_snapshot_id ||
        !features.has(`${i.zoning_snapshot_id}/${i.zoning_feature_index}`) ||
        !validGeometry(i.geometry)
      )
        throw new Error('Invalid intersection')
    }
  }
  return data
}
function validPoint(p: unknown): p is XY {
  return (
    Array.isArray(p) && p.length >= 2 && p.every((v) => typeof v === 'number' && Number.isFinite(v))
  )
}
function validRings(r: unknown): r is XY[][] {
  return (
    Array.isArray(r) &&
    r.every((ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(validPoint))
  )
}
function validGeometry(g: Geometry): boolean {
  if (!g || typeof g !== 'object') return false
  const c = g.coordinates
  switch (g.type) {
    case 'Point':
      return validPoint(c)
    case 'MultiPoint':
    case 'LineString':
      return Array.isArray(c) && c.every(validPoint)
    case 'MultiLineString':
      return Array.isArray(c) && c.every((r) => Array.isArray(r) && r.every(validPoint))
    case 'Polygon':
      return validRings(c)
    case 'MultiPolygon':
      return Array.isArray(c) && c.every(validRings)
    case 'GeometryCollection':
      return Array.isArray(g.geometries) && g.geometries.every(validGeometry)
    default:
      return false
  }
}
export function ringsPath(rings: XY[][]): string {
  return rings
    .map((r) => r.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${-p[1]}`).join(' ') + ' Z')
    .join(' ')
}
export function geometryPath(g: Geometry): string {
  const c = g.coordinates
  switch (g.type) {
    case 'Polygon':
      return ringsPath(c as XY[][])
    case 'MultiPolygon':
      return (c as XY[][][]).map(ringsPath).join(' ')
    case 'LineString':
      return (c as XY[]).map((p, i) => `${i ? 'L' : 'M'}${p[0]},${-p[1]}`).join(' ')
    case 'MultiLineString':
      return (c as XY[][])
        .map((r) => geometryPath({ type: 'LineString', coordinates: r }))
        .join(' ')
    case 'Point': {
      const p = c as XY
      return `M${p[0] - 0.3},${-p[1]} l.6,0 M${p[0]},${-p[1] - 0.3} l0,.6`
    }
    case 'MultiPoint':
      return (c as XY[]).map((p) => geometryPath({ type: 'Point', coordinates: p })).join(' ')
    case 'GeometryCollection':
      return (g.geometries ?? []).map(geometryPath).join(' ')
    default:
      return ''
  }
}
