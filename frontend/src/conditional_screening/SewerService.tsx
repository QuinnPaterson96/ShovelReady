import { publicSourceUrl, readableDate } from '../ReadableProvenance'
import type { EnquirySection } from '../builder_demo/enquiry'
import type { ParcelRef } from './victoriaZoning'
import type { PropertyScanResult } from './PropertyScan'

export type SewerServiceFinding = {
  status: 'mapped_connection' | 'ambiguous' | 'nearby_main_only' | 'no_mapped_connection' | 'unavailable'
  detail: string
  source: PropertyScanResult['findings'][number]['source']
  records: Record<string, unknown>[]
  checked_at_utc: string
  authority: { name: string; email: string; url: string }
  question: string
  capacity_status: 'requires_confirmation'
  association_source?: PropertyScanResult['findings'][number]['source']
  association_parcel_count?: number | null
  association_parcel_ids?: number[]
  main_source?: PropertyScanResult['findings'][number]['source']
  main_search_status?: 'not_needed' | 'nearby' | 'none' | 'unavailable'
  main_records?: Record<string, unknown>[]
  main_search_radius_m?: number
}

export function parseSewerService(raw: unknown, expected: ParcelRef): SewerServiceFinding | undefined {
  const row = raw as SewerServiceFinding
  const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0
  const hasDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
  if (!row || typeof row.status !== 'string' || !Object.prototype.hasOwnProperty.call(sewerFindings, row.status) || !hasText(row.detail) || !hasDate(row.checked_at_utc) ||
    row.authority?.email !== 'eng@victoria.ca' || !hasText(row.authority.name) || !hasText(row.question) ||
    row.capacity_status !== 'requires_confirmation' || !Array.isArray(row.records) ||
    !row.records.every(record => record && typeof record === 'object' && !Array.isArray(record))) return
  const validSource = (source?: SewerServiceFinding['source']) => {
    const url = publicSourceUrl(source?.source_url)
    return source && url && new URL(url).hostname === 'maps.victoria.ca' &&
      source.provider === 'City of Victoria Open Data' && hasText(source.record_label) &&
      source.review_status === 'unreviewed_live_observation' && hasDate(source.captured_at_utc) &&
      typeof source.sha256 === 'string' && /^[a-f0-9]{64}$/.test(source.sha256)
  }
  if ((row.source === null ? row.status === 'unavailable' : validSource(row.source)) &&
    (!row.main_source || validSource(row.main_source)) && (!row.association_source || validSource(row.association_source)) &&
    (row.status !== 'mapped_connection' || (row.records.length === 1 && row.association_parcel_count === 1 && Array.isArray(row.association_parcel_ids) && row.association_parcel_ids.length === 1 && row.association_parcel_ids[0] === expected.object_id && validSource(row.association_source))) &&
    (row.status !== 'nearby_main_only' || (row.main_search_status === 'nearby' && validSource(row.main_source) && Array.isArray(row.main_records) && row.main_records.length > 0 && row.main_search_radius_m === 20))) return row
}

const sewerFindings: Record<SewerServiceFinding['status'], string> = {
  mapped_connection: 'The City maps an active sewer connection for this property. Capacity for the proposed dwelling is unconfirmed.',
  ambiguous: 'The City records do not clearly link a sewer connection to this property.',
  nearby_main_only: 'The City maps a sewer main nearby. A connection to this property is unconfirmed.',
  no_mapped_connection: 'The City search found no connection record for this property. Sewer service is unconfirmed.',
  unavailable: 'The City sewer check is unavailable. Sewer service is unconfirmed.',
}

export function sewerFinding(finding: SewerServiceFinding | null | undefined) {
  return sewerFindings[finding?.status ?? 'unavailable']
}

export function sewerSources({ source, association_source, main_source, checked_at_utc }: SewerServiceFinding) {
  const sources = [source, association_source, main_source].filter((item): item is NonNullable<SewerServiceFinding['source']> => !!item)
  return sources.length ? sources.map(item => ({ text: `${item.provider} · ${item.record_label} · checked ${readableDate(item.captured_at_utc)} · unreviewed`, url: publicSourceUrl(item.source_url) }))
    : [{ text: `City of Victoria map lookup attempted ${readableDate(checked_at_utc)}`, url: null }]
}

export function suggestedSewerQuestion(finding: SewerServiceFinding | null | undefined, intendedUse: string, housePlan?: string | null) {
  if (finding?.status !== 'mapped_connection') return 'How would we confirm sewer service for this property?'
  const proposal = intendedUse === 'Garden suite' ? 'the proposed garden suite'
    : intendedUse === 'Home office' ? 'the proposed home office'
    : housePlan === 'replace' ? 'a replacement dwelling' : 'the proposed project'
  return `Can you help confirm whether the existing sewer connection can serve ${proposal} and whether any upgrades would be needed?`
}

export function sewerReport(finding: SewerServiceFinding | null, question = ''): EnquirySection {
  const sources = finding ? sewerSources(finding).map(({ text, url }) => `${text}.${url ? ` ${url}` : ''}`) : []
  const summary = [sewerFinding(finding), question].filter(Boolean)
  return { heading: 'Sewer connection', paragraphs: [...summary, ...sources], emailSummary: summary.join(' '), siteDetails: true }
}
