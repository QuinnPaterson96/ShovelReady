import { useEffect } from 'react'
import { MeasurementInput } from '../MeasurementInput'
import { StepInfo } from '../StepInfo'
import { CopyableRecord, TechnicalDetails, publicSourceUrl, readableDate } from '../ReadableProvenance'
import type { MunicipalDraft, MunicipalProfile, MunicipalResult } from './model'
import { findingText, invalidMunicipalInput } from './model'

export function MunicipalInputs({ profile, draft, onChange, result }: {
  profile: MunicipalProfile; draft: MunicipalDraft; onChange: (next: MunicipalDraft) => void; result: MunicipalResult | null
}) {
  useEffect(() => { void import('./municipal-facts.css') }, [])
  const area = result?.findings.find(finding => finding.input_id === 'lot_area')
  const source = profile.inputs.find(field => field.definition)?.definition?.source
  return <section aria-label={profile.label} className="municipal-facts">
    <h3>{profile.label}</h3><p>{profile.scope}</p>
    {source && <p>{source.provider} · {source.record_label} · captured {readableDate(source.capture_date)} · {source.review_status}. Effective bylaw revision remains unresolved.</p>}
    {area && <p>{findingText(result!, area)}</p>}
    <details><summary>Add or correct local property facts</summary>
      <p>Leave a measurement blank when unknown. Lot area uses the captured polygon as an approximate assumption unless you enter an override.</p>
      {profile.inputs.map(field => {
        const definition = field.definition
        const value = draft[field.id] ?? ''
        const invalid = field.kind === 'measurement' && invalidMunicipalInput(profile, { [field.id]: value }) !== null
        return <div key={field.id}>
          <div className="municipal-facts__label"><label htmlFor={`municipal-input-${field.id}`}>{field.label}{definition ? ` (${definition.unit === 'fraction' ? '%' : definition.unit === 'm2' ? 'm²' : 'm'})` : ''}</label>
            <StepInfo label={`${field.label} definition`}>{definition?.basis ?? field.help} {definition?.description}</StepInfo>
          </div>
          {field.kind === 'boolean' ? <select id={`municipal-input-${field.id}`} value={value} onChange={event => onChange({ ...draft, [field.id]: event.target.value })}>
            <option value="">Not sure</option><option value="true">Yes, under my supplied information</option><option value="false">No</option>
          </select> : <MeasurementInput id={`municipal-input-${field.id}`} type="text" inputMode="decimal" dimension={definition?.unit === 'm' ? 'length' : 'area'} value={value} placeholder={field.id === 'lot_area' ? 'Use mapped area' : 'Unknown'} aria-invalid={!!invalid} onChange={event => onChange({ ...draft, [field.id]: event.target.value })} />}
          {invalid && <p role="alert">Enter a nonnegative number{definition?.unit === 'fraction' ? ' up to 100%' : ''}, or leave blank.</p>}
          {definition && <details><summary>{field.label} source and measurement basis</summary><p>{definition.basis}. {definition.description}</p>
            <p>{definition.source.provider} · {definition.source.locator} · captured {readableDate(definition.source.capture_date)} · {definition.source.review_status}.
              {' '}<a href={publicSourceUrl(definition.source.url) ?? undefined} target="_blank" rel="noreferrer">Read the source</a></p>
          </details>}
        </div>
      })}
    </details>
    {result && <TechnicalDetails title="Compared checks and exact evidence">
      {result.findings.map(finding => <p key={finding.id}><strong>{finding.label}</strong> · {finding.status.replace(/_/g, ' ')}. {findingText(result, finding)}</p>)}
      <CopyableRecord id="municipal-exact-record" label="Complete municipal comparison evidence" value={JSON.stringify(result, null, 2)} />
    </TechnicalDetails>}
  </section>
}
