import { useEffect, useState } from 'react'
import { parcelCoverage, type MunicipalityContext } from '../municipality_coverage/model'
import type { Case } from '../occupied_lots/contract'
import type { Confirmed } from '../site_discovery/flow'
import { parcelEdges, type StreetAdjacency } from './model'

type ParcelRef = { source: string; object_id: number }
type Prefill = {
  status: 'suggested' | 'partial' | 'no_match' | 'unavailable'
  selection?: StreetAdjacency
  evidence?: unknown[]
  observations?: { segment: number; name: string; road_class: string; feature_ids: number[] }[]
}
const unavailable: Prefill = { status: 'unavailable' }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'

export function readStreetPrefill(value: unknown, ref: ParcelRef, site: Case, revision: string): Prefill {
  if (!object(value) || value.schema_version !== 'parcel-streets.v1' || !object(value.parcel_ref)
    || value.parcel_ref.source !== ref.source || value.parcel_ref.object_id !== ref.object_id
    || !Array.isArray(value.evidence) || !Array.isArray(value.suggestions)) return unavailable
  if (value.status === 'unavailable') return { ...unavailable, evidence: value.evidence }
  const geometry = site.site.parcel.shape.geometry
  if (!object(value.parcel_geometry) || geometry.type !== 'Polygon' || value.parcel_geometry.type !== geometry.type
    || JSON.stringify(value.parcel_geometry.coordinates) !== JSON.stringify(geometry.coordinates)) return unavailable
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

export function useStreetPrefill(site: Case | null, revision: string | null, municipality: MunicipalityContext | null,
  property: Confirmed | null, example: boolean) {
  const candidate = (property?.parcel.raw as { candidate?: { parcel_ref?: ParcelRef; pid?: string } } | null)?.candidate
  const ref = example ? { source: 'city-of-victoria-pid-parcels', object_id: 10573 } : candidate?.parcel_ref
  const source = ref?.source, oid = ref?.object_id, pid = example ? undefined : candidate?.pid
  const eligible = !!ref && parcelCoverage(municipality)?.source === source
  const key = eligible && revision ? JSON.stringify([revision, source, oid, pid]) : null
  const [state, setState] = useState<{ key: string; result: Prefill } | null>(null)
  useEffect(() => {
    if (!key || !source || !oid || !site || !revision) return
    let current = true
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 20000)
    const load = async () => {
      try {
        const response = await fetch('/api/municipal-sites/street-edges', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ schema_version: 'municipal-sites.v1', parcel_ref: { source, object_id: oid }, expected_pid: pid }) })
        const result = response.ok ? readStreetPrefill(await response.json(), { source, object_id: oid }, site, revision) : unavailable
        if (current) setState({ key, result })
      } catch { if (current) setState({ key, result: unavailable }) }
      finally { window.clearTimeout(timer) }
    }
    void load()
    return () => { current = false; controller.abort(); window.clearTimeout(timer) }
  }, [key, source, oid, pid, site, revision])
  return key && state?.key === key ? state.result : null
}
