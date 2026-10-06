import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { bundledCatalogue } from '../../model_catalogue/model'
import { HeightView } from './HeightView'

const model = bundledCatalogue.models.find(item => item.model_id === 'aux-300')!

test('published Model 300 height stays attributed and separate from a user allowance', () => {
  const html = renderToStaticMarkup(createElement(HeightView, { model, initialFoundationAllowanceM: '0.25' }))
  assert.match(html, /10 ft 6 in \(3\.2 m\)/)
  assert.match(html, /0\.25 m entered by you/)
  assert.match(html, /captured September 25|captured 2026-09-25/)
  assert.match(html, /manufacturer revision unknown/)
  assert.match(html, /Installed height:<\/strong> unknown/)
  assert.match(html, /Applicable regulatory height and limit:<\/strong> unknown/)
  assert.doesNotMatch(html, /3\.45 m|legal height limit/)
  const shared = renderToStaticMarkup(createElement(HeightView, { model, foundationAllowanceM: '0.30' }))
  assert.match(shared, /0\.3 m planning assumption/)
  assert.match(shared, /Changing it updates that estimate/)
  assert.doesNotMatch(shared, /none supplied|does not.*change any placement or zoning result/)
  assert.match(shared, /Installed height:<\/strong> unknown/)
})

test('missing published height and invalid allowance never become drawn dimensions', () => {
  const missing = { ...model, measurements: model.measurements.map(item => item.name === 'advertised_overall_height'
    ? { ...item, status: 'missing' as const, quantity: null } : item) }
  const html = renderToStaticMarkup(createElement(HeightView, { model: missing, initialFoundationAllowanceM: '-1' }))
  assert.match(html, /Manufacturer overall height:<\/strong> unknown/)
  assert.match(html, /invalid entry; no usable allowance/)
  assert.match(html, /aria-invalid="true"/)
  assert.match(html, /not a scaled drawing/)
})
