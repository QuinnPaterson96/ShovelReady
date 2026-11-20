// Run against a stateless, built local app. Replay captured municipal inputs and
// use the real local placement and screening endpoints and browser exports.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { strFromU8, unzipSync } from 'fflate'
import { chromium } from 'playwright'

const base = new URL(process.env.TITLE_REFERENCE_URL ?? 'http://127.0.0.1:18157')
assert.equal(base.hostname, '127.0.0.1', 'Use an isolated local preview')
const readFixture = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const [may, gorge, victoria, streets, suit] = await Promise.all([
  readFixture('../src/site_discovery/may-street-api.fixture.json'),
  readFixture('../src/site_discovery/address-api.fixture.json'),
  readFixture('../src/site_discovery/municipal-api.fixture.json'),
  readFixture('./fixtures/municipal-street-edges.json'),
  readFixture('../src/site_discovery/suit-live.fixture.json'),
])
const mappedPid = victoria.search.candidates[0].pid
const firstNumber = 'QA710001'
const revisedNumber = 'QA710002'
const question = 'Who should review the referenced document before we discuss placement?'
const reviewerOnly = 'Reviewer only: please confirm the scope of your review before proceeding.'
const mapLayers = ['Heritage properties', 'Heritage conservation areas', 'Development permit areas',
  'Mapped special restrictions', 'Mapped development applications', 'Development application history']
const mappedRestriction = { OBJECTID: 701001 }
let missingPid = false
const browser = await chromium.launch({
  headless: true,
  ...(process.env.TITLE_REFERENCE_BROWSER ? { channel: process.env.TITLE_REFERENCE_BROWSER } : {}),
})
const width = Number(process.env.TITLE_REFERENCE_WIDTH ?? '390')
const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base.origin })
const page = await context.newPage()
page.setDefaultTimeout(12000)
const errors = []
const requests = []
page.on('pageerror', error => errors.push(error.message))
await page.addInitScript(() => {
  window.enquiryPdfText = []
  const original = CanvasRenderingContext2D.prototype.fillText
  CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
    window.enquiryPdfText.push(text)
    return original.call(this, text, ...args)
  }
})
const localApis = new Set([
  '/api/scouting-geometry/assess', '/api/placement-suggestions/v1/suggest',
  '/api/municipal-rules/v1/placement-scenarios', '/api/municipal-rules/v1/evaluate',
  '/api/municipal-rules/v1/property-opportunity', '/api/identity',
])
await context.route('**/*', async route => {
  const request = route.request()
  const url = new URL(request.url())
  if (url.origin !== base.origin) {
    errors.push(`Unexpected external request: ${url.origin}`)
    return route.abort()
  }
  if (!url.pathname.startsWith('/api/')) return route.continue()
  const data = request.postData()
  requests.push({ url: url.href, data })
  const body = data ? JSON.parse(data) : {}
  const json = value => route.fulfill({ json: value })
  if (url.pathname === '/api/address-search') {
    const fixture = body.query.includes('Gorge') ? gorge : body.query.includes('601 ') ? suit.address : may
    return json({ ...fixture, query: body.query })
  }
  if (url.pathname === '/api/municipal-sites/search') {
    if (body.municipality === 'saanich') return json(streets.saanich.search)
    if (body.address.startsWith('601 ')) return json(suit.search)
    if (!missingPid) return json(victoria.search)
    const candidate = victoria.search.candidates[0]
    return json({ ...victoria.search, candidates: [{
      ...candidate, pid: null, attributes: { ...candidate.attributes, PID: null },
    }] })
  }
  if (url.pathname === '/api/municipal-sites/observe') {
    const { source, object_id } = body.parcel_ref
    if (source === 'district-of-saanich-parcels') return json(streets.saanich.observation)
    const alternate = suit.observations.find(observation => observation.parcel_ref.object_id === object_id)
    if (alternate) return json(alternate)
    if (!missingPid) return json(victoria.observation)
    const parcel = victoria.observation.parcel
    return json({ ...victoria.observation, parcel: { ...parcel, attributes: { ...parcel.attributes, PID: null } } })
  }
  if (url.pathname === '/api/municipal-sites/street-edges') {
    return json(body.parcel_ref.source === 'district-of-saanich-parcels' ? streets.saanich.streets : streets.victoria)
  }
  if (url.pathname === '/api/victoria-zoning/property-scan') {
    const findings = mapLayers.map(label => label === 'Mapped special restrictions' ? {
      label, status: 'review', records: [mappedRestriction], detail: 'Mapped record found; review its relevance.',
      source: {
        provider: 'City of Victoria Open Data', record_label: label, captured_at_utc: '2000-01-01T00:00:00Z',
        review_status: 'unreviewed_live_observation', sha256: '0'.repeat(64),
        source_url: 'https://maps.victoria.ca/server/rest/services/OpenData/OpenData_PlanningAndDevelopment/MapServer/1/query?f=json',
      },
    } : { label, status: 'unknown', source: null, records: [], detail: 'Outside this synthetic replay.' })
    const source = { ...findings.find(row => row.source).source, record_label: 'Active sewer lateral',
      source_url: 'https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Sewer/MapServer/12/query?f=json' }
    const sewer = { status: 'mapped_connection', checked_at_utc: source.captured_at_utc, source,
      detail: 'Active lateral linked to this parcel in the fixture.', records: [{ OBJECTID: 1 }],
      association_source: { ...source, record_label: 'Associated parcel',
        source_url: 'https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/11/query?f=json' },
      association_parcel_count: 1, association_parcel_ids: [body.parcel_ref.object_id],
      capacity_status: 'requires_confirmation', authority: { name: 'City Engineering', email: 'eng@victoria.ca' },
      question: 'Confirm capacity.' }
    return json({ schema_version: 'victoria-property-scan.v1', parcel_ref: body.parcel_ref, findings, limitations: [], parcel_source: null, sewer })
  }
  if (url.pathname === '/api/municipal-sites/waterfront-edges' || url.pathname.startsWith('/api/victoria-zoning/')) {
    return route.fulfill({ status: 503, body: 'Offline map-source boundary' })
  }
  if (localApis.has(url.pathname)) return route.continue()
  errors.push(`Unexpected API: ${url.pathname}`)
  return route.fulfill({ status: 503, body: 'Unrecognized local endpoint' })
})

