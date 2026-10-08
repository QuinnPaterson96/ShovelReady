import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { manufacturerDocument } from './manufacturer'
import { enquiryPlainText, enquiryMarkdown, enquiryEmailBody } from './enquiry'
import { journeyCatalogue } from '../model_catalogue/demo'
import { reviewScenarios } from './manufacturer-review.fixture'
import { EnquirySaveOptions } from './EnquirySaveOptions'

// Reproduced export risks: unknown use or a model switch must not fabricate intent,
// and a concrete property-identity concern must survive every recipient format.
test('selected additional models, Not sure and material property questions survive recipient formats', () => {
  const input = { intendedUse: 'Not sure', timing: 'next spring', budget: 'CAD 90,000', access: '', services: '',
    relationship: 'I own the property', nextStep: 'Please suggest the next useful step.',
    propertyConcern: 'Two materially different mapped parcels share this address. I need the property contact to confirm the intended parcel.' }
  for (const model of journeyCatalogue.models.filter(model => model.model_id !== 'aux-300')) {
    const doc = manufacturerDocument(input, '601 Su’it Street', false, null, null, null, null, true, false, null, model)
    for (const text of [enquiryPlainText(doc), enquiryMarkdown(doc), enquiryEmailBody(doc, true)]) {
      assert.ok(text.includes(input.nextStep))
      assert.ok(text.includes(input.propertyConcern))
      assert.ok(text.includes(model.name) && text.includes(model.provider))
      assert.match(text, /intended use is not yet confirmed/)
      assert.doesNotMatch(text, /Model 300|for Not sure|I would use it for a garden suite|placement sketch available/)
      assert.ok(text.indexOf(input.nextStep) < text.indexOf('Project'))
      assert.ok(text.indexOf(input.propertyConcern) < text.indexOf('1. Can you'))
      assert.ok(text.indexOf(`Questions for ${model.provider}`) < text.indexOf('Planning questions to resolve separately'))
      assert.match(text, /My preferred timing is next spring/)
    }
  }
})

test('saved examples cannot claim the sender owns the example property', () => {
  const doc = manufacturerDocument({ intendedUse: '', timing: '', budget: '', access: '', services: '', relationship: 'I own the property' }, 'saved example', true, null, null, null, null, true)
  assert.match(enquiryPlainText(doc), /SAVED EXAMPLE ONLY/)
  assert.doesNotMatch(enquiryPlainText(doc), /I own the property/)
})

test('enquiry PDF remains the enabled primary save when no current plan is available', () => {
  const html = renderToStaticMarkup(createElement(EnquirySaveOptions, { onSave: () => {}, hasPlacement: false }))
  assert.match(html, /class="sr-primary"[^>]*>Save enquiry PDF/)
  assert.match(html, /No current placement plan is included/)
  assert.match(html, /<details><summary>Other download formats/)
  assert.match(html, /disabled="">Placement image/)
  assert.match(html, /disabled="">Placement plan only/)
  assert.doesNotMatch(html, /disabled="">Save enquiry PDF/)
})

// The same garden-suite packet must not become a claim about an unknown use.
test('unknown scenario excludes hypothetical garden-suite concerns from the provider message', () => {
  const doc = manufacturerDocument({ intendedUse: 'Not sure', timing: '', budget: '', access: '', services: '' }, null, false, null, null, reviewScenarios, null, true, false, null)
  const text = enquiryPlainText(doc)
  assert.match(text, /outside the supported garden-suite comparisons/)
  assert.doesNotMatch(text, /extends beyond the assumed rear-yard|59.1%|25% limit/)
})
