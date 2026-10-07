import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import BuilderDemo, { screeningDocument, enquiryDocument } from './BuilderDemo'
import { EnquiryPreview, emailDraftUrl, enquiryEmailBody, enquiryMarkdown, enquiryPlainText, technicalEvidenceMarkdown, validRecipient } from './enquiry'
import { buildSelection } from '../site_preparations/SitePreparation'
import type { Fact, ManualFacts } from '../site_preparations/types'
import { parseResult, parseSites } from '../occupied_lots/contract'
import { exampleCase, exampleRequest, initialExamplePosition } from './example'
import { ExampleProperty } from './ExampleProperty'
import OccupiedLots from '../occupied_lots/OccupiedLots'
import { bundledCatalogue } from '../model_catalogue/model'
import { manufacturerDocument, additionalObservation, boundaryObservations } from './manufacturer'
import { reviewAddress, reviewInput, reviewConditional, reviewScenarios, reviewScan, reviewAssumptions, reviewSettings } from './manufacturer-review.fixture'
import { PriceTiming, priceTimingParagraphs } from '../model_catalogue/PriceTiming'

const manualFact = (value: string | number | null): Fact => ({
  value, unit: null, basis: null, unresolved_reason: value === null ? 'unknown' : null,
  evidence: { origin: 'user', snapshot_id: null, feature_index: null, source_url: null,
    captured_at: '2026-09-27', method: 'manual entry', review_status: 'unreviewed' },
})
const manual: ManualFacts = { address: manualFact('Unmatched example address'), pid: manualFact(null),
  lot_area_m2: manualFact(450), notes: manualFact(null) }
const enquiry = (...args: Parameters<typeof screeningDocument>) => enquiryPlainText(screeningDocument(...args))
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
  assert.match(html, /Starting at CAD 187,000/)
  assert.match(html, /Contract to delivery: roughly 12–18 weeks · provider-wide/)
  assert.match(html, /On-site installation: 1 day · provider-wide/)
  assert.match(html, /<summary>Price &amp; timing details and sources<\/summary>/)
})

