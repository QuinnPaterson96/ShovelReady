import type { Case, Feature, Site } from '../occupied_lots/contract'

export type EdgeRole = 'unknown' | 'front' | 'rear' | 'side' | 'flanking_street'
export type BoundaryMapMode = 'place' | 'front' | 'rear' | 'waterfront'
export type UserFact<T> = { value: T | null; origin: 'user' | 'journey_default'; note: string | null; evidence_state?: 'assumed' | 'user_confirmed' | 'unknown' }
export type BoundaryEdge = { id: string; ring: number; segment: number; start: [number, number]; end: [number, number]; role: UserFact<EdgeRole> }
export type UserMeasurement = { value: number; unit: 'm' | 'm2'; basis: 'proposed_wall_to_lot_line' | 'principal_wall_to_proposed_wall' | 'regulatory_floor_area' | 'rough_floor_area_estimate'; origin: 'user'; note: string | null; placement_revision: string }
export type StreetAdjacency = { edge_ids: string[]; all_marked: boolean; completion_method?: 'explicit_confirmation' | 'advance'; origin: 'user' }
export type BoundaryRoleSuggestions = { roles: Record<string, EdgeRole>; conflicts: string[]; basis: 'user_marks' }
export type SiteAssumptions = {
  planning_buffers_m?: Record<string, number>
  waterfront_edge_ids?: string[]
  infer_principal_building?: boolean
  boundary_role_suggestions?: BoundaryRoleSuggestions
  street_adjacency?: StreetAdjacency
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

export function initialAssumptions(site: Case, geometryRevision: string, placementRevision: string, homeownerDefaults = false): SiteAssumptions {
  const edges = parcelEdges(site, geometryRevision)
  const exterior = edges.filter(edge => edge.ring === 0)
  const main = homeownerDefaults ? assumedMainBuilding(site) : null
  return {
    schema_version: 'sr.zoning-site-assumptions.v1',
    property: { case_id: site.case_id, parcel_id: site.site.parcel.id, geometry_revision: geometryRevision,
      crs: site.site.projected_metre_crs, source: site.site.parcel.source, capture: site.site.capture },
    observed_buildings: site.site.buildings.map(building => ({ id: building.id, basis: building.basis, source: building.source })),
    planning_buffers_m: Object.fromEntries(edges.map(edge => [edge.id, homeownerDefaults ? 1 : 0])),
    waterfront_edge_ids: [], infer_principal_building: true,
    edges, building_type: fact(), existing_garden_suites: homeownerDefaults ? { value: 0, origin: 'journey_default', evidence_state: 'assumed', note: 'Assuming none already exist; editable homeowner scenario, not independently verified.' } : fact(), principal_building_id: main ? { value: main, origin: 'journey_default', evidence_state: 'assumed', note: 'Unique largest usable mapped outline; assumed main building, not confirmed use or walls.' } : fact(), waterfront: fact(),
    measurements: { boundary: {}, principal_separation: null, floor_area: null }, placement_revision: placementRevision,
    limitations: [
      'Edge roles are user assumptions, not surveyed legal lot-line classifications.',
      'Captured rooflines are not surveyed walls or proof of a principal building.',
      ...(site.site.projected_metre_crs !== 'EPSG:3157' ? ['This parcel does not use the captured Victoria projected metre frame.'] : []),
      ...(exterior.length < 3 || edges.some(edge => edge.ring > 0) ? ['Complex or unsupported parcel boundary: use manual/unknown roles until reviewed.'] : []),
    ],
  }
}

/** Restrict automatic selection to simple outlines wholly inside a convex parcel.
 * The API independently validates the selected default with full polygon geometry. */
export function assumedMainBuilding(site: Case): string | null {
  const geometry = site.site.parcel.shape.geometry
  if (geometry.type !== 'Polygon') return null
  const parcelRing = (geometry.coordinates as number[][][])[0]
  if (!parcelRing?.length || !parcelRing.every(finitePoint) || parcelRing[0][0] !== parcelRing.at(-1)![0] || parcelRing[0][1] !== parcelRing.at(-1)![1]) return null
  const edges = parcelEdges(site, 'selection')
  if (edges.length < 3 || edges.some(edge => edge.ring !== 0)) return null
  const cross = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const orientation = Math.sign(cross(edges[0].start, edges[0].end, edges[1].end))
  if (!orientation || !edges.every((edge, i) => orientation * cross(edge.start, edge.end, edges[(i + 1) % edges.length].end) > 0)) return null
  const candidates = site.site.buildings.flatMap(building => {
    if (building.basis === 'unknown' || building.shape.crs !== site.site.projected_metre_crs || building.shape.geometry.type !== 'Polygon') return []
    const rings = building.shape.geometry.coordinates as number[][][]
    if (rings.length !== 1 || rings[0].length < 4 || !rings[0].every(finitePoint)) return []
    const ring = rings[0], n = ring.length - 1
    if (ring[0][0] !== ring[n][0] || ring[0][1] !== ring[n][1] || !ring.every(point => edges.every(edge => orientation * cross(edge.start, edge.end, point) >= 0))) return []
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || i === 0 && j === n - 1) continue
      const a = ring[i], b = ring[i + 1], c = ring[j], d = ring[j + 1]
      if (cross(a, b, c) * cross(a, b, d) <= 0 && cross(c, d, a) * cross(c, d, b) <= 0) return []
    }
    const area = Math.abs(ring.slice(0, n).reduce((sum, point, i) => sum + (point[0] - ring[0][0]) * (ring[i + 1][1] - ring[0][1]) - (ring[i + 1][0] - ring[0][0]) * (point[1] - ring[0][1]), 0)) / 2
    return area > 0 ? [{ id: building.id, area }] : []
  }).sort((a, b) => b.area - a.area)
  return candidates.length && (candidates.length === 1 || candidates[0].area > candidates[1].area) ? candidates[0].id : null
}

