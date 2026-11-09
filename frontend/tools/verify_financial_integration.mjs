// Real Chrome + local stateless API acceptance walkthrough. Never contacts providers.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const origin = process.env.COMPARISON_URL ?? 'http://127.0.0.1:5236'
const api = process.env.COMPARISON_API ?? 'http://127.0.0.1:8036'
const output = process.env.COMPARISON_OUTPUT ?? '../.local/project-economics-verification'
const rentalAcceptance = process.env.RENTAL_ACCEPTANCE === '1'
for (const url of [origin, api]) assert.equal(new URL(url).hostname, '127.0.0.1')
await mkdir(output, { recursive: true })
const models = [
  { id: 'aux-300', name: 'Model 300', provider: 'aux box', width: '3.5', angle: '17', prefab: '187500', foundation: '0.45' },
  { id: 'aux-240', name: 'Model 240', provider: 'aux box', width: '3.2', angle: '29', prefab: '175000', foundation: '0.15' },
  { id: 'wcch-ch-studio', name: 'C.H. Studio Pod', provider: 'West Coast Container Homes', width: '2.6', angle: '41', prefab: '104000', foundation: '0.25' },
  { id: 'hewing-quadra4', name: 'Quadra 4', provider: 'Hewing Haus', width: '6.3', angle: '53', prefab: '225000', foundation: '0.35' },
]
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const builtIndex = await readFile('dist/index.html', 'utf8')
const entryAsset = builtIndex.match(/src="([^"]+\.js)"/)[1]
const results = { capturedAt: new Date().toISOString(), buildCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), entryAsset, entrySha256: createHash('sha256').update(await readFile(`dist${entryAsset}`)).digest('hex'), browser: browser.version(), scope: 'local bundled example; real stateless API; no source publication, database or provider contact', runs: [] }

