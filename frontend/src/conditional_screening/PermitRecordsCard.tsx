import { CopyableRecord, publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { StatusIcon } from './HomeownerSummary'
import type { ScanSource } from './PropertyScan'

type PermitRecord = {
  case_number: string
  application_type: string | null
  subject: string | null
  application_status: string | null
  application_date: string | null
  case_url: string
  evidence_checked_on: string | null
  issuance_task: 'dated_completion' | 'no_completion_date' | null
  issued_on: string | null
  approved_plan_links: string[] | null
  applicable_condition_reviewed: false
  follow_up: string
}

export type PermitRecords = {
  status: 'records_found' | 'no_match' | 'unavailable' | 'truncated'
  source: ScanSource | null
  records: PermitRecord[]
  detail: string
}

export function validatePermitRecords(permit: PermitRecords, validSource: (source: ScanSource | null | undefined) => boolean) {
  const dateOrUnknown = (date: unknown) => date === null || typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
  const nonempty = (item: unknown) => typeof item === 'string' && item.trim().length > 0
  const textOrUnknown = (item: unknown) => item === null || nonempty(item)
  const planUrl = /^https:\/\/tender\.victoria\.ca\/webapps\/ourcity\/Prospero\/FileDownload\.aspx\?fileId=[A-Za-z0-9-]+&folderId=[A-Za-z0-9]+$/i
  const hasSource = permit?.source && validSource(permit.source) && permit.source.source_url.includes('/18/query?')
  if (!permit || !nonempty(permit.detail) || !Array.isArray(permit.records)) throw Error('Permit records are incomplete.')
  if (permit.status === 'no_match' && hasSource && permit.records.length === 0) return
  if (permit.status === 'unavailable' && (permit.source === null || hasSource) && permit.records.length === 0) return
  if (permit.status === 'truncated' && permit.source === null && permit.records.length === 0) return
  if (permit.status !== 'records_found' || !hasSource || !permit.records.length ||
    !permit.records.every(record => record && typeof record.case_number === 'string' && /^(?:DDP|DDV|DP|DPV|DVP)[0-9]{5,6}$/.test(record.case_number) &&
      record.case_url === `https://tender.victoria.ca/webapps/ourcity/Prospero/Details.aspx?folderNumber=${record.case_number}` &&
      textOrUnknown(record.application_type) && textOrUnknown(record.subject) && textOrUnknown(record.application_status) &&
      dateOrUnknown(record.application_date) && dateOrUnknown(record.evidence_checked_on) && dateOrUnknown(record.issued_on) &&
      [null, 'no_completion_date', 'dated_completion'].includes(record.issuance_task) &&
      (record.issuance_task === 'dated_completion' ? record.issued_on !== null : record.issued_on === null) &&
      (record.issuance_task === null || record.evidence_checked_on !== null) &&
      (record.approved_plan_links === null || record.evidence_checked_on !== null && Array.isArray(record.approved_plan_links) &&
        record.approved_plan_links.every(link => typeof link === 'string' && planUrl.test(link))) &&
      record.applicable_condition_reviewed === false && nonempty(record.follow_up))) throw Error('Permit records are incomplete.')
}

function Case({ record }: { record: PermitRecord }) {
  const { case_number, case_url, follow_up, application_type, application_date, subject,
    evidence_checked_on, issuance_task, issued_on, approved_plan_links } = record
  return <article className="property-scan__permit-case">
    <strong><a href={case_url} target="_blank" rel="noreferrer">{case_number} in Development Tracker</a></strong>
    <p>{application_type || 'Application record'}{application_date && <> · Filed <time>{application_date}</time></>}</p>
    {subject && <p>{subject}</p>}
    <p>{issued_on ? <>Issuance recorded <time>{issued_on}</time>.</>
      : issuance_task === 'no_completion_date' ? 'The tracker’s issuance task had no completion date when checked.'
      : 'Issuance date has not been checked.'}</p>
    {approved_plan_links && approved_plan_links.length > 0 && <p>
      {approved_plan_links.map((link, index) => <span key={link}>{index > 0 && ' · '}<a href={link} target="_blank" rel="noreferrer">Final approved drawing {index + 1}</a></span>)}
    </p>}
    {evidence_checked_on && <small>City of Victoria Development Tracker · checked <time>{evidence_checked_on}</time></small>}
    <p>{follow_up}</p>
  </article>
}

export function PermitRecordsCard({ records, busy, available }: {
  records?: PermitRecords; busy: boolean; available: boolean
}) {
  const status = records?.status
  const count = records?.records.length ?? 0
  const finding = busy ? 'Searching City application history…'
    : status === 'records_found' ? `${count} linked ${count === 1 ? 'file' : 'files'} found`
    : status === 'truncated' ? 'Search incomplete · more records may exist'
    : status === 'no_match' ? 'No matching development or variance permit files in the searched City history'
    : available ? 'City permit lookup unavailable' : 'Select a City parcel to search'
  const tone = count > 0 ? 'review' : 'unknown'
  const source = records?.source
  const sourceUrl = publicSourceUrl(source?.source_url)
  return <li className={`property-scan__${tone}`}>
    <details className="property-scan__permit">
      <summary>
        <StatusIcon status={tone} />
        <span className="property-scan__card-content">
          <strong>Permit records to review</strong>
          <span>{finding}</span>
          {source && <small>{source.record_label} · checked {readableDate(source.captured_at_utc)}</small>}
        </span>
      </summary>
      <div className="property-scan__permit-details">
        {source && <small>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer">{source.provider}</a> : source.provider} · unreviewed</small>}
        {count > 0 && <p>{records?.detail}</p>}
        {records?.records.map(record => <Case key={record.case_number} record={record} />)}
        {(status === 'truncated' || status === 'unavailable') && <p>{records?.detail}</p>}
        {count === 0 && !busy && <p>See <a href="https://tender.victoria.ca/WebApps/PIP/Pages/Search.aspx" target="_blank" rel="noreferrer">City Property Information Portal</a> for the property’s permit history.</p>}
        {source && <TechnicalDetails title="Permit search evidence">
          <CopyableRecord id="permit-records-evidence" label="Permit search records and source" value={JSON.stringify(records, null, 2)} />
        </TechnicalDetails>}
      </div>
    </details>
  </li>
}
