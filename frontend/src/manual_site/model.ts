import type { Site } from '../occupied_lots/contract'

export const LOCAL_METRE_FRAME = 'LOCAL:METRE' as const

export type ManualFacts = { address: string; statedAreaM2: string; notes: string }
export type RectangleDraft = { label: string; x: string; y: string; width: string; depth: string }
export type PlacementDraft = { x: string; y: string; width: string; depth: string; angle: string }
export type ManualSiteOutput = {
  facts: ManualFacts
  site: Site | null
  placement: { id: string; centre_xy: [number, number]; width_m: number; depth_m: number; angle_degrees: number } | null
  assessment: ManualAssessment | null
}
export type ManualAssessment = {
  schema_version: 'scouting-geometry.v1'
  conclusion: 'tested_placement_observations_only'
  input: { projected_metre_crs: string; parcel: Site['parcel']; buildings: Site['buildings']; placement: NonNullable<ManualSiteOutput['placement']> }
  checks: { id: string; kind: string; status: string; relation: string | null; area_m2: number | null; distance_m: number | null; reason: string | null }[]
  limitations: string[]
}

export function metres(raw: string): number | null {
  if (!raw.trim()) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function positive(raw: string): number | null {
  const value = metres(raw)
  return value !== null && value > 0 ? value : null
}

function rectangle(x: number, y: number, width: number, depth: number) {
  return { type: 'Polygon' as const, coordinates: [[[x, y], [x + width, y], [x + width, y + depth], [x, y + depth], [x, y]]] }
}

export function buildSite(widthRaw: string, depthRaw: string, buildings: RectangleDraft[], coverage: 'unknown' | 'partial'): Site | null {
  const width = positive(widthRaw), depth = positive(depthRaw)
  if (width === null || depth === null) return null
  const parsed = buildings.map((b, index) => ({ index, label: b.label.trim(), x: metres(b.x), y: metres(b.y), width: positive(b.width), depth: positive(b.depth) }))
  const usable = parsed.filter(b => b.label && b.x !== null && b.y !== null && b.width !== null && b.depth !== null)
  const omitted = usable.length !== parsed.length
  const source = (record_label: string) => ({ provider: 'User supplied sketch', record_label, capture_date: null, review_status: 'unreviewed', reference: null })
  return {
    projected_metre_crs: LOCAL_METRE_FRAME,
    parcel: { id: 'manual-parcel', shape: { crs: LOCAL_METRE_FRAME, geometry: rectangle(0, 0, width, depth) }, source: source('Approximate parcel rectangle; dimensions entered by user') },
    buildings: usable.map(b => ({ id: `manual-building-${b.index + 1}`, shape: { crs: LOCAL_METRE_FRAME, geometry: rectangle(b.x!, b.y!, b.width!, b.depth!) }, source: source(`Approximate existing structure: ${b.label}`), basis: 'unknown' as const })),
    named_boundaries: [],
    capture: { completeness: coverage, scope: 'User-entered structure rectangles only', limitations: ['Other buildings and obstructions may be missing.', 'Parcel dimensions, structure locations and orientation are approximate and unverified.', ...(omitted ? ['Incomplete structure entries were omitted from measurement.'] : [])] },
  }
}

export function buildPlacement(draft: PlacementDraft): ManualSiteOutput['placement'] {
  const x = metres(draft.x), y = metres(draft.y), width = positive(draft.width), depth = positive(draft.depth), angle = metres(draft.angle)
  if (x === null || y === null || width === null || depth === null || angle === null) return null
  return { id: 'manual-placement', centre_xy: [x, y], width_m: width, depth_m: depth, angle_degrees: angle }
}
