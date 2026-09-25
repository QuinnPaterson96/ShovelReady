import { useEffect, useRef, useState } from 'react'
import type { Dispatch } from 'react'
import StatusBanner from '../StatusBanner'
import { exampleIds, fields, preparationStatus } from './model'
import type { Action, Draft, ExampleId, Field } from './model'

export function Provenance({ draft }: { draft: Draft }) {
  if (!draft.imported) return <p>Entered values are user supplied and unreviewed. Blank values mean unknown.</p>
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
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => { if (draft.pending) cancel.current?.focus() }, [draft.pending])
  useEffect(() => { if (Object.keys(draft.errors).length) form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus() }, [draft.errors])
  return <section className="sr-assessment" aria-labelledby="inputs-title">
    <h2 id="inputs-title">Assessment inputs</h2>
    <StatusBanner {...preparationStatus(draft)} />
    <p>Start with what you know. Dimensions are optional; leave unknown facts blank. Your draft stays in this session while you move between pages.</p>
    <p>Proposed research scope: City of Victoria · garden suite · accessory building. No accepted dataset is published.</p>
    <form ref={form} noValidate onSubmit={event => { event.preventDefault(); dispatch({ type: 'submit' }); onSummary() }}>
      <div className="sr-fields">{(Object.keys(fields) as Field[]).map(key => <div key={key}>
        <label htmlFor={`input-${key}`}>{fields[key]}</label>
        <input id={`input-${key}`} type="text" inputMode={['width', 'depth', 'height', 'area'].includes(key) ? 'decimal' : 'text'}
          value={draft.values[key]} aria-invalid={!!draft.errors[key]} aria-describedby={`hint-${key}${draft.errors[key] ? ` error-${key}` : ''}`}
          onChange={event => dispatch({ type: 'edit', field: key, value: event.target.value })} />
        <p className="sr-hint" id={`hint-${key}`}>
          {draft.imported && !draft.edited.includes(key) ? 'Imported synthetic input' : 'User supplied · unreviewed'}
          {draft.values[key].trim() ? ' · Entered' : ' · Unknown'}
          {key === 'area' && ' · Physical interior area, not regulatory floor area.'}
        </p>
        {draft.errors[key] && <p className="sr-error" id={`error-${key}`} role="alert">{draft.errors[key]}</p>}
      </div>)}</div>
      <p>Site, lot boundaries, principal building, setbacks and proposed placement: unknown. No placement is inferred from these dimensions.</p>
      <button className="sr-primary" type="submit">Prepare summary</button>
    </form>
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
    <dl className="sr-values">{(Object.keys(fields) as Field[]).map(key => <div key={key}><dt>{fields[key]}</dt>
      <dd>{draft.values[key].trim() || 'Unknown'} · {draft.imported && !draft.edited.includes(key) ? 'Imported synthetic input' : 'User supplied / unreviewed'}</dd></div>)}</dl>
    <Provenance draft={draft} />
    <button className="sr-primary" onClick={onEdit}>Edit inputs</button>
  </section>
}
