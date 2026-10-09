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
let hold = false, fail = false, release, heldStarted, verifyingExport = false
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
const page = await context.newPage()
page.on('pageerror', error => errors.push(error.message))
page.on('download', () => { if (!verifyingExport) errors.push('unexpected playback download') })
context.on('page', popup => { if (popup !== page) errors.push('unexpected provider navigation') })
await page.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url())
  if (url.origin !== new URL(frontend).origin) { errors.push(`unexpected external request: ${url.origin}`); return route.abort() }
  if (!url.pathname.startsWith('/api/') && url.pathname !== '/health') return route.continue()
  requests.push({ method: request.method(), path: url.pathname })
  if (url.pathname === '/api/scouting-geometry/assess') {
    if (hold) { heldStarted?.(); await new Promise(resolve => { release = resolve }) }
    if (fail) return route.fulfill({ status: 503, body: 'offline' })
  }
  if (/zoning-lookup|property-scan/.test(url.pathname)) return route.fulfill({ status: 503, body: 'offline municipal boundary' })
  // Unknown external discovery routes are not needed for this saved example.
  if (!['/health', '/api/scouting-geometry/assess', '/api/conditional-screening/v1/evaluate', '/api/conditional-screening/v1/placement-scenarios'].includes(url.pathname)) return route.fulfill({ status: 503, body: 'offline boundary' })
  const response = await context.request.fetch(api + url.pathname, { method: request.method(), data: request.postData(), headers: { 'Content-Type': 'application/json' } })
  await route.fulfill({ response })
})
const button = text => page.getByRole('button', { name: text, exact: true })
const click = async text => button(text).click()
const caption = () => page.locator('[data-playback-controls] p')
const evidence = async () => JSON.parse(await page.locator('#builder-technical-record').inputValue())
const wait = async predicate => {
  for (let i = 0; i < 150; i++) { if (await predicate()) return; await page.waitForTimeout(100) }
  throw new Error('Current walkthrough result did not become ready')
}
const settled = async () => { await page.waitForTimeout(150); await wait(async () => { const e = await evidence(); return e.evaluation_state === 'current' && e.measurement }); await page.waitForTimeout(150); await wait(async () => { const e = await evidence(); return e.evaluation_state === 'current' && e.measurement }) }
const next = async () => { await wait(() => button('Next').isEnabled()); await click('Next') }
try {
  await page.goto(frontend)
  await click('Watch a walkthrough')
  assert.match(await caption().textContent(), /Model 300/)
  await click('Pause'); await page.waitForTimeout(800)
  assert.match(await caption().textContent(), /Model 300/)
  await click('Resume'); await next()
  assert.match(await caption().textContent(), /Parcel 87/)
  await next(); await settled()
  let e = await evidence()
  assert.equal(e.measurement.result.input.projected_metre_crs, 'EPSG:3157')
  const checks = e.measurement.result.checks
  assert.equal(checks.find(c => c.kind === 'containment').relation, 'outside')
  assert.ok(checks.some(c => c.kind === 'building_overlap' && c.relation === 'positive_area_overlap'))
  results.push({ phase: 'initial', placement: e.measurement.result.input.placement, checks })
  await page.screenshot({ path: `${output}/desktop-initial.png` })
  assert.equal(await page.locator('.builder-placement-next--floating, .floating-next--docked').count(), 0)
  await next(); await settled()
  e = await evidence()
  assert.deepEqual(e.measurement.result.input.placement.centre_xy, [473693.7, 5362202.36])
  assert.equal(e.measurement.result.checks.find(c => c.kind === 'containment').relation, 'contained')
  assert.ok(e.measurement.result.checks.filter(c => c.kind === 'building_overlap').every(c => c.relation === 'separate'))
  await page.screenshot({ path: `${output}/desktop-moved.png` })
  results.push({ phase: 'moved', placement: e.measurement.result.input.placement, checks: e.measurement.result.checks })
  await next(); await settled()
  assert.match(await caption().textContent(), /Not sure/)
  e = await evidence()
  assert.equal(e.project_settings.evidence.proposed_use.origin, 'demo_supplied')
  assert.equal(e.demo_answer_provenance.streetContext.origin, 'demo_supplied')
  assert.equal(e.zoning_site_assumptions.building_type.value, null)
  assert.equal(e.zoning_site_assumptions.street_adjacency.all_marked, false)
  assert.equal(e.zoning_site_assumptions.existing_garden_suites.origin, 'journey_default')
  await next(); await settled()
  assert.match(await page.locator('#builder-enquiry-text').inputValue(), /Demo-supplied answers/)
  assert.equal(await page.locator('#builder-next').isVisible(), true)
  assert.equal((await evidence()).review_readiness?.ready, false, 'playback cannot acknowledge findings')
  await page.screenshot({ path: `${output}/desktop-enquiry.png` })
  await click('Let me try')
  assert.equal(await page.locator('[data-playback-controls]').count(), 0)
  await page.locator('#builder-relationship').fill('I am helping the owner')
  e = await evidence()
  assert.equal(e.demo_answer_provenance.relationship, undefined)
  assert.equal(e.demo_answer_provenance.intendedUse.origin, 'demo_supplied')
  // Replay requires explicit replacement; keep-current preserves the edited text.
  await click('Replay walkthrough'); await click('Keep current assessment')
  assert.equal(await page.locator('#builder-relationship').inputValue(), 'I am helping the owner')
  await click('Replay walkthrough'); await click('Load example assessment')
  await click('Skip to result'); await wait(async () => /unsent enquiry/.test(await caption().textContent()))
  await settled(); assert.match(await page.locator('#builder-enquiry-text').inputValue(), /Demo-supplied/)
  // Pause when a moved measurement is in flight; its eventual completion cannot advance.
  await click('Let me try'); await click('Replay walkthrough'); await click('Load example assessment')
  hold = true
  const started = new Promise(resolve => { heldStarted = resolve })
  await click('Skip to result'); await Promise.race([started, page.waitForTimeout(15000).then(() => { throw new Error('Held measurement did not start') })]); await click('Pause')
  hold = false; release(); await settled(); await page.waitForTimeout(200)
  assert.match(await caption().textContent(), /Move away/)
  assert.equal(await button('Resume').isVisible(), true)
  await click('Resume'); await wait(async () => /unsent enquiry/.test(await caption().textContent()))
  console.log('Pause/resume complete')
  // A failed request never becomes a successful timed result. Retry/takeover stays usable.
  await click('Let me try'); await click('Replay walkthrough'); await click('Load example assessment')
  fail = true; await click('Skip to result'); await wait(async () => await page.getByRole('button', { name: 'Retry placement check', exact: true, includeHidden: true }).count() > 0)
  assert.match(await caption().textContent(), /Move away/)
  assert.equal(await button('Resume').isVisible(), true); fail = false; await page.getByText('More placement controls', { exact: true }).click(); await click('Retry placement check'); await settled()
  assert.equal(await page.locator('[data-playback-controls]').count(), 0, 'retry is a takeover')
  console.log('Failure recovery complete')
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
  await page.goto(frontend + '/#home'); await page.reload()
  await click('Watch a walkthrough'); await next(); await next(); await settled()
  await page.screenshot({ path: `${output}/mobile-initial.png` })
  const box = await page.locator('[data-playback-controls]').boundingBox()
  assert.ok(box.height < 230 && box.width <= 390)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
  await button('Skip to result').focus(); await page.keyboard.press('Enter')
  await wait(async () => /unsent enquiry/.test(await caption().textContent())); await settled()
  await page.screenshot({ path: `${output}/mobile-enquiry.png` })
  await button('Let me try').focus(); await page.keyboard.press('Enter')
  assert.equal(await page.locator('#builder-use').evaluate(node => node === document.activeElement), true)
  // Full normal-motion run uses the approximately 55-second narration schedule.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(frontend + '/#home'); await page.reload(); await click('Watch a walkthrough')
  const began = Date.now()
  await page.getByText(/Walkthrough complete/).waitFor({ timeout: 90000 })
  assert.match(await page.locator('#builder-enquiry-text').inputValue(), /Demo-supplied/)
  results.push({ normalElapsedSeconds: (Date.now() - began) / 1000 })
  await click('Let me try')
  verifyingExport = true
  const download = page.waitForEvent('download')
  await click('Save enquiry PDF')
  await (await download).saveAs(`${output}/example-enquiry.pdf`)
  await writeFile(`${output}/example-enquiry.txt`, await page.locator('#builder-enquiry-text').inputValue())
  await writeFile(`${output}/example-evidence.json`, JSON.stringify(await evidence(), null, 2))
  assert.deepEqual(errors, [])
  const readOnlyPosts = ['/api/scouting-geometry/assess', '/api/conditional-screening/v1/evaluate', '/api/conditional-screening/v1/placement-scenarios', '/api/victoria-zoning/lookup', '/api/victoria-zoning/property-scan']
  assert.ok(requests.every(r => r.method === 'GET' || r.method === 'POST' && readOnlyPosts.includes(r.path)))
  await page.goto(frontend + '/#home'); await page.reload(); await click('Watch a walkthrough')
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: 'Start assessment', exact: true }).first().click()
  assert.equal(await page.locator('[data-playback-controls]').count(), 0, 'navigation cancels playback instead of resuming obsolete transitions')
  assert.equal(await page.locator('#builder-intended-use').inputValue(), '')
  await writeFile(`${output}/browser-results.json`, JSON.stringify({ results, errors, requests: [...new Set(requests.map(r => `${r.method} ${r.path}`))] }, null, 2))
  console.log('Walkthrough browser journeys passed:', JSON.stringify(results.map(r => r.phase ?? r)))
} catch (error) { await page.screenshot({ path: `${output}/failure.png` }); console.error('Failure state', await caption().textContent({ timeout: 1000 }).catch(() => 'no playback')); throw error } finally { release?.(); await browser.close() }
