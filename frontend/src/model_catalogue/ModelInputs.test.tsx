import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ModelInputs } from './ModelInputs'
import { assessmentValues, bundledCatalogue, emptySelection, selectModel } from './model'
import { PreparationSummary, providerReviewText } from '../assessment/Assessment'
import { draftReducer, initialDraft } from '../assessment/model'

test('published Model 240 dimensions remain visible through preparation without becoming roof height', () => {
  // Reproduced UX defect: the source publishes 10 ft 3 in (10.25 * 0.3048 = 3.1242 m),
  // but the blank assessment-height input made the known product height look missing.
  const selection = selectModel(emptySelection(), bundledCatalogue, 'aux-240')
  const markup = renderToStaticMarkup(<ModelInputs value={selection} onChange={() => {}} />)
  const card = markup.match(/<section class="sr-published-dimensions"[\s\S]*?<\/section>/)?.[0]
  assert.ok(card)
  assert.match(card, /Exterior height<\/dt><dd>10 ft 3 in \(≈ 3\.12 m\)/)
  assert.match(card, /Length<\/dt><dd>24 ft 1 in \(≈ 7\.34 m\)/)
  assert.match(card, /Width<\/dt><dd>10 ft \(≈ 3\.05 m\)/)
  assert.match(card, /href="https:\/\/www\.auxbox\.ca\/model-240"/)
  assert.match(card, /captured 2026-09-25/)
  assert.doesNotMatch(card, /<details/)
  assert.match(markup, /<label for="sr-model-height">Height \(m\)<\/label>/)
  assert.match(markup, /<label for="sr-model-width">Width \(m\)<\/label>/)
  assert.match(markup, /<label for="sr-model-depth">Length \(m\)<\/label>/)
  assert.match(markup, /<label for="sr-model-area">Interior floor area \(m²\)<\/label>/)
  assert.match(markup, /aria-label="About height measurement" aria-expanded="false" aria-controls="sr-model-height-help"/)
  assert.match(markup, /id="sr-model-height-help" class="sr-model-help" hidden=""/)
  assert.match(markup, /Technical term: roof height from foundation datum/)
  assert.match(markup, /datum\/roof point unspecified/)
  assert.match(markup, /Source baseline and basis/)
  assert.match(markup, /Provider model page/)
  assert.match(markup, /unreviewed provider observation/)
  assert.match(markup, /All source measurements and capture identity/)
  assert.match(markup, /Leave blank if unsure/)
  assert.equal(selection.fields.height.value, '')
  assert.equal(assessmentValues(selection).height, '')

  const draft = draftReducer(initialDraft, { type: 'model', value: selection })
  const summary = renderToStaticMarkup(<PreparationSummary draft={draft} onEdit={() => {}} />)
  assert.match(summary, /Exterior height<\/dt><dd>10 ft 3 in \(≈ 3\.12 m\)/)
  assert.match(providerReviewText(draft), /Exterior height: 10 ft 3 in \(≈ 3\.12 m\)/)
  assert.match(providerReviewText(draft), /Height \(m\): unknown \(roof height from foundation datum;/)
  assert.match(providerReviewText(draft), /Length \(m\): 7\.3406 \(nominal exterior depth;/)
})

test('unavailable catalogue shows manual fields without invented candidate data', () => {
  const markup = renderToStaticMarkup(<ModelInputs value={emptySelection()} onChange={() => {}} catalogue={null} />)
  assert.match(markup, /Catalogue unavailable/)
  assert.match(markup, /Model name/)
  assert.doesNotMatch(markup, /aux box/)
  assert.doesNotMatch(markup, /Published exterior dimensions/)
  const landing = selectModel(emptySelection(), bundledCatalogue, 'click-landing')
  const landingMarkup = renderToStaticMarkup(<ModelInputs value={landing} onChange={() => {}} />)
  assert.match(landingMarkup, /Exterior height<\/dt><dd>Not available in captured sources/)
})
