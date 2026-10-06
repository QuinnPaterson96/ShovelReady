import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import BuilderDemo, { enquiry, enquiryDocument } from './BuilderDemo'
import { EnquiryPreview, emailDraftUrl, enquiryEmailBody, enquiryMarkdown, enquiryPlainText, validRecipient } from './enquiry'
import { buildSelection } from '../site_preparations/SitePreparation'
import type { Fact, ManualFacts } from '../site_preparations/types'
import { parseResult, parseSites } from '../occupied_lots/contract'
import { exampleCase, exampleRequest, initialExamplePosition } from './example'
import { ExampleProperty } from './ExampleProperty'
import OccupiedLots from '../occupied_lots/OccupiedLots'

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
  assert.ok(request.placement.angle_degrees > -10 && request.placement.angle_degrees < -9, 'building length follows the saved lot axis')
  assert.equal(exampleRequest({ ...initialExamplePosition(), width: '' }), null)
  assert.equal(exampleRequest({ ...initialExamplePosition(), x: 'unknown' }), null)
  const html = renderToStaticMarkup(createElement(ExampleProperty, { onMeasurement: () => {} }))
  assert.match(html, /Nominal exterior rectangle · saved Victoria example/)
  assert.match(html, /Open Government Licence/)
  assert.match(html, /Recheck placement/)
  assert.match(html, /Click the map or drag the rectangle/)
  assert.match(html, /North ↑/)
  assert.match(html, /Reset placement/)
  assert.match(html, /Saved example sources and exact projected coordinates/)
  assert.doesNotMatch(html, /Centre X \(m\)|Centre Y \(m\)/)
  assert.match(html, /Unknown: legal lot lines/)
  assert.doesNotMatch(html, /builder-example-outcome|Measured observation for this position/)
})

test('Model 300 live placement starts without a success panel while generic occupied-lot guidance remains', () => {
  const compact = renderToStaticMarkup(createElement(OccupiedLots, { compactPlacement: true, showHandoff: false, suppliedCase: exampleCase, initialModelId: 'aux-300' }))
  const generic = renderToStaticMarkup(createElement(OccupiedLots, { showHandoff: false }))
  assert.doesNotMatch(compact, /placement-check--clear|No observed geometry conflict/)
  assert.match(generic, /Observed overlaps and distances are checked automatically after edits settle/)
  assert.match(generic, /Loading retained sites/)
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

test('one structured enquiry drives accessible preview, plain copy, Markdown and concise email', () => {
  const doc = enquiryDocument(buildSelection(null, null, manual), { ...questions, question: 'Could this suit family & guests <script>?', intendedUse: 'family & guests <script>', access: 'Crane access?' }, null)
  const html = renderToStaticMarkup(createElement(EnquiryPreview, { document: doc }))
  const plain = enquiryPlainText(doc)
  const markdown = enquiryMarkdown(doc)
  const emailWithoutSite = enquiryEmailBody(doc, false)
  const emailWithSite = enquiryEmailBody(doc, true)
  for (const heading of ['Model', 'Property', 'Placement', 'Still to confirm']) {
    assert.match(html, new RegExp(`>${heading}<`))
    assert.ok(plain.includes(heading))
    assert.ok(markdown.includes(`## ${heading}`))
  }
  for (const output of [plain, emailWithoutSite, emailWithSite]) assert.ok(output.includes(doc.question))
  assert.ok(html.indexOf('family &amp; guests') < html.indexOf('>Model<'))
  assert.doesNotMatch(html, /<script>/)
  assert.doesNotMatch(markdown, /<script>/)
  assert.match(markdown, /&lt;script&gt;/)
  assert.match(html, /href="https:\/\/www\.auxbox\.ca\/model-300"/)
  assert.match(plain, /Unmatched example address/)
  assert.match(markdown, /Unmatched example address/)
  assert.doesNotMatch(emailWithoutSite, /Unmatched example address/)
  assert.match(emailWithSite, /Unmatched example address/)
  assert.doesNotMatch(emailWithoutSite, /EPSG:3157|snapshot_id|feature_index/)
})

test('email draft URLs encode content and reject recipient or URL injection without truncation', () => {
  const body = 'Café & review\nLine two? yes'
  const mailto = emailDraftUrl('mailto', ' person+site@example.com ', 'Model 300 & site', body)
  const gmail = emailDraftUrl('gmail', '', 'Model 300 & site', body)
  assert.ok(mailto)
  assert.ok(gmail)
  assert.equal(decodeURIComponent(new URL(mailto).searchParams.get('body') ?? ''), body)
  assert.equal(new URL(gmail).searchParams.get('body'), body)
  assert.match(mailto, /subject=Model%20300%20%26%20site/)
  assert.equal(emailDraftUrl('mailto', 'safe@example.com\r\nBcc:evil@example.com', 'Hello', body), null)
  assert.equal(validRecipient('a@example.com,b@example.com'), false)
  assert.equal(emailDraftUrl('gmail', '', 'Hello', 'x'.repeat(1900)), null)
})
