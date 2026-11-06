import type { Case } from '../occupied_lots/contract'
import { parcelEdges, type ShoreSource, type WaterfrontSelection } from './model'
import { object, sameParcel, sameGeometry, useEdgePrefill, type ParcelRef, type PrefillInputs } from './useEdgePrefill'

type Prefill = {
  status: 'suggested' | 'partial' | 'no_match' | 'unavailable'
  selection?: WaterfrontSelection
  evidence?: unknown[]
  suggestions?: unknown[]
}
const unavailable: Prefill = { status: 'unavailable' }

function source(record: unknown, label: string, locator: string): ShoreSource | null {
  if (!object(record) || typeof record.provider !== 'string' || typeof record.record_label !== 'string'
    || typeof record.source_url !== 'string' || !record.source_url.startsWith('https://')
    || typeof record.captured_at_utc !== 'string' || record.review_status !== 'unreviewed_live_observation') return null
  return { provider: record.provider, record_label: label, locator, url: record.source_url.split('/query?')[0],
    capture_date: record.captured_at_utc, review_status: record.review_status }
}

export function readWaterfrontPrefill(v: unknown, ref: ParcelRef, site: Case, revision: string): Prefill {
  if (!object(v) || v.schema_version !== 'parcel-waterfront.v1' || !sameParcel(v, ref)
    || !Array.isArray(v.evidence) || !Array.isArray(v.suggestions)) return unavailable
  const evidence = v.evidence
  if (v.status === 'unavailable') return { ...unavailable, evidence }
  if (!sameGeometry(v.parcel_geometry, site)) return unavailable
  if (v.status === 'no_match' && !v.suggestions.length) return { status: 'no_match', evidence }
  if (v.status !== 'suggested' && v.status !== 'partial') return unavailable
  const edges = parcelEdges(site, revision).filter(edge => edge.ring === 0)
  const mapped: Record<string, ShoreSource> = {}
  for (const row of v.suggestions) {
    if (!object(row) || typeof row.label !== 'string' || !row.label.trim() || !Number.isInteger(row.feature_id)
      || typeof row.evidence_index !== 'number' || !Number.isInteger(row.evidence_index)) return unavailable
    const edge = edges.find(e => e.segment === row.segment)
    const s = source(evidence[row.evidence_index], row.label, `Feature ${row.feature_id}`)
    if (!edge || !s || mapped[edge.id]) return unavailable
    mapped[edge.id] = s
  }
  const ids = Object.keys(mapped)
  const s = mapped[ids[0]] ?? (v.status === 'partial' && typeof v.nearby_source === 'number'
    ? source(evidence[v.nearby_source], 'Possible shoreline contact', 'Near the selected parcel') : null)
  if (!s) return unavailable
  return { status: v.status, evidence, suggestions: v.suggestions, selection: {
    waterfront: { value: ids.length ? true : null, origin: 'municipal_map', evidence_state: ids.length ? 'assumed' : 'unknown',
      source: s, note: ids.length ? 'The map suggests shoreline contact. Legal waterfront status is unverified.' : 'Water is mapped nearby; contact with a parcel edge is unclear.' },
    waterfront_edge_ids: ids, waterfront_map: mapped } }
}

export function useWaterfrontPrefill(...inputs: PrefillInputs) {
  return useEdgePrefill('waterfront-edges', readWaterfrontPrefill, unavailable, inputs)
}

export function answerWaterfront(value: boolean | null, selection?: WaterfrontSelection): WaterfrontSelection {
  return { waterfront: { value, origin: 'user', evidence_state: value === null ? 'unknown' : 'user_confirmed',
    note: value === null ? null : 'Your selected answer; not independently verified.' },
    waterfront_edge_ids: value ? selection?.waterfront_edge_ids ?? [] : [],
    waterfront_map: value ? selection?.waterfront_map : undefined }
}

export function toggleWaterfront(mark: string | string[] | null, selection?: WaterfrontSelection): WaterfrontSelection {
  if (mark === null) return answerWaterfront(null)
  const old = selection?.waterfront_edge_ids ?? []
  const targets = typeof mark === 'string' ? [mark] : mark
  const ids = targets.every(id => old.includes(id)) ? old.filter(id => !targets.includes(id)) : [...new Set([...old, ...targets])]
  const mapped = Object.fromEntries(Object.entries(selection?.waterfront_map ?? {}).filter(([e]) => ids.includes(e)))
  const s = Object.values(mapped)[0]
  const waterfront = selection?.waterfront.origin === 'municipal_map' && s
    ? { ...selection.waterfront, source: s } : ids.length || selection?.waterfront.origin === 'user' && selection.waterfront.value
    ? answerWaterfront(true).waterfront : answerWaterfront(null).waterfront
  return { waterfront, waterfront_edge_ids: ids, waterfront_map: mapped }
}
