import { useEffect } from 'react'
import { CopyableRecord, publicSourceUrl, readableDate } from '../ReadableProvenance'
import { emailDraftUrl, type EnquirySection } from '../builder_demo/enquiry'
import type { ParcelRef } from './victoriaZoning'
import type { PropertyScanResult, usePropertyScan } from './PropertyScan'
import { StatusIcon } from './HomeownerSummary'

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

export const sewerStatusLabels: Record<SewerServiceFinding['status'], string> = {
  mapped_connection: 'Connection shown on the City map',
  ambiguous: 'Connection match unclear',
  nearby_main_only: 'Sewer main mapped nearby',
  no_mapped_connection: 'No connection record found',
  unavailable: 'City map check unavailable',
}

export function parseSewerService(raw: unknown, expected: ParcelRef): SewerServiceFinding | undefined {
  const row = raw as SewerServiceFinding
  const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0
  const hasDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
  if (!row || typeof row.status !== 'string' || !Object.prototype.hasOwnProperty.call(sewerStatusLabels, row.status) || !hasText(row.detail) || !hasDate(row.checked_at_utc) ||
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

export const sewerServiceTitle = 'Sanitary sewer connection'
const capacity = 'Capacity and permission to connect or reuse a connection still need City confirmation.'
const authority = 'City of Victoria Engineering'
const email = 'eng@victoria.ca'

function sourceRows({ source, main_source, checked_at_utc }: SewerServiceFinding) {
  const sources = [source, main_source].filter((item): item is NonNullable<SewerServiceFinding['source']> => !!item)
  return sources.length ? sources.map(item => ({ text: `${item.provider} · ${item.record_label} · checked ${readableDate(item.captured_at_utc)} · unreviewed`, url: publicSourceUrl(item.source_url) }))
    : [{ text: `City of Victoria map lookup attempted ${readableDate(checked_at_utc)}`, url: null }]
}

function serviceQuestion(intendedUse: string, housePlan?: string | null, detached = false) {
  const use = intendedUse.trim()
  const gardenSuite = !detached && /garden suite/i.test(use)
  const otherUse = !detached && !gardenSuite && use && !/^(not sure|unknown|undecided|still deciding|prefer not to say)$/i.test(use)
  const replacement = detached || !gardenSuite && !otherUse && housePlan === 'replace'
  const proposal = replacement ? 'a replacement dwelling' : gardenSuite ? 'the proposed garden suite' : 'the proposed dwelling'
  const context = otherUse ? `For my intended use (${use}), ` : gardenSuite || replacement ? 'For this project, ' : 'If I proceed with a new dwelling, '
  return `${context}can you confirm the property’s sanitary sewer connection and whether it can serve ${otherUse ? 'the proposal' : proposal}? What wastewater demand information or connection upgrades would you need?`
}

export function sewerReport(finding: SewerServiceFinding | null, intendedUse: string, housePlan?: string | null): EnquirySection {
  const line = `${finding?.detail ?? 'City map check unavailable.'} ${capacity}`
  const next = `Ask ${authority} (${email}): ${serviceQuestion(intendedUse, housePlan)}`
  const sources = finding ? sourceRows(finding).map(({ text, url }) => `${text}.${url ? ` ${url}` : ''}`) : []
  return { heading: sewerServiceTitle, paragraphs: [line, ...sources, next], emailSummary: `${line} ${next}`, siteDetails: true }
}

export function sewerEnquiry(finding: SewerServiceFinding | null): EnquirySection {
  const line = `${sewerStatusLabels[finding?.status ?? 'unavailable']}. ${capacity} ${authority} (${email}) can advise on site servicing.`
  return { heading: sewerServiceTitle, paragraphs: [line, ...(finding ? sourceRows(finding).map(row => row.text) : [])], emailSummary: line, siteDetails: true }
}

export function SewerService({ scan, address, intendedUse, housePlan, detached = false, example = false }: {
  scan: ReturnType<typeof usePropertyScan>; address: string | null; intendedUse: string; housePlan?: string | null; detached?: boolean; example?: boolean
}) {
  useEffect(() => { void import('./sewer-service.css') }, [])
  const finding = scan.result?.sewer
  const detail = finding?.detail ?? (!scan.available ? 'Victoria sewer map coverage requires a selected City parcel.'
    : scan.busy ? 'Checking the City sewer map…' : scan.error || finding === null ? 'City map check unavailable.' : 'No sewer finding was included in this property scan.')
  const question = serviceQuestion(intendedUse, housePlan, detached)
  const sources = finding ? sourceRows(finding) : []
  const subject = `${example ? 'Saved example only — ' : ''}Sanitary sewer service question${address ? ` — ${address}` : ''}`
  const body = ['Hello City of Victoria Engineering,', example ? 'I am reviewing a saved example. This property is not mine.' : '', address ? `Property: ${address}.` : '', question, detail, ...sources.map(({ text, url }) => `${text}.${url ? ` ${url}` : ''}`), 'Thank you.'].filter(Boolean).join('\n\n')
  const draft = emailDraftUrl('mailto', email, subject, body)
  return <section className="project-details builder-sewer-service" aria-labelledby="sewer-service">
    <h3 id="sewer-service" tabIndex={-1}>{sewerServiceTitle}</h3>
    <div className="builder-sewer-service__finding">
      <StatusIcon status={finding && finding.status !== 'unavailable' ? 'review' : 'unknown'} />
      <div>
        <p>{detail}</p>
        {sources.map(({ text, url }) => <p key={text} className="metadata">{text}{url && <> · <a href={url} target="_blank" rel="noreferrer">View City layer</a></>}</p>)}
      </div>
    </div>
    {scan.available && <>
      <p>{capacity}</p>
      {(scan.error || finding?.status === 'unavailable' || finding?.main_search_status === 'unavailable' || !finding) && !scan.busy && <button type="button" onClick={scan.retry}>Retry sewer map check</button>}
      <details><summary>Ask City of Victoria Engineering</summary>
        <p>{question}</p>
        {draft ? <a href={draft}>Open email draft to {email}</a> : <><p><a href={`mailto:${email}`}>{email}</a></p><CopyableRecord id="sewer-service-email" label="Email draft to copy" value={body} /></>}
      </details>
    </>}
  </section>
}
