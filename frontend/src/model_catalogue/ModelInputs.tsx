import { bundledCatalogue, editField, editHeightReference, editIdentity, fieldError, selectModel } from './model'
import type { Catalogue, Field, Selection } from './model'
import { readableDate, TechnicalDetails } from '../ReadableProvenance'
import { PublishedDimensions } from './PublishedDimensions'
import { MeasurementLabel } from './MeasurementLabel'
import { measurementCopy } from './measurementCopy'
import { MeasurementInput } from '../MeasurementInput'

const fields: Field[] = ['width', 'depth', 'height', 'area']

export function ModelInputs({ value, onChange, catalogue = bundledCatalogue }: {
  value: Selection; onChange: (next: Selection) => void; catalogue?: Catalogue | null
}) {
  const model = catalogue?.models.find(item => item.model_id === value.modelId)
  const selected = model && value.snapshotId === catalogue?.snapshot_id ? model : null
  return <section className="sr-model-inputs" aria-labelledby="model-inputs-title">
    <h2 id="model-inputs-title">Prefab model inputs</h2>
    <p>Choose a provider model or enter your own details. All measurements are optional. Provider specifications are unreviewed leads, and no model or site fit has been assessed.</p>
    {!catalogue && <p role="status" className="sr-model-notice">Catalogue unavailable. Enter a model manually; no values are inferred.</p>}
    {catalogue && <><label htmlFor="sr-model-select">Model</label>
      <select id="sr-model-select" value={selected?.model_id ?? ''}
        onChange={event => onChange(selectModel(value, catalogue, event.target.value || null))}>
        <option value="">Manual model entry / no catalogue match</option>
        {catalogue.models.map(item => <option key={item.model_id} value={item.model_id}>{item.provider} · {item.name}</option>)}
      </select></>}
    {!selected && <div className="sr-model-grid">
      {(['provider', 'modelName'] as const).map(field => <div key={field}>
        <label htmlFor={`sr-model-${field}`}>{field === 'provider' ? 'Provider' : 'Model name'}</label>
        <input id={`sr-model-${field}`} value={value[field]} onChange={event => onChange(editIdentity(value, field, event.target.value))} />
      </div>)}
    </div>}
    {selected && <div className="sr-model-source">
      <p><strong>{selected.provider} · {selected.name}</strong> · unreviewed provider observation</p>
      <PublishedDimensions model={selected} />
      <p>Configuration: {selected.configuration}. Controlled model revision: {selected.source_revision ?? 'unknown'}.</p>
      <p>Service area: {selected.service_area_note}</p>
      <p>Installation: {selected.installation_note}</p>
      <p>Footprint: {selected.footprint_note}</p>
      <p>Use: {selected.intended_use_note}</p>
      <a href={selected.provider_url} target="_blank" rel="noreferrer">Provider model page</a>
      <p>Provider sources captured {readableDate(selected.sources[0]?.captured_at)} · unreviewed.</p>
    </div>}
    <p className="sr-model-hint">Display rounds lengths to two decimal places and areas to one. Focus a field to edit its full value; calculations keep the stored precision.</p>
    <div className="sr-model-grid">{fields.map(field => {
      const input = value.fields[field]
      const error = fieldError(input.value)
      return <div key={field}>
        <MeasurementLabel field={field} inputId={`sr-model-${field}`} />
        <MeasurementInput id={`sr-model-${field}`} inputMode="decimal" value={input.value} dimension={field === 'area' ? 'area' : 'length'}
          aria-invalid={!!error} aria-describedby={`sr-model-hint-${field}${error ? ` sr-model-error-${field}` : ''}`}
          onChange={event => onChange(editField(value, field, event.target.value))} />
        <p id={`sr-model-hint-${field}`} className="sr-model-hint">
          {input.value.trim() ? input.origin === 'source' ? 'Source value · unreviewed' : 'User value · unreviewed' : 'Unknown'}.
          {' '}{measurementCopy[field].hint}
        </p>
        {error && <p id={`sr-model-error-${field}`} className="sr-model-error" role="alert">{error}</p>}
        {input.baseline && <details><summary>Source baseline and basis</summary>
          <p>{input.baseline.quantity?.original_text ?? 'Unknown'} · {input.baseline.definition}</p>
          {input.baseline.quantity && <p>Full normalized source value: {input.baseline.quantity.value} {input.baseline.quantity.unit}</p>}
          <p>{input.baseline.reason ?? 'Source transcription'} · unreviewed provider observation.</p>
          <TechnicalDetails><p>Source ID: <code>{input.baseline.source_id ?? 'unknown'}</code></p></TechnicalDetails>
          {input.origin === 'user' && <p>Current entry overrides this baseline and remains unreviewed.</p>}
        </details>}
      </div>
    })}</div>
    <label htmlFor="sr-model-height-reference">How was this height measured?</label>
    <select id="sr-model-height-reference" value={value.heightReference}
      onChange={event => onChange(editHeightReference(value, event.target.value as Selection['heightReference']))}>
      <option value="unknown">Unknown / not established</option>
      <option value="foundation_datum_to_roof_high_point">From the foundation reference to the highest roof point</option>
    </select>
    <p className="sr-model-hint">If you are unsure how it was measured, we will save the value but leave the height check unresolved. Your answer remains unverified.</p>
    {selected && <details><summary>All source measurements and capture identity</summary>
      <p>{selected.provider} · {selected.name} · catalogue captured {readableDate(catalogue?.captured_at)} · unreviewed.</p>
      <ul>{selected.measurements.map(measure => <li key={measure.name}>{measure.name}: {measure.quantity?.original_text ?? 'unknown'} · {measure.definition}
        {measure.reason && ` · ${measure.reason}`}</li>)}</ul>
      <ul>{selected.sources.map(source => <li key={source.source_id}><a href={source.url} target="_blank" rel="noreferrer">Provider source</a> · {source.locator} · captured {readableDate(source.captured_at)} · {source.artifact_status}</li>)}</ul>
      <TechnicalDetails><pre>{JSON.stringify({ catalogue_schema: catalogue?.schema_version, catalogue_snapshot: value.snapshotId, sources: selected.sources }, null, 2)}</pre></TechnicalDetails>
    </details>}
    <p className="sr-model-notice">Every edit or model change invalidates the prior preparation summary. Catalogue data, user edits and manual entries remain unreviewed.</p>
  </section>
}

export default ModelInputs
