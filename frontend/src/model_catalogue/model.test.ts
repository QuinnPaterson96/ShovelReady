import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assessmentValues, bundledCatalogue, editField, editHeightReference, emptySelection, fieldError, selectModel } from './model'

test('real candidates keep building height blank despite advertised exterior heights', () => {
  assert.equal(bundledCatalogue.models.length, 3)
  for (const model of bundledCatalogue.models) {
    const selected = selectModel(emptySelection(), bundledCatalogue, model.model_id)
    assert.equal(selected.fields.height.value, '')
    assert.equal(selected.heightReference, 'unknown')
    assert.equal(assessmentValues(selected).height, '')
    assert.equal(selected.reviewStatus, 'unreviewed')
  }
})

test('manual override retains source baseline and invalidates previous summary', () => {
  const selected = selectModel(emptySelection(), bundledCatalogue, 'click-landing')
  const edited = editField(selected, 'width', '4.3')
  assert.equal(edited.fields.width.origin, 'user')
  assert.equal(edited.fields.width.baseline?.quantity?.original_text, '14 ft')
  assert.equal(edited.changeSequence, selected.changeSequence + 1)
  assert.equal(edited.reviewStatus, 'unreviewed')
  assert.equal(assessmentValues(edited).width, '4.3')
})

test('model switching drops old overrides and records another change', () => {
  const landing = editField(selectModel(emptySelection(), bundledCatalogue, 'click-landing'), 'width', '9')
  const aux = selectModel(landing, bundledCatalogue, 'aux-300')
  assert.equal(aux.fields.width.baseline?.quantity?.original_text, '10 ft')
  assert.notEqual(aux.fields.width.value, '9')
  assert.equal(aux.changeSequence, landing.changeSequence + 1)
})

test('unavailable catalogue and manual height reference remain explicit', () => {
  const manual = selectModel(emptySelection(), null, null)
  const height = editField(manual, 'height', '3.2')
  assert.equal(assessmentValues(height).height, '')
  const referenced = editHeightReference(height, 'foundation_datum_to_roof_high_point')
  assert.equal(assessmentValues(referenced).height, '3.2')
  assert.equal(fieldError('-2'), 'Use a positive decimal, or leave blank for unknown.')
  assert.equal(fieldError(''), null)
})
