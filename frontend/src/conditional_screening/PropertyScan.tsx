import { useEffect, useState } from 'react'
import { TechnicalDetails, CopyableRecord, readableDate } from '../ReadableProvenance'
import type { ParcelRef } from './victoriaZoning'
import { StepInfo } from '../StepInfo'
import { StatusIcon } from './HomeownerSummary'

const scanLabels = ['Heritage properties', 'Heritage conservation areas', 'Development permit areas', 'Mapped special restrictions', 'Mapped development applications', 'Development application history']

// General guidance only; these descriptions do not establish site applicability.
const scanHelp: Record<string, string> = {
  'Heritage properties': 'City-listed heritage property records. Review the returned record and ask City heritage staff whether the proposed work needs heritage review.',
  'Heritage conservation areas': 'Mapped heritage conservation areas. Ask City planning staff which area guidelines apply to the property and proposed work.',
  'Development permit areas': 'Mapped areas where development may need additional permit review. Check the returned area name and ask City planning staff about applicable guidelines.',
  'Mapped special restrictions': 'Restrictions and covenants shown in the searched City map layer. Review any returned records; this map does not replace a land-title search.',
  'Mapped development applications': 'Development applications shown near or on the parcel by the City map query. Check the application and its location in Development Tracker; a map hit is not an issued approval.',
  'Development application history': 'Application-history records linked by the City query. Review their status and underlying documents in Development Tracker or the Property Information Portal.',
  'Permit conditions': 'Requirements attached to an issued permit or approved plans. Obtain the permit and approved drawings through the City Property Information Portal or permit-records request. They have not been reviewed by this scan.',
  'Title restrictions': 'Registered interests such as covenants, easements or rights of way that may affect how land can be used. Obtain the current title and relevant registered documents from LTSA; ask a qualified professional to interpret their effect. This scan has not searched title records.',
  'Projections': 'Parts extending beyond the main building walls, such as eaves, balconies or steps. Ask the provider for installed drawings and have the proposed projections checked against the applicable City rules. They are not captured by the nominal rectangle.',
  'Service capacity': 'Whether water, sewer, drainage and power can support the additional building. Ask City servicing staff and utility providers about the proposed connections and any upgrades. This scan does not assess capacity.',
}
function ScanCard({ label, status, answer, source, row }: { label: string; status: 'probable' | 'review' | 'unknown'; answer: string; source: string; row?: PropertyScanResult['findings'][number] }) {
  return <li className={`property-scan__${status}`}><StepInfo className="property-scan__help" label={label} trigger={<><StatusIcon status={status} /><span className="property-scan__card-content"><strong>{label}</strong><span>{answer}</span><small>{source}</small><small className="property-scan__help-hint">Hover or tap for details</small></span></>}>
    <strong>{label}</strong><p>{scanHelp[label]}</p>
    {row ? <><p>{row.detail}</p>{row.records.length > 0 && <p>Returned records: {row.records.map(record => `${String(record.Name ?? record.SUBJECT ?? record.Heritage ?? record.AppType ?? 'City record requiring review')}${record.STATUS ? ` (${String(record.STATUS)})` : ''}`).join('; ')}</p>}{row.source && <p>{row.source.provider} · {row.source.record_label} · {readableDate(row.source.captured_at_utc)} · unreviewed</p>}</> : <p>No property-specific finding is available for this item.</p>}
  </StepInfo></li>
}

export type PropertyScanResult = {
  schema_version: 'victoria-property-scan.v1'; parcel_ref: ParcelRef
  findings: { label: string; status: 'probably_clear' | 'review' | 'unknown'; records: Record<string, unknown>[]; detail: string; source: null | { provider: string; record_label: string; source_url: string; captured_at_utc: string; review_status: string; sha256: string } }[]
  limitations: string[]; parcel_source: unknown
}

export function parsePropertyScan(raw: unknown, expected: ParcelRef): PropertyScanResult {
  const value = raw as PropertyScanResult
  const labels = ['Heritage properties', 'Heritage conservation areas', 'Development permit areas', 'Mapped special restrictions', 'Mapped development applications', 'Development application history']
  const nonempty = (item: unknown) => typeof item === 'string' && item.trim().length > 0
  const validSource = (source: PropertyScanResult['findings'][number]['source']) => source !== null &&
    source.provider === 'City of Victoria Open Data' && nonempty(source.record_label) &&
    source.review_status === 'unreviewed_live_observation' && nonempty(source.captured_at_utc) &&
    typeof source.sha256 === 'string' && /^[a-f0-9]{64}$/.test(source.sha256) &&
    typeof source.source_url === 'string' && /^https:\/\/maps\.victoria\.ca\/server\/rest\/services\/OpenData\/OpenData_PlanningAndDevelopment\/MapServer\/(1|3|10|11|14|18)\/query\?/.test(source.source_url)
  if (!value || value.schema_version !== 'victoria-property-scan.v1' ||
    value.parcel_ref?.source !== expected.source || value.parcel_ref?.object_id !== expected.object_id ||
    !Array.isArray(value.findings) || value.findings.length !== 6 ||
    !labels.every(label => value.findings.some(row => row?.label === label)) ||
    !Array.isArray(value.limitations) || !value.limitations.every(nonempty) ||
    !value.findings.every(row => row && labels.includes(row.label) &&
      ['probably_clear', 'review', 'unknown'].includes(row.status) && nonempty(row.detail) &&
      Array.isArray(row.records) && row.records.length < 24 && row.records.every(record =>
        record && typeof record === 'object' && !Array.isArray(record) && Number.isInteger(record.OBJECTID)) &&
      (row.source === null ? row.status === 'unknown' : validSource(row.source)) &&
      (row.status !== 'probably_clear' || row.records.length === 0) &&
      (row.status !== 'review' || row.records.length > 0))) throw Error('Property scan is incomplete or belongs to another parcel.')
  return value
}

