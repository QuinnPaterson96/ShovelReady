import { useEffect, useRef, useState } from 'react'
import type { Dispatch } from 'react'
import StatusBanner from '../StatusBanner'
import { exampleIds, fields, preparationStatus } from './model'
import type { Action, Draft, ExampleId, Field } from './model'
import { ModelInputs } from '../model_catalogue/ModelInputs'
import { bundledCatalogue } from '../model_catalogue/model'
import { SitePreparation, addressEvidenceText } from '../site_preparations/SitePreparation'
import victoriaPacket from '../../../docs/rule-packets/victoria-garden-suite/packet.json'

const scopeFields = ['municipality', 'use', 'role'] as const
const scopeChoices: Record<(typeof scopeFields)[number], { value: string; label: string }[]> = {
  municipality: [{ value: '', label: 'I do not know yet' }, { value: 'City of Victoria', label: 'City of Victoria' }, { value: 'Outside current scope', label: 'Another municipality / outside current scope' }],
  use: [{ value: '', label: 'I do not know yet' }, { value: 'Garden suite', label: 'Garden suite' }, { value: 'Outside current scope', label: 'Another use / outside current scope' }],
  role: [{ value: '', label: 'I do not know yet' }, { value: 'Accessory building', label: 'Accessory building' }, { value: 'Outside current scope', label: 'Another building role / outside current scope' }],
}
function sourceLink(url: string | null) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && ['opendata.victoria.ca', 'www.victoria.ca', 'maps.victoria.ca'].includes(parsed.hostname) ? parsed.href : null
  } catch { return null }
}

function VictoriaEvidence() {
  return <section className="sr-evidence" aria-labelledby="victoria-rules-title">
    <h3 id="victoria-rules-title">Victoria rule evidence · provisional</h3>
    <p>Four unreviewed clauses may guide later research. Current applicability and bylaw consolidation are unresolved. No clause has been checked against this site or model.</p>
    <details><summary>Read rule clauses and source record</summary>
    <p>Source: <a href={victoriaPacket.source.source_url} target="_blank" rel="noreferrer">City of Victoria bylaw page</a>. {victoriaPacket.source.instrument}; {victoriaPacket.source.printed_revision}. Captured {victoriaPacket.source.captured_at}; snapshot <code>{victoriaPacket.source.snapshot_id}</code>.</p>
    <ul>{victoriaPacket.candidates.map(rule => <li key={rule.logical_rule_id}>
      <strong>{rule.content.semantics.subject}</strong> · {rule.locator} · {rule.excerpt} · threshold {rule.content.semantics.threshold.original_text} ({rule.content.semantics.threshold.unit}; {rule.content.semantics.measurement_definition}). Rule {rule.logical_rule_id}, proposed revision {rule.proposed_revision_id}; applicability unresolved.
    </li>)}</ul>
    </details>
  </section>
}

