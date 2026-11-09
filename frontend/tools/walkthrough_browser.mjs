// Run against the local frontend/API only. Municipal network boundaries fail
// explicitly; geometry and planning calculations use the real local API.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const frontend = process.env.WALKTHROUGH_URL ?? 'http://127.0.0.1:5173'
const api = process.env.WALKTHROUGH_API ?? 'http://127.0.0.1:8019'
for (const url of [frontend, api]) assert.equal(new URL(url).hostname, '127.0.0.1', 'isolated local preview required')
const output = process.env.WALKTHROUGH_OUTPUT ?? '../docs/walkthrough-verification'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, ...(process.env.WALKTHROUGH_BROWSER ? { channel: process.env.WALKTHROUGH_BROWSER } : {}) })
const errors = [], requests = [], results = []
let hold = false, fail = false, partial = false, release, heldStarted, verifyingExport = false
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
const page = await context.newPage()
page.on('pageerror', error => errors.push(error.message))
page.on('download', () => { if (!verifyingExport) errors.push('unexpected playback download') })
const popups = []
context.on('page', popup => {
  if (popup !== page) {
    const record = { url: popup.url(), duringExport: verifyingExport, requests: [] }
    popups.push(record)
    popup.on('framenavigated', frame => { if (frame === popup.mainFrame()) record.url = frame.url() })
    popup.on('request', request => record.requests.push(request.url()))
    if (!verifyingExport) errors.push('unexpected playback popup')
  }
})
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url())
  if (url.origin !== new URL(frontend).origin) { errors.push(`unexpected external request: ${url.origin}`); return route.abort() }
  if (!url.pathname.startsWith('/api/') && url.pathname !== '/health') return route.continue()
  requests.push({ method: request.method(), path: url.pathname })
  if (url.pathname === '/api/scouting-geometry/assess') {
    if (hold) { heldStarted?.(); await new Promise(resolve => { release = resolve }) }
    if (fail) return route.fulfill({ status: 503, body: 'offline' })
  }
  if (/^\/api\/victoria-zoning\/(lookup|property-scan)$/.test(url.pathname)) return route.fulfill({ status: 503, body: 'offline municipal boundary' })
  // Unknown external discovery routes are not needed for this saved example.
  if (!['/health', '/api/scouting-geometry/assess', '/api/municipal-rules/v1/evaluate', '/api/municipal-rules/v1/placement-scenarios', '/api/placement-suggestions/v1/suggest'].includes(url.pathname)) return route.fulfill({ status: 503, body: 'offline boundary' })
  // Independent transport lets obsolete responses finish even after browser cancellation.
  const response = await fetch(api + url.pathname, { method: request.method(), body: request.postData() || undefined, headers: { 'Content-Type': 'application/json' } })
  let body = await response.text()
  if (partial && url.pathname === '/api/scouting-geometry/assess' && response.ok) { const value = JSON.parse(body); value.checks = value.checks.filter(check => check.kind !== 'building_overlap'); body = JSON.stringify(value) }
  await route.fulfill({ status: response.status, contentType: 'application/json', body }).catch(error => { if (!/closed|disposed|cancel|intercept/i.test(error.message)) throw error })
})
const button = text => page.getByRole('button', { name: text, exact: true })
const click = async text => button(text).click()
const player = page.getByRole('region', { name: 'Walkthrough controls' })
const rail = page.getByRole('navigation', { name: 'Prefab model steps' })
const caption = () => player.locator('p').first()
const progress = () => player.locator('.builder-playback-progress').innerText()
const actionGeometry = () => button('Next').boundingBox()
const assertSameAction = (previous, current) => {
  assert.ok(previous && current, 'Next remains visible')
  for (const edge of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(previous[edge] - current[edge]) <= 1, `Next ${edge} changed: ${previous[edge]} to ${current[edge]}`)
}
const assertHeadingBelowPlayer = async selector => {
  await page.waitForFunction(selector => {
    const element = document.querySelector(selector)
    const controls = document.querySelector('[data-playback-controls]')
    if (!element || !controls) return false
    const heading = element.getBoundingClientRect(), player = controls.getBoundingClientRect()
    return heading.top >= player.bottom && heading.bottom <= innerHeight
  }, selector, { timeout: 5000 })
}
const evidence = async () => JSON.parse(await page.locator('#builder-technical-record').inputValue())
const wait = async predicate => {
  for (let i = 0; i < 150; i++) { if (await predicate()) return; await page.waitForTimeout(100) }
  throw new Error('Current walkthrough result did not become ready')
}
const assertEnquiryTakeover = async () => {
  await page.waitForFunction(() => document.activeElement?.id === 'builder-use')
  // Wait past smooth-scroll and rail relayout, which used to strand the focused field.
  await page.waitForTimeout(750)
  const field = await page.locator('#builder-use').evaluate(input => {
    const bounds = input.getBoundingClientRect()
    return { focused: document.activeElement === input, top: bounds.top, bottom: bounds.bottom, height: innerHeight }
  })
  assert.ok(field.focused && field.top >= 0 && field.bottom <= field.height, `Takeover leaves the focused edit visible: ${JSON.stringify(field)}`)
  results.push({ enquiryTakeover: field })
}
const settled = async () => { await page.waitForTimeout(150); await wait(async () => { const e = await evidence(); return e.evaluation_state === 'current' && e.measurement }); await page.waitForTimeout(150); await wait(async () => { const e = await evidence(); return e.evaluation_state === 'current' && e.measurement }) }
const next = async () => { await wait(() => button('Next').isEnabled()); await click('Next') }
try {
  await page.goto(frontend)
  // Keep the initial measurement pending until Property is positioned. The
  // real response must not remove a banner above it and hide its heading.
  hold = true
  const entryMeasurement = new Promise(resolve => { heldStarted = resolve })
  await click('Watch the demo')
  await Promise.race([entryMeasurement, page.waitForTimeout(15000).then(() => { throw new Error('Initial held measurement did not start') })])
  assert.match(await caption().textContent(), /Model 300/)
  await page.waitForTimeout(800)
  assert.match(await caption().textContent(), /Model 300/)
  assert.equal(await button('Pause').count(), 0)
  assert.equal(await rail.count(), 0)
  await assertHeadingBelowPlayer('#builder-title')
  await next()
  assert.match(await caption().textContent(), /419 Cecelia/)
  await assertHeadingBelowPlayer('#builder-property-title')
  const propertyAction = await actionGeometry()
  // Wait for the scheduled destination scroll before measuring stationarity.
  await page.waitForFunction(() => {
    const heading = document.getElementById('builder-property-title')?.getBoundingClientRect()
    const player = document.querySelector('[data-playback-controls]')?.getBoundingClientRect()
    return heading && player && heading.top >= player.bottom && heading.top - player.bottom <= 32
  })
  const pendingPropertyHeading = await page.locator('#builder-property-title').boundingBox()
  hold = false
  release()
  await settled()
  await assertHeadingBelowPlayer('#builder-property-title')
  assertSameAction(propertyAction, await actionGeometry())
  const readyPropertyHeading = await page.locator('#builder-property-title').boundingBox()
  assert.ok(Math.abs(pendingPropertyHeading.y - readyPropertyHeading.y) <= 1, 'the Property heading stays in place when initial checks finish')
  results.push({ kind: 'property-heading-after-initial-checks', before: pendingPropertyHeading, after: readyPropertyHeading })
  hold = true
  const initialMeasurement = new Promise(resolve => { heldStarted = resolve })
  await button('Next').focus(); await page.keyboard.press('Enter')
  await Promise.race([initialMeasurement, page.waitForTimeout(15000).then(() => { throw new Error('Initial measurement did not start') })])
  assert.match(await progress(), /Step 3 of 6 · Placement/)
  assert.match(await player.getByRole('status').innerText(), /Waiting for current checks/)
  assert.equal(await button('Next').isDisabled(), true)
  assert.equal(await button('Next').evaluate(element => element === document.activeElement), true, 'pending checks preserve keyboard focus')
  await assertHeadingBelowPlayer('#placement-map h3')
  const waitingAction = await actionGeometry()
  assertSameAction(propertyAction, waitingAction)
  await page.keyboard.press('Tab')
  assert.equal(await button('Skip to result').evaluate(element => element === document.activeElement), true, 'Tab stays within the player')
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Space')
  await page.mouse.click(waitingAction.x + waitingAction.width / 2, waitingAction.y + waitingAction.height / 2)
  assert.match(await caption().textContent(), /starting position/, 'early keyboard and pointer attempts cannot advance')
  await page.screenshot({ path: `${output}/desktop-waiting.png` })
  hold = false; release(); await settled()
  assert.equal(await button('Next').isEnabled(), true)
  assert.equal(await button('Next').evaluate(element => element === document.activeElement), true, 'Next retains focus when the checks finish')
  assert.match(await player.getByRole('status').innerText(), /Current checks ready/)
  assertSameAction(waitingAction, await actionGeometry())
  await assertHeadingBelowPlayer('#placement-map h3')
  results.push({ pendingNext: { propertyAction, waitingAction, readyAction: await actionGeometry() } })
  let e = await evidence()
  assert.equal(e.measurement.result.input.projected_metre_crs, 'EPSG:3157')
  const checks = e.measurement.result.checks
  assert.equal(checks.find(c => c.kind === 'containment').relation, 'contained')
  assert.ok(checks.some(c => c.kind === 'building_overlap' && c.relation === 'positive_area_overlap'))
  results.push({ phase: 'initial', placement: e.measurement.result.input.placement, checks })
  await page.screenshot({ path: `${output}/desktop-initial.png` })
  assert.equal(await page.locator('.floating-next--active:visible').count(), 0, 'playback owns the visible navigation')
  await page.keyboard.press('Enter'); await settled()
  assert.match(await progress(), /Step 3 of 6 · Placement/)
  assert.match(await caption().textContent(), /Move away/)
  e = await evidence()
  assert.deepEqual(e.measurement.result.input.placement.centre_xy, [471906.5401536183, 5365824.096762222])
  assert.equal(e.measurement.result.checks.find(c => c.kind === 'containment').relation, 'contained')
  assert.ok(e.measurement.result.checks.filter(c => c.kind === 'building_overlap').every(c => c.relation === 'separate'))
  await page.screenshot({ path: `${output}/desktop-moved.png` })
  results.push({ phase: 'moved', placement: e.measurement.result.input.placement, checks: e.measurement.result.checks })
  await click('Back'); await settled()
  assert.match(await caption().textContent(), /starting position/)
  assert.deepEqual((await evidence()).measurement.result.input.placement.centre_xy, [471913, 5365834], 'Back restores the initial comparison instead of showing the moved geometry under its caption')
  await next(); await settled()
  await next(); await settled()
  assert.match(await caption().textContent(), /Not sure/)
  e = await evidence()
  assert.equal(e.project_settings.evidence.proposed_use.origin, 'demo_supplied')
  assert.equal(e.demo_answer_provenance.streetContext.origin, 'demo_supplied')
  assert.equal(e.zoning_site_assumptions.building_type.value, null)
  assert.equal(e.zoning_site_assumptions.street_adjacency.all_marked, false)
  assert.equal(e.zoning_site_assumptions.existing_garden_suites.origin, 'journey_default')
  await next(); await settled()
  assert.match(await caption().textContent(), /planning subtotal/); assert.match(await page.locator('.project-economics').innerText(), /187,000/)
  assert.equal((await evidence()).project_budget.calculation.complete, false)
  await next(); await settled()
  assert.match(await page.locator('#builder-enquiry-text').inputValue(), /Demo-supplied answers/)
  assert.equal(await page.locator('#builder-next').isVisible(), true)
  assert.equal((await evidence()).review_readiness?.ready, false, 'playback cannot acknowledge findings')
  await page.screenshot({ path: `${output}/desktop-enquiry.png` })
  await click('Let me try')
  assert.equal(await player.count(), 0)
  await rail.waitFor({ state: 'visible' })
  assert.equal(await rail.locator('[aria-current="step"]').getAttribute('href'), '#builder-next')
  await assertEnquiryTakeover()
  await page.locator('#builder-relationship').fill('I am helping the owner')
  await wait(async () => (await evidence()).enquiry_inputs.relationship === 'I am helping the owner')
  e = await evidence()
  assert.equal(e.demo_answer_provenance.relationship, undefined)
  assert.equal(e.demo_answer_provenance.intendedUse.origin, 'demo_supplied')
  await page.locator('#builder-model-choice').selectOption('hewing-quadra4')
  await settled()
  assert.equal((await evidence()).project_settings.evidence.proposed_use.origin, 'demo_supplied', 'changing the model does not turn an unchanged example answer into user input')
  // Replay requires explicit replacement; keep-current preserves the edited text.
  await click('Replay walkthrough'); await click('Keep current assessment')
  assert.equal(await page.locator('#builder-relationship').inputValue(), 'I am helping the owner')
  await click('Replay walkthrough'); await click('Load example assessment')
  await click('Skip to result'); await wait(async () => /Not sure/.test(await caption().textContent())); await next(); await next()
  await settled(); assert.match(await page.locator('#builder-enquiry-text').inputValue(), /Demo-supplied/)
  // A response completes the explicit skip only as far as results; ordinary Next stays gated.
  await click('Let me try'); await click('Replay walkthrough'); await click('Load example assessment')
  hold = true
  const started = new Promise(resolve => { heldStarted = resolve })
  await click('Skip to result'); await Promise.race([started, page.waitForTimeout(15000).then(() => { throw new Error('Held measurement did not start') })])
  assert.equal(await button('Next').isEnabled(), false)
  hold = false; release(); await settled(); await page.waitForTimeout(200)
  assert.match(await caption().textContent(), /Not sure/)
  await next(); assert.match(await caption().textContent(), /planning subtotal/); assert.match(await page.locator('.project-economics').innerText(), /187,000/)
  await next(); assert.match(await caption().textContent(), /unsent enquiry/)
  console.log('Explicit skip and pending checks complete')
  // A failed request cannot enable Next. Retry/takeover stays usable.
  await click('Let me try'); await click('Replay walkthrough'); await click('Load example assessment')
  fail = true; await click('Skip to result'); await wait(async () => await page.getByRole('button', { name: 'Retry placement check', exact: true, includeHidden: true }).count() > 0)
  assert.match(await caption().textContent(), /Move away/)
  assert.match(await player.getByRole('status').innerText(), /Placement check unavailable/)
  assert.equal(await button('Next').isEnabled(), false); fail = false; await page.getByText('More placement controls', { exact: true }).click(); await click('Retry placement check'); await settled()
  assert.equal(await page.locator('[data-playback-controls]').count(), 0, 'retry is a takeover')
  console.log('Failure recovery complete')
  // An incomplete response cannot turn absence of overlap rows into a success caption.
  await click('Replay walkthrough'); await click('Load example assessment')
  partial = true; await next(); await next(); await settled(); await next(); await settled(); await next(); await settled()
  assert.match(await caption().textContent(), /Inspect the current placement findings/)
  partial = false; await click('Let me try')
  // Obsolete response after model switch cannot replace the new model or its dimensions.
  await click('Replay walkthrough'); await click('Load example assessment')
  hold = true
  const pending = new Promise(resolve => { heldStarted = resolve })
  await click('Skip to result'); await Promise.race([pending, page.waitForTimeout(15000).then(() => { throw new Error('Model-switch held measurement did not start') })])
  await page.locator('#builder-model-choice').selectOption('hewing-quadra4')
  hold = false; release(); await page.waitForTimeout(1000)
  assert.equal(await page.locator('[data-playback-controls]').count(), 0)
  assert.equal(await page.locator('#builder-model-choice').inputValue(), 'hewing-quadra4')
  await click('Wrong property? Change')
  assert.equal(await page.locator('#placement-map').count(), 0)
  await click('Can’t find your address? Enter details manually')
  assert.equal(await page.locator('.manual-site').isVisible(), true)
  // Narrow keyboard journey with reduced motion: explicit Next, same real calculations.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(frontend + '/#home'); await page.reload()
  await click('Watch the demo')
  await assertHeadingBelowPlayer('#builder-title')
  await next(); await assertHeadingBelowPlayer('#builder-property-title')
  await next(); await settled(); await assertHeadingBelowPlayer('#placement-map h3')
  assert.equal(await rail.count(), 0)
  await page.screenshot({ path: `${output}/mobile-initial.png` })
  const box = await page.locator('[data-playback-controls]').boundingBox()
  assert.ok(box.height < 230 && box.width <= 390)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
  await button('Skip to result').focus(); await page.keyboard.press('Enter')
  await wait(async () => /Not sure/.test(await caption().textContent())); await settled()
  await assertHeadingBelowPlayer('#builder-quick-checks h3')
  await button('Next').focus(); await page.keyboard.press('Enter'); await settled()
  await assertHeadingBelowPlayer('#builder-budget-title')
  await button('Next').focus(); await page.keyboard.press('Enter'); await settled()
  await assertHeadingBelowPlayer('#builder-unsent-preview h3')
  assert.equal(await button('Let me try').evaluate(element => element === document.activeElement), true, 'the final Next becomes the takeover action without losing focus')
  assert.equal(await page.getByText('Highlighted fields still need an answer.').count(), 0)
  await page.screenshot({ path: `${output}/mobile-enquiry.png` })
  await page.keyboard.press('Enter')
  await assertEnquiryTakeover()
  assert.equal(await rail.locator('[aria-current="step"]').getAttribute('href'), '#builder-next')
  results.push({ narrowHeadings: true, takeoverProgress: true })
  // With normal motion, waiting longer than the old dwell cannot advance a step.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(frontend + '/#home'); await page.reload(); await click('Watch the demo')
  await page.waitForTimeout(7500)
  assert.match(await caption().textContent(), /Model 300/)
  for (let i = 0; i < 6; i++) await next()
  await settled()
  assert.match(await caption().textContent(), /Walkthrough complete/)
  assert.match(await page.locator('#builder-enquiry-text').inputValue(), /Demo-supplied/)
  results.push({ explicitNavigation: true, normalMotionHoldMs: 7500 })
  await click('Let me try')
  await assertEnquiryTakeover()
  verifyingExport = true
  const download = page.waitForEvent('download')
  await click('Save enquiry PDF')
  await (await download).saveAs(`${output}/example-enquiry.pdf`)
  await writeFile(`${output}/example-enquiry.txt`, await page.locator('#builder-enquiry-text').inputValue())
  await writeFile(`${output}/example-evidence.json`, JSON.stringify(await evidence(), null, 2))
  await page.locator('a[href="#builder-property-details"]').first().click()
  const municipality = page.locator('#municipality-settings')
  await municipality.getByText('Change municipality', { exact: true }).click()
  await municipality.getByLabel('City or municipality in British Columbia').fill('Saanich')
  await municipality.getByRole('button', { name: 'Use municipality', exact: true }).click()
  await wait(async () => (await evidence()).municipality.rule_coverage === 'unresolved')
  assert.equal((await evidence()).municipal_evaluation, null, 'Saved Victoria geometry cannot acquire Saanich rules through a city edit')
  await municipality.getByLabel('City or municipality in British Columbia').fill('Victoria')
  await municipality.getByRole('button', { name: 'Use municipality', exact: true }).click()
  await settled()
  results.push({ savedExampleCityMismatch: true })
  await click('Wrong property? Change')
  await click('Can’t find your address? Enter details manually')
  await page.locator('#manual-address').fill('My own property description')
  assert.equal(await page.locator('#builder-intended-use').inputValue(), '', 'a property correction clears the example intention instead of claiming it as user input')
  assert.deepEqual(errors, [])
  // Edge can open its own download hub for an explicitly requested PDF download.
  // Allow that exact internal UI only during export, with no document/network requests.
  assert.ok(popups.every(popup => popup.duringExport && ['', 'about:blank', 'edge://downloads-hub/'].includes(popup.url) && popup.requests.length === 0), JSON.stringify(popups))
  const readOnlyPosts = ['/api/municipal-sites/waterfront-edges', '/api/municipal-sites/street-edges', '/api/scouting-geometry/assess', '/api/municipal-rules/v1/evaluate', '/api/municipal-rules/v1/placement-scenarios', '/api/victoria-zoning/lookup', '/api/victoria-zoning/property-scan', '/api/placement-suggestions/v1/suggest']
  const unexpectedRequests = requests.filter(r => r.method !== 'GET' && !(r.method === 'POST' && readOnlyPosts.includes(r.path)))
  assert.deepEqual(unexpectedRequests, [], 'only allowed read-only requests occur')
  await page.goto(frontend + '/#home'); await page.reload(); await click('Watch the demo')
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: 'Start assessment', exact: true }).first().click()
  assert.equal(await page.locator('[data-playback-controls]').count(), 0, 'navigation cancels playback instead of resuming obsolete transitions')
  assert.equal(await page.locator('#builder-intended-use').inputValue(), '')
  await writeFile(`${output}/browser-results.json`, JSON.stringify({ results, errors, downloadSurfaces: popups, requests: [...new Set(requests.map(r => `${r.method} ${r.path}`))] }, null, 2))
  console.log('Walkthrough browser journeys passed:', JSON.stringify(results.map(r => r.phase ?? r)))
} catch (error) { await page.screenshot({ path: `${output}/failure.png` }); console.error('Failure state', await caption().textContent({ timeout: 1000 }).catch(() => 'no playback')); throw error } finally { release?.(); await browser.close() }