export function usePropertyScan(request: { parcel_ref: ParcelRef; expected_pid?: string } | null, revision: string | null) {
  const [attempt, setAttempt] = useState(0)
  const key = request && revision ? JSON.stringify([request, revision, attempt]) : null
  const [state, setState] = useState<{ key: string; result: PropertyScanResult | null; error: string } | null>(null)
  useEffect(() => {
    if (!key || !request) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort('timeout'), 18000)
    void (async () => {
      try {
        const response = await fetch('/api/victoria-zoning/property-scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schema_version: 'victoria-property-scan.v1', ...request }), signal: controller.signal })
        if (!response.ok) throw Error(`Property scan unavailable (${response.status}).`)
        const result = parsePropertyScan(await response.json(), request.parcel_ref)
        if (!controller.signal.aborted) setState({ key, result, error: '' })
      } catch (error) {
        if (!controller.signal.aborted || controller.signal.reason === 'timeout') setState({ key, result: null, error: controller.signal.reason === 'timeout' ? 'Scan timed out.' : error instanceof Error ? error.message : 'Unavailable.' })
      } finally { window.clearTimeout(timeout) }
    })()
    return () => { controller.abort(); window.clearTimeout(timeout) }
  }, [key])
  return { result: key && state?.key === key ? state.result : null, error: key && state?.key === key ? state.error : '', busy: !!key && state?.key !== key, available: !!key, retry: () => setAttempt(value => value + 1) }
}

export function PropertyScan({ scan }: { scan: ReturnType<typeof usePropertyScan> }) {
  useEffect(() => { void import('./property-scan.css') }, [])
  return <section className="project-details" id="property-scan" tabIndex={-1} aria-label="Preliminary property scan">
    <h3>Preliminary property scan</h3>
    <p>City map flags and linked application history. Issued permit conditions, title covenants, projections and service capacity still need review.</p>
    {scan.busy ? <p role="status">Scanning City records…</p> : scan.error ? <p role="status">{scan.error} Unsearched records remain unknown.</p> : !scan.available ? <p>A selected City parcel is needed for this scan. Manual sketches cannot establish property records.</p> : null}
    {scan.available && <button type="button" onClick={scan.retry}>Refresh property scan</button>}
    <p className="property-scan__legend">Yes: City records found. No: none found in the searched City sources. Maybe: unknown or not checked.</p>
    <ul className="property-scan__list" aria-label="Property review checklist">{scanLabels.map(label => {
      const row = scan.result?.findings.find(finding => finding.label === label)
      const status = row?.status === 'probably_clear' ? 'probable' : row?.status === 'review' ? 'review' : 'unknown'
      return <ScanCard key={label} label={label} row={row} status={status} answer={status === 'probable' ? 'No · Likely fine in searched scope' : status === 'review' ? 'Yes · Needs review' : `Maybe · ${scan.busy ? 'Scanning…' : 'Not established'}`} source={row?.source ? `City records · ${readableDate(row.source.captured_at_utc)} · unreviewed` : 'No source finding established'} />
    })}{['Permit conditions', 'Title restrictions', 'Projections', 'Service capacity'].map(label => <ScanCard key={label} label={label} status="unknown" answer="Maybe · Not checked" source="Property-specific records needed" />)}</ul>
    {scan.result && <details><summary>Scan findings and sources</summary>{scan.result.findings.map(row => <div key={row.label}><strong>{row.label} · {row.status === 'probably_clear' ? 'Likely fine in searched scope' : row.status === 'review' ? 'Needs review' : 'Unknown'}</strong><p>{row.detail}</p>{row.source && <p>{row.source.provider} · {row.source.record_label} · captured {readableDate(row.source.captured_at_utc)} · unreviewed. <a href={row.source.source_url} target="_blank" rel="noreferrer">City source</a></p>}{row.records.length > 0 && <ul>{row.records.map((record, index) => <li key={index}>{String(record.Name ?? record.SUBJECT ?? record.Heritage ?? record.AppType ?? 'City record requiring review')}{record.STATUS ? ` (${String(record.STATUS)})` : ''}</li>)}</ul>}{row.records.length > 0 && <TechnicalDetails title={`${row.label}: returned records`}><CopyableRecord id={`scan-${row.label.replace(/ /g, "-")}`} label="Source records" value={JSON.stringify(row.records, null, 2)} /></TechnicalDetails>}</div>)}</details>}
    <p><a href="https://www.victoria.ca/building-business/permits-development-construction/development-tracker" target="_blank" rel="noreferrer">Development Tracker</a> · <a href="https://tender.victoria.ca/WebApps/PIP/Pages/Search.aspx" target="_blank" rel="noreferrer">Property Information Portal</a> · <a href="https://www.victoria.ca/building-business/permits-development-construction/building-renovating/accessing-permit-records" target="_blank" rel="noreferrer">Permit records</a> · <a href="https://ltsa.ca/property-owners/how-can-i/find-information-on-a-title/" target="_blank" rel="noreferrer">LTSA title records</a></p>
  </section>
}