const button = name => page.getByRole('button', { name, exact: true })
const field = name => page.getByLabel(name, { exact: true })
const preview = page.locator('#builder-unsent-preview')
const draft = () => page.locator('#builder-enquiry-text').inputValue()
const evidence = async () => JSON.parse(await page.locator('#builder-technical-record').inputValue())
const addReference = () => button('Add a title reference')
const editReference = () => button('Edit title reference')
const checklist = page.getByRole('list', { name: 'Property review checklist' })
const titleRow = checklist.getByRole('listitem').filter({ has: button('Go to title reference') })
const titleEditor = page.locator('#builder-title-reference')
const acquireTitle = titleEditor.locator('details').filter({ has: page.locator('summary', { hasText: /^Get my BC title$/ }) })

async function openDetails(parent, text) {
  const summary = parent.getByText(text, { exact: true }).and(page.locator('summary'))
  if (!(await summary.evaluate(node => node.parentElement.open))) await summary.click()
}

const scanLink = page.locator('nav a[href="#property-scan"]')
async function openScan() {
  await scanLink.click()
  await page.waitForFunction(() => document.activeElement?.id === 'property-scan-title')
  assert.equal(await scanLink.getAttribute('aria-current'), 'step')
}
async function getTitle() {
  if (!(await titleEditor.isVisible())) await openScan()
  await openDetails(titleEditor, 'Get my BC title')
}
async function haveTitle() {
  if (!(await titleEditor.isVisible())) await openScan()
  await openDetails(titleEditor, 'I already have my title')
}
const reviewHandoff = () => openDetails(titleEditor, 'Preview title review handoff')
const clipboard = () => page.evaluate(() => navigator.clipboard.readText())

async function searchAddress(query, result) {
  await page.locator('#sd-address').fill(query)
  await page.locator('#sd-address').press('Enter')
  await page.getByRole('button', { name: result }).click()
}

async function selectProperty(query, result) {
  await searchAddress(query, result)
  await page.getByRole('region', { name: 'Selected property', exact: true }).waitFor()
}

