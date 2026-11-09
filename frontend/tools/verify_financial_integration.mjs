// Real Chrome + local stateless API acceptance walkthrough. Never contacts providers.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const origin = process.env.COMPARISON_URL ?? 'http://127.0.0.1:5236'
const api = process.env.COMPARISON_API ?? 'http://127.0.0.1:8036'
const output = process.env.COMPARISON_OUTPUT ?? '../docs/usability/financial-integrated-2026-11-06'
const rentalAcceptance = process.env.RENTAL_ACCEPTANCE === '1'
for (const url of [origin, api]) assert.equal(new URL(url).hostname, '127.0.0.1')
await mkdir(output, { recursive: true })
const models = [
  { id: 'aux-300', name: 'Model 300', provider: 'aux box', width: '3.5', angle: '17', preference: 'CAD 310000 for Model 300', foundation: '0.45' },
  { id: 'aux-240', name: 'Model 240', provider: 'aux box', width: '3.2', angle: '29', preference: 'CAD 240000 for Model 240', foundation: '0.15' },
  { id: 'wcch-ch-studio', name: 'C.H. Studio Pod', provider: 'West Coast Container Homes', width: '2.6', angle: '41', preference: 'Studio cost scope to discuss', foundation: '0.25' },
  { id: 'hewing-quadra4', name: 'Quadra 4', provider: 'Hewing Haus', width: '6.3', angle: '53', preference: 'CAD 340000 for Quadra', foundation: '0.35' },
]
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const builtIndex = await readFile('dist/index.html', 'utf8')
const entryAsset = builtIndex.match(/src="([^"]+\.js)"/)[1]
const results = { capturedAt: new Date().toISOString(), buildCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), entryAsset, entrySha256: createHash('sha256').update(await readFile(`dist${entryAsset}`)).digest('hex'), browser: browser.version(), scope: 'local bundled example; real stateless API; no source publication, database or provider contact', runs: [] }
try {
  for (const size of [{ label: 'phone', width: 390, height: 844, mobile: true }, { label: 'desktop', width: 1440, height: 1000, mobile: false }]) {
    for (const selected of [true, false]) {
      const label = `${size.label}-${selected ? 'interests' : 'skip'}`
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, isMobile: size.mobile, hasTouch: size.mobile, reducedMotion: 'reduce' })
      const page = await context.newPage()
      page.setDefaultTimeout(15000)
      const run = { label, completed: false, observations: [], errors: [], externalRequests: [], apiRequests: [], models: [] }
      results.runs.push(run)
      page.on('pageerror', error => run.errors.push(error.message))
      await context.addInitScript(() => {
        window.qaPainted = []
        const paint = CanvasRenderingContext2D.prototype.fillText
        CanvasRenderingContext2D.prototype.fillText = function (text, ...args) { window.qaPainted.push(String(text)); return paint.call(this, text, ...args) }
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.qaCopied = text } } })
      })
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url())
        if (url.origin !== new URL(origin).origin) { run.externalRequests.push(url.origin); return route.abort() }
        if (!url.pathname.startsWith('/api/') && url.pathname !== '/health') return route.continue()
        if (!['/api/scouting-geometry/assess', '/api/conditional-screening/v1/evaluate', '/api/conditional-screening/v1/placement-scenarios', '/api/placement-suggestions/v1/suggest'].includes(url.pathname))
          return route.fulfill({ status: 503, body: 'Offline source boundary for repeatable acceptance QA' })
        run.apiRequests.push(url.pathname)
        const response = await fetch(api + url.pathname, { method: request.method(), body: request.postData() || undefined, headers: { 'Content-Type': 'application/json' } })
        await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() }).catch(error => { if (!/closed|disposed|cancel|intercept/i.test(error.message)) throw error })
      })
      const button = name => page.getByRole('button', { name, exact: true, includeHidden: true })
      const evidence = async () => JSON.parse(await page.locator('#builder-technical-record').inputValue())
      const settle = async () => {
        await page.waitForFunction(() => { const field = document.getElementById('builder-technical-record'); if (!field) return false; const e = JSON.parse(field.value); return e.evaluation_state === 'current' && e.measurement })
        await page.waitForTimeout(600)
      }
      const step = async id => {
        await page.locator(`nav[aria-label="Prefab model steps"] a[href="#${id}"]`).click()
        if (await button('I’m not sure—continue').isVisible()) await button('I’m not sure—continue').click()
      }
      const reveal = async field => {
        const ancestors = await field.locator('xpath=ancestor::details').count()
        for (let index = 0; index < ancestors; index++) {
          const details = field.locator('xpath=ancestor::details').nth(index)
          if (!await details.evaluate(element => element.open)) await details.locator(':scope > summary').click()
        }
      }
      const fillMeasurement = async (field, value) => {
        // These controls reveal full precision on focus. Let that render finish
        // before Playwright selects/replaces text, matching a person's edit.
        await field.focus(); await page.waitForTimeout(100); await field.fill(value)
        await field.blur()
      }
      const inspect = async phase => {
        const metrics = await page.evaluate(() => ({ innerWidth, innerHeight, devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, touchPoints: navigator.maxTouchPoints }))
        assert.equal(metrics.innerWidth, size.width); assert.equal(metrics.innerHeight, size.height)
        assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${label}/${phase}: horizontal overflow ${JSON.stringify(metrics)}`)
        run.observations.push({ phase, ...metrics })
      }
      const compare = async () => {
        const details = page.locator('#builder-alternative-comparison')
        await reveal(details)
        if (!await details.evaluate(element => element.open)) await details.locator(':scope > summary').click()
        return details
      }
      try {
        console.log(`Starting ${label}`)
        await page.goto(origin)
        await inspect('home')
        await button('Try an example').click()
        await settle()
        const interests = page.getByRole('region', { name: 'Financial interests', exact: true })
        await interests.scrollIntoViewIfNeeded()
        assert.equal(await page.locator('#builder-alternative-comparison').evaluate(element => element.open), false, 'financial choice is discoverable before opening details')
        if (selected) {
          await interests.getByRole('checkbox', { name: 'Project cost', exact: true }).check()
          await interests.getByRole('checkbox', { name: 'Potential rental income', exact: true }).check()
          await interests.getByRole('button', { name: 'Save interests', exact: true }).click()
        } else await interests.getByRole('button', { name: 'Skip for now', exact: true }).click()
        await inspect('financial-choice')
        await page.screenshot({ path: `${output}/${label}-financial-choice.png` })
        const initialComparison = await compare()
        const initialLead = initialComparison.getByRole('region', { name: 'Current model financial next step', exact: true })
        assert.match(await initialLead.innerText(), /187,000/)
        assert.match(await initialLead.innerText(), /Installed cost incomplete/)
        if (selected) assert.match(await initialLead.innerText(), /For rental income/)
        else assert.doesNotMatch(await initialLead.innerText(), /For rental income/)
        const comparisonBox = await initialComparison.boundingBox()
        const quoteBox = await initialLead.getByRole('button', { name: 'Prepare quote request for Model 300', exact: true }).boundingBox()
        assert.ok(quoteBox.width >= 44 && quoteBox.height >= 44, 'quote handoff supports a touch target')
        run.observations.push({ phase: 'initial-quote-position', fromOpenedComparisonTopPx: quoteBox.y - comparisonBox.y, quoteHeightPx: quoteBox.height, quoteWidthPx: quoteBox.width })
        await initialLead.screenshot({ path: `${output}/${label}-initial-financial-overview.png` })
        await writeFile(`${output}/${label}-initial-financial-overview.txt`, await initialLead.innerText())
        await inspect('initial-financial-overview')
        await step('builder-next')
        await page.locator('#builder-use').fill('Garden suite')
        await page.locator('#builder-relationship').fill('Public demonstration; no ownership claimed')
        await page.locator('#builder-nextStep').fill('Please advise what is needed for an initial call.')
        await settle()
        const retained = new Map()
        for (const model of models) {
          console.log(`${label}: authoring ${model.name}`)
          if (await page.locator('#builder-model-choice').inputValue() !== model.id) { await reveal(page.locator('#builder-model-choice')); await page.locator('#builder-model-choice').selectOption(model.id); await settle() }
          await step('builder-placement')
          await fillMeasurement(page.locator('#builder-example-angle'), model.angle)
          await reveal(page.locator('#builder-example-width'))
          await fillMeasurement(page.locator('#builder-example-width'), model.width)
          await reveal(button('East →'))
          await button('East →').click()
          await settle()
          const authoredPlacement = (await evidence()).measurement.result.input.placement
          console.log(`${label}: authored placement ${JSON.stringify(authoredPlacement)}`)
          assert.equal(authoredPlacement.width_m, Number(model.width), 'custom width is measured before continuing')
          assert.equal(authoredPlacement.angle_degrees, Number(model.angle), 'authored rotation is measured before continuing')
          await step('builder-next')
          const question = `For ${model.name}, please confirm the matching quote and foundation scope.\nKeep this authored question for ${model.id}.`
          await page.locator('#builder-question').fill(question)
          if (model.id !== 'aux-300') {
            await reveal(page.locator('#builder-configuration'))
            await page.locator('#builder-configuration').fill(`${model.name} custom options for QA`)
          }
          await settle()
          await step('builder-budget-stage')
          await page.locator('#builder-budget').fill(model.preference)
          await page.locator('#budget-scope').selectOption('whole_project')
          const suggestion = button('Use this price suggestion')
          if (await suggestion.count()) { await reveal(suggestion); await suggestion.click() }
          if (model.id === 'aux-240') {
            assert.match(await page.locator('#project-budget').innerText(), /No price in this model/)
            await reveal(button('Edit building')); await button('Edit building').click()
            await page.locator('#budget-minimum').fill('175000'); await page.locator('#budget-currency').fill('CAD')
            await page.locator('#budget-rationale').fill('Synthetic software QA planning allowance only')
            await button('Save cost entry').click()
          }
          if (model.id === 'wcch-ch-studio') {
            assert.match(await page.locator('.budget-summary').innerText(), /Currency is unknown/)
            assert.match(await page.locator('.budget-summary').innerText(), /No usable priced components/)
          }
          if (model.id === 'aux-300') assert.match(await page.locator('.budget-summary').innerText(), /Priced-components subtotal: CAD 187,000/)
          assert.match(await page.locator('.budget-summary').innerText(), /Incomplete · installed total unavailable/)
          await settle()
          if (rentalAcceptance && selected) {
            await compare()
            const prefix = `#rental-${model.id}`
            const initial = (await evidence()).rental_scenario
            const oneBedroom = ['aux-300', 'hewing-quadra4'].includes(model.id)
            assert.equal(initial.result.rent, oneBedroom ? 2040 : 1670)
            assert.equal(initial.result.cashFlow, null, 'omitted financing is not zero')
            assert.equal(await page.locator(`${prefix}-rent`).inputValue(), String(initial.result.rent))
            if (model.id === 'aux-300') {
              await page.locator(`${prefix}-rent`).fill('-1')
              assert.equal((await evidence()).rental_scenario.result.collected, null)
              assert.equal(await page.locator(`${prefix}-rent`).getAttribute('aria-invalid'), 'true')
              await button('Use regional rent again').click()
              assert.equal((await evidence()).rental_scenario.result.rent, 2040)
              await page.locator(`${prefix}-bedrooms`).selectOption('0')
              assert.equal((await evidence()).rental_scenario.result.rent, 1670)
              await page.locator(`${prefix}-bedrooms`).selectOption('1')
            }
            const rents = { 'aux-300': 2000, 'aux-240': 1500, 'wcch-ch-studio': 1400, 'hewing-quadra4': 2200 }
            await page.locator(`${prefix}-rent`).fill(String(rents[model.id]))
            await reveal(page.locator(`${prefix}-financing`))
            await page.locator(`${prefix}-financing`).selectOption('payment')
            await page.locator(`${prefix}-debt`).fill('1000')
            const calculation = (await evidence()).rental_scenario.result
            assert.equal(calculation.cashFlow, rents[model.id] * 12 * 0.95 * 0.75 - 12000)
            if (model.id === 'wcch-ch-studio') assert.equal(calculation.cashFlow, -30)
            await page.locator('.rental-scenario').screenshot({ path: `${output}/${label}-${model.id}-rental.png` })
            await inspect(`${model.id}-rental`)
          } else if (rentalAcceptance) {
            assert.equal((await evidence()).rental_scenario, null, 'skipping does not manufacture a rental intention')
          }
          const e = await evidence()
          retained.set(model.id, { rental: e.rental_scenario, placement: e.measurement.result.input.placement, question, configuration: e.enquiry_inputs.configuration, budget: e.project_budget.draft, preference: model.preference })
          await step('builder-next')
          const text = await page.locator('#builder-enquiry-text').inputValue()
          assert.ok(text.includes(question)); assert.ok(text.includes(model.name))
          if (!model.id.startsWith('aux-')) assert.doesNotMatch(text, /aux box|187,000|Model 300 custom/)
          await inspect(`${model.id}-authored`)
          run.models.push({ id: model.id, question, rental: e.rental_scenario, placement: e.measurement.result.input.placement, budget: e.project_budget, enquiry: text })
        }
        const comparison = await compare()
        assert.equal(await comparison.getByRole('article').count(), 4)
        const overview = comparison.getByRole('region', { name: 'Explored model overview', exact: true })
        assert.ok(await overview.isVisible())
        assert.match(await overview.innerText(), /Preliminary concern: Space within the property/, 'current material placement concerns remain visible beside the costs')
        assert.match(await comparison.innerText(), /Price unknown in captured sources/)
        assert.match(await comparison.innerText(), /Currency is unknown/)
        assert.match(await comparison.innerText(), /Whole-project estimate: unavailable/)
        assert.match(await comparison.innerText(), /different retained positions or rotations/)
        await inspect('four-model-comparison')
        await comparison.screenshot({ path: `${output}/${label}-comparison.png` })
        await writeFile(`${output}/${label}-comparison.txt`, await comparison.innerText())
        for (const model of models) {
          console.log(`${label}: restoring ${model.name}`)
          if (await page.locator('#builder-model-choice').inputValue() !== model.id) { await (await compare()).getByRole('button', { name: `Open ${model.name}`, exact: true }).first().click(); await settle() }
          const saved = retained.get(model.id), e = await evidence()
          if (rentalAcceptance) assert.deepEqual(e.rental_scenario, saved.rental, 'each model restores its own rental assumptions and source')
          assert.deepEqual(e.measurement.result.input.placement, saved.placement, `${model.name} exact placement restored and remeasured`)
          assert.equal(e.enquiry_inputs.question, saved.question); assert.equal(e.enquiry_inputs.configuration, saved.configuration)
          assert.equal(e.enquiry_inputs.budget, saved.preference)
          assert.deepEqual(e.project_budget.draft, saved.budget, `${model.name} cost draft restored`)
          assert.ok(e.project_budget.draft.items.every(item => item.context.model_id === model.id), 'cross-provider costs remain isolated')
          await interests.getByRole('button', { name: 'Edit financial interests', exact: true }).click()
          assert.equal(await interests.getByRole('checkbox', { name: 'Project cost', exact: true }).isChecked(), selected)
          assert.equal(await interests.getByRole('checkbox', { name: 'Potential rental income', exact: true }).isChecked(), selected)
          await interests.getByRole('button', { name: selected ? 'Save interests' : 'Skip for now', exact: true }).click()
          const activeComparison = await compare()
          const nextStep = activeComparison.getByRole('region', { name: 'Current model financial next step', exact: true })
          assert.ok((await nextStep.innerText()).includes(model.name))
          assert.match(await nextStep.innerText(), /cost|quote|price/i)
          await nextStep.getByRole('button', { name: `Prepare quote request for ${model.name}`, exact: true }).click()
          assert.equal(await page.locator('#builder-question').inputValue(), saved.question, 'quote handoff preserves authored question')
          const enquiry = await page.locator('#builder-enquiry-text').inputValue()
          assert.ok(enquiry.includes(saved.question)); assert.ok(enquiry.includes(model.provider))
          assert.match(enquiry, /quote|price|pricing/i)
          await page.locator('#builder-enquiry-text').locator('..').getByRole('button', { name: 'Copy text', exact: true }).click()
          assert.equal(await page.evaluate(() => window.qaCopied), enquiry)
          await inspect(`${model.id}-restored-quote`)
        }
        await page.screenshot({ path: `${output}/${label}-quote-handoff.png` })
        await page.evaluate(() => { window.qaPainted = [] })
        const pending = page.waitForEvent('download')
        await button('Save enquiry PDF').click()
        const download = await pending
        assert.equal(await download.failure(), null)
        const filename = `${output}/${label}-quadra-enquiry.pdf`
        await download.saveAs(filename)
        const pdf = await readFile(filename)
        assert.equal(pdf.subarray(0, 4).toString(), '%PDF'); assert.ok(pdf.length > 10000)
        const painted = await page.evaluate(() => window.qaPainted)
        assert.ok(painted.some(line => line.includes('Quadra 4 feasibility enquiry')), 'actual downloaded PDF uses active model heading')
        assert.ok(painted.some(line => line.includes('SAVED EXAMPLE ONLY')), 'download identifies example')
        assert.ok(painted.includes('Site information'), 'download paints the complete Site information heading')
        assert.ok(!painted.some(line => /Model 300|West Coast Container Homes|Currency unknown/.test(line)), 'download excludes other-provider draft')
        run.download = { filename: download.suggestedFilename(), bytes: pdf.length, painted }
        if (rentalAcceptance && selected) {
          const savePackage = button('Enquiry and evidence package (ZIP)')
          await reveal(savePackage)
          const packagePending = page.waitForEvent('download')
          await savePackage.click()
          const packageDownload = await packagePending
          assert.equal(await packageDownload.failure(), null)
          const packageFile = `${output}/${label}-rental-evidence.zip`
          await packageDownload.saveAs(packageFile)
          const { unzipSync, strFromU8 } = await import('fflate')
          const files = unzipSync(await readFile(packageFile))
          const report = strFromU8(files['prefab-supporting-report.md'])
          const technical = JSON.parse(strFromU8(files['prefab-technical-evidence.json']))
          assert.match(report, /Rental planning scenario/)
          assert.match(report, /6,810/)
          assert.match(report, /Statistics Canada/)
          assert.equal(technical.rental_scenario.result.cashFlow, 6810)
          assert.doesNotMatch(strFromU8(files['prefab-enquiry.md']), /Rental planning scenario/, 'provider enquiry does not disclose homeowner financing')
          run.rentalPackage = { report, rentalEvidence: technical.rental_scenario }
        }
        await inspect('download-complete')
        assert.deepEqual(run.errors, []); assert.deepEqual(run.externalRequests, [])
        run.completed = true
        console.log(`Completed ${label}`)
      } catch (error) {
        run.failure = String(error)
        await writeFile(`${output}/${label}-failure.txt`, await page.locator('body').innerText())
        await page.screenshot({ path: `${output}/${label}-failure.png` })
        throw error
      } finally {
        await writeFile(`${output}/browser-results.json`, JSON.stringify(results, null, 2))
        await context.close()
      }
    }
  }
} finally { await browser.close() }
