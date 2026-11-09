// An actual browser download after a release replacement, without publishing.
// Build A normally; build B with Vite --base=/replacement/ into another directory.
// Set ENQUIRY_REPLACEMENT_DIR to B and run with a stateless local API at 8019.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { chromium } from 'playwright'

const original = resolve(process.env.ENQUIRY_ORIGINAL_DIR || 'dist')
const replacement = resolve(process.env.ENQUIRY_REPLACEMENT_DIR || '../output/enquiry-delivery/replacement')
const output = resolve(process.env.ENQUIRY_DELIVERY_OUTPUT || '../output/enquiry-delivery')
const api = process.env.ENQUIRY_DELIVERY_API || 'http://127.0.0.1:8019'
assert.equal(new URL(api).hostname, '127.0.0.1', 'Only a local stateless API is allowed')
const indexA = await readFile(resolve(original, 'index.html'), 'utf8')
const indexB = await readFile(resolve(replacement, 'index.html'), 'utf8')
const entryA = indexA.match(/src="([^"]+\.js)"/)[1]
const entryB = indexB.match(/src="([^"]+\.js)"/)[1]
assert.notEqual(entryA, entryB, 'The replacement must have a different entry URL')
assert.ok(entryB.startsWith('/replacement/'), 'Build B with --base=/replacement/')
await mkdir(output, { recursive: true })
let active = original
const requests = [], errors = [], painted = {}
const allowed = new Set(['/api/scouting-geometry/assess', '/api/municipal-rules/v1/evaluate', '/api/municipal-rules/v1/placement-scenarios'])
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://127.0.0.1').pathname
    if (path.startsWith('/api/') || path === '/health') {
      if (!allowed.has(path)) { response.writeHead(503); return response.end('offline boundary') }
      const chunks = []; for await (const chunk of request) chunks.push(chunk)
      const upstream = await fetch(api + path, { method: request.method, headers: { 'Content-Type': 'application/json' }, body: request.method === 'GET' ? undefined : Buffer.concat(chunks) })
      response.writeHead(upstream.status, { 'Content-Type': 'application/json' }); return response.end(await upstream.text())
    }
    const local = active === replacement ? path.replace(/^\/replacement\//, '/') : path
    const file = resolve(active, '.' + (local === '/' ? '/index.html' : local))
    assert.ok(file.startsWith(active + sep), 'Static path stays inside this test build')
    const bytes = await readFile(file)
    response.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    response.end(bytes)
  } catch { response.writeHead(404); response.end('Not found') }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, channel: process.env.ENQUIRY_DELIVERY_BROWSER || 'chrome' })
async function prepare(page, label) {
  await page.getByRole('button', { name: 'Watch the demo', exact: true }).click()
  for (let step = 0; step < 6; step++) await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: 'Let me try', exact: true }).click()
  await page.waitForFunction(() => {
    const record = document.querySelector('#builder-technical-record')
    if (!record) return false
    const evidence = JSON.parse(record.value)
    return evidence.evaluation_state === 'current' && evidence.measurement
  })
  await page.locator('#builder-question').fill(`For ${label}, can you assess crane access from my photos?`)
  await page.locator('#builder-unsent-preview').getByText(`For ${label}, can you assess crane access from my photos?`, { exact: true }).waitFor()
  assert.match(await page.locator('#builder-enquiry-text').inputValue(), /Model 300/)
}
async function download(page, label) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save enquiry PDF', exact: true }).click()
  const saved = await pending
  assert.equal(saved.suggestedFilename(), 'prefab-enquiry.pdf')
  const file = resolve(output, `${label}.pdf`)
  await saved.saveAs(file)
  const bytes = await readFile(file)
  assert.equal(bytes.subarray(0, 4).toString(), '%PDF')
  assert.ok(bytes.length > 10000)
  painted[label] = await page.evaluate(() => window.deliveryPainted)
  assert.ok(painted[label].some(line => line.includes(`For ${label}, can you assess crane access`)))
  assert.ok(painted[label].some(line => line.includes('Model 300')))
  assert.ok(painted[label].some(line => line.includes('Approximate mapped outlines')))
  await writeFile(resolve(output, `${label}.txt`), await page.locator('#builder-enquiry-text').inputValue())
  await page.screenshot({ path: resolve(output, `${label}.png`), fullPage: true })
}
try {
  const open = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } })
  await browser.contexts()[0].addInitScript(() => {
    window.deliveryPainted = []
    const fill = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) { window.deliveryPainted.push(text); return fill.call(this, text, ...args) }
  })
  open.on('pageerror', error => errors.push(error.message))
  open.on('request', request => requests.push({ phase: active === original ? 'before replacement' : 'after replacement', path: new URL(request.url()).pathname }))
  await open.goto(origin)
  await open.getByRole('button', { name: 'Watch the demo', exact: true }).waitFor()
  // Replace all served files before first entry into the assessment or any PDF use.
  active = replacement
  assert.equal((await fetch(origin + entryA)).status, 404, 'Old release entry is genuinely absent')
  await prepare(open, 'open-session')
  await download(open, 'open-session')
  const fresh = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } })
  await fresh.addInitScript(() => {
    window.deliveryPainted = []
    const fill = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) { window.deliveryPainted.push(text); return fill.call(this, text, ...args) }
  })
  fresh.on('pageerror', error => errors.push(error.message))
  await fresh.goto(origin)
  await prepare(fresh, 'fresh-session')
  await download(fresh, 'fresh-session')
  assert.deepEqual(errors, [])
  assert.equal(requests.filter(request => request.phase === 'after replacement' && /jspdf.*\.js/.test(request.path)).length, 0, 'PDF requires no removed lazy renderer')
  await writeFile(resolve(output, 'delivery.json'), JSON.stringify({ entryA, entryB, errors, requests, painted, boundary: 'Controlled local release replacement, not a hosted deployment' }, null, 2))
  console.log('Actual fresh + already-open PDF downloads passed after local release replacement.')
} catch (error) {
  await writeFile(resolve(output, 'delivery-failure.json'), JSON.stringify({ error: String(error), entryA, entryB, errors, requests }, null, 2))
  for (const [index, context] of browser.contexts().entries()) for (const page of context.pages()) {
    await page.screenshot({ path: resolve(output, `failure-${index}.png`), fullPage: true }).catch(() => {})
    await writeFile(resolve(output, `failure-${index}.txt`), await page.locator('body').innerText()).catch(() => {})
  }
  throw error
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