export function providerReviewText(draft: Draft) {
  const candidate = draft.site?.candidate
  const model = bundledCatalogue.models.find(item => item.model_id === draft.model.modelId)
  return [
    'ShovelReady provider review draft — preparation only; no site fit or permit finding',
    `Scope: ${draft.values.municipality || 'unknown'} / ${draft.values.use || 'unknown'} / ${draft.values.role || 'unknown'}`,
    `Site: ${candidate ? `retained GIS lead PID ${candidate.pid.value ?? 'unknown'}` : draft.site ? 'unmatched manual site' : 'not selected'}; spatial revision ${draft.site?.spatial_revision ?? 'unknown'}; captured ${candidate?.pid.evidence.captured_at ?? 'unknown'}`,
    `Site source: ${candidate?.pid.evidence.source_url ?? 'none'}; snapshot ${candidate?.pid.evidence.snapshot_id ?? 'none'}`,
    `Source address: ${candidate?.address.value ?? 'unknown'}; ${candidate ? addressEvidenceText(candidate.address) : 'no captured address evidence'}`,
    `Manual site: address ${draft.site?.manual.address.value ?? 'unknown'}; PID ${draft.site?.manual.pid.value ?? 'unknown'}; area ${draft.site?.manual.lot_area_m2.value ?? 'unknown'} m²; notes ${draft.site?.manual.notes.value ?? 'none'}`,
    `Model: ${draft.model.provider || 'unknown'} / ${draft.model.modelName || 'unknown'}; revision ${draft.model.modelRevision ?? 'unknown'}; snapshot ${draft.model.snapshotId ?? 'none'}; height reference ${draft.model.heightReference}`,
    ...(['width', 'depth', 'height', 'area'] as const).map(key => `${fields[key]}: ${draft.model.fields[key].value || 'unknown'} (${draft.model.fields[key].origin}; source baseline ${draft.model.fields[key].baseline?.quantity?.original_text ?? 'none'})`),
    `Model sources: ${model?.sources.map(source => `${source.url} [${source.locator}, captured ${source.captured_at}]`).join('; ') ?? 'none'}`,
    `Provisional rule source: ${victoriaPacket.source.source_url}; snapshot ${victoriaPacket.source.snapshot_id}; captured ${victoriaPacket.source.captured_at}; unreviewed`,
    'Checks performed: none. Provisional rule candidates are not accepted or evaluated.',
    ...preparationStatus(draft).unresolved.map(item => `Unresolved: ${item}`),
  ].join('\n')
}

export function Provenance({ draft }: { draft: Draft }) {
  if (!draft.imported) return <p>Manual entries are user supplied; selected source observations retain their own provenance. Both remain unreviewed. Blank values mean unknown.</p>
  const imported = draft.imported
  return <details className="sr-provenance"><summary>Original example and provenance · {imported.id}</summary>
    <p>Synthetic inputs only. Fixture review and computed outcomes do not apply to this editable draft.</p>
    <p>Request: <code>{imported.request.evaluation_id}</code> · Design revision: <code>{imported.request.design.identity.revision_id}</code></p>
    <p>Snapshot: <code>{imported.request.sources[0].snapshot_id}</code> · SHA-256: <code>{imported.request.sources[0].artifact.sha256}</code></p>
    <p>Width/depth are nominal exterior dimensions. Area is manufacturer interior area, not regulatory floor area.
      Roof height is unknown; ceiling height is not a substitute. The separate evaluator width fact is not the nominal design width.</p>
    <dl>{(Object.keys(fields) as Field[]).map(key => <div key={key}>
      <dt>{fields[key]}</dt><dd>Original: {imported.values[key] || 'Unknown'} · Current: {draft.values[key] || 'Unknown'}
        {' '}({draft.edited.includes(key) ? 'User supplied / edited' : 'Imported synthetic input'})</dd>
    </div>)}</dl>
    <details><summary>Complete original request · values, units, definitions and provenance</summary><pre>{JSON.stringify(imported.request, null, 2)}</pre></details>
  </details>
}