async function verifyEstimateStatus(page, context) {
  const detail = page.locator('#builder-economics-estimate')
  const status = detail.getByRole('status')
  const fees = detail.getByRole('textbox', { name: 'Development and permit fees', exact: true })
  const rent = detail.getByRole('textbox', { name: 'Monthly rent (CAD)', exact: true })
  const expenses = detail.locator('#rental-aux-300-expenses')
  const expenseBasis = detail.getByLabel('Running-cost basis')
  const financing = detail.getByLabel('Financing', { exact: true })
  const debt = detail.getByRole('textbox', { name: 'Monthly debt payments (CAD)' })
  const totals = detail.getByLabel('Live estimate')
  assert.equal(await status.count(), 1, 'one status for the expanded estimate')
  assert.equal(await status.textContent(), '', 'opening the estimate is quiet')
  assert.equal(await detail.getByText('Development and permit fees', { exact: true }).count(), 1)
  assert.equal(await detail.getByRole('group', { name: 'Prefab package' }).getByRole('textbox', { name: 'Prefab building' }).count(), 1)
  const cdp = await context.newCDPSession(page)
  try {
    const { nodes } = await cdp.send('Accessibility.getFullAXTree')
    const updates = nodes.filter(node => !node.ignored && node.role.value === 'status' && node.properties?.some(prop => prop.name === 'live' && prop.value.value === 'polite'))
    assert.equal(updates.length, 1, 'one polite status exposed in Chrome accessibility')
    assert.ok(updates[0].properties.some(prop => prop.name === 'atomic' && prop.value.value === true))
    const feeNode = nodes.find(node => node.role.value === 'textbox' && node.name.value === 'Development and permit fees')
    assert.match(feeNode?.description?.value ?? '', /Amounts in CAD/)
    assert.equal(nodes.filter(node => !node.ignored && node.role.value === 'StaticText' && node.name?.value === 'Expected monthly rent').length, 1)
  } finally { await cdp.detach() }

  await status.evaluate(element => {
    window.estimateStatusChanges = []
    new MutationObserver(() => window.estimateStatusChanges.push(element.textContent))
      .observe(element, { childList: true, subtree: true, characterData: true })
  })
  const changes = () => page.evaluate(() => window.estimateStatusChanges)
  let count = 0
  const next = async (expected, focus) => {
    await page.waitForFunction(previous => window.estimateStatusChanges.length > previous, count)
    const observed = await changes()
    assert.equal(observed.length, ++count, 'one announcement per settled edit')
    assert.match(observed.at(-1), expected)
    assert.doesNotMatch(observed.at(-1), /Statistics Canada|Evolv Modular/)
    if (focus) assert.equal(await focus.evaluate(element => element === document.activeElement), true, 'announcement preserves input focus')
  }
  const quiet = async () => {
    await page.waitForTimeout(900)
    assert.equal((await changes()).length, count, 'malformed text does not produce a new estimate')
  }

  await fees.fill('9000')
  await fees.fill('9x')
  await quiet()
  assert.match(await totals.innerText(), /251,000/, 'the last accepted cost remains visible')
  await fees.fill('9000')
  await next(/Project cost subtotal \$251,000 CAD.*Simple payback on priced costs 14\.4 years/, fees)
  await fees.fill('')
  await next(/Project cost subtotal \$242,000 CAD.*Simple payback Not estimated/, fees)
  await fees.fill('8000')
  await next(/Project cost subtotal \$250,000 CAD/)

  await rent.fill('')
  await rent.pressSequentially('2400', { delay: 35 })
  await next(/Expected monthly rent \$2,400.*Annual income after running costs \$20,520.*Simple payback on priced costs 12\.2 years/, rent)
  await rent.fill('2600')
  await rent.fill('26x')
  await quiet()
  await rent.fill('')
  await next(/Expected monthly rent Not estimated.*Annual income after running costs Not estimated.*Simple payback Not estimated/, rent)
  await detail.getByRole('button', { name: 'Use regional rent again' }).click()
  await next(/Expected monthly rent \$2,040.*Annual income after running costs \$17,442/)

  await expenseBasis.selectOption('monthly')
  await expenses.fill('2000')
  // 2040 × 12 × 0.95 - 2000 × 12 = -744.
  await next(/Annual running costs and reserves \$24,000.*Annual income after running costs negative \$744.*Simple payback Not estimated/, expenses)
  await expenseBasis.selectOption('allowance')
  await expenses.fill('25')
  await next(/Annual income after running costs \$17,442/)
  await financing.selectOption('payment')
  await debt.fill('3000')
  // A $3,000 monthly debt payment subtracts $36,000 from the known income.
  await next(/^Annual cash flow after debt payments negative \$18,558\. Before income tax\.$/, debt)
  await debt.fill('')
  await next(/^Annual cash flow after debt payments Not estimated/, debt)
  await financing.selectOption('unknown')
  return changes()
}

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
        const interests = page.getByRole('region', { name: 'Rental interest', exact: true })
        const economics = page.locator('.project-economics')
        const openEstimate = page.getByRole('link', { name: 'View and adjust estimate' })
        const back = page.getByRole('link', { name: 'Back to project', exact: true }).first()
        await interests.scrollIntoViewIfNeeded()
        assert.equal(await page.locator('#builder-alternative-comparison').evaluate(element => element.open), false)
        await interests.getByRole('button', { name: selected ? 'Include rental income' : 'Skip for now', exact: true }).click()
        await inspect('rental-choice')
        assert.match(await economics.innerText(), /Project cost subtotal.*250,000/s)
        assert.match(await economics.innerText(), /187,000.*8,000.*55,000/s)
        if (selected) assert.match(await economics.innerText(), /2,040.*17,442.*14.3 years/s)
        else assert.doesNotMatch(await economics.innerText(), /Expected monthly rent/)
        await economics.screenshot({ path: `${output}/${label}-summary.png` })
        await writeFile(`${output}/${label}-summary.txt`, await economics.innerText())
        const initialComparison = await compare()
        const quoteBox = await initialComparison.getByRole('button', { name: 'Prepare quote request for Model 300', exact: true }).boundingBox()
        assert.ok(quoteBox.width >= 44 && quoteBox.height >= 44, 'quote handoff supports a touch target')
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
          await openEstimate.scrollIntoViewIfNeeded()
          const beforeScroll = await page.evaluate(() => window.scrollY)
          await openEstimate.click()
          assert.equal(await page.locator('#economics-detail-title').evaluate(element => element === document.activeElement), true)
          assert.equal(await economics.isVisible(), false, 'the dedicated view replaces the visible assessment')
          assert.equal(await page.locator('.economics-editors').getByRole('heading', { name: 'Project costs' }).isVisible(), true)
          if (rentalAcceptance && selected && model.id === 'aux-300') {
            await page.screenshot({ path: `${output}/${label}-accessible-editor.png` })
            run.estimateStatus = await verifyEstimateStatus(page, context)
          }
          const prefab = page.locator('#economics-cost-unit')
          const starting = model.id === 'aux-300' ? '187000' : ''
          assert.equal(await prefab.inputValue(), starting, 'custom configurations and missing currency or price do not acquire a prefab price')
          if (model.id === 'aux-300') {
            const scope = page.locator('#budget-scope')
            await reveal(scope)
            await scope.selectOption('not_sure')
            assert.equal(await scope.inputValue(), 'not_sure')
            assert.equal((await evidence()).project_budget.payback, null, 'undefined cost scope cannot produce payback')
            await scope.selectOption('whole_project')
            await page.locator('.budget-advanced > summary').click()
          }
          await prefab.fill(model.prefab)
          const expectedCost = Number(model.prefab) + 25000 + 15000 + 15000 + 8000
          assert.equal((await evidence()).project_budget.calculation.subtotals[0].minimum, String(expectedCost))
          assert.match(await page.locator('.economics-live').innerText(), /Project cost subtotal/)
          assert.equal((await evidence()).project_budget.calculation.complete, false)
          if (model.id === 'aux-300') {
            assert.equal(await page.locator('#economics-cost-fees').inputValue(), '8000')
            const fees = page.locator('#economics-cost-fees')
            await fees.fill('8,500')
            assert.equal((await evidence()).project_budget.calculation.subtotals[0].minimum, String(expectedCost + 500))
            await fees.fill('8,50')
            assert.equal(await fees.getAttribute('aria-invalid'), 'true')
            assert.equal((await evidence()).project_budget.calculation.subtotals[0].minimum, String(expectedCost + 500), 'invalid text does not change the valid amount')
            await fees.fill('')
            assert.equal((await evidence()).project_budget.payback, null, 'clearing an amount makes the line unknown')
            await fees.fill('8500')
            await inspect('estimate-editor')
            await page.screenshot({ path: `${output}/${label}-estimate.png` })
          }
          if (rentalAcceptance && selected) {
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
              await page.locator(`${prefix}-rent`).fill('0')
              assert.equal((await evidence()).project_budget.payback, null, 'zero annual income cannot produce payback')
              await button('Use regional rent again').click()
            }
            const rents = { 'aux-300': 2000, 'aux-240': 1500, 'wcch-ch-studio': 1400, 'hewing-quadra4': 2200 }
            await page.locator(`${prefix}-rent`).fill(String(rents[model.id]))
            await reveal(page.locator(`${prefix}-financing`))
            await page.locator(`${prefix}-financing`).selectOption('payment')
            await page.locator(`${prefix}-debt`).fill('1000')
            const estimated = await evidence()
            const calculation = estimated.rental_scenario.result
            assert.equal(estimated.project_budget.payback.basis, 'subtotal')
            assert.equal(estimated.project_budget.payback.minimum, Number(estimated.project_budget.calculation.subtotals[0].minimum) / calculation.operating)
            assert.equal(calculation.cashFlow, rents[model.id] * 12 * 0.95 * 0.75 - 12000)
            if (model.id === 'wcch-ch-studio') assert.equal(calculation.cashFlow, -30)
            await page.locator('.rental-scenario').screenshot({ path: `${output}/${label}-${model.id}-rental.png` })
            await inspect(`${model.id}-rental`)
          } else if (rentalAcceptance) {
            assert.equal((await evidence()).rental_scenario, null, 'skipping does not manufacture a rental intention')
          }
          if (model.id === 'aux-300') await page.goBack()
          else await back.click()
          await openEstimate.waitFor()
          assert.equal(await openEstimate.evaluate(element => element === document.activeElement), true, 'return restores the trigger focus')
          assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - beforeScroll) <= 4, 'return restores the project scroll')
          const e = await evidence()
          assert.deepEqual(e.measurement.result.input.placement, authoredPlacement, 'opening and closing the editor retains the authored placement')
          assert.equal(e.enquiry_inputs.question, question)
          retained.set(model.id, { rental: e.rental_scenario, placement: e.measurement.result.input.placement, question, configuration: e.enquiry_inputs.configuration, budget: e.project_budget.draft })
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
          assert.deepEqual(e.project_budget.draft, saved.budget, `${model.name} cost draft restored`)
          assert.ok(e.project_budget.draft.items.every(item => item.context.model_id === model.id), 'cross-provider costs remain isolated')
          assert.match(await interests.innerText(), selected ? /Rental scenario included/ : /Rental income skipped/)
          const activeComparison = await compare()
          await activeComparison.getByRole('button', { name: `Prepare quote request for ${model.name}`, exact: true }).click()
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
          assert.equal((report.match(/Price source: Evolv Modular/g) ?? []).length, 1, 'shared site-cost evidence is named once in the readable report')
          assert.match(report, /Priced work:/)
          assert.match(report, /Simple payback/)
          assert.equal(technical.project_budget.payback.basis, 'subtotal')
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