export function assumptionsKey(site: Case, geometryRevision: string, placementRevision: string): string {
  // The caller must use a source geometry revision, never a legal or model revision.
  return JSON.stringify([site.case_id, site.site.parcel.id, geometryRevision, placementRevision])
}

export function withPlacementRevision(value: SiteAssumptions, revision: string): SiteAssumptions {
  return revision === value.placement_revision ? value : { ...value, placement_revision: revision,
    measurements: { boundary: {}, principal_separation: null, floor_area: null } }
}

/** Display-only suggestions. They never become surveyed roles or overwrite a user choice. */
export function suggestedBoundaryRoles(edges: BoundaryEdge[], frontId: string | null, rearId: string | null,
  streetPattern: 'unknown' | 'single' | 'corner_or_multiple'): Record<string, EdgeRole> {
  if (streetPattern !== 'single' || !ordinaryFourEdgeBoundary(edges)) return {}
  const ordered = [...edges].sort((a, b) => a.segment - b.segment)
  const front = ordered.findIndex(edge => edge.id === frontId)
  const rear = ordered.findIndex(edge => edge.id === rearId)
  if (front < 0 && rear < 0 || front >= 0 && rear >= 0 && (front + 2) % 4 !== rear) return {}
  const frontIndex = front >= 0 ? front : (rear + 2) % 4
  return Object.fromEntries(ordered.map((edge, index) => [edge.id,
    index === frontIndex ? 'front' : index === (frontIndex + 2) % 4 ? 'rear' : 'side']))
}

/** Geometric suggestions preserve every explicit role and never supply evaluation facts. */
export function inferBoundaryRoles(edges: BoundaryEdge[], streets?: StreetAdjacency): BoundaryRoleSuggestions {
  const result: BoundaryRoleSuggestions = { roles: {}, conflicts: [], basis: 'user_marks' }
  if (!ordinaryFourEdgeBoundary(edges)) return result
  const ordered = [...edges].sort((a, b) => a.segment - b.segment)
  const fronts = ordered.filter(edge => edge.role.value === 'front'), rears = ordered.filter(edge => edge.role.value === 'rear')
  if (fronts.length > 1 || rears.length > 1) { result.conflicts.push('More than one front or rear is marked. Review your marks.'); return result }
  let front = fronts.length ? ordered.indexOf(fronts[0]) : -1
  const rear = rears.length ? ordered.indexOf(rears[0]) : -1
  if (front >= 0 && rear >= 0 && (front + 2) % 4 !== rear) { result.conflicts.push('Your front and rear marks are not opposite. Review your marks.'); return result }
  if (front < 0 && rear >= 0) front = (rear + 2) % 4
  if (front < 0 && streets?.all_marked && streets.edge_ids.length === 1) front = ordered.findIndex(edge => edge.id === streets.edge_ids[0])
  if (front < 0) return result
  if (streets?.all_marked && !streets.edge_ids.includes(ordered[front].id)) { result.conflicts.push('The front implied by your marks does not border a marked street. Review front/rear or street marks.'); return result }
  ordered.forEach((edge, index) => {
    const role: EdgeRole = index === front ? 'front' : index === (front + 2) % 4 ? 'rear' : streets?.edge_ids.includes(edge.id) ? 'flanking_street' : streets?.all_marked ? 'side' : 'unknown'
    const explicit = edge.role.value
    if (explicit && explicit !== 'unknown') {
      if (role !== 'unknown' && explicit !== role) result.conflicts.push(`Edge ${edge.segment + 1}: your ${explicit === 'flanking_street' ? 'flanking' : explicit} mark differs from the suggested ${role === 'flanking_street' ? 'flanking' : role}. Your mark is kept.`)
    } else if (role !== 'unknown') result.roles[edge.id] = role
  })
  return result
}

export function ordinaryFourEdgeBoundary(edges: BoundaryEdge[]): boolean {
  if (edges.length !== 4 || edges.some(edge => edge.ring !== 0)) return false
  const ordered = [...edges].sort((a, b) => a.segment - b.segment)
  if (ordered.some((edge, index) => edge.segment !== index ||
    edge.end[0] !== ordered[(index + 1) % 4].start[0] ||
    edge.end[1] !== ordered[(index + 1) % 4].start[1])) return false
  const turns = ordered.map((edge, index) => {
    const next = ordered[(index + 1) % 4]
    return (edge.end[0] - edge.start[0]) * (next.end[1] - next.start[1]) -
      (edge.end[1] - edge.start[1]) * (next.end[0] - next.start[0])
  })
  return turns.every(turn => turn > 0) || turns.every(turn => turn < 0)
}

/** Selection is still an assumption until the optional confirmation is checked. */
export function suiteCountFact(value: 0 | 1 | 'two_or_more' | null, confirmed = false): SiteAssumptions['existing_garden_suites'] {
  return { value, origin: 'user', evidence_state: value === null ? 'unknown' : confirmed ? 'user_confirmed' : 'assumed',
    note: value === null ? null : confirmed ? 'User-confirmed; not independently verified.' : 'User-selected assumption; not independently verified.' }
}