export function AssessmentForm({ draft, dispatch, onSummary, onEvidence }: {
  draft: Draft; dispatch: Dispatch<Action>; onSummary: () => void; onEvidence: () => void
}) {
  const [selected, setSelected] = useState<ExampleId | ''>('')
  const cancel = useRef<HTMLButtonElement>(null)
  const load = useRef<HTMLButtonElement>(null)
  const form = useRef<HTMLElement>(null)
  useEffect(() => { if (draft.pending) cancel.current?.focus() }, [draft.pending])
  useEffect(() => { if (Object.keys(draft.errors).length) form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus() }, [draft.errors])
  return <section ref={form} className="sr-assessment" aria-labelledby="inputs-title">
    <h2 id="inputs-title">Assessment inputs</h2>
    <StatusBanner {...preparationStatus(draft)} />
    <p>Choose the intended scope, then add any model and site facts you know. Measurements and parcel search are optional. Unknown facts can stay unknown; your draft remains while you move between pages.</p>
    <p>Only City of Victoria garden suites in an accessory building are the proposed research scope. Other choices are recorded honestly, without treating them as a zoning rejection. No accepted dataset is published.</p>
    <form noValidate onSubmit={event => { event.preventDefault(); dispatch({ type: 'submit' }); onSummary() }}>
      <div className="sr-fields">{scopeFields.map(key => <div key={key}>
        <label htmlFor={`input-${key}`}>{fields[key]}</label>
        <select id={`input-${key}`} value={draft.values[key]} aria-describedby={`hint-${key}`}
          onChange={event => dispatch({ type: 'edit', field: key, value: event.target.value })}>
          {scopeChoices[key].map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          {!scopeChoices[key].some(choice => choice.value === draft.values[key]) &&
            <option value={draft.values[key]}>{draft.imported && !draft.edited.includes(key) ? 'Imported synthetic value' : 'Previously entered value'}: {draft.values[key]}</option>}
        </select>
        <p className="sr-hint" id={`hint-${key}`}>
          {draft.imported && !draft.edited.includes(key) ? 'Imported synthetic input, kept as recorded' : 'Your choice · unreviewed'}
          {draft.values[key].trim() ? '' : ' · Unknown'}
        </p>
      </div>)}</div>
    </form>
      <h3>Building details · optional</h3>
      <ModelInputs value={draft.model} onChange={value => dispatch({ type: 'model', value })} />
      <h3>Site details · optional</h3>
      <SitePreparation onLookup={value => dispatch({ type: 'site-lookup', value })} draft={draft.siteInput} onDraftChange={(value, areaInvalid) => dispatch({ type: 'site-input', value, areaInvalid })} selection={draft.site} onEdit={areaInvalid => dispatch({ type: 'site', value: null, areaInvalid })} onConfirm={value => dispatch({ type: 'site', value })} />
      <p>Placement, principal building and constraints remain unverified. If a parcel lead appears, confirm it explicitly before preparing the summary. The model and site facts are preparation evidence, not a fit result.</p>
      <button className="sr-primary" type="button" onClick={() => { dispatch({ type: 'submit' }); onSummary() }}>Prepare summary</button>
    <VictoriaEvidence />
    <details><summary>Load an example (optional)</summary>
      <p>Load only when you want invented sample inputs. No original computed result is imported or applied to edits.</p>
      <label htmlFor="input-example">Synthetic example</label>
      <select id="input-example" value={selected} onChange={event => setSelected(event.target.value as ExampleId | '')}>
        <option value="">Choose an example…</option>{exampleIds.map(id => <option key={id} value={id}>{id} · synthetic inputs</option>)}
      </select>
      <button ref={load} disabled={!selected} onClick={() => { if (selected) dispatch({ type: 'load', id: selected }) }}>Load selected example</button>
      {draft.pending && <div className="sr-replace" role="group" aria-labelledby="replace-title">
        <h3 id="replace-title">Replace your edited draft?</h3>
        <p>Loading {draft.pending} will replace all current values, import provenance and the preparation summary. Your edits will be lost.</p>
        <button ref={cancel} onClick={() => { dispatch({ type: 'cancel' }); load.current?.focus() }}>Keep my draft</button>
        <button onClick={() => { dispatch({ type: 'confirm' }); load.current?.focus() }}>Replace draft</button>
      </div>}
    </details>
    <Provenance draft={draft} />
    <p>Pilot has unresolved historical observations, not canonical form dimensions.</p>
    <button onClick={onEvidence}>Investigate Pilot evidence</button>
  </section>
}

export function PreparationSummary({ draft, onEdit }: { draft: Draft; onEdit: () => void }) {
  return <section className="sr-assessment" aria-labelledby="summary-title">
    <h2 id="summary-title">Preparation summary</h2>
    <StatusBanner {...preparationStatus(draft)} />
    <p>This record separates your choices, source observations and manual corrections. Review unknown facts with a provider or qualified local reviewer before any real evaluation.</p>
    <dl className="sr-values">{(Object.keys(fields) as Field[]).map(key => <div key={key}><dt>{fields[key]}</dt>
      <dd>{draft.values[key].trim() || 'Unknown'} · {draft.imported && !draft.edited.includes(key) ? 'Imported synthetic input' : key in draft.model.fields
        ? draft.model.fields[key as keyof typeof draft.model.fields].origin === 'source' && draft.values[key].trim()
          ? 'Provider source observation · unreviewed' : 'User supplied or unknown · unreviewed'
        : 'Your choice · unreviewed'}</dd></div>)}</dl>
    <h3>Chosen site and model · provider review draft</h3>
    <p>Site: {draft.site?.candidate ? `retained PID ${draft.site.candidate.pid.value ?? 'unknown'}` : draft.site ? 'manual unmatched facts' : 'not selected'}; model: {draft.model.modelName || 'not selected'}. No checks were run.</p>
    {draft.site && <details open><summary>Site source and manual facts</summary>
      {draft.site.candidate && <p>Retained PID {draft.site.candidate.pid.value ?? 'unknown'} · approximate GIS area {draft.site.candidate.approximate_area_m2.value ?? 'unknown'} m² · {sourceLink(draft.site.candidate.pid.evidence.source_url) ? <a href={sourceLink(draft.site.candidate.pid.evidence.source_url)!}>source observation</a> : 'source link unavailable'}. Unreviewed geometry, not a legal survey.</p>}
      {draft.site.candidate && <><p>Source address: {draft.site.candidate.address.value ?? 'unknown'} · captured address observation, unreviewed.</p>
        <details><summary>Address match method and capture</summary><p>{addressEvidenceText(draft.site.candidate.address)}</p></details></>}
      {draft.site.candidate && <details><summary>Complete retained parcel candidate and evidence</summary><pre>{JSON.stringify(draft.site.candidate, null, 2)}</pre></details>}
      <p>Manual address {draft.site.manual.address.value ?? 'unknown'}; PID {draft.site.manual.pid.value ?? 'unknown'}; lot area {draft.site.manual.lot_area_m2.value ?? 'unknown'} m²; notes {draft.site.manual.notes.value ?? 'none'}. Manual values remain unreviewed and separate from source values.</p>
      <details><summary>Site capture and revision identifiers</summary><p>Spatial revision {draft.site.spatial_revision ?? 'unknown'} · schema {draft.site.schema_version} · review {draft.site.review_status} · source capture {draft.site.candidate?.pid.evidence.captured_at ?? 'unknown'} · snapshot {draft.site.candidate?.pid.evidence.snapshot_id ?? 'unknown'}.</p></details>
    </details>}
    <details open><summary>Model source and edits</summary><p>{draft.model.provider || 'Provider unknown'} · {draft.model.modelName || 'model unknown'} · unreviewed. Height reference: {draft.model.heightReference}.</p>
      <ul>{(['width', 'depth', 'height', 'area'] as const).map(key => <li key={key}>{fields[key]}: {draft.model.fields[key].value || 'unknown'} · {draft.model.fields[key].origin} · baseline {draft.model.fields[key].baseline?.quantity?.original_text ?? 'none'}</li>)}</ul>
      {bundledCatalogue.models.find(model => model.model_id === draft.model.modelId)?.sources.map(source => <p key={source.source_id}><a href={source.url}>{source.source_id}</a> · {source.locator} · captured {source.captured_at}</p>)}
      <details><summary>Model capture and revision identifiers</summary><p>Snapshot {draft.model.snapshotId ?? 'none'} · revision {draft.model.modelRevision ?? 'unknown'} · review {draft.model.reviewStatus}.</p></details>
      <details><summary>Complete model selection and source baselines</summary><pre>{JSON.stringify(draft.model, null, 2)}</pre></details>
    </details>
    <VictoriaEvidence />
    <details><summary>Copyable provider-review summary · no sending</summary>
      <label htmlFor="provider-review-text">Select and copy this unreviewed preparation record</label>
      <textarea id="provider-review-text" readOnly value={providerReviewText(draft)} rows={16} />
    </details>
    <Provenance draft={draft} />
    <button className="sr-primary" onClick={onEdit}>Edit inputs</button>
  </section>
}
