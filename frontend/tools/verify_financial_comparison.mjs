// Local, stateless browser QA. No live municipal sources or provider transmission.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const frontend = process.env.COMPARISON_URL ?? 'http://127.0.0.1:5204'
const api = process.env.COMPARISON_API ?? 'http://127.0.0.1:8024'
for (const url of [frontend, api]) assert.equal(new URL(url).hostname, '127.0.0.1', 'local preview only')
const output = process.env.COMPARISON_OUTPUT ?? '../docs/usability/financial-comparison-2026-11-04'
const buildCommit = process.env.COMPARISON_BUILD_COMMIT ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
const page = await context.newPage()
const errors = [], observations = [], externalRequests = []
let completed = false
page.on('pageerror', error => errors.push(error.message))
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url())
  if (url.origin !== new URL(frontend).origin) { externalRequests.push(url.origin); return route.abort() }
  if (!url.pathname.startsWith('/api/') && url.pathname !== '/health') return route.continue()
  if (!['/api/scouting-geometry/assess', '/api/conditional-screening/v1/evaluate', '/api/conditional-screening/v1/placement-scenarios'].includes(url.pathname))
    return route.fulfill({ status: 503, body: 'Offline source boundary for repeatable QA' })
  const response = await fetch(api + url.pathname, { method: request.method(), body: request.postData() || undefined, headers: { 'Content-Type': 'application/json' } })
  await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() }).catch(error => { if (!/closed|disposed|cancel|intercept/i.test(error.message)) throw error })
})
const button = name => page.getByRole('button', { name, exact: true })
const evidence = async () => JSON.parse(await page.locator('#builder-technical-record').inputValue())
const settle = async () => {
  await page.waitForFunction(() => { const field = document.getElementById('builder-technical-record'); if (!field) return false; const e = JSON.parse(field.value); return e.evaluation_state === 'current' && e.measurement })
  await page.waitForTimeout(450)
}
const inspect = async label => {
  console.log(`Checking ${label}`)
  const metrics = await page.evaluate(() => ({ innerWidth, innerHeight, devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, touchPoints: navigator.maxTouchPoints,
    overflowing: [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(), style = getComputedStyle(el); return style.display !== 'none' && r.width && (r.right > innerWidth + 1 || r.left < -1) }).slice(0, 15).map(el => ({ tag: el.tagName, class: String(el.className), id: el.id })) }))
  observations.push({ phase: label, ...metrics })
  assert.equal(metrics.innerWidth, 390)
  assert.equal(metrics.innerHeight, 844)
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${label}: horizontal page overflow ${JSON.stringify(metrics)}`)
}
const openEnquiry = async () => {
  if (await page.locator('#builder-use').isVisible()) return
  await button('Prepare enquiry').tap()
  if (await button('I’m not sure—continue').isVisible()) await button('I’m not sure—continue').tap()
}
const openBudget = async () => {
  if (await page.locator('#budget-scope').isVisible()) return
  await button('Explore budget (optional)').tap()
  if (await button('I’m not sure—continue').isVisible()) await button('I’m not sure—continue').tap()
}

try {
  await page.goto(frontend)
  await inspect('home')
  await page.getByRole('button', { name: 'Try an example', exact: true }).tap()
  await settle()
  await writeFile(`${output}/initial-ui.txt`, await page.locator('body').innerText())
  if (process.env.COMPARISON_BASELINE_ONLY) {
    await inspect('example-baseline')
    await page.screenshot({ path: `${output}/narrow-baseline.png`, fullPage: true })
  } else {
    await openEnquiry()
    await page.locator('#builder-use').fill('Garden suite')
    await page.locator('#builder-relationship').fill('Public demonstration; no ownership claimed')
    await page.locator('#builder-nextStep').fill('Please advise what is needed for an initial call.')
    const question = 'For Model 300, can you confirm a matching quote and the foundation responsibilities?'
    await page.locator('#builder-question').fill(question)
    await settle()
    await inspect('authored-question')
    await openBudget()
    await page.locator('#budget-scope').selectOption('whole_project')
    await page.locator('#builder-budget').fill('Prefer CAD 250,000 overall; still exploring')
    await button('Use this price suggestion').tap()
    await inspect('whole-project-model300')
    assert.match(await page.locator('.budget-summary').innerText(), /187,000/)
    assert.match(await page.locator('.budget-summary').innerText(), /Incomplete/)
    const firstPlacement = (await evidence()).measurement.result.input.placement
    await page.locator('#builder-model-choice').selectOption('aux-240')
    await settle()
    await openEnquiry()
    await page.locator('#builder-question').fill('For Model 240, which current configuration and currency apply?')
    await openBudget()
    await page.locator('#budget-scope').selectOption('whole_project')
    assert.match(await page.locator('#project-budget').innerText(), /No price in this model/)
    await inspect('missing-price-model240')
    await page.locator('#builder-model-choice').selectOption('wcch-ch-studio')
    await settle()
    await openBudget()
    await page.locator('#budget-scope').selectOption('whole_project')
    await button('Use this price suggestion').tap()
    assert.match(await page.locator('.budget-summary').innerText(), /Currency is unknown/)
    assert.match(await page.locator('.budget-summary').innerText(), /No usable priced components/)
    await inspect('unknown-currency-studio')
    const comparison = page.locator('#builder-alternative-comparison')
    const summary = comparison.locator(':scope > summary')
    await summary.focus()
    await page.keyboard.press('Enter')
    assert.equal(await comparison.getAttribute('open'), '')
    await inspect('comparison-open')
    const returnButton = comparison.getByRole('button', { name: 'Open Model 300', exact: true })
    const touchTarget = await returnButton.boundingBox()
    assert.ok(touchTarget.height >= 44 && touchTarget.width >= 44)
    await returnButton.tap()
    await settle()
    await openEnquiry()
    assert.equal(await page.locator('#builder-question').inputValue(), question, 'authored model question returns')
    assert.deepEqual((await evidence()).measurement.result.input.placement, firstPlacement, 'retained placement is remeasured')
    await openBudget()
    assert.equal(await page.locator('#budget-scope').inputValue(), 'whole_project')
    assert.match(await page.locator('.budget-summary').innerText(), /187,000/)
    await inspect('returned-model300-budget')
    await page.screenshot({ path: `${output}/narrow-budget.png` })
    if (!await comparison.evaluate(element => element.open)) await summary.tap()
    await summary.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${output}/narrow-comparison.png` })
    for (const [name, file] of [['Model 300', 'model300'], ['Model 240', 'model240'], ['C.H. Studio Pod', 'studio']]) {
      await comparison.getByRole('article', { name: `${name} comparison`, exact: true }).screenshot({ path: `${output}/narrow-${file}-comparison.png` })
    }
    await writeFile(`${output}/comparison-ui.txt`, await comparison.innerText())
    const detail = comparison.getByText('Price scope and exclusions', { exact: true }).first()
    await detail.focus(); await page.keyboard.press('Enter')
    assert.equal(await detail.evaluate(element => element.parentElement.open), true, 'price help opens with keyboard')
    await page.keyboard.press('Tab')
    observations.push({ phase: 'keyboard-after-price-help', activeTag: await page.evaluate(() => document.activeElement.tagName), touchTarget })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await summary.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${output}/desktop-comparison.png` })
    observations.push({ phase: 'desktop-comparison', ...await page.evaluate(() => ({ innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })) })
    await page.setViewportSize({ width: 390, height: 844 })
    await openEnquiry()
    // Exercise the supported manual-copy recovery without relying on OS clipboard permissions.
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('QA clipboard unavailable') } } }))
    const enquiryCopy = page.locator('#builder-enquiry-text').locator('..').getByRole('button', { name: 'Copy text', exact: true })
    await enquiryCopy.tap()
    assert.equal(await page.evaluate(() => document.activeElement.id), 'builder-enquiry-text')
    assert.match(await page.locator('#builder-enquiry-text').locator('..').innerText(), /Automatic copy unavailable/)
    await inspect('copy-recovery')
    await page.screenshot({ path: `${output}/narrow-copy-recovery.png` })
    await writeFile(`${output}/unsent-enquiry.txt`, await page.locator('#builder-enquiry-text').inputValue())
    const pendingDownload = page.waitForEvent('download')
    await button('Save enquiry PDF').tap()
    const download = await pendingDownload
    assert.equal(await download.failure(), null)
    await download.saveAs(`${output}/representative-enquiry.pdf`)
    const pdf = await readFile(`${output}/representative-enquiry.pdf`)
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF')
    assert.ok(pdf.length > 1000)
    observations.push({ phase: 'export', filename: download.suggestedFilename(), bytes: pdf.length, contentSignature: '%PDF' })
    await inspect('export-complete')
    await button('Home').tap()
    await page.getByRole('button', { name: 'Check my property', exact: true }).tap()
    await openEnquiry()
    assert.equal(await page.locator('#builder-question').inputValue(), question)
    await inspect('navigation-return')
    await page.reload()
    if (await page.getByRole('button', { name: 'Check my property', exact: true }).isVisible()) await page.getByRole('button', { name: 'Check my property', exact: true }).tap()
    await page.getByText('Recover your previous enquiry', { exact: true }).tap()
    assert.match(await page.locator('#recovered-enquiry').inputValue(), /matching quote and the foundation responsibilities/)
    await inspect('refresh-recovery')
    await page.screenshot({ path: `${output}/narrow-refresh-recovery.png` })
    assert.deepEqual(errors, [])
    assert.deepEqual(externalRequests, [])
  }
  completed = true
} catch (error) {
  await writeFile(`${output}/failure-ui.txt`, await page.locator('body').innerText())
  await page.screenshot({ path: `${output}/failure.png` })
  throw error
} finally {
  await writeFile(`${output}/browser-results.json`, JSON.stringify({ completed, mode: process.env.COMPARISON_BASELINE_ONLY ? 'baseline' : 'combined journey', capturedAt: new Date().toISOString(), buildCommit, application: 'local frontend + stateless API; not deployed', browser: `Chrome ${browser.version()}`, agentInspection: true, observations, errors, externalRequests }, null, 2))
  await context.close()
  await browser.close()
}
