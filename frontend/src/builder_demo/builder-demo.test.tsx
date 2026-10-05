import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import BuilderDemo, { enquiry } from './BuilderDemo'
import { buildSelection } from '../site_preparations/SitePreparation'
import type { Fact, ManualFacts } from '../site_preparations/types'
import { parseResult, parseSites } from '../occupied_lots/contract'
import { exampleCase, exampleRequest, initialExamplePosition } from './example'
import { ExampleProperty } from './ExampleProperty'

const manualFact = (value: string | number | null): Fact => ({
  value, unit: null, basis: null, unresolved_reason: value === null ? 'unknown' : null,
  evidence: { origin: 'user', snapshot_id: null, feature_index: null, source_url: null,
    captured_at: '2026-09-27', method: 'manual entry', review_status: 'unreviewed' },
})
const manual: ManualFacts = { address: manualFact('Unmatched example address'), pid: manualFact(null),
  lot_area_m2: manualFact(450), notes: manualFact(null) }
const questions = { intendedUse: 'family accommodation', timing: '', budget: '', access: '', services: '' }

test('Model 300 entry uses an explicit single-model catalogue lead and optional examples', () => {
  const html = renderToStaticMarkup(createElement(BuilderDemo))
  assert.match(html, /Model 300/)
  assert.match(html, /Start with a site lead or the facts you know/)
  assert.doesNotMatch(html, /Model 240|The Landing/)
  assert.doesNotMatch(html, /Import a separate retained example for placement/)
  assert.match(html, /Try an example property/)
  assert.match(html, /Use my own property/)
  assert.match(html, /What the published height tells us/)
})

test('saved example retains the licensed packet and an explicit measurable starting placement', () => {
  const retained = parseSites(JSON.parse(readFileSync('../app/scouting_sites/data/sites.json', 'utf8')))[0]
  assert.deepEqual(exampleCase, retained)
  const request = exampleRequest(initialExamplePosition())
  assert.ok(request)
  assert.equal(request.parcel.source.provider, 'City of Victoria')
  assert.equal(request.parcel.source.review_status, 'unreviewed')
  assert.equal(request.buildings[0].basis, 'roofline')
  assert.equal(request.placement.width_m, 3.048)
  assert.equal(request.placement.depth_m, 9.144)
  assert.deepEqual(request.placement.centre_xy, [473689.18, 5362171.53])
  assert.equal(request.placement.angle_degrees, 90)
  assert.equal(exampleRequest({ ...initialExamplePosition(), width: '' }), null)
  assert.equal(exampleRequest({ ...initialExamplePosition(), x: 'unknown' }), null)
  const html = renderToStaticMarkup(createElement(ExampleProperty, { onMeasurement: () => {} }))
  assert.match(html, /Example property \/ saved data/)
  assert.match(html, /Open Government Licence/)
  assert.match(html, /Measure this placement/)
  assert.match(html, /Unknown: legal lot lines/)
})

test('example enquiry carries source identity and clears measured wording after an edit or exit', () => {
  const example = enquiry(null, questions, null, false, null, null, true)
  assert.match(example, /Example property \/ saved data/)
  assert.match(example, /saved example placement has no current measurement/i)
  assert.match(example, /Open Government Licence/)
  assert.doesNotMatch(example, /No overlap with the captured rooflines was observed/)
  const ownProperty = enquiry(null, questions, null)
  assert.doesNotMatch(ownProperty, /Example property \/ saved data|illustrative placement on the saved example/i)
})

test('unmatched manual site yields a useful enquiry without invented geometry', () => {
  const text = enquiry(buildSelection(null, null, manual), questions, null)
  assert.match(text, /Unmatched example address/)
  assert.match(text, /450 m²/)
  assert.match(text, /Geometry and zoning unassessed/)
  assert.match(text, /family accommodation/)
  assert.doesNotMatch(text, /EPSG:3157|VIC-087|No overlap/)
})

test('explicit retained measurement remains a separately named example with provenance', () => {
  const site = parseSites(JSON.parse(readFileSync('../app/scouting_sites/data/sites.json', 'utf8')))[0]
  const result = parseResult(JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8')))
  const text = enquiry(buildSelection(null, null, manual), questions,
    { site, model: null, result, widthOrigin: 'user', depthOrigin: 'catalogue' })
  assert.match(text, /separately imported retained example/)
  assert.match(text, /not linked to the site lead/)
  assert.match(text, /width user edited; depth catalogue nominal/)
  assert.match(text, /No overlap with the captured rooflines was observed/)
})


test('foundation assumption remains separate in the enquiry and is unknown when absent', () => {
  const scenario = enquiry(null, questions, null, false, null, null, true, '0.5')
  assert.match(scenario, /0.5 m entered by the user/)
  assert.match(scenario, /not a verified installed height/)
  assert.match(enquiry(null, questions, null), /Foundation scenario allowance: not supplied/)
})
