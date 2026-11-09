// Captured discovery boundaries + real local geometry, suggestion and scenario APIs.
// This verifies the connected demo, not municipal source accuracy or human usefulness.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'

const base = process.env.PLACEMENT_DEMO_URL ?? 'http://127.0.0.1:18137'
assert.equal(new URL(base).hostname, '127.0.0.1', 'Use an isolated local preview')
const output = process.env.PLACEMENT_DEMO_OUTPUT ?? '../.local/placement-demo-verification'
await mkdir(output, { recursive: true })
const fixture = async name => JSON.parse(await readFile(new URL(`../src/site_discovery/${name}`, import.meta.url), 'utf8'))
const [may, outside, municipal] = await Promise.all([
  fixture('may-street-api.fixture.json'), fixture('address-api.fixture.json'), fixture('municipal-api.fixture.json'),
])
const streets = JSON.parse(await readFile(new URL('./fixtures/municipal-street-edges.json', import.meta.url), 'utf8'))
const lake = JSON.parse(await readFile(new URL('./fixtures/prospect-lake-waterfront.json', import.meta.url), 'utf8'))
let lakeSelected = false
let releaseStreets
const delayedStreets = new Promise(resolve => { releaseStreets = resolve })
const browser = await chromium.launch({ headless: true, ...(process.env.WALKTHROUGH_BROWSER ? { channel: process.env.WALKTHROUGH_BROWSER } : {}) })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
const page = await context.newPage()
const errors = [], requests = [], evidence = []
page.on('pageerror', error => errors.push(error.message))
let failSuggestion = false, holdSuggestion = false, heldStarted = false, releaseSuggestion
let holdMunicipal = false, municipalStarted = false, releaseMunicipal
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url())
  if (url.origin !== new URL(base).origin) { errors.push(`Unexpected external request: ${url.origin}`); return route.abort() }
  if (!url.pathname.startsWith('/api/')) return route.continue()
  requests.push(url.pathname)
  const body = request.postDataJSON()
  const json = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) })
  if (url.pathname === '/api/address-search') {
    lakeSelected = body.query.includes('Prospect')
    return json({ ...(lakeSelected ? lake.address : body.query.includes('Gorge') ? outside : may), query: body.query })
  }
  if (url.pathname === '/api/municipal-sites/waterfront-edges') {
    if (body.parcel_ref.object_id === lake.waterfront.parcel_ref.object_id) return json(lake.waterfront)
    return route.fulfill({status: 503, body: 'Offline shoreline source'})
  }
  if (lakeSelected) {
    if (url.pathname === '/api/municipal-sites/search') return json(lake.search)
    if (url.pathname === '/api/municipal-sites/observe') return json(lake.observation)
    if (url.pathname === '/api/municipal-sites/street-edges') return route.fulfill({status: 503, body: 'Offline streets'})
  }
  if (url.pathname === '/api/municipal-sites/search') return json(body.municipality === 'saanich' ? streets.saanich.search : municipal.search)
  if (url.pathname === '/api/municipal-sites/observe') return json(body.parcel_ref.source === 'district-of-saanich-parcels' ? streets.saanich.observation : municipal.observation)
  if (url.pathname === '/api/municipal-sites/street-edges') {
    if (body.parcel_ref.source === 'district-of-saanich-parcels') return json(streets.saanich.streets)
    await delayedStreets
    return json(streets.victoria)
  }
  if (url.pathname.startsWith('/api/victoria-zoning/')) return route.fulfill({ status: 503, body: 'Offline municipal source boundary' })
  if (url.pathname === '/api/municipal-rules/v1/evaluate' && holdMunicipal) {
    municipalStarted = true
    const response = await fetch(base + url.pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: request.postData() })
    const text = await response.text()
    await new Promise(resolve => { releaseMunicipal = resolve })
    return route.fulfill({ status: response.status, contentType: 'application/json', body: text }).catch(() => {})
  }
  if (url.pathname === '/api/placement-suggestions/v1/suggest') {
    if (failSuggestion) return route.fulfill({ status: 503, body: 'Controlled suggestion outage' })
    if (holdSuggestion) {
      heldStarted = true
      const response = await fetch(base + url.pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: request.postData() })
      const text = await response.text()
      await new Promise(resolve => { releaseSuggestion = resolve })
      return route.fulfill({ status: response.status, contentType: 'application/json', body: text }).catch(() => {})
    }
  }
  return route.continue()
})
const current = async () => JSON.parse(await page.locator('#builder-technical-record').inputValue())
const until = async (predicate, message, timeout = 30000) => {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) { if (await predicate()) return; await page.waitForTimeout(100) }
  throw new Error(message)
}
const settled = async () => until(async () => {
  const value = await current()
  return value.evaluation_state === 'current' && value.measurement
}, 'Expected current connected placement')
const search = async text => { await page.locator('#sd-address').fill(text); await page.locator('#sd-address').press('Enter') }
const suggest = () => page.getByRole('button', { name: 'Suggest a placement', exact: true })
const map = () => page.locator('svg.occupied-map')

