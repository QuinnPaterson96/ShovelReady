import type { Case, Source as GeometrySource } from '../occupied_lots/contract'
import type { Confirmed, Source } from './flow'

// No retained-release identity is assigned to this temporary live observation.
export function placementCase(value: Confirmed): Case {
  const observation = value.observation
  const source = (record: Source): GeometrySource => ({ provider: record.provider, record_label: record.record,
    capture_date: record.capturedAt, review_status: 'unreviewed', reference: record.url })
  return {
    case_id: `live:${value.parcel.id}`, label: value.address.label,
    site: {
      projected_metre_crs: observation.crs,
      parcel: { id: `live-parcel:${value.parcel.id}`, shape: { crs: observation.crs, geometry: observation.parcel.geometry }, source: source(observation.source) },
      buildings: observation.roofs.map(roof => ({ id: `live-roof:${roof.id}`, shape: { crs: observation.crs, geometry: roof.geometry },
        basis: 'roofline', source: source(observation.roofSource ?? observation.source) })),
      named_boundaries: [],
      capture: { completeness: observation.buildingsState === 'available' ? 'complete_for_declared_scope' : 'partial',
        scope: 'City rooflines returned by this parcel-intersection query only; not a complete obstruction inventory',
        limitations: [...observation.issues, value.schema_version === 'site-discovery.selected.v1' ? 'Source-selected observation; identity, ownership and legal boundaries are not confirmed. Source join and positional accuracy remain unreviewed.' : 'Parcel identity confirmed by the user only; source join and positional accuracy remain unreviewed.',
          'Rooflines are not walls. Other obstructions, zoning, setbacks, services and delivery access remain unassessed.'] },
    },
  }
}
