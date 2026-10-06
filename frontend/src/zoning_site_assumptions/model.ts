import type { Case, Feature, Site } from '../occupied_lots/contract'

export type EdgeRole = 'unknown' | 'front' | 'rear' | 'side' | 'flanking_street'
export type UserFact<T> = { value: T | null; origin: 'user'; note: string | null }
export type BoundaryEdge = { id: string; ring: number; segment: number; start: [number, number]; end: [number, number]; role: UserFact<EdgeRole> }
export type UserMeasurement = { value: number; unit: 'm' | 'm2'; basis: 'proposed_wall_to_lot_line' | 'principal_wall_to_proposed_wall' | 'regulatory_floor_area'; origin: 'user'; note: string | null; placement_revision: string }
export type SiteAssumptions = {
  schema_version: 'sr.zoning-site-assumptions.v1'
  property: { case_id: string; parcel_id: string; geometry_revision: string; crs: string; source: Feature['source']; capture: Site['capture'] }
  observed_buildings: { id: string; basis: 'roofline' | 'wall' | 'unknown'; source: Feature['source'] }[]
  edges: BoundaryEdge[]
  building_type: UserFact<'single_detached' | 'duplex' | 'other'>
  existing_garden_suites: UserFact<0 | 1 | 'two_or_more'>
  principal_building_id: UserFact<string>
  waterfront: UserFact<boolean>
  measurements: { boundary: Record<string, UserMeasurement>; principal_separation: UserMeasurement | null; floor_area: UserMeasurement | null }
  placement_revision: string
  limitations: string[]
}

const fact = <T,>(value: T | null = null): UserFact<T> => ({ value, origin: 'user', note: null })
const finitePoint = (value: unknown): value is [number, number] => Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && Number.isFinite(value[0]) && typeof value[1] === 'number' && Number.isFinite(value[1])

/** Preserve source ring/segment order; IDs are valid only with the supplied geometry revision. */
export function parcelEdges(site: Case, geometryRevision: string): BoundaryEdge[] {
  const geometry = site.site.parcel.shape.geometry
  if (geometry.type !== 'Polygon' || !geometryRevision.trim()) return []
  const rings = geometry.coordinates as unknown
  if (!Array.isArray(rings) || !rings.every(ring => Array.isArray(ring) && ring.length >= 4 && ring.every(finitePoint))) return []
  const result: BoundaryEdge[] = []
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
    const ring = rings[ringIndex] as [number, number][]
    for (let segment = 0; segment < ring.length - 1; segment++) {
      const start = ring[segment], end = ring[segment + 1]
      if (start[0] === end[0] && start[1] === end[1]) continue
      result.push({ id: `${geometryRevision}:ring-${ringIndex}:segment-${segment}`, ring: ringIndex, segment,
        start: [start[0], start[1]], end: [end[0], end[1]], role: fact<EdgeRole>('unknown') })
    }
  }
  return result
}

export function initialAssumptions(site: Case, geometryRevision: string, placementRevision: string): SiteAssumptions {
  const edges = parcelEdges(site, geometryRevision)
  const exterior = edges.filter(edge => edge.ring === 0)
  return {
    schema_version: 'sr.zoning-site-assumptions.v1',
    property: { case_id: site.case_id, parcel_id: site.site.parcel.id, geometry_revision: geometryRevision,
      crs: site.site.projected_metre_crs, source: site.site.parcel.source, capture: site.site.capture },
    observed_buildings: site.site.buildings.map(building => ({ id: building.id, basis: building.basis, source: building.source })),
    edges, building_type: fact(), existing_garden_suites: fact(), principal_building_id: fact(), waterfront: fact(),
    measurements: { boundary: {}, principal_separation: null, floor_area: null }, placement_revision: placementRevision,
    limitations: [
      'Edge roles are user assumptions, not surveyed legal lot-line classifications.',
      'Captured rooflines are not surveyed walls or proof of a principal building.',
      ...(site.site.projected_metre_crs !== 'EPSG:3157' ? ['This parcel does not use the captured Victoria projected metre frame.'] : []),
      ...(exterior.length < 3 || edges.some(edge => edge.ring > 0) ? ['Complex or unsupported parcel boundary: use manual/unknown roles until reviewed.'] : []),
    ],
  }
}

export function assumptionsKey(site: Case, geometryRevision: string, placementRevision: string): string {
  // The caller must use a source geometry revision, never a legal or model revision.
  return JSON.stringify([site.case_id, site.site.parcel.id, geometryRevision, placementRevision])
}

export function withPlacementRevision(value: SiteAssumptions, revision: string): SiteAssumptions {
  return revision === value.placement_revision ? value : { ...value, placement_revision: revision,
    measurements: { boundary: {}, principal_separation: null, floor_area: null } }
}