async function measurePlacement() {
  await button('Explore a garden suite').click()
  await button('Try this model').click()
  await page.waitForFunction(() => {
    const record = document.querySelector('#builder-technical-record')
    if (!record) return false
    const current = JSON.parse(record.value)
    return current.evaluation_state === 'current' && current.measurement
  })
}

async function prepareEnquiry() {
  await measurePlacement()
  await page.locator('a[href="#builder-next"]').first().click()
  await page.locator('#builder-relationship').fill('I am helping the owner')
  await page.locator('#builder-nextStep').fill('I would like to arrange an initial call.')
  await preview.waitFor()
}

async function download(control, filename) {
  const pending = page.waitForEvent('download')
  await control.click()
  const file = await pending
  assert.equal(file.suggestedFilename(), filename)
  return readFile(await file.path())
}

function emailText(message) {
  const encoded = message.toString().match(/Content-Type: text\/plain;[^\r\n]*\r\nContent-Transfer-Encoding: base64\r\n\r\n([\s\S]+?)\r\n--/)
  assert.ok(encoded, 'An unsent email download has a readable text part')
  return Buffer.from(encoded[1], 'base64').toString('utf8')
}

try {
  await page.goto(base.href)
  await button('Check my property').click()
  await selectProperty('1144 May St', /1144 May St, Victoria/)
  await openScan()
  assert.match(await scanLink.locator('xpath=preceding-sibling::a[1]').innerText(), /property/i)
  assert.match(await checklist.innerText(), /The City maps an active sewer connection/)
  assert.equal(await page.locator('a[href*="eng%40victoria.ca"], a[href="mailto:eng@victoria.ca"]').count(), 0)
  await getTitle()
  assert.equal(await field('Selected parcel identifier (PID)').inputValue(), mappedPid)
  await button('Copy PID').click()
  await acquireTitle.getByText('PID copied.', { exact: true }).waitFor()
  assert.equal(await clipboard(), mappedPid)
  assert.match(await acquireTitle.innerText(), /Compare this mapped PID.+before paying/)
  const explorer = acquireTitle.getByRole('link', { name: 'Open LTSA Explorer in a new tab' })
  assert.equal(await explorer.getAttribute('href'), 'https://myltsa.ltsa.ca/explorer')
  assert.equal(await explorer.getAttribute('target'), '_blank')
  assert.equal(await acquireTitle.getByRole('link', { name: 'LTSA fee schedule' }).getAttribute('href'), 'https://ltsa.ca/fees/')
  assert.match(await acquireTitle.innerText(), /Save the PDF.+confirmation email or the Explorer Inbox/i)
  assert.match(await acquireTitle.innerText(), /Return to this assessment tab and open I already have my title/i)
  await haveTitle()
  await addReference().waitFor()
  await button('Close property scan').click()
  await page.waitForFunction(() => document.activeElement?.id === 'property-options-title')
  await prepareEnquiry()
  const sewerField = field('Sewer question for the builder (optional)')
  const proposedQuestion = await sewerField.inputValue()
  assert.match(proposedQuestion, /existing sewer connection can serve the proposed garden suite/)
  assert.equal((await draft()).split(proposedQuestion).length, 2)
  const editedQuestion = 'Could our builder check the mapped sewer connection before quoting?'
  await sewerField.fill(editedQuestion)
  assert.ok(!(await draft()).includes(proposedQuestion))
  assert.doesNotMatch(await preview.innerText(), /Title reference for follow-up/i)
  await page.locator('nav a[href="#builder-placement"]').click()
  const roof = page.locator('#placement-projections')
  const adjust = roof.getByText('Adjust assumption', { exact: true })
  assert.ok(!(await roof.getByRole('combobox').isVisible()))
  await adjust.focus()
  await page.keyboard.press('Enter')
  await roof.getByRole('combobox').selectOption('includes_projection')
  await adjust.click()
  assert.match(await roof.innerText(), /mapped edge.*width includes the gutter/is)
  await adjust.click()
  await roof.getByRole('combobox').selectOption('wall_face')
  const depth = roof.getByLabel('Example projection past the wall (m)')
  await depth.click()
  await depth.press('ControlOrMeta+a')
  await depth.pressSequentially('100')
  await roof.locator('[data-projection-clearance="crosses"]').waitFor()
  await adjust.click()
  assert.match(await roof.innerText(), /Crosses the mapped parcel boundary near mapped edge/i)
  assert.ok(!(await roof.getByRole('combobox').isVisible()))
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
  await page.locator('nav a[href="#builder-next"]').click()
  assert.equal(await sewerField.inputValue(), editedQuestion)
  assert.doesNotMatch(await draft(), new RegExp(mappedPid))
  assert.ok(!(await evidence()).property_title_reference)
  assert.equal((await evidence()).live.parcel.raw.candidate.pid, mappedPid, 'The city PID remains available as a distinct map lead')
  assert.deepEqual((await evidence()).property_scan.findings.find(finding => finding.label === 'Mapped special restrictions').records, [mappedRestriction])

  await openScan()
  const mappedRow = checklist.getByRole('listitem').filter({ hasText: 'Mapped special restrictions' })
  assert.match(await mappedRow.innerText(), /Yes · Needs review/)
  assert.match(await titleRow.innerText(), /Maybe · Not checked/)
  const permits = checklist.getByRole('listitem').filter({ hasText: 'Permit records to review' })
  assert.match(await permits.innerText(), /City permit lookup unavailable/, 'The scan still renders when optional permit records are absent')
  await button('Go to title reference').click()
  await page.waitForFunction(() => document.activeElement?.id === 'builder-title-reference')
  await haveTitle()
  assert.ok(await addReference().isVisible(), 'The title review action exposes the editor')
  await addReference().focus()
  await page.keyboard.press('Enter')
  await field('Reference type').selectOption({ label: 'Instrument number' })
  await field('Reference number').fill(firstNumber)
  await field('Document date').fill('2026-01-15')
  await field('Related title date (optional)').fill('2026-02-15')
  await field('Question to share').fill(question)
  await button('Save title reference').click()
  await editReference().waitFor()
  await reviewHandoff()
  const reviewerDraft = field('Review draft')
  const handoff = await reviewerDraft.inputValue()
  assert.match(handoff, /For a qualified land-title reviewer/)
  assert.match(handoff, /1144 May St/)
  assert.ok(handoff.includes(firstNumber) && handoff.includes(mappedPid) && handoff.includes(question))
  assert.match(handoff, /Related title dated 2026-02-15/)
  assert.match(handoff, /still need professional review/)
  await button('Preview placement sketch').click()
  await titleEditor.getByRole('img', { name: 'Approximate proposed placement for title review' }).waitFor()
  const sketch = await download(button('Download review sketch'), 'bc-title-review-placement.png')
  assert.equal(sketch.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  await titleEditor.getByText('Placement sketch downloaded separately. Attach it when sharing the draft.', { exact: true }).waitFor()
  const editableText = await reviewerDraft.inputValue()
  assert.match(editableText, /approximate placement sketch is available/)
  const editedText = `${editableText}\n\n${reviewerOnly}`
  await reviewerDraft.fill(editedText)
  await button('Copy review draft').click()
  await titleEditor.getByText('Unsent review draft copied.', { exact: true }).waitFor()
  assert.equal((await clipboard()).replace(/\r\n/g, '\n'), editedText)
  const reviewerFile = await download(button('Download review draft'), 'bc-title-review-draft.txt')
  assert.equal(reviewerFile.toString(), editedText)
  await titleEditor.getByText('Unsent review draft downloaded.', { exact: true }).waitFor()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
  await page.locator('a[href="#builder-next"]').first().click()
  await preview.getByText(question, { exact: false }).waitFor()
  assert.match(await preview.innerText(), /Title reference for follow-up/i)
  assert.match(await preview.innerText(), new RegExp(firstNumber))
  assert.match(await preview.innerText(), /Owner-supplied reference.*still need professional review/i)
  assert.match(await draft(), new RegExp(firstNumber))
  assert.ok(!(await draft()).includes(reviewerOnly))
  assert.ok(!JSON.stringify(await evidence()).includes(reviewerOnly))
  assert.deepEqual((await evidence()).property_title_reference, {
    schema_version: 'property-title-reference.v1', origin: 'owner_supplied', review_status: 'legal_effect_unreviewed',
    kind: 'instrument', number: firstNumber, document_date: '2026-01-15', title_date: '2026-02-15', question,
  })
  await openScan()
  assert.match(await titleRow.innerText(), /Reference supplied · Legal effect needs review/)
  assert.match(await mappedRow.innerText(), /Yes · Needs review/, 'An owner-supplied reference does not change the mapped lead')
  await page.locator('a[href="#builder-next"]').first().click()

  await page.getByText('Other download formats', { exact: true }).click()
  const pdf = await download(button('Save enquiry PDF'), 'prefab-enquiry.pdf')
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF')
  const pdfText = (await page.evaluate(() => window.enquiryPdfText)).join(' ')
  assert.match(pdfText, new RegExp(firstNumber))
  assert.ok(pdfText.includes(question))
  const zip = await download(button('Enquiry and evidence package (ZIP)'), 'prefab-enquiry-package.zip')
  const files = unzipSync(zip)
  for (const filename of ['prefab-enquiry.md', 'prefab-supporting-report.md']) {
    const report = strFromU8(files[filename])
    assert.ok(report.includes(firstNumber) && report.includes(question))
    assert.ok(!report.includes(reviewerOnly))
  }
  assert.equal(strFromU8(files['prefab-enquiry.md']).split(editedQuestion).length, 2)
  const technical = JSON.parse(strFromU8(files['prefab-technical-evidence.json']))
  assert.deepEqual(technical.property_title_reference, (await evidence()).property_title_reference)

  await page.getByRole('button', { name: /Confirm enquiry & continue/ }).click()
  await page.getByText('I already have an email contact', { exact: true }).click()
  const email = page.locator('#builder-email-body')
  assert.match(await email.inputValue(), new RegExp(firstNumber))
  await field('Recipient email (optional; edit before opening)').fill('verification@example.invalid')
  const included = await download(button('Download email draft with placement attachment'), 'prefab-enquiry.eml')
  assert.ok(emailText(included).includes(question))
  assert.equal(emailText(included).split(editedQuestion).length, 2)
  assert.match(emailText(included), new RegExp(firstNumber))
  await field('Include site details in the email').uncheck()
  assert.doesNotMatch(await email.inputValue(), new RegExp(firstNumber))
  assert.ok(!(await email.inputValue()).includes(question))
  const eml = await download(button('Download email draft'), 'prefab-enquiry.eml')
  assert.doesNotMatch(emailText(eml), new RegExp(firstNumber))
  assert.ok(!emailText(eml).includes(editedQuestion))
  assert.ok(!emailText(eml).includes(question))
  assert.doesNotMatch(eml.toString(), /Content-Disposition: attachment/i)

  await page.locator('a[href="#builder-property"]').first().click()
  await haveTitle()
  await reviewHandoff()
  assert.equal(await reviewerDraft.inputValue(), editedText)
  await editReference().click()
  assert.equal(await field('Reference number').inputValue(), firstNumber)
  await field('Reference number').fill(revisedNumber)
  await button('Save title reference').click()
  await reviewHandoff()
  assert.match(await reviewerDraft.inputValue(), new RegExp(revisedNumber))
  assert.doesNotMatch(await reviewerDraft.inputValue(), new RegExp(firstNumber))
  assert.ok(!(await reviewerDraft.inputValue()).includes(reviewerOnly))
  await page.locator('a[href="#builder-next"]').first().click()
  assert.match(await draft(), new RegExp(revisedNumber))
  assert.doesNotMatch(await draft(), new RegExp(firstNumber))
  await page.locator('a[href="#builder-property"]').first().click()
  await haveTitle()
  await button('Remove title reference').click()
  await addReference().waitFor()
  await page.locator('a[href="#builder-next"]').first().click()
  assert.doesNotMatch(await draft(), new RegExp(revisedNumber))
  assert.ok(!(await evidence()).property_title_reference)

  await page.locator('a[href="#builder-property"]').first().click()
  await haveTitle()
  await addReference().click()
  await field('Reference type').selectOption({ label: 'Title number' })
  await field('Reference number').fill(revisedNumber)
  await field('Document date').fill('2026-02-15')
  await field('Question to share').fill(question)
  await button('Save title reference').click()
  await editReference().waitFor()
  await reviewHandoff()
  await reviewerDraft.fill(reviewerOnly)
  await button('Change address').filter({ visible: true }).first().click()
  await selectProperty('200 Gorge Rd W', /200 Gorge Rd W, Saanich/)
  await haveTitle()
  await addReference().waitFor()
  await prepareEnquiry()
  assert.equal(await sewerField.inputValue(), 'How would we confirm sewer service for this property?')
  assert.ok(!(await draft()).includes(editedQuestion) && !(await draft()).includes(proposedQuestion))
  assert.doesNotMatch(await draft(), new RegExp(revisedNumber))
  assert.ok(!(await evidence()).property_title_reference)
  await page.locator('a[href="#builder-property"]').first().click()
  await button('Change address').filter({ visible: true }).first().click()
  await selectProperty('1144 May St', /1144 May St, Victoria/)
  await haveTitle()
  await addReference().waitFor()
  assert.equal(await editReference().count(), 0, 'Reselecting the old address does not resurrect a cleared reference')
  assert.equal(await titleEditor.getByText('Preview title review handoff', { exact: true }).count(), 0)

  await button('Change address').filter({ visible: true }).first().click()
  await searchAddress('601 Su’it Street', /601 Su.it St, Victoria/)
  const choices = page.getByRole('region', { name: 'Parcel choices', exact: true })
  await choices.waitFor()
  assert.equal(await titleEditor.isVisible(), false, 'Ordering guidance stays off until a parcel is chosen')
  await choices.getByRole('button', { name: /008-094-764/ }).click()
  await getTitle()
  assert.match(await acquireTitle.innerText(), /does not establish one PID for ordering/)
  assert.equal(await button('Copy PID').count(), 0)
  assert.doesNotMatch(await acquireTitle.innerText(), /008-094-764|008-094-772/)
  await haveTitle()
  await addReference().click()
  await field('Reference number').fill(firstNumber)
  await field('Document date').fill('2026-01-15')
  await field('Question to share').fill(question)
  await button('Save title reference').click()
  await measurePlacement()
  await page.locator('a[href="#builder-property"]').first().click()
  await haveTitle()
  await reviewHandoff()
  assert.match(await reviewerDraft.inputValue(), /Please confirm the parcel and PID/)
  assert.equal(await button('Preview placement sketch').count(), 0, 'An ambiguous parcel with a rendered placement cannot supply a reviewer sketch')

  missingPid = true
  await button('Change address').filter({ visible: true }).first().click()
  await selectProperty('1144 May St', /1144 May St, Victoria/)
  await getTitle()
  assert.match(await acquireTitle.innerText(), /does not establish one PID for ordering/)
  assert.equal(await button('Copy PID').count(), 0)
  await haveTitle()
  await addReference().click()
  await field('Reference number').fill(firstNumber)
  await field('Document date').fill('2026-01-15')
  await field('Question to share').fill(question)
  await button('Save title reference').click()
  await measurePlacement()
  await page.locator('a[href="#builder-property"]').first().click()
  await haveTitle()
  await reviewHandoff()
  assert.match(await reviewerDraft.inputValue(), /Please confirm the parcel and PID/)
  assert.ok(!(await reviewerDraft.inputValue()).includes(reviewerOnly))
  await button('Preview placement sketch').click()
  await titleEditor.getByRole('img', { name: 'Approximate proposed placement for title review' }).waitFor()
  assert.ok(requests.every(request => ![firstNumber, revisedNumber, question, reviewerOnly].some(value =>
    request.url.includes(value) || request.data?.includes(value))), 'Title input stays out of API requests')
  assert.equal(await page.evaluate(values => [localStorage, sessionStorage].some(storage =>
    Object.values(storage).some(entry => values.some(value => entry.includes(value)))), [firstNumber, revisedNumber, reviewerOnly]), false)
  assert.deepEqual(errors, [])
  console.log(`Homeowner flow at ${width}px: early scan and focus, title review, roof adjustment and crossing, sewer draft and PDF/ZIP/EML handoff, edits, property reset and privacy passed.`)
} finally {
  await browser.close()
}