try {
  await page.goto(`${base}/#assessment`)
  await search('1144 May St')
  await page.getByRole('button', { name: /1144 May St, Victoria/ }).click()
  await settled()
  let value = await current()
  assert.equal(value.municipality.jurisdiction_id, 'ca-bc-victoria')
  assert.equal(value.municipality.origin, 'municipal_parcel')
  assert.equal(value.project_settings.proposal.proposed_use, null, 'the initial map preview must not answer intended use')
  assert.equal(value.planning_comparison_scope.garden_suite_comparisons_applied, false)
  assert.ok(value.measurement.startingSuggestion, 'automatic position retains its suggestion evidence')
  assert.ok(await page.getByText(/Illustrative garden-suite setbacks/).first().isVisible())
  assert.equal(value.measurement.result.checks.find(row => row.kind === 'containment').relation, 'contained')
  assert.ok(value.measurement.result.checks.filter(row => row.kind === 'building_overlap').every(row => row.relation === 'separate'))
  assert.ok(requests.includes('/api/placement-suggestions/v1/suggest'))
  evidence.push({ phase: 'automatic live suggestion', municipality: value.municipality, placement: value.measurement.result.input.placement })

  // A delayed suggestion may not undo a user's keyboard move.
  holdSuggestion = true
  await suggest().click()
  await until(async () => heldStarted, 'Suggestion request was not issued')
  await map().focus(); await page.keyboard.press('ArrowRight')
  await settled()
  const moved = (await current()).measurement.result.input.placement
  holdSuggestion = false; releaseSuggestion?.()
  await page.waitForTimeout(450)
  assert.deepEqual((await current()).measurement.result.input.placement, moved)
  evidence.push({ phase: 'late suggestion preserves edit', placement: moved })

  failSuggestion = true; await suggest().click()
  await page.waitForTimeout(450)
  assert.deepEqual((await current()).measurement.result.input.placement, moved)
  failSuggestion = false; await suggest().click(); await settled()

  // Select a known street through accessible controls, then use the intended-use step.
  await page.locator('#placement-action-front').click()
  await page.getByText('Mark without the map', { exact: true }).click()
  await page.getByRole('button', { name: 'Edge 1 borders a street', exact: true }).click()
  releaseStreets()
  await until(async () => (await current()).street_prefill?.status === 'suggested', 'Victoria prefill did not arrive')
  // Source arrival and the resulting placement/assumption update are separate
  // commits. Wait for the current record before checking manual-edit retention.
  await until(async () => !!(await current()).zoning_site_assumptions, 'Current street assumptions did not settle')
  assert.equal((await current()).zoning_site_assumptions.street_adjacency.origin, 'user')
  assert.equal((await current()).zoning_site_assumptions.street_adjacency.edge_ids.length, 1, 'late map results must preserve the manual mark')
  await page.locator('a[href="#builder-purpose"]').first().click()
  await page.locator('#builder-intended-use').selectOption('Garden suite')
  await settled()
  await page.locator('#placement-action-place').click()
  await until(async () => await page.locator('.setback-map-layer').count() > 0, 'Expected source-backed setback overlay')
  value = await current()
  assert.ok(value.placement_scenario_result?.scenarios.length)
  evidence.push({ phase: 'setback overlay', request: value.placement_scenario_request, result: value.placement_scenario_result })
  await map().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.screenshot({ path: `${output}/desktop-placement.png` })
  await page.setViewportSize({ width: 390, height: 844 })
  await map().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.screenshot({ path: `${output}/mobile-placement.png` })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'Mobile layout must not overflow horizontally')
  // The canvas includes padding outside the captured lot. An outside position
  // has a new conflict; the setbacks themselves must not disappear on movement.
  await map().click({ position: { x: 5, y: 5 } })
  await settled()
  assert.equal((await current()).measurement.result.checks.find(row => row.kind === 'containment').relation, 'outside')
  assert.ok(await page.locator('.setback-map-layer').count() > 0, 'Setback lines survive a move outside the lot')

  // Changing municipality keeps the drawn placement but invalidates Victoria findings.
  await page.locator('a[href="#builder-property-details"]').first().click()
  const coverage = page.locator('#municipality-settings')
  await coverage.getByText('Change municipality', { exact: true }).click()
  await coverage.getByLabel('City or municipality in British Columbia').fill('Saanich')
  await coverage.getByRole('button', { name: 'Use municipality', exact: true }).click()
  await until(async () => (await current()).municipality.name === 'Saanich', 'City correction missing')
  value = await current()
  assert.ok(value.measurement)
  assert.equal(value.conditional_screening, null)
  assert.equal(value.placement_scenario_result, null)
  assert.equal(value.municipal_zoning_lookup, null)
  assert.equal(value.property_scan, null)
  assert.equal(value.planning_comparison_scope.garden_suite_comparisons_applied, false)
  assert.equal(await page.locator('.setback-map-layer').count(), 0)
  const report = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'Supporting screening report' }) }).last()
  await until(async () => (await report.textContent())?.includes('No local rule comparison was run for this site.'), 'Corrected report must drop Victoria rule wording')
  assert.doesNotMatch(await report.textContent(), /planning comparisons use a garden-suite scenario/)
  assert.equal(value.municipality.rule_coverage, 'unresolved', 'Changing the city does not relabel a Victoria parcel as Saanich')
  assert.equal(value.municipal_evaluation, null)
  evidence.push({ phase: 'municipality correction', municipality: value.municipality, retainedPlacement: value.measurement.result.input.placement })

  // Saanich reuses discovery, street observations and the common evaluation flow.
  await page.getByRole('button', { name: 'Change address', exact: true }).filter({ visible: true }).first().click()
  const before = requests.length
  await search('200 Gorge Rd W')
  await page.getByRole('button', { name: /200 Gorge Rd W, Saanich/ }).click()
  await until(async () => (await current()).zoning_site_assumptions?.street_adjacency?.origin === 'municipal_map', 'Missing Saanich prefill')
  const observed = await current()
  assert.equal(observed.municipality.jurisdiction_id, 'ca-bc-saanich')
  assert.equal(observed.municipality.rule_coverage, 'candidate')
  const original = observed.zoning_site_assumptions.street_adjacency
  assert.equal(original.edge_ids.length, 3)
  assert.ok(Object.values(original.mapped_names).includes('GORGE RD W'))
  assert.ok(!requests.slice(before).some(path => path.startsWith('/api/victoria-zoning/')))
  await page.locator('#placement-action-front').click()
  await page.getByText('Mark without the map', { exact: true }).click()
  const edge = page.getByRole('button', { name: 'Edge 3 borders a street', exact: true })
  assert.equal(await edge.getAttribute('aria-pressed'), 'true')
  const sourceLink = await page.getByRole('link', { name: 'Street map source' }).getAttribute('href')
  assert.match(sourceLink, /Streets\/FeatureServer\/0$/)
  await page.screenshot({ path: `${output}/saanich-editable-streets.png` })
  await edge.click()
  await until(async () => (await current()).zoning_site_assumptions?.street_adjacency?.edge_ids.length === 2, 'Street removal lost')
  assert.equal((await current()).zoning_site_assumptions.street_adjacency.origin, 'edited_map')
  await edge.click()
  await until(async () => (await current()).zoning_site_assumptions?.street_adjacency?.edge_ids.length === 3, 'Street addition lost')
  assert.ok(!Object.values((await current()).zoning_site_assumptions.street_adjacency.mapped_names).includes('GORGE RD W'), 'Manually re-added edge keeps its origin')
  await until(async () => (await report.textContent())?.includes('The visitor edited the street selection.'), 'Report lost edit provenance')
  await page.getByRole('button', { name: 'Not sure · clear street marks' }).click()
  await until(async () => !(await current()).zoning_site_assumptions?.street_adjacency?.edge_ids.length, 'Clear did not persist')
  evidence.push({ phase: 'Saanich editable prefill', suggested: original, afterClear: (await current()).zoning_site_assumptions.street_adjacency })

  await page.locator('a[href="#builder-purpose"]').first().click()
  await page.locator('#builder-intended-use').selectOption('Garden suite')
  await page.locator('a[href="#builder-property-details"]').first().click()
  await page.getByText('Add or correct local property facts', { exact: true }).click()
  const localInput = name => page.locator(`#municipal-input-${name}`)
  await localInput('lot_width').fill('12')
  await localInput('floor_area').fill('93')
  await localInput('open_space').fill('45')
  await localInput('zone_permits').selectOption('true')
  await localInput('sewer_service_area').selectOption('true')
  await settled()
  const scalar = async key => (await current()).municipal_evaluation?.screening.checks.find(check => check.rule.fact_id === key)
  for (const key of ['lot_area', 'lot_width', 'floor_area', 'open_space']) assert.equal((await scalar(key)).status, 'meets_under_assumptions', key)
  assert.equal((await current()).conditional_screening, null)
  assert.equal((await current()).placement_scenario_result, null)
  assert.equal((await scalar('floor_area')).fact.measurement_definition.includes('Gross Floor Area (R)'), true)
  await page.locator('#existing-suites').getByRole('button', { name: 'One', exact: true }).click()
  await until(async () => (await current()).zoning_site_assumptions?.existing_garden_suites.value === 1, 'Existing-suite edit did not reach the assessment')
  await settled()
  assert.equal((await scalar('no_existing_suite')).status, 'apparent_conflict_under_assumptions')
  assert.equal((await scalar('lot_area')).status, 'unsupported', 'Known existing suite must not be ignored')
  await page.locator('#existing-suites').getByRole('button', { name: 'None', exact: true }).click()
  await until(async () => (await current()).zoning_site_assumptions?.existing_garden_suites.value === 0, 'Existing-suite correction did not reach the assessment')
  await settled()
  await localInput('open_space').fill('44.999999999999999999')
  await settled()
  assert.equal((await scalar('open_space')).status, 'apparent_conflict_under_assumptions', 'Exact percentage below 45% cannot round into a match')
  await localInput('open_space').fill('45')
  await localInput('lot_area').fill('-1')
  await until(async () => (await current()).municipal_evaluation === null, 'Invalid override must not regain the mapped-area match')
  await localInput('lot_area').fill('399.99')
  await settled()
  assert.equal((await scalar('lot_area')).status, 'apparent_conflict_under_assumptions')
  assert.match(await report.textContent(), /exact values differ despite rounding/)
  assert.match(await report.textContent(), /District of Saanich.*unreviewed/)
  assert.doesNotMatch(await report.textContent(), /Candidate Victoria garden-suite comparison|GRD-1/)
  await localInput('lot_width').focus()
  await page.getByRole('button', { name: 'About Lot width definition', exact: true }).click()
  assert.match(await page.getByRole('tooltip').innerText(), /perpendicular line/)
  await page.screenshot({ path: `${output}/saanich-facts-mobile.png` })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'Saanich facts must fit a phone')
  await page.setViewportSize({ width: 1280, height: 900 })
  await localInput('lot_width').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${output}/saanich-facts-desktop.png` })
  evidence.push({phase: 'Saanich measured comparisons and enquiry concern', result: (await current()).municipal_evaluation, report: await report.textContent()})

  await page.locator('a[href="#builder-next"]').first().click()
  await page.locator('#builder-relationship').fill('I am helping the owner')
  await page.locator('#builder-nextStep').fill('Please advise whether this is worth investigating further.')
  const enquiry = page.locator('#builder-unsent-preview')
  await until(async () => (await enquiry.textContent())?.includes('Local planning comparisons'), 'Saanich enquiry did not compose')
  const message = await enquiry.innerText()
  assert.match(message, /Lot area:.*conflicts with the candidate threshold/)
  assert.match(message, /District of Saanich.*unreviewed/)
  assert.doesNotMatch(message, /No local rule comparison was run|Candidate Victoria|GRD-1|saanich-gs-min-lot-area/)
  evidence.push({phase: 'Saanich unsent provider enquiry', message})
  await page.locator('a[href="#builder-property-details"]').first().click()

  // An obsolete response must not restore city-specific facts or findings.
  holdMunicipal = true
  await localInput('lot_width').fill('13')
  await until(async () => municipalStarted && !!releaseMunicipal, 'No delayed municipal response')
  await coverage.getByText('Change municipality', { exact: true }).click()
  await coverage.getByLabel('City or municipality in British Columbia').fill('Burnaby')
  await coverage.getByRole('button', { name: 'Use municipality', exact: true }).click()
  holdMunicipal = false; releaseMunicipal()
  await page.waitForTimeout(450)
  assert.equal((await current()).municipal_evaluation, null)
  assert.deepEqual((await current()).municipal_input_draft.values, {})
  const requestUrl = new URL(await coverage.getByRole('link', { name: 'Request Burnaby coverage' }).getAttribute('href'))
  assert.equal(requestUrl.hostname, 'github.com')
  assert.ok(!requestUrl.toString().includes('Gorge'))
  await coverage.getByLabel('City or municipality in British Columbia').fill('Saanich')
  await coverage.getByRole('button', { name: 'Use municipality', exact: true }).click()
  await settled()
  assert.equal((await scalar('lot_width')).status, 'needs_information', 'Switching back must not resurrect old local inputs')
  // Replay an actual lake parcel through the same editor. Keeping one mark and
  // replacing another must give the drawing and enquiry the correct provenance.
  await page.getByRole('button', { name: 'Change address', exact: true }).filter({ visible: true }).first().click()
  await search('5015 Prospect Lake Rd')
  await page.getByRole('button', { name: /5015 Prospect Lake Rd, Saanich/ }).click()
  await until(async () => (await current()).zoning_site_assumptions?.waterfront?.origin === 'municipal_map', 'Lake marks did not arrive')
  const lakeSite = (await current()).zoning_site_assumptions
  assert.equal(lakeSite.waterfront.source.record_label, 'Prospect Lake')
  assert.equal(lakeSite.waterfront_edge_ids.length, 4)
  await page.locator('#placement-action-waterfront').click()
  const shore = page.getByRole('button', { name: 'Edge 2 adjoins water', exact: true })
  assert.equal(await shore.getAttribute('aria-pressed'), 'true')
  await shore.click()
  await until(async () => (await current()).zoning_site_assumptions?.waterfront_edge_ids.length === 3, 'Lake edit did not persist')
  await shore.click()
  await until(async () => (await current()).zoning_site_assumptions?.waterfront_edge_ids.length === 4, 'Lake addition did not persist')
  assert.equal(Object.keys((await current()).zoning_site_assumptions.waterfront_map).length, 3)
  await until(async () => (await report.textContent())?.includes('3 map-suggested waterfront edges: Prospect Lake'), 'Report lost waterfront provenance')
  await page.getByRole('button', { name: 'Prospect Lake · 4 adjoining edges' }).click()
  await until(async () => (await current()).zoning_site_assumptions?.waterfront.value === null, 'Removing the last mapped edge must not affirm inland status')
  assert.equal((await current()).municipality.rule_coverage, 'candidate')
  assert.deepEqual((await current()).municipal_input_draft.values, {}, 'Local facts cannot transfer to another property')
  evidence.push({phase: 'editable lake edge and grouped removal', suggested: lakeSite.waterfront, count: 4})
  assert.deepEqual(errors, [])
  await writeFile(`${output}/evidence.json`, JSON.stringify({ checks: evidence, requests, browserErrors: errors }, null, 2))
  console.log('PASS: Victoria/Saanich street prefill, Prospect Lake waterfront prefill, editable marks, connected city routing, smart placement, setback overlays, edit race, recovery, municipality invalidation and narrow layout')
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {})
  await writeFile(`${output}/failure.txt`, `${error.stack}\n\n${(await page.locator('body').innerText()).slice(0,22000)}`)
  throw error
} finally { releaseStreets(); releaseSuggestion?.(); releaseMunicipal?.(); await browser.close() }