test('sourced commercial information survives supporting report formats', () => {
  const document = screeningDocument(buildSelection(null, null, manual), questions, null)
  const section = document.sections.find(item => item.heading === 'Price & timing')!
  assert.ok(section)
  const outputs = [enquiryPlainText(document), enquiryMarkdown(document),
    renderToStaticMarkup(createElement(EnquiryPreview, { document }))]
  for (const serialized of outputs) {
    const output = serialized.replace(/\\([\\`*_{}\[\]()#+.!|~-])/g, '$1')
    assert.match(output, /CAD 187,000/)
    assert.match(output, /12–18 weeks/)
    assert.match(output, /provider-wide/)
    assert.match(output, /Tax treatment: unknown/)
    assert.match(output, /Shipping; Installation/)
    assert.match(output, /Production lead time: unknown/)
    assert.match(output, /Delivery transit: unknown/)
    assert.match(output, /not total project cost/)
    assert.match(output, /not the full project timeline/)
    assert.match(output, /Purchase contract/)
    assert.match(output, /Production schedule/)
    assert.match(output, /Permitting requirements/)
    assert.match(output, /2026/)
    assert.match(output, /unreviewed/)
    assert.match(output, /https:\/\/www.auxbox.ca\/faqs/)
  }
  assert.deepEqual(section.paragraphs, priceTimingParagraphs(bundledCatalogue.models[2]))
  const older = { ...bundledCatalogue.models[2], prices: undefined, timings: undefined }
  const unknown = renderToStaticMarkup(createElement(PriceTiming, { model: older }))
  assert.match(unknown, /Price unknown/)
  assert.match(unknown, /On-site installation: unknown/)
  assert.doesNotMatch(unknown, /CAD 0|instant|free/i)
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
  assert.match(scenario, /0.5 m planning assumption/)
  assert.match(scenario, /installed height remains unverified/)
  assert.match(enquiry(null, questions, null), /Foundation scenario allowance: not supplied/)
})

test('one structured enquiry drives accessible preview, plain copy, Markdown and concise email', () => {
  const doc = enquiryDocument(buildSelection(null, null, manual), { ...questions, question: 'Could this suit family & guests <script>?', intendedUse: 'family & guests <script>', access: 'Crane access?' }, null)
  const html = renderToStaticMarkup(createElement(EnquiryPreview, { document: doc }))
  const plain = enquiryPlainText(doc)
  const markdown = enquiryMarkdown(doc)
  const emailWithoutSite = enquiryEmailBody(doc, false)
  const emailWithSite = enquiryEmailBody(doc, true)
  for (const heading of ['Project', 'Questions for aux box', 'Site preparation']) {
    assert.match(html, new RegExp(`>${heading}<`))
    assert.ok(plain.includes(heading))
    assert.ok(markdown.includes(`## ${heading}`))
  }
  for (const output of [plain, emailWithoutSite, emailWithSite]) assert.ok(output.includes(doc.question))
  assert.ok(html.indexOf('family &amp; guests') < html.indexOf('>Project<'))
  assert.doesNotMatch(html, /<script>/)
  assert.doesNotMatch(markdown, /<script>/)
  assert.match(markdown, /&lt;script&gt;/)
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


test('manufacturer brief and supporting report reconcile two rear-yard concerns with a zero-conflict strict subset', () => {
  // Independent arithmetic from the supplied review: 27.870912 / 47.159571 is
  // approximately 59.1%, exceeding 25%. This is a presentation regression,
  // not verification of legal applicability or reconstruction of the original geometry.
  const brief = manufacturerDocument(reviewInput, reviewAddress, false, null, reviewConditional, reviewScenarios, reviewScan, true)
  const plain = enquiryPlainText(brief)
  const email = enquiryEmailBody(brief, true)
  const markdown = enquiryMarkdown(brief)
  const html = renderToStaticMarkup(createElement(EnquiryPreview, { document: brief }))
  for (const output of [plain, email, markdown, html]) {
    assert.match(output, /not wholly inside/)
    assert.match(output, /59.1%/)
    assert.match(output, /25%/)
    assert.match(output, /intended use is not yet specified/)
    assert.doesNotMatch(output, /0 apparent conflicts|journey_default|legal_lot|principal_separation|acknowledged by the user/i)
    assert.ok(output.indexOf('not wholly inside') < output.indexOf('1. Can you provide'))
    assert.match(output, /Development permit areas/)
    assert.match(output, /record names not supplied/)
  }
  const defaultUse = enquiryPlainText(enquiryDocument(null, reviewInput, null, false, null, null, false, null, null, null, reviewSettings.proposal, null, reviewSettings))
  assert.match(defaultUse, /intended use is not yet specified/)
  const confirmedSettings = { ...reviewSettings, evidence: { ...reviewSettings.evidence, proposed_use: { ...reviewSettings.evidence.proposed_use, origin: 'user_confirmed' as const } } }
  const confirmedUse = enquiryPlainText(enquiryDocument(null, reviewInput, null, false, null, null, false, null, null, null, confirmedSettings.proposal, null, confirmedSettings))
  assert.match(confirmedUse, /garden suite \(confirmed by the user/)
  const explicitUse = enquiryPlainText(enquiryDocument(null, { ...reviewInput, intendedUse: 'art studio' }, null, false, null, null, false, null, null, null, confirmedSettings.proposal, null, confirmedSettings))
  assert.match(explicitUse, /for art studio/)
  const report = screeningDocument(null, reviewInput, null, false, null, null, false, null, reviewConditional, reviewAssumptions, reviewSettings.proposal, reviewScenarios, reviewSettings, reviewScan)
  const reportText = enquiryPlainText(report)
  assert.match(reportText, /Unresolved concerns are present/)
  assert.match(reportText, /no concerns identified in this strict-input subset; this excludes approximate rear-yard checks/)
  assert.match(reportText, /default scenario, not confirmed intended use/)
  assert.match(reportText, /assumed from the largest mapped outline, not verified/)
  assert.match(reportText, /Existing garden suites: 0 \(default assumption, unconfirmed\)/)
  assert.match(reportText, /Waterfront status: no \(default assumption, unconfirmed\)/)
  assert.match(reportText, /Part 3\.1\(28\)\(i\)/)
  assert.equal(reviewScenarios.additional_checks![1].basis, 'nominal footprint 27.870912000912913 m2 / approximate rear yard 47.15957088298145 m2')
  const exactRecord = { scenarios: reviewScenarios, conditional: reviewConditional, settings: reviewSettings, assumptions: reviewAssumptions }
  const evidence = technicalEvidenceMarkdown(exactRecord)
  assert.deepEqual(JSON.parse(evidence.split('\n').slice(1, -2).join('\n')), exactRecord)
  assert.match(evidence, /candidate-2026-10-05-1|geom-1/)
  assert.doesNotMatch(email, /https:|nominal footprint 27\.870912/)
  assert.match(enquiryEmailBody(brief, false), /withheld/)
  assert.doesNotMatch(enquiryEmailBody(brief, false), /Cecelia|59.1%|Development permit areas/)
  const gaps = boundaryObservations(reviewScenarios, reviewAssumptions).join(' ')
  assert.match(gaps, /Rear boundary/)
  assert.match(gaps, /1.7 m approximate/)
  assert.match(gaps, /Separate user planning allowance: 1 m/)
})

test('near-threshold concerns and arbitrary evidence text retain their exact meaning', () => {
  // Values independently stipulated just outside thresholds; rounding cannot
  // convert a conflict to equality. Full values survive the technical export.
  const ratio = { ...reviewScenarios.additional_checks![1], observed: .250000001 }
  assert.match(additionalObservation(ratio), /Excess: < 0.1 percentage points/)
  const height = { ...ratio, id: 'height', label: 'Height', unit: 'm', observed: 4.200001, threshold: 4.2 }
  assert.match(additionalObservation(height), /Difference.*< 0.01 m/)
  const record = { height, ratio, sourceText: '```\n# source text <script> & raw' }
  const fenced = technicalEvidenceMarkdown(record)
  assert.ok(fenced.startsWith('````json'))
  assert.deepEqual(JSON.parse(fenced.split('\n').slice(1, -2).join('\n')), record)
  const document = enquiryDocument(null, { ...questions, question: '# <script> test & 1.7 m' }, null)
  const markdown = enquiryMarkdown(document)
  assert.doesNotMatch(markdown, /1\\.7|&amp;/)
  assert.match(markdown, /&lt;script&gt;/)
})


test('a misleading producer count cannot suppress an included strict-input conflict', () => {
  const result = parseResult(JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8')))
  const site = parseSites(JSON.parse(readFileSync('../app/scouting_sites/data/sites.json', 'utf8')))[0]
  const measured = { site, model: null, result, widthOrigin: 'catalogue' as const, depthOrigin: 'catalogue' as const }
  const conflictCheck = { ...reviewConditional.checks[0], status: 'apparent_conflict_under_assumptions' as const }
  const contradictory = { ...reviewConditional, checks: [conflictCheck], coverage: { ...reviewConditional.coverage, apparent_conflict_under_assumptions: 0 } }
  const report = enquiryPlainText(screeningDocument(null, questions, measured, false, null, null, false, null, contradictory))
  assert.match(report, /1 concern in this subset/)
  assert.doesNotMatch(report, /no concerns identified in this strict-input subset/)
  const unknown = { ...measured, result: { ...result, checks: [{ ...result.checks[0], kind: 'containment', status: 'observed', relation: null }] } }
  const brief = enquiryPlainText(enquiryDocument(null, questions, unknown))
  assert.doesNotMatch(brief, /not wholly inside the mapped parcel/)
})
