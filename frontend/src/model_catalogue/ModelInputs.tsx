import { bundledCatalogue, editField, editHeightReference, editIdentity, fieldError, selectModel } from './model'
import type { Catalogue, Field, Selection } from './model'

const labels: Record<Field, string> = { width: 'Nominal exterior width (m)', depth: 'Nominal exterior depth (m)',
  height: 'Building height (m)', area: 'Manufacturer interior area (m²)' }
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
      <p>Configuration: {selected.configuration}. Controlled model revision: {selected.source_revision ?? 'unknown'}.</p>
      <p>Service area: {selected.service_area_note}</p>
      <p>Installation: {selected.installation_note}</p>
      <p>Footprint: {selected.footprint_note}</p>
      <p>Height: {selected.height_note}</p>
      <p>Use: {selected.intended_use_note}</p>
      <a href={selected.provider_url} target="_blank" rel="noreferrer">Provider model page</a>
    </div>}
    <div className="sr-model-grid">{fields.map(field => {
      const input = value.fields[field]
      const error = fieldError(input.value)
      return <div key={field}>
        <label htmlFor={`sr-model-${field}`}>{labels[field]}</label>
        <input id={`sr-model-${field}`} inputMode="decimal" value={input.value}
          aria-invalid={!!error} aria-describedby={`sr-model-hint-${field}${error ? ` sr-model-error-${field}` : ''}`}
          onChange={event => onChange(editField(value, field, event.target.value))} />
        <p id={`sr-model-hint-${field}`} className="sr-model-hint">
          {input.value.trim() ? input.origin === 'source' ? 'Source value · unreviewed' : 'User value · unreviewed' : 'Unknown'}.
          {field === 'height' && ' Roof high point and measurement datum are required; ceiling and unspecified overall exterior height do not qualify.'}
          {field === 'area' && ' Physical interior area, not regulatory floor area.'}
        </p>
        {error && <p id={`sr-model-error-${field}`} className="sr-model-error" role="alert">{error}</p>}
        {input.baseline && <details><summary>Source baseline and basis</summary>
          <p>{input.baseline.quantity?.original_text ?? 'Unknown'} · {input.baseline.definition}</p>
          <p>Source: {input.baseline.source_id ?? 'missing'} · {input.baseline.reason ?? 'Source transcription'}</p>
          {input.origin === 'user' && <p>Current entry overrides this baseline and remains unreviewed.</p>}
        </details>}
      </div>
    })}</div>
    <label htmlFor="sr-model-height-reference">Building height measurement reference</label>
    <select id="sr-model-height-reference" value={value.heightReference}
      onChange={event => onChange(editHeightReference(value, event.target.value as Selection['heightReference']))}>
      <option value="unknown">Unknown / not established</option>
      <option value="foundation_datum_to_roof_high_point">Foundation datum to roof high point · user asserted</option>
    </select>
    <p className="sr-model-hint">A height with unknown reference is retained in this draft but excluded from the assessment mapping. Regulatory height from grade requires separate site and rule evidence.</p>
    {selected && <details><summary>All source measurements and capture identity</summary>
      <p>Catalogue captured {catalogue?.captured_at ?? 'unknown'} · snapshot <code>{value.snapshotId}</code>.</p>
      <ul>{selected.measurements.map(measure => <li key={measure.name}>{measure.name}: {measure.quantity?.original_text ?? 'unknown'} · {measure.definition}
        {measure.reason && ` · ${measure.reason}`}</li>)}</ul>
      <ul>{selected.sources.map(source => <li key={source.source_id}><a href={source.url} target="_blank" rel="noreferrer">{source.source_id}</a> · {source.locator} · captured {source.captured_at} · SHA-256 {source.sha256 ?? 'capture gap'}</li>)}</ul>
    </details>}
    <p className="sr-model-notice">Every edit or model change invalidates the prior preparation summary. Catalogue data, user edits and manual entries remain unreviewed.</p>
  </section>
}

export default ModelInputs
