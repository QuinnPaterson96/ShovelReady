import type { Confirmed } from '../site_discovery/flow'
import type { MappedZoning, MunicipalSource } from './projectSettings'

export type ParcelRef = { source: 'city-of-victoria-pid-parcels'; object_id: number }
export type ZoningLookup = {
  schema_version: 'victoria-zoning.v1'
  status: 'single_covered_mapping' | 'split_zones' | 'partial_coverage' | 'no_match' | 'unsupported_geometry' | 'unavailable' | 'unmapped_bylaw'
  parcel_ref: ParcelRef
  parcel_area_m2: number | null; covered_area_m2: number | null; uncovered_area_m2: number | null
  coverage_tolerance_m2: number; horizontal_crs: 'EPSG:3157'
  zones: { object_id: number; source_fields: { Zoning: string | null; ZoningBylaw: string | null; Title: string | null; URL: string | null }; intersection_area_m2: number; parcel_coverage_fraction: number; bylaw_name: string | null; bylaw_url: string | null; mapping_status: 'mapped' | 'unmapped'; source_geometry: unknown; intersection_geometry: unknown }[]
  source_records: { provider: string; record_label: string; source_url: string; captured_at_utc: string; review_status: 'unreviewed_live_observation'; licence_url: string; attribution: string; sha256: string; source_date_limit: string }[]
  issues: string[]; note: string
  parcel_source_fields: unknown; parcel_source_geometry: unknown
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
const nullableNumber = (value: unknown) => value === null || nonnegative(value)
const nullableText = (value: unknown) => value === null || typeof value === 'string'
export function selectedParcelRef(live: Confirmed | null): { parcel_ref: ParcelRef; expected_pid?: string } | null {
  const candidate = record(live?.parcel.raw) ? live.parcel.raw.candidate : null
  if (!record(candidate) || !record(candidate.parcel_ref) || candidate.parcel_ref.source !== 'city-of-victoria-pid-parcels' ||
    !Number.isInteger(candidate.parcel_ref.object_id) || Number(candidate.parcel_ref.object_id) < 1) return null
  return { parcel_ref: { source: 'city-of-victoria-pid-parcels', object_id: Number(candidate.parcel_ref.object_id) },
    ...(text(candidate.pid) ? { expected_pid: candidate.pid } : {}) }
}
export function parseZoningLookup(raw: unknown, expected: ParcelRef): ZoningLookup {
  if (!record(raw) || raw.schema_version !== 'victoria-zoning.v1' ||
    !['single_covered_mapping', 'split_zones', 'partial_coverage', 'no_match', 'unsupported_geometry', 'unavailable', 'unmapped_bylaw'].includes(String(raw.status)) ||
    !record(raw.parcel_ref) || raw.parcel_ref.source !== expected.source || raw.parcel_ref.object_id !== expected.object_id ||
    raw.horizontal_crs !== 'EPSG:3157' || !nullableNumber(raw.parcel_area_m2) || !nullableNumber(raw.covered_area_m2) ||
    !nullableNumber(raw.uncovered_area_m2) || !nonnegative(raw.coverage_tolerance_m2) || !Array.isArray(raw.zones) ||
    !Array.isArray(raw.source_records) || !Array.isArray(raw.issues) || !raw.issues.every(text) || !text(raw.note)) throw Error('Municipal zoning response is malformed or belongs to another parcel.')
  if (!raw.source_records.every(source => record(source) && text(source.provider) && text(source.record_label) && text(source.source_url) &&
    text(source.captured_at_utc) && source.review_status === 'unreviewed_live_observation' && text(source.licence_url) &&
    text(source.attribution) && text(source.sha256) && text(source.source_date_limit))) throw Error('Municipal zoning source is malformed.')
  if (!raw.zones.every(zone => record(zone) && Number.isInteger(zone.object_id) && Number(zone.object_id) > 0 &&
    record(zone.source_fields) && ['Zoning', 'ZoningBylaw', 'Title', 'URL'].every(key => nullableText((zone.source_fields as Record<string, unknown>)[key])) &&
    nonnegative(zone.intersection_area_m2) && nonnegative(zone.parcel_coverage_fraction) &&
    nullableText(zone.bylaw_name) && nullableText(zone.bylaw_url) && ['mapped', 'unmapped'].includes(String(zone.mapping_status)) &&
    record(zone.source_geometry) && record(zone.intersection_geometry))) throw Error('Municipal zoning hit is malformed.')
  if (raw.status === 'single_covered_mapping' && (raw.zones.length !== 1 || raw.zones[0].mapping_status !== 'mapped' ||
    !text(raw.zones[0].source_fields.Zoning) || !text(raw.zones[0].bylaw_name) || raw.uncovered_area_m2 === null ||
    raw.uncovered_area_m2 > raw.coverage_tolerance_m2 || raw.source_records.length < 2)) throw Error('Municipal zoning coverage is inconsistent.')
  return raw as ZoningLookup
}
export function zoningProjection(result: ZoningLookup, propertyRevision: string): MappedZoning {
  const zone = result.status === 'single_covered_mapping' ? result.zones[0] : null
  const sourceRecord = zone ? result.source_records.at(-1) : null
  const source: MunicipalSource | null = zone && sourceRecord ? {
    provider: sourceRecord.provider, record_label: `${sourceRecord.record_label}: ${zone.source_fields.Zoning} · ${zone.source_fields.Title ?? 'title unavailable'}`,
    url: zone.bylaw_url || sourceRecord.source_url, locator: `Zoning polygon ${zone.object_id}; selected parcel ${result.parcel_ref.object_id}`,
    capture_date: sourceRecord.captured_at_utc, review_status: sourceRecord.review_status,
    source_revision: null, currentness_limitations: [sourceRecord.source_date_limit],
  } : null
  return { schema_version: 'sr.mapped-zoning.v1', property_revision: propertyRevision,
    status: zone && source ? 'single' : result.status === 'split_zones' ? 'multiple' : result.status === 'partial_coverage' ? 'partial' : 'unavailable',
    zone: zone && source ? zone.source_fields.Zoning : null, instrument: zone && source ? zone.bylaw_name : null,
    source, reason: `${result.status.replace(/_/g, ' ')}; ${result.note}${result.issues.length ? ` Issues: ${result.issues.join(', ')}` : ''}` }
}
