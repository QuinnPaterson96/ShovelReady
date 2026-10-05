import { useEffect, useMemo, useRef, useState } from 'react'
import { SiteDiscovery } from '../site_discovery/SiteDiscovery'
import type { Confirmed } from '../site_discovery/flow'
import { placementCase } from '../site_discovery/placement'
import { ManualSiteInput } from '../manual_site/ManualSiteInput'
import type { ManualSiteOutput } from '../manual_site/model'
import { measurementWithUnit } from '../measurements'
import { bundledCatalogue } from '../model_catalogue/model'
import { CopyableRecord, publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { SitePreparation } from '../site_preparations/SitePreparation'
import { emptySiteInput, type SiteInputDraft, type SitePreparationSelection } from '../site_preparations/types'
import OccupiedLots, { type OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import { overlapFinding } from '../occupied_lots/observations'
import { HeightView } from './height_view/HeightView'
import { ExampleProperty } from './ExampleProperty'
import { exampleCase, exampleSourcePage } from './example'
import { EnquiryPreview, emailDraftUrl, enquiryEmailBody, enquiryMarkdown, enquiryPlainText, validRecipient, type EnquiryDocument } from './enquiry'

const MODEL_ID = 'aux-300' as const
const foundModel = bundledCatalogue.models.find(item => item.model_id === MODEL_ID)
if (!foundModel) throw new Error('The Model 300 catalogue record is unavailable')
const model = foundModel

const measurement = (name: string) => model.measurements.find(item => item.name === name)
const original = (name: string) => measurement(name)?.quantity?.original_text ?? 'unknown'
const metres = (name: string) => measurement(name)?.quantity?.unit === 'm'
  ? measurementWithUnit(measurement(name)!.quantity!.value, 'length') : 'unknown'
const fact = (value: string | number | null) => value === null || value === '' ? 'unknown' : String(value)
const field = (value: string) => value.trim() || 'unknown'

export function enquiryDocument(selection: SitePreparationSelection | null, input: {
  intendedUse: string; timing: string; budget: string; access: string; services: string
}, measured: OccupiedMeasurement | null, exampleImported = false, live: Confirmed | null = null, manual: ManualSiteOutput | null = null, savedExample = false, foundationAllowanceM: string | null = null) {
  const source = model.sources[0]
  const candidate = selection?.candidate
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
  const lines = [
    'UNSENT DRAFT · Model 300 enquiry for preliminary investigation',
    'Prepared independently with ShovelReady; no affiliation with or contact to aux box.',
    `Design: aux box Model 300; public page captured ${readableDate(source?.captured_at)}; unreviewed; manufacturer revision ${model.source_revision ?? 'unknown'}. Nominal exterior ${original('nominal_exterior_width')} × ${original('nominal_exterior_depth')} (${metres('nominal_exterior_width')} × ${metres('nominal_exterior_depth')}). Advertised exterior height ${original('advertised_overall_height')}; regulatory installed height and datum unknown. Source: ${model.provider_url}.`,
    savedExample ? `Example property / saved data: City of Victoria ${exampleCase.site.parcel.source.record_label}; captured ${readableDate(exampleCase.site.parcel.source.capture_date)}; ${exampleCase.site.parcel.source.review_status}. Parcel source: ${exampleSourcePage(exampleCase.site.parcel.source.reference)} (${exampleCase.site.parcel.source.record_label}). Roofline source: ${exampleSourcePage(exampleCase.site.buildings[0]?.source.reference ?? null)} (${exampleCase.site.buildings[0]?.source.record_label ?? 'record unavailable'}). Contains information licensed under the Open Government Licence – City of Victoria: https://opendata.victoria.ca/pages/open-data-licence. Full source record links are in the technical evidence export. This is not the sender's property or a verified address.` :
    live ? `Site lead: ${live.address.label}; ${live.parcel.label}. User-confirmed City of Victoria source observation; source join and parcel identity remain unreviewed. Captured ${readableDate(live.observation.source.capturedAt)}. Source: ${live.observation.source.url}. ${live.observation.issues.join(' ')}` :
      manual ? `User-supplied site: ${field(manual.facts.address)}; stated area ${measurementWithUnit(manual.facts.statedAreaM2, 'area')}; notes ${field(manual.facts.notes)}. Approximate local sketch only, with no verified address, survey position or orientation.` :
      `Site lead: ${candidate ? 'City of Victoria retained parcel observation' : 'manual facts without a matched parcel'}. Source address ${candidate ? fact(candidate.address.value) : 'unknown'}; manual address ${fact(selection?.manual.address.value ?? null)}; manual approximate area ${measurementWithUnit(selection?.manual.lot_area_m2.value, 'area')}. Manual notes: ${fact(selection?.manual.notes.value ?? null)}. Manual entries are unverified and separate from source observations. Exact parcel identifiers remain in technical evidence.`,
    ...(candidate ? [`Parcel source: City of Victoria; captured ${readableDate(candidate.pid.evidence.captured_at)}; ${candidate.pid.evidence.review_status}; ${publicSourceUrl(candidate.pid.evidence.source_url) ?? 'source link unavailable'}.`] : []),
    `Use: ${field(input.intendedUse)}. Timing: ${field(input.timing)}. Budget, if shared: ${field(input.budget)}.`,
    `Access and crane questions/known facts: ${field(input.access)}. Utility/services questions/known facts: ${field(input.services)}.`,
    measured && p ? `${savedExample ? `Illustrative placement on the saved example ${measured.site.label}` : live ? `Placement on the confirmed property ${measured.site.label}` : `Optional, separately imported retained example ${measured.site.label} (not linked to the site lead)`}: nominal rectangle ${measurementWithUnit(p.width_m, 'length')} × ${measurementWithUnit(p.depth_m, 'length')} (width ${measured.widthOrigin === 'catalogue' ? 'catalogue nominal' : 'user edited'}; depth ${measured.depthOrigin === 'catalogue' ? 'catalogue nominal' : 'user edited'}), rotation ${p.angle_degrees}°. ${observed(containment) ? `Parcel containment ${containment?.relation?.replace(/_/g, ' ') ?? 'unknown'}.` : 'Parcel containment unresolved.'} ${overlapText} ${observed(boundary) && boundary?.distance_m != null ? `Observed parcel boundary distance ${measurementWithUnit(boundary.distance_m, 'length')}.` : 'Parcel boundary distance unresolved.'} Captured ${readableDate(measured.site.site.parcel.source.capture_date)}; ${measured.site.site.parcel.source.review_status}; approximate captured geometry only.`
      : manual?.assessment ? `Measured user sketch: tested user-supplied rectangle ${measurementWithUnit(manual.assessment.input.placement.width_m, 'length')} × ${measurementWithUnit(manual.assessment.input.placement.depth_m, 'length')}; edits may differ from the model dimensions above. ${manual.assessment.checks.filter(c => c.status === 'observed').map(c => `${c.kind.replace(/_/g, ' ')}: ${c.relation?.replace(/_/g, ' ') ?? measurementWithUnit(c.distance_m, 'length')}`).join('; ')}. Obstruction coverage remains partial or unknown; no zoning or site fit assessed.`
      : savedExample ? 'Saved example placement has no current measurement; measure again after edits. Zoning remains unassessed.'
      : live || manual?.site ? 'No current placement measurement. Position the footprint and measure again after edits. Zoning remains unassessed.'
      : `${exampleImported ? 'Imported example has no current measurement; remeasure after edits. ' : ''}Geometry and zoning unassessed for this site. An address or area does not define a usable parcel shape.`,
    `Foundation scenario allowance: ${foundationAllowanceM === null ? 'not supplied' : measurementWithUnit(foundationAllowanceM, 'length') + ' entered by the user'}. This separate assumption is not a verified installed height and was not used in geometry or zoning checks.`,
    `Provider service/installation: ${model.service_area_note} ${model.installation_note}`,
    'Questions: Please confirm the current controlled Model 300 drawing/revision, installed envelope and height datum; roof projections and site clearances; local delivery/crane access, foundation and utility requirements; and what site information you need before discussing this property.',
    'Legal lot lines, building walls and roles, other obstructions, zoning and setbacks, installed height and datum, current controlled provider dimensions, access and services remain unresolved.',
    'No legal compatibility, permit approval, installed cost or availability has been determined.',
  ]
  const offset = candidate ? 1 : 0
  const question = `I’m exploring aux box Model 300${input.intendedUse.trim() ? ` for ${input.intendedUse.trim()}` : ''}. Could you confirm the current design, installation requirements, and what you would need to discuss a possible site?`
  return {
    title: savedExample ? 'UNSENT DRAFT · SAVED EXAMPLE ONLY · Model 300' : 'UNSENT DRAFT · Model 300 enquiry',
    question,
    example: savedExample,
    sections: [
      { heading: 'Model', paragraphs: [lines[1], lines[2], lines[8 + offset]], emailSummary: `aux box Model 300; nominal exterior ${original('nominal_exterior_width')} × ${original('nominal_exterior_depth')}; source ${model.provider_url}; current controlled revision and installed height unknown.` },
      { heading: 'Property', paragraphs: [lines[3], ...(candidate ? [lines[4]] : []), lines[4 + offset], lines[5 + offset]], emailSummary: savedExample ? 'Saved City of Victoria example only; this is not my property.' : live ? `Confirmed Victoria lead: ${live.address.label}. Captured observation remains unreviewed.` : manual ? `User-supplied site: ${field(manual.facts.address)}; facts and sketch unverified.` : `Site lead: ${candidate ? fact(candidate.address.value) : fact(selection?.manual.address.value ?? null)}; identity and dimensions unverified.` },
      { heading: 'Placement', paragraphs: [lines[6 + offset], lines[7 + offset]], emailSummary: measured ? `Approximate measured rectangle ${measurementWithUnit(p?.width_m, 'length')} × ${measurementWithUnit(p?.depth_m, 'length')}; ${measured.widthOrigin === 'user' || measured.depthOrigin === 'user' ? 'custom size, provider availability unknown; ' : ''}geometry observations only; zoning unassessed.` : manual?.assessment ? `User sketch measured at ${measurementWithUnit(manual.assessment.input.placement.width_m, 'length')} × ${measurementWithUnit(manual.assessment.input.placement.depth_m, 'length')}; unverified geometry; zoning unassessed.` : 'No current placement measurement; geometry and zoning unassessed.' },
      { heading: 'Still to confirm', paragraphs: [lines[9 + offset], lines[10 + offset]], emailSummary: `Current drawing and revision, installed envelope and height, site access, foundations, utilities, legal boundaries and zoning. Timing: ${field(input.timing)}. Budget: ${field(input.budget)}. Access: ${field(input.access)}. Services: ${field(input.services)}.` },
    ],
    closing: lines[11 + offset],
  } satisfies EnquiryDocument
}

export function enquiry(...args: Parameters<typeof enquiryDocument>) { return enquiryPlainText(enquiryDocument(...args)) }

export type BuilderProgress = { model: boolean; property: boolean; placement: boolean; enquiry: boolean }
export default function BuilderDemo({ onProgressChange }: { onProgressChange?: (progress: BuilderProgress) => void } = {}) {
  const [foundationAllowanceM, setFoundationAllowanceM] = useState<string | null>(null)
  const [heightRevision, setHeightRevision] = useState(0)
  const [mode, setMode] = useState<'live' | 'manual' | 'retained' | 'example'>('live')
  const [live, setLive] = useState<Confirmed | null>(null)
  const [manual, setManual] = useState<ManualSiteOutput | null>(null)
  const liveCase = useMemo(() => live ? placementCase(live) : undefined, [live])
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
  const [readyFor, setReadyFor] = useState<string | null>(null)
  const [manualConfirmedFor, setManualConfirmedFor] = useState<string | null>(null)
  const [recipient, setRecipient] = useState('')
  const [includeSiteDetails, setIncludeSiteDetails] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')
  function siteEdited() { setSelection(null); setImported(false); setMeasurementResult(null); setReadyFor(null); setRevision(value => value + 1) }
  function changeMode(next: typeof mode) {
    setFoundationAllowanceM(null); setHeightRevision(value => value + 1)
    setMode(next); siteEdited(); setLive(null); setManual(null)
    setDraft({ ...emptySiteInput, kind: 'address' })
    setUse(''); setTiming(''); setBudget(''); setAccess(''); setServices('')
    setReadyFor(null); setManualConfirmedFor(null); setIncludeSiteDetails(false); setEmailMessage('')
  }
  const hasSite = mode === 'example' || !!(selection || live || manual && (manual.site || Object.values(manual.facts).some(value => value.trim())))
  const enquiryDoc = hasSite ? enquiryDocument(selection, { intendedUse: use, timing, budget, access, services }, measurementResult, imported, live, manual, mode === 'example', foundationAllowanceM) : null
  const draftText = enquiryDoc ? enquiryPlainText(enquiryDoc) : ''
  const manualSignature = JSON.stringify({ facts: manual?.facts ?? null, site: manual?.site ?? null })
  const propertyComplete = mode === 'example' || !!(live || selection || mode === 'manual' && manual && manualConfirmedFor === manualSignature)
  const placementComplete = !!(measurementResult || mode === 'manual' && manual?.assessment)
  const enquiryReady = !!enquiryDoc && readyFor === draftText
  const progressCallback = useRef(onProgressChange)
  progressCallback.current = onProgressChange
  useEffect(() => { progressCallback.current?.({ model: true, property: propertyComplete, placement: placementComplete, enquiry: enquiryReady }) }, [propertyComplete, placementComplete, enquiryReady])
  useEffect(() => { setReadyFor(null) }, [draftText])
  const emailBody = enquiryDoc ? enquiryEmailBody(enquiryDoc, includeSiteDetails) : ''
  const emailSubject = enquiryDoc?.example ? 'Saved example only — Model 300 question' : 'Model 300 preliminary enquiry'
  const emailTooLong = !!enquiryDoc && (!emailDraftUrl('mailto', recipient, emailSubject, emailBody) || !emailDraftUrl('gmail', recipient, emailSubject, emailBody)) && validRecipient(recipient)
  const shortEmailBody = enquiryDoc?.example
    ? 'SAVED EXAMPLE ONLY — not my property. I will paste the full reviewed Model 300 enquiry into this draft before sending.'
    : 'I have prepared a Model 300 enquiry. I will paste the full reviewed text into this draft before sending.'
  function openDraft(kind: 'mailto' | 'gmail') {
    const url = emailDraftUrl(kind, recipient, emailSubject, emailTooLong ? shortEmailBody : emailBody)
    if (!url) { setEmailMessage('Enter one valid email address without line breaks.'); return }
    if (kind === 'mailto') window.location.href = url
    else window.open(url, '_blank', 'noopener,noreferrer')
    setEmailMessage(emailTooLong ? 'Short draft opened. Copy and paste the full text shown above before sending.' : 'Draft opened for your review. You must send it yourself.')
  }
  async function copyEmailBody() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(emailBody)
      setEmailMessage('Full email body copied.')
    } catch { setEmailMessage('Clipboard unavailable. Select and copy the email body above.') }
  }
  function downloadMarkdown() {
    if (!enquiryDoc) return
    const objectUrl = URL.createObjectURL(new Blob([enquiryMarkdown(enquiryDoc)], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = objectUrl; anchor.download = 'model-300-enquiry.md'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
  return <div className="builder-demo">
    <section className="builder-hero" id="builder-model" aria-labelledby="builder-title">
      <p className="eyebrow">Independent sample journey · aux box</p>
      <h1 id="builder-title">Explore Model 300 on your site</h1>
      <p>Start with a site lead or the facts you know. Find and confirm a Victoria property, or sketch your own approximate lot, then test one placement and take away an unsent enquiry.</p>
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
    <section className="builder-stage" id="builder-property" aria-labelledby="builder-property-title">
    <p className="eyebrow">Property</p><h2 id="builder-property-title">Start with what you know</h2>
    <div className="builder-entry-choices"><div><strong>Use my own property</strong><p>Search a Victoria address or enter known facts.</p><button type="button" onClick={() => changeMode('live')}>Use my own property</button></div>
      <div><strong>Try an example property</strong><p>Open a saved parcel and roofline with an illustrative Model 300 placement.</p><button type="button" onClick={() => changeMode('example')}>Try an example property</button></div></div>
    <p className="metadata">Changing property mode clears the current placement, answers and unsent draft. Copy any question you want to keep first.</p>
    <label htmlFor="builder-site-mode">How would you like to enter your property?</label>
    <select id="builder-site-mode" value={mode} onChange={event => changeMode(event.target.value as typeof mode)}>
      <option value="live">Search a Victoria address</option><option value="manual">Enter facts or sketch manually</option><option value="retained">Use the retained example workflow</option><option value="example">Example property / saved data</option>
    </select>
    {mode === 'live' && <SiteDiscovery onConfirm={next => { setLive(next); setMeasurementResult(null); setReadyFor(null); setRevision(value => value + 1) }} onManual={() => changeMode('manual')} />}
    {mode === 'retained' && <SitePreparation draft={draft} onDraftChange={next => { setDraft(next); setReadyFor(null) }} selection={selection}
      onEdit={siteEdited} onConfirm={next => { setSelection(next); setImported(false); setMeasurementResult(null); setReadyFor(null); setRevision(value => value + 1) }} />}
    </section>
    <section className="builder-stage" id="builder-placement" aria-labelledby="builder-placement-title">
      <p className="eyebrow">Placement</p><h2 id="builder-placement-title">Explore one approximate placement</h2>
      {mode === 'example' && <ExampleProperty key={revision} onMeasurement={value => { setMeasurementResult(value); setReadyFor(null) }} />}
      {mode === 'live' && (liveCase ? <OccupiedLots key={revision} suppliedCase={liveCase} allowedModelIds={[MODEL_ID]} initialModelId={MODEL_ID} onMeasurement={value => { setMeasurementResult(value); setReadyFor(null) }} showHandoff={false} /> : <p>Confirm a Victoria property above to open its captured parcel sketch. Available geometry is approximate and unreviewed.</p>)}
      {mode === 'manual' && <ManualSiteInput onChange={value => { if (JSON.stringify(value) !== JSON.stringify(manual)) { setManual(value); setReadyFor(null) } }} footprint={{ widthM: Number(measurement('nominal_exterior_width')?.quantity?.value) || null, depthM: Number(measurement('nominal_exterior_depth')?.quantity?.value) || null, label: 'aux box Model 300 · unreviewed nominal dimensions' }} />}
    {selection && <section className="builder-optional" aria-labelledby="builder-optional-title">
      <p className="eyebrow">Optional placement</p><h2 id="builder-optional-title">Import a retained example only if useful</h2>
      <p>Three captured lots are examples with their own parcel and roofline geometry. They are not citywide address coverage. Importing one does not match it to your address or parcel lead.</p>
      {!imported ? <button type="button" onClick={() => { setImported(true); setReadyFor(null) }}>Import a separate retained example for placement</button>
        : <><button type="button" onClick={() => { setImported(false); setMeasurementResult(null); setReadyFor(null); setRevision(value => value + 1) }}>Remove example</button>
          <OccupiedLots key={revision} allowedModelIds={[MODEL_ID]} initialModelId={MODEL_ID} onMeasurement={value => { setMeasurementResult(value); setReadyFor(null) }} showHandoff={false} /></>}
    </section>}
    {mode === 'retained' && !selection && <p>Confirm a site lead above to consider a separate retained placement example. An example is never matched to your site lead.</p>}
      <HeightView key={`height-${heightRevision}`} model={model} onFoundationAllowanceChange={value => { setFoundationAllowanceM(value); setReadyFor(null) }} />
    </section>
    <section className="builder-stage builder-enquiry" id="builder-next" aria-labelledby="builder-enquiry-title">
      <p className="eyebrow">Take away · local draft</p><h2 id="builder-enquiry-title">Prepare a useful question</h2>
      {!hasSite && <p>Add a property or your known site facts above to prepare an unsent enquiry. Your answers stay local to this journey.</p>}
      {hasSite && <><p>Leave unknown answers blank. This text stays in your browser until you copy it; no provider request or contact record is created.</p>
      <div className="builder-questions">
        <label htmlFor="builder-use">Intended use</label><input id="builder-use" value={use} onChange={event => setUse(event.target.value)} placeholder="e.g. family accommodation; unknown is fine" />
        <label htmlFor="builder-timing">Possible timing</label><input id="builder-timing" value={timing} onChange={event => setTiming(event.target.value)} placeholder="e.g. next year; unknown is fine" />
        <label htmlFor="builder-budget">Budget range, optional</label><input id="builder-budget" value={budget} onChange={event => setBudget(event.target.value)} placeholder="Leave blank if unknown" />
        <label htmlFor="builder-access">Access or crane questions</label><input id="builder-access" value={access} onChange={event => setAccess(event.target.value)} placeholder="Known access facts or questions" />
        <label htmlFor="builder-services">Services or utility questions</label><input id="builder-services" value={services} onChange={event => setServices(event.target.value)} placeholder="Known services or questions" />
      </div>
      {mode === 'manual' && <div className="builder-manual-confirm">
        <p>Manual facts and sketches are unverified. Confirm that this is the site description you want to use for this draft.</p>
        <button type="button" onClick={() => setManualConfirmedFor(manualSignature)} disabled={manualConfirmedFor === manualSignature}>Confirm my site description</button>
        <span role="status">{manualConfirmedFor === manualSignature ? 'Site description confirmed for this draft.' : 'Site description not yet confirmed.'}</span>
      </div>}
      {enquiryDoc && <EnquiryPreview document={enquiryDoc} />}
      <div className="builder-enquiry-actions">
        <CopyableRecord id="builder-enquiry-text" label="Plain-text enquiry to copy" value={draftText} />
        <button type="button" onClick={downloadMarkdown}>Download Markdown enquiry</button>
        <button type="button" onClick={() => setReadyFor(draftText)} disabled={enquiryReady}>Mark enquiry ready</button>
        <span role="status">{enquiryReady ? 'Ready for your review and optional handoff. No message has been sent.' : 'Draft in progress. Review before marking ready.'}</span>
      </div>
      <section className="builder-email" aria-labelledby="builder-email-title">
        <h3 id="builder-email-title">Open an editable email draft</h3>
        <p>Review the recipient and exact text below. Your email app opens a draft; only you can send it. This demonstration has no affiliation with aux box.</p>
        <p className="metadata">The <a href="https://www.auxbox.ca/contact" target="_blank" rel="noreferrer">official aux box contact page</a> directs general enquiries to a form. Its published email addresses are for privacy, media or careers, so no product enquiry recipient is prefilled. Checked 2026-10-05.</p>
        <label htmlFor="builder-email-recipient">Recipient email (optional; edit before opening)</label>
        <input id="builder-email-recipient" type="email" autoComplete="email" value={recipient} onChange={event => setRecipient(event.target.value)} aria-invalid={!validRecipient(recipient)} />
        {!validRecipient(recipient) && <p role="alert">Enter one valid email address without line breaks.</p>}
        <label className="builder-email-choice"><input type="checkbox" checked={includeSiteDetails} onChange={event => setIncludeSiteDetails(event.target.checked)} /> Include site details in the email</label>
        <p className="metadata">{includeSiteDetails ? 'The property summary below may include an address or site description.' : 'Property details are excluded from the email. The full copy and download still include them.'}</p>
        <label htmlFor="builder-email-subject">Subject</label><input id="builder-email-subject" readOnly value={emailSubject} />
        <label htmlFor="builder-email-body">Exact email body to share</label><textarea id="builder-email-body" readOnly rows={12} value={emailBody} />
        {emailTooLong && <p role="status">The full email is too long for a reliable draft link. The buttons open a short placeholder draft. Copy the complete text above and paste it into your email app before sending; no content is silently shortened.</p>}
        <div className="builder-email-buttons">
          <button type="button" onClick={() => void copyEmailBody()}>Copy email body</button>
          <button type="button" disabled={!validRecipient(recipient)} onClick={() => openDraft('mailto')}>Open in default email app</button>
          <button type="button" disabled={!validRecipient(recipient)} onClick={() => openDraft('gmail')}>Open in Gmail</button>
        </div>
        <p role="status">{emailMessage}</p>
      </section>
      <TechnicalDetails title="Complete site selection, sources and measurements"><CopyableRecord id="builder-technical-record" label="Complete technical evidence export" value={JSON.stringify({ schema_version: 'builder-evidence.v1', foundation_scenario: { allowance_m: foundationAllowanceM, basis: 'user_assumption', used_in_assessment: false }, selection, live, manual, example: mode === 'example' ? exampleCase : null, measurement: measurementResult }, null, 2)} /></TechnicalDetails>
      </>}
    </section>
  </div>
}
