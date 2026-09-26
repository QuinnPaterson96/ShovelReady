import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { draftReducer, emptyValues, errorsFor, example, exampleIds, initialDraft, preparationStatus } from './model'
import { AssessmentForm, PreparationSummary } from './Assessment'
import StatusBanner from '../StatusBanner'
import type { AssessmentStatus } from '../StatusBanner'

test('empty stays unknown; invalid and nonfinite quantities are never zero or accepted', () => {
  assert.equal(initialDraft.imported, undefined)
  assert.equal(preparationStatus(initialDraft).status, 'not_assessed')
  assert.deepEqual(errorsFor(emptyValues), {})
  for (const value of ['0', '-1', 'NaN', 'Infinity', '1e999', '0x10', '1,000', 'abc', '9'.repeat(400)]) {
    assert.ok(errorsFor({ ...emptyValues, width: value }).width, value)
    const edited = draftReducer(initialDraft, { type: 'edit', field: 'width', value })
    assert.equal(draftReducer(edited, { type: 'submit' }).submitted, false)
  }
  for (const value of ['.1', '10000', '1.5', ' 2 ']) assert.deepEqual(errorsFor({ ...emptyValues, width: value }), {})
  const submitted = draftReducer(initialDraft, { type: 'submit' })
  assert.equal(submitted.values.width, '')
  assert.equal(preparationStatus(submitted).status, 'needs_investigation')
  assert.ok(preparationStatus(submitted).unresolved.some(v => v.includes('width')))
})

test('imports map actual design inputs, never evaluator facts or ceiling height', () => {
  for (const id of exampleIds) {
    const imported = example(id)
    assert.equal(imported.values.width, '5')
    assert.equal(imported.values.depth, '9')
    assert.equal(imported.values.area, '40')
    assert.equal(imported.values.height, '')
    assert.equal(imported.values.municipality, imported.request.scope.jurisdiction)
    assert.equal(imported.request.sources[0].snapshot_id, 'synthetic-arithmetic')
    assert.equal(imported.request.design.identity.revision_id, 'design-r1')
  }
})

test('replacement is explicit, cancellable, and clears old summary only when confirmed', () => {
  let draft = draftReducer(initialDraft, { type: 'edit', field: 'width', value: '7' })
  draft = draftReducer(draft, { type: 'submit' })
  const pending = draftReducer(draft, { type: 'load', id: exampleIds[0] })
  assert.equal(pending.values.width, '7')
  assert.equal(pending.submitted, true)
  assert.deepEqual(draftReducer(pending, { type: 'cancel' }), { ...draft, pending: undefined })
  const replaced = draftReducer(pending, { type: 'confirm' })
  assert.equal(replaced.values.width, '5')
  assert.equal(replaced.submitted, false)
  assert.equal(replaced.dirty, false)
  assert.equal(replaced.imported?.id, exampleIds[0])
})

test('editing invalidates preparation and retains original values and full provenance', () => {
  const loaded = draftReducer(initialDraft, { type: 'load', id: exampleIds[0] })
  const submitted = draftReducer(loaded, { type: 'submit' })
  const changed = draftReducer(submitted, { type: 'edit', field: 'width', value: '12' })
  assert.equal(changed.submitted, false)
  assert.equal(preparationStatus(changed).status, 'not_assessed')
  assert.equal(changed.imported, loaded.imported)
  assert.equal(changed.imported?.values.width, '5')
  const html = renderToStaticMarkup(createElement(PreparationSummary, { draft: changed, onEdit() {} }))
  assert.match(html, /Original: 5 · Current: 12/)
  assert.match(html, /User supplied \/ edited/)
  assert.match(html, /synthetic-arithmetic/)
  assert.match(html, /No regulatory checks/)
  assert.match(html, /Copyable provider-review summary/)
  assert.match(html, /Checks performed: none/)
})

