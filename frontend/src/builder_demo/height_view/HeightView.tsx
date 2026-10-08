import { useState } from 'react'
import type { CatalogueModel } from '../../model_catalogue/model'
import { measurementWithUnit } from '../../measurements'
import { readableDate, TechnicalDetails } from '../../ReadableProvenance'

/** A source-attributed dimensional explanation, not an installed-height calculation. */
export type HeightViewProps = {
  model: CatalogueModel
  /** Optional local scenario input in metres; this is never promoted to source evidence. */
  initialFoundationAllowanceM?: string
  foundationAllowanceM?: string | null
  onFoundationAllowanceChange?: (metres: string | null) => void
}

function validAllowance(value: string): boolean {
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) && Number.isFinite(Number(value)) && Number(value) >= 0
}

export function HeightView({ model, initialFoundationAllowanceM = '', foundationAllowanceM, onFoundationAllowanceChange }: HeightViewProps) {
  const [localAllowance, setAllowance] = useState(initialFoundationAllowanceM)
  const allowance = foundationAllowanceM === undefined ? localAllowance : foundationAllowanceM ?? ''
  const advertised = model.measurements.find(item => item.name === 'advertised_overall_height')
  const quantity = advertised?.status === 'known' && advertised.quantity?.dimension === 'length'
    ? advertised.quantity : null
  const source = model.sources.find(item => item.source_id === advertised?.source_id)
  const measured = quantity && Number.isFinite(Number(quantity.value)) && Number(quantity.value) > 0
  const allowancePresent = allowance.trim() !== ''
  const allowanceValid = !allowancePresent || validAllowance(allowance)

  return <section className="height-view" aria-labelledby="height-view-title">
    <p className="eyebrow">Side elevation · dimensional explanation</p>
    <h3 id="height-view-title">What the published height tells us</h3>
    <p>This outline is a diagram, not a scaled drawing or a site survey. It does not show a verified installed envelope.</p>
    <div className="height-view-layout">
      <svg className="height-view-diagram" viewBox="0 0 400 250" role="img" aria-label="Schematic building above a separate dashed foundation band; no datum or regulatory height is established">
        <path className="height-view-ground" d="M20 224H380" />
        <rect className="height-view-foundation" x="93" y="194" width="216" height="30" />
        <path className="height-view-building" d="M93 194V54H309V194Z" />
        <text x="200" y="42" textAnchor="middle" className="height-view-svg-label">roof profile unknown</text>
        <path className="height-view-dimension" d="M57 54V194M48 54H66M48 194H66" />
        <text x="7" y="143" className="height-view-svg-label">A</text>
        <text x="197" y="215" textAnchor="middle" className="height-view-svg-label">B</text>
        <text x="316" y="227" className="height-view-svg-label">grade?</text>
      </svg>
      <div className="height-view-legend">
        <p><strong>A · Manufacturer overall height:</strong> {measured ? <>{quantity!.original_text} ({quantity!.unit === 'm' ? measurementWithUnit(quantity!.value, 'length') : 'normalized value unavailable'})</> : 'unknown'}. {measured ? 'The published figure has no stated datum or roof-point definition.' : 'No usable published exterior height is available.'}</p>
        <p><strong>B · Foundation allowance:</strong> {allowancePresent ? allowanceValid ? `${measurementWithUnit(allowance, 'length')} ${foundationAllowanceM === undefined ? 'entered by you' : 'planning assumption (default or edited)'}` : 'invalid entry; no usable allowance' : 'none supplied'}. This is an optional scenario assumption, separate from the manufacturer figure.</p>
        <p><strong>Installed height:</strong> unknown. The foundation relationship, site grade datum, and roof high point need confirmation. A and B cannot be added as a verified installed or regulatory height.</p>
        <p><strong>Applicable regulatory height and limit:</strong> unknown. No reviewed local rule, definition, or applicable limit is supplied here.</p>
      </div>
    </div>
    <label htmlFor="height-view-allowance">Optional foundation allowance (m)</label>
    <p id="height-view-allowance-hint" className="metadata">{foundationAllowanceM === undefined ? 'Enter a non-negative scenario amount if you have one. It does not establish installed height or change any placement or zoning result.' : 'This shares the foundation allowance used in the labelled preliminary height estimate. Changing it updates that estimate; it does not establish installed or regulatory height.'}</p>
    <input id="height-view-allowance" type="text" inputMode="decimal" value={allowance}
      aria-describedby={`height-view-allowance-hint${allowanceValid ? '' : ' height-view-allowance-error'}`}
      aria-invalid={!allowanceValid}
      onChange={event => {
        const next = event.target.value
        setAllowance(next)
        onFoundationAllowanceChange?.(next.trim() && validAllowance(next) ? next.trim() : null)
      }} />
    {!allowanceValid && <p id="height-view-allowance-error" className="height-view-error" role="alert">Enter a non-negative decimal in metres, or leave it blank.</p>}
    <div className="height-view-source evidence">
      <strong>Published product evidence</strong>
      <p>{model.provider} · {model.name} · {source?.locator ?? 'record label unavailable'} · captured {readableDate(source?.captured_at)} · {model.review_status}; manufacturer revision {model.source_revision ?? 'unknown'}.</p>
      {source?.url && <a href={source.url} target="_blank" rel="noreferrer">Provider source page</a>}
      <p>{model.height_note}</p>
      <TechnicalDetails title="Exact height evidence and catalogue identifiers"><pre>{JSON.stringify({ model_id: model.model_id, source_revision: model.source_revision, advertised_overall_height: advertised ?? null, roof_height: model.measurements.find(item => item.name === 'roof_height') ?? null, source: source ?? null }, null, 2)}</pre></TechnicalDetails>
    </div>
  </section>
}
