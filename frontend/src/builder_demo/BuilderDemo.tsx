import { useState } from 'react'
import { bundledCatalogue } from '../model_catalogue/model'
import { CopyableRecord, publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { SitePreparation } from '../site_preparations/SitePreparation'
import { emptySiteInput, type SiteInputDraft, type SitePreparationSelection } from '../site_preparations/types'
import OccupiedLots, { type OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import { overlapFinding } from '../occupied_lots/observations'

const MODEL_ID = 'aux-300' as const
const foundModel = bundledCatalogue.models.find(item => item.model_id === MODEL_ID)
if (!foundModel) throw new Error('The Model 300 catalogue record is unavailable')
const model = foundModel

const measurement = (name: string) => model.measurements.find(item => item.name === name)
const original = (name: string) => measurement(name)?.quantity?.original_text ?? 'unknown'
const metres = (name: string) => measurement(name)?.quantity?.unit === 'm'
  ? `${Number(measurement(name)!.quantity!.value)} m` : 'unknown'
const fact = (value: string | number | null) => value === null || value === '' ? 'unknown' : String(value)
const field = (value: string) => value.trim() || 'unknown'
const rounded = (value: number) => Number(value.toFixed(2))

export function enquiry(selection: SitePreparationSelection, input: {
  intendedUse: string; timing: string; budget: string; access: string; services: string
}, measured: OccupiedMeasurement | null, exampleImported = false) {
  const source = model.sources[0]
  const candidate = selection.candidate
  const p = measured?.result.input.placement
  const checks = measured?.result.checks ?? []
  const containment = checks.find(check => check.kind === 'containment')
  const overlaps = checks.filter(check => check.kind === 'building_overlap')
  const boundary = checks.find(check => check.kind === 'parcel_boundary_distance')
  const observed = (check: typeof containment) => check?.status === 'observed'
  const complete = measured ? overlapFinding(measured.site, measured.result).complete : false
  const overlapText = complete && overlaps.length && overlaps.every(observed)
    ? overlaps.some(check => check.relation === 'positive_area_overlap' || check.relation === 'touches')
      ? 'A captured roofline intersects or touches this nominal rectangle.'
      : 'No overlap with the captured rooflines was observed; other obstructions remain unknown.'
    : 'Captured roofline overlap remains unresolved.'
  return [
    'UNSENT DRAFT · Model 300 enquiry for preliminary investigation',
    'Prepared independently with ShovelReady; no affiliation with or contact to aux box.',
    `Design: aux box Model 300; public page captured ${readableDate(source?.captured_at)}; unreviewed; manufacturer revision ${model.source_revision ?? 'unknown'}. Nominal exterior ${original('nominal_exterior_width')} × ${original('nominal_exterior_depth')} (${metres('nominal_exterior_width')} × ${metres('nominal_exterior_depth')}). Advertised exterior height ${original('advertised_overall_height')}; regulatory installed height and datum unknown. Source: ${model.provider_url}.`,
    `Site lead: ${candidate ? `City of Victoria retained parcel observation, PID ${fact(candidate.pid.value)}` : 'manual facts without a matched parcel'}. Source address ${candidate ? fact(candidate.address.value) : 'unknown'}; manual address ${fact(selection.manual.address.value)}; manual PID ${fact(selection.manual.pid.value)}; manual approximate area ${selection.manual.lot_area_m2.value === null ? 'unknown' : `${selection.manual.lot_area_m2.value} m²`}. Manual notes: ${fact(selection.manual.notes.value)}. Manual entries are unverified and separate from source observations.`,
    ...(candidate ? [`Parcel source: City of Victoria; captured ${readableDate(candidate.pid.evidence.captured_at)}; ${candidate.pid.evidence.review_status}; ${publicSourceUrl(candidate.pid.evidence.source_url) ?? 'source link unavailable'}.`] : []),
    `Use: ${field(input.intendedUse)}. Timing: ${field(input.timing)}. Budget, if shared: ${field(input.budget)}.`,
    `Access and crane questions/known facts: ${field(input.access)}. Utility/services questions/known facts: ${field(input.services)}.`,
    measured && p ? `Optional, separately imported retained example ${measured.site.label} (not linked to the site lead): nominal rectangle ${p.width_m} × ${p.depth_m} m (width ${measured.widthOrigin === 'catalogue' ? 'catalogue nominal' : 'user edited'}; depth ${measured.depthOrigin === 'catalogue' ? 'catalogue nominal' : 'user edited'}), rotation ${p.angle_degrees}°. ${observed(containment) ? `Parcel containment ${containment?.relation?.replace(/_/g, ' ') ?? 'unknown'}.` : 'Parcel containment unresolved.'} ${overlapText} ${observed(boundary) && boundary?.distance_m != null ? `Observed parcel boundary distance ${rounded(boundary.distance_m)} m.` : 'Parcel boundary distance unresolved.'} Captured ${readableDate(measured.site.site.parcel.source.capture_date)}; ${measured.site.site.parcel.source.review_status}; approximate captured geometry only.`
      : `${exampleImported ? 'Imported example has no current measurement; remeasure after edits. ' : ''}Geometry and zoning unassessed for this site. An address or area does not define a usable parcel shape.`,
    `Provider service/installation: ${model.service_area_note} ${model.installation_note}`,
    'Questions: Please confirm the current controlled Model 300 drawing/revision, installed envelope and height datum; roof projections and site clearances; local delivery/crane access, foundation and utility requirements; and what site information you need before discussing this property.',
    'No legal compatibility, permit approval, installed cost or availability has been determined.',
  ].join('\n')
}

export default function BuilderDemo() {
  const [draft, setDraft] = useState<SiteInputDraft>({ ...emptySiteInput, kind: 'address' })
  const [selection, setSelection] = useState<SitePreparationSelection | null>(null)
  const [imported, setImported] = useState(false)
  const [measurementResult, setMeasurementResult] = useState<OccupiedMeasurement | null>(null)
  const [revision, setRevision] = useState(0)
  const [use, setUse] = useState('')
  const [timing, setTiming] = useState('')
  const [budget, setBudget] = useState('')
  const [access, setAccess] = useState('')
  const [services, setServices] = useState('')
  function siteEdited() { setSelection(null); setImported(false); setMeasurementResult(null); setRevision(value => value + 1) }
  const draftText = selection ? enquiry(selection, { intendedUse: use, timing, budget, access, services }, measurementResult, imported) : ''
  return <div className="builder-demo">
    <section className="builder-hero" aria-labelledby="builder-title">
      <p className="eyebrow">Independent sample journey · aux box</p>
      <h2 id="builder-title">Explore Model 300 on your site</h2>
      <p>Start with a site lead or the facts you know. You can optionally test a placement on a separately selected retained example, then take away an unsent enquiry.</p>
      <p className="notice">This ShovelReady demonstration is independent of aux box. It does not check zoning compatibility, confirm provider service, or contact the company.</p>
      <div className="builder-specs" aria-label="Captured model information">
        <div><strong>{original('nominal_exterior_width')} × {original('nominal_exterior_depth')}</strong><span>Provider nominal exterior rectangle · {metres('nominal_exterior_width')} × {metres('nominal_exterior_depth')}</span></div>
        <div><strong>{original('advertised_overall_height')}</strong><span>Advertised exterior height; installed regulatory height and datum unknown</span></div>
        <div><strong>{original('manufacturer_footprint')}</strong><span>Provider footprint; roof projections and regulatory area unverified</span></div>
      </div>
      <p className="metadata">aux box · Model 300 public product page · captured {readableDate(model.sources[0]?.captured_at)} · {model.review_status}; manufacturer revision unknown. <a href={model.provider_url} target="_blank" rel="noreferrer">Provider source page</a>.</p>
      <p className="metadata">{model.footprint_note} {model.height_note} {model.service_area_note}</p>
      <TechnicalDetails title="Catalogue source and exact model record"><pre>{JSON.stringify({ snapshot_id: bundledCatalogue.snapshot_id, model }, null, 2)}</pre></TechnicalDetails>
    </section>
    <SitePreparation draft={draft} onDraftChange={next => setDraft(next)} selection={selection}
      onEdit={siteEdited} onConfirm={next => { setSelection(next); setImported(false); setMeasurementResult(null); setRevision(value => value + 1) }} />
    {selection && <section className="builder-optional" aria-labelledby="builder-optional-title">
      <p className="eyebrow">Optional placement</p><h2 id="builder-optional-title">Import a retained example only if useful</h2>
      <p>Three captured lots are examples with their own parcel and roofline geometry. They are not citywide address coverage. Importing one does not match it to your address or parcel lead.</p>
      {!imported ? <button type="button" onClick={() => setImported(true)}>Import a separate retained example for placement</button>
        : <><button type="button" onClick={() => { setImported(false); setMeasurementResult(null); setRevision(value => value + 1) }}>Remove example</button>
          <OccupiedLots key={revision} allowedModelIds={[MODEL_ID]} initialModelId={MODEL_ID} onMeasurement={setMeasurementResult} showHandoff={false} /></>}
    </section>}
    {selection && <section className="builder-enquiry" aria-labelledby="builder-enquiry-title">
      <p className="eyebrow">Take away · local draft</p><h2 id="builder-enquiry-title">Prepare a useful question</h2>
      <p>Leave unknown answers blank. This text stays in your browser until you copy it; no provider request or contact record is created.</p>
      <div className="builder-questions">
        <label htmlFor="builder-use">Intended use</label><input id="builder-use" value={use} onChange={event => setUse(event.target.value)} placeholder="e.g. family accommodation; unknown is fine" />
        <label htmlFor="builder-timing">Possible timing</label><input id="builder-timing" value={timing} onChange={event => setTiming(event.target.value)} placeholder="e.g. next year; unknown is fine" />
        <label htmlFor="builder-budget">Budget range, optional</label><input id="builder-budget" value={budget} onChange={event => setBudget(event.target.value)} placeholder="Leave blank if unknown" />
        <label htmlFor="builder-access">Access or crane questions</label><input id="builder-access" value={access} onChange={event => setAccess(event.target.value)} placeholder="Known access facts or questions" />
        <label htmlFor="builder-services">Services or utility questions</label><input id="builder-services" value={services} onChange={event => setServices(event.target.value)} placeholder="Known services or questions" />
      </div>
      <CopyableRecord id="builder-enquiry-text" label="Copyable unsent enquiry draft" value={draftText} />
      <TechnicalDetails title="Complete site selection and current measurement record"><pre>{JSON.stringify({ selection, measurement: measurementResult }, null, 2)}</pre></TechnicalDetails>
    </section>}
  </div>
}
