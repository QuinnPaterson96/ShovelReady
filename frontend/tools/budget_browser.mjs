// On-demand real-browser integration, no external providers or database.
// Requires local Vite and FastAPI. Environment names match walkthrough_browser.mjs.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { unzipSync } from 'fflate'
const frontend = process.env.WALKTHROUGH_URL ?? 'http://127.0.0.1:5187'
const api = process.env.WALKTHROUGH_API ?? 'http://127.0.0.1:8017'
const output = '../docs/budget-verification'
for (const url of [frontend, api]) assert.equal(new URL(url).hostname, '127.0.0.1')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.WALKTHROUGH_BROWSER ?? 'msedge' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
const errors = [], requests = []
page.on('pageerror', error => errors.push(error.message))
await page.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url())
  if (url.origin !== new URL(frontend).origin) { errors.push(`unexpected external request: ${url.origin}`); return route.abort() }
  if (!url.pathname.startsWith('/api/') && url.pathname !== '/health') return route.continue()
  requests.push(`${request.method()} ${url.pathname}`)
  if (!['/health', '/api/scouting-geometry/assess', '/api/conditional-screening/v1/evaluate', '/api/conditional-screening/v1/placement-scenarios'].includes(url.pathname)) return route.fulfill({ status: 503, body: 'Offline municipal boundary' })
  // Node fetch is independent of browser navigation cancellation.
  const response = await fetch(api + url.pathname, { method: request.method(), body: request.postData() || undefined,
    headers: { 'Content-Type': 'application/json' } })
  const body = await response.text()
  await route.fulfill({ status: response.status, contentType: 'application/json', body }).catch(error => {
    if (!/closed|disposed|cancel|intercept/i.test(error.message)) throw error
  })
})
const button = name => page.getByRole('button', { name, exact: true })
const evidence = async () => JSON.parse(await page.locator('#builder-technical-record').inputValue())
const current = async () => { await page.waitForFunction(() => { const node = document.querySelector('#builder-technical-record'); if (!node) return false; const e = JSON.parse(node.value); return e.evaluation_state === 'current' && e.measurement }, { timeout: 20000 }) }
const openDetails = async (name, scope = page) => { const summary = scope.locator('summary').filter({ hasText: name }).first(); if (!(await summary.evaluate(node => node.parentElement.open))) await summary.click() }
const save = async (name, path) => { const pending = page.waitForEvent('download'); await button(name).click(); await (await pending).saveAs(`${output}/${path}`) }
try {
  await page.goto(frontend)
  await button('Watch the demo').click()
  await button('Skip to result').click(); await current()
  await button('Next').click(); await current()
  await button('Let me try').click()
  await page.locator('#builder-budget').fill('Around CAD 250,000; scope to discuss')
  const budget = page.locator('#project-budget')
  await budget.locator(':scope > summary').focus(); await page.keyboard.press('Enter')
  assert.equal(await budget.evaluate(node => node.open), true)
  await page.locator('#budget-scope').selectOption('whole_project')
  await openDetails('Use a captured model price', budget)
  await button('Use this price suggestion').click()
  assert.match(await budget.locator('.budget-summary').textContent(), /187,000/)
  assert.equal((await evidence()).project_budget.calculation.complete, false)
  await openDetails('Cost coverage and optional entries', budget)
  await button('Edit delivery and lift').click()
  await page.locator('#budget-minimum').fill('2500.25'); await page.locator('#budget-currency').fill('CAD')
  await page.locator('#budget-rationale').fill('Synthetic homeowner allowance; no delivery quote')
  await button('Save cost entry').click()
  assert.match(await budget.locator('.budget-summary').textContent(), /189,500.25/)
  // A malformed edit must leave the valid draft and catalogue evidence intact.
  const valid = JSON.stringify((await evidence()).project_budget.draft)
  await openDetails('Cost coverage and optional entries', budget)
  await button('Edit delivery and lift').click(); await page.locator('#budget-minimum').fill('-1'); await button('Save cost entry').click()
  assert.equal(JSON.stringify((await evidence()).project_budget.draft), valid)
  assert.match(await budget.getByRole('alert').textContent(), /Invalid input/)
  await button('Cancel entry').click()
  await openDetails('Full cost evidence and local draft file', budget)
  await save('Download budget draft JSON', 'budget-draft.json')
  await openDetails('Paste JSON instead', budget)
  await page.locator('#budget-import-json').fill('{"schema_version":"wrong"}'); await button('Validate and replace budget draft').click()
  assert.equal(JSON.stringify((await evidence()).project_budget.draft), valid)
  assert.match(await budget.getByRole('alert').textContent(), /existing draft unchanged/)
  await page.locator('#budget-import-json').fill(valid); await button('Validate and replace budget draft').click()
  // Close secondary panels for the normal view and exercise keyboard disclosure.
  while (await budget.locator('details[open]').count()) await budget.locator('details[open] > summary').last().click()
  await budget.scrollIntoViewIfNeeded()
  if (!process.env.BUDGET_SKIP_SCREENSHOTS) await budget.screenshot({ path: `${output}/desktop-budget.png` })
  await page.setViewportSize({ width: 390, height: 844 }); await budget.scrollIntoViewIfNeeded()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
  if (!process.env.BUDGET_SKIP_SCREENSHOTS) await budget.screenshot({ path: `${output}/mobile-budget.png` })
  await budget.locator('summary').filter({ hasText: 'Useful next questions' }).focus(); await page.keyboard.press('Enter')
  assert.ok(await budget.locator('details[open]').count())
  const text = await page.locator('#builder-enquiry-text').inputValue()
  assert.match(text, /Demo-supplied answers/); assert.match(text, /Priced-components subtotal.*189,500.25/)
  assert.match(text, /upper amount unknown/); assert.match(text, /Around CAD 250,000; scope to discuss/)
  await writeFile(`${output}/example-enquiry.txt`, text)
  await writeFile(`${output}/example-evidence.json`, JSON.stringify(await evidence(), null, 2))
  await save('Save enquiry PDF', 'example-enquiry.pdf')
  await openDetails('Other download formats')
  await save('Enquiry and evidence package (ZIP)', 'example-package.zip')
  const packageFiles = unzipSync(new Uint8Array(await readFile(`${output}/example-package.zip`)))
  const packageText = Object.entries(packageFiles).filter(([name]) => /json|md$/.test(name)).map(([, bytes]) => new TextDecoder().decode(bytes)).join('\n')
  assert.match(packageText, /189500.25/); assert.match(packageText, /original_record/)
  // No financial gate: existing context answers permit contact with incomplete costs.
  await button('Confirm enquiry & continue →').focus(); await page.keyboard.press('Enter')
  assert.equal(await page.locator('#builder-provider-website').isVisible(), true)
  // Configuration invalidates amounts and preserves the owner preference.
  await page.locator('#builder-model-choice').selectOption('hewing-quadra4'); await current()
  assert.equal((await evidence()).project_budget.calculation.subtotals.length, 0)
  assert.equal(await page.locator('#builder-budget').inputValue(), 'Around CAD 250,000; scope to discuss')
  await button('Wrong property? Change').click()
  await button('Can’t find your address? Enter details manually').click()
  await page.locator('#manual-address').fill('Different synthetic property; no real quote')
  assert.equal((await evidence()).project_budget.calculation.subtotals.length, 0)
  assert.equal(await page.locator('#builder-budget').inputValue(), 'Around CAD 250,000; scope to discuss')
  assert.deepEqual(errors, [])
  await writeFile(`${output}/browser-results.json`, JSON.stringify({ checks: ['guided demo', 'keyboard disclosure', 'catalogue suggestion', 'decimal allowance', 'negative edit preserves draft', 'malformed import preserves draft', 'draft JSON download', 'desktop/mobile no overflow', 'unsent enquiry PDF/ZIP', 'incomplete financial contact', 'model/property invalidation retains owner preference'], errors, requests: [...new Set(requests)] }, null, 2))
  console.log('Budget desktop/mobile/keyboard and downloads passed.')
} catch (error) { await page.screenshot({ path: `${output}/failure.png` }); throw error } finally { await browser.close() }
