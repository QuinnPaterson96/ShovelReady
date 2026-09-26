import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ModelInputs } from './ModelInputs'
import { bundledCatalogue, emptySelection, selectModel } from './model'

test('component labels height, provenance and the unreviewed source boundary', () => {
  const selection = selectModel(emptySelection(), bundledCatalogue, 'aux-300')
  const markup = renderToStaticMarkup(<ModelInputs value={selection} onChange={() => {}} />)
  assert.match(markup, /Building height \(m\)/)
  assert.match(markup, /datum\/roof point unspecified/)
  assert.match(markup, /Source baseline and basis/)
  assert.match(markup, /Provider model page/)
  assert.match(markup, /unreviewed source snapshot/)
  assert.match(markup, /Roof high point and measurement datum are required/)
})

test('unavailable catalogue shows manual fields without invented candidate data', () => {
  const markup = renderToStaticMarkup(<ModelInputs value={emptySelection()} onChange={() => {}} catalogue={null} />)
  assert.match(markup, /Catalogue unavailable/)
  assert.match(markup, /Model name/)
  assert.doesNotMatch(markup, /aux box/)
})
