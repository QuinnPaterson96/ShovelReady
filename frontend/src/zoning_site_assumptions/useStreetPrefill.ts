import type { Case } from '../occupied_lots/contract'
import { object, sameParcel, sameGeometry, useEdgePrefill, type ParcelRef, type PrefillInputs } from './useEdgePrefill'
import { parcelEdges, type StreetAdjacency } from './model'

type Prefill = {
  status: 'suggested' | 'partial' | 'no_match' | 'unavailable'
  selection?: StreetAdjacency
  evidence?: unknown[]
  observations?: { segment: number; name: string; road_class: string; feature_ids: number[] }[]
}
const unavailable: Prefill = { status: 'unavailable' }

export function readStreetPrefill(value: unknown, ref: ParcelRef, site: Case, revision: string): Prefill {
  if (!object(value) || value.schema_version !== 'parcel-streets.v1' || !sameParcel(value, ref)
    || !Array.isArray(value.evidence) || !Array.isArray(value.suggestions)) return unavailable
  if (value.status === 'unavailable') return { ...unavailable, evidence: value.evidence }
  if (!sameGeometry(value.parcel_geometry, site)) return unavailable
  if (value.status === 'no_match' && !value.suggestions.length) return { status: 'no_match', evidence: value.evidence }
  if (value.status !== 'suggested' && value.status !== 'partial') return unavailable
  if (!value.suggestions.length) return value.status === 'partial' ? { status: 'partial', evidence: value.evidence } : unavailable
  const record = value.evidence[1]
  if (!object(record) || typeof record.provider !== 'string' || typeof record.record_label !== 'string'
    || typeof record.source_url !== 'string' || typeof record.captured_at_utc !== 'string') return unavailable
  const edges = parcelEdges(site, revision).filter(edge => edge.ring === 0)
  const names: Record<string, string> = {}
  const observations: NonNullable<Prefill['observations']> = []
  for (const suggestion of value.suggestions) {
    if (!object(suggestion) || typeof suggestion.name !== 'string' || !suggestion.name.trim()) return unavailable
    const edge = edges.find(candidate => candidate.segment === suggestion.segment)
    if (!edge || names[edge.id] || typeof suggestion.road_class !== 'string' || !Array.isArray(suggestion.feature_ids)
      || !suggestion.feature_ids.length || !suggestion.feature_ids.every(Number.isInteger)) return unavailable
    observations.push({ segment: edge.segment, name: suggestion.name, road_class: suggestion.road_class, feature_ids: suggestion.feature_ids })
    names[edge.id] = suggestion.name
  }
  return { status: value.status, evidence: value.evidence, observations, selection: {
    origin: 'municipal_map', all_marked: value.status === 'suggested', completion_method: 'map_prefill',
    edge_ids: Object.keys(names), mapped_names: names, map_source: { provider: record.provider,
      record_label: record.record_label, captured_at_utc: record.captured_at_utc, source_url: record.source_url },
  } }
}

export function useStreetPrefill(...inputs: PrefillInputs) {
  return useEdgePrefill('street-edges', readStreetPrefill, unavailable, inputs)
}
