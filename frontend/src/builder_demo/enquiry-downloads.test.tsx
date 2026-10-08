import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { manufacturerDocument } from './manufacturer'
import { enquiryPlainText, enquiryMarkdown, enquiryEmailBody, withPlacementSketch } from './enquiry'
import { journeyCatalogue } from '../model_catalogue/demo'
import { reviewScenarios, reviewAssumptions } from './manufacturer-review.fixture'
import { EnquirySaveOptions } from './EnquirySaveOptions'
import { placementDrawing } from './placementExport'
import { exampleCase } from './example'
import retainedGeometry from '../scenario_handoff/retained-assessment.fixture.json'
import { parseResult } from '../occupied_lots/contract'
import type { ScenarioResult } from '../conditional_screening/scenarios'

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

test('explicit requested response leads despite a default or distinct custom question', () => {
  const response = 'Please send current dimensioned plans and advise the next useful step.'
  const custom = 'Can you assess crane access from photos?'
  for (const question of ['Could Model 300 be suitable for this property?', custom, response]) {
    const doc = manufacturerDocument({ intendedUse: 'Not sure', question, nextStep: response, timing: '', budget: '', access: '', services: '', contact: 'Zoë' }, '601 Su’it Street', false, null, null, null, null, true)
    assert.equal(doc.question, response)
    for (const text of [enquiryPlainText(doc), enquiryMarkdown(doc), enquiryEmailBody(doc, true)]) {
      assert.equal(text.split(response).length - 1, 1)
      assert.ok(text.indexOf(response) < text.indexOf('Project'))
      if (question === custom) assert.ok(text.indexOf(custom) > text.indexOf(response))
      else assert.doesNotMatch(text, /Could Model 300 be suitable/)
      assert.doesNotMatch(text, /Please let me know what information would help you advise on the next step/)
    }
    assert.equal(doc.closing, 'Zoë')
  }
})

test('delivered sketch notes replace availability wording rather than contradict it', () => {
  const doc = manufacturerDocument({ intendedUse: 'Not sure', timing: '', budget: '', access: '', services: '' }, null, false, null, null, null, null, true, true)
  assert.match(enquiryPlainText(doc), /sketch available/)
  const attached = withPlacementSketch(doc, 'The approximate placement plan follows in this PDF.')
  assert.match(enquiryMarkdown(attached), /plan follows in this PDF/)
  assert.doesNotMatch(enquiryMarkdown(attached), /sketch available|best way to share/)
  assert.doesNotMatch(enquiryMarkdown(withPlacementSketch(doc, null)), /sketch available|best way to share|included below/)
})

// Reproduced PDF defect: a connector crossed the candidate-minimum text.
// Rendering order and separate gutters protect labels independently of site geometry.
test('placement gap callouts cover connectors and reserve space beside geometry', () => {
  const centre = parseResult(retainedGeometry).input.placement.centre_xy
  const scenarios: ScenarioResult = { ...reviewScenarios,
    edge_measurement_lines: Object.fromEntries(reviewAssumptions.edges.map(edge => [edge.id, [centre, edge.start]])),
    additional_checks: [{ ...reviewScenarios.additional_checks![0], id: 'separation', observed: 0, threshold: 2.4,
      visual_evidence: { schema_version: 'scouting-comparison-geometry.v1', crs: exampleCase.site.projected_metre_crs,
        principal_building_id: exampleCase.site.buildings[0].id, principal_outline_area_m2: 1,
        principal_crosses_parcel: true, measurement_line: [centre, centre], rear_yard: null,
        outside_rear_yard: null, rear_yard_area_m2: null, outside_rear_yard_area_m2: null } }],
  }
  const drawing = placementDrawing({ site: exampleCase, model: null, result: parseResult(retainedGeometry), widthOrigin: 'catalogue', depthOrigin: 'catalogue' }, reviewAssumptions, scenarios, true,
    { ink: '#203238', danger: '#9a3e35', parcelFill: '#d3e2e0', parcelStroke: '#245b68', roofFill: '#dbd5e8', roofStroke: '#564881', zoneFill: '#edcfac', zoneStroke: '#91602f' })
  assert.equal((drawing.svg.match(/class="placement-gap-callout"/g) ?? []).length, 5)
  assert.ok(drawing.svg.lastIndexOf('<path') < drawing.svg.indexOf('class="placement-gap-callout"'))
  assert.match(drawing.svg, /<rect x="680"[^>]*fill="white"/)
  assert.match(drawing.svg, /x="65" y="730"[^>]*>0 m main-home gap/)
  assert.match(drawing.svg, /x="65" y="753"[^>]*>Candidate minimum: 2\.4 m \(concern\)/)
})