test('complete arbitrary inputs and imported fixtures never produce regulatory pass/failure', () => {
  const complete = { ...initialDraft, values: { municipality: 'Victoria', use: 'garden suite', role: 'accessory', width: '5', depth: '9', height: '3', area: '40' }, submitted: true }
  assert.equal(preparationStatus(complete).status, 'needs_investigation')
  assert.equal(preparationStatus({ ...complete, values: { ...complete.values, municipality: 'Toronto' } }).status, 'outside_coverage')
  assert.equal(preparationStatus({ ...complete, values: { ...complete.values, role: 'principal' } }).status, 'outside_coverage')
  for (const id of exampleIds) {
    const draft = draftReducer(draftReducer(initialDraft, { type: 'load', id }), { type: 'submit' })
    assert.equal(preparationStatus(draft).status, 'needs_investigation')
  }
})

test('form exposes units, connected labels/errors, and explicit optional example choice', () => {
  const draft = draftReducer(draftReducer(initialDraft, { type: 'edit', field: 'height', value: '-2' }), { type: 'submit' })
  const html = renderToStaticMarkup(createElement(AssessmentForm, { draft, dispatch() {}, onSummary() {}, onEvidence() {} }))
  assert.match(html, /width \(m\)/)
  assert.match(html, /area \(m²\)/)
  assert.match(html, /for="sr-model-height"/)
  assert.match(html, /for="sr-model-height-reference"/)
  assert.match(html, /for="manual-area"/)
  assert.match(html, /Roof height from foundation datum \(m\) is invalid/)
  assert.match(html, /option value="" selected=""/)
  assert.match(html, /Load selected example/)
})

test('model and site selections preserve source objects and invalidate prepared state', () => {
  const model = { ...initialDraft.model, modelId: 'lead', snapshotId: 'source-snapshot', changeSequence: 1 }
  const withModel = draftReducer(draftReducer(initialDraft, { type: 'submit' }), { type: 'model', value: model })
  assert.equal(withModel.submitted, false)
  assert.equal(withModel.model, model)
  const withSite = draftReducer(withModel, { type: 'site', value: null })
  assert.equal(withSite.submitted, false)
  assert.ok(preparationStatus(withSite).unresolved.some(item => item.includes('Parcel lead')))
  const invalid = draftReducer(withSite, { type: 'model', value: {
    ...model, fields: { ...model.fields, width: { ...model.fields.width, value: '-1' } },
  } })
  assert.equal(draftReducer(invalid, { type: 'submit' }).submitted, false)
  assert.ok(preparationStatus(invalid).unresolved.some(item => item.includes('width') && item.includes('invalid')))
  const invalidArea = draftReducer(withSite, { type: 'site', value: null, areaInvalid: true })
  assert.equal(draftReducer(invalidArea, { type: 'submit' }).submitted, false)
  assert.ok(preparationStatus(invalidArea).unresolved.some(item => item.includes('Manual lot area is invalid')))
})

test('banner status mapping has text, scope, reasons and action alongside every colour', () => {
  const statuses: [AssessmentStatus, string, string][] = [
    ['not_assessed', 'neutral', 'Not assessed'], ['outside_coverage', 'neutral', 'Outside coverage'],
    ['needs_investigation', 'amber', 'Needs investigation'], ['candidate', 'green', 'Candidate within evaluated scope'],
    ['failed_placement', 'red', 'Supplied placement fails evaluated checks'],
  ]
  for (const [status, colour, label] of statuses) {
    const html = renderToStaticMarkup(createElement(StatusBanner, { status, reason: 'Reason', coverage: 'One supported synthetic check', unresolved: ['Current law unknown'], nextAction: 'Review evidence', synthetic: true }))
    for (const text of [`sr-status-${colour}`, label, 'Reason', 'One supported synthetic check', 'Current law unknown', 'Review evidence', 'Synthetic example', 'Approval is separate', 'role="status"']) assert.ok(html.includes(text), text)
  }
})
