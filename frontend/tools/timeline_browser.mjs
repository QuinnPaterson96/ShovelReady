// Real browser / stateless local API integration. External source calls are isolated.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const origin = process.env.TIMELINE_URL ?? 'http://127.0.0.1:8046'
assert.equal(new URL(origin).hostname, '127.0.0.1')
const output = process.env.TIMELINE_OUTPUT ?? '../.local/timeline'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), date: new Date().toISOString(), runs: [] }
try {
  for (const size of [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce', isMobile: size.name === 'phone', hasTouch: size.name === 'phone' })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin !== origin) return route.abort()
      if (url.pathname.startsWith('/api/') && !['/api/scouting-geometry/assess', '/api/municipal-rules/v1/evaluate', '/api/municipal-rules/v1/placement-scenarios', '/api/placement-suggestions/v1/suggest'].includes(url.pathname)) return route.fulfill({ status: 503, body: 'Isolated external source boundary' })
      return route.continue()
    })
    const evidence = async () => JSON.parse(await page.locator('#builder-technical-record').inputValue())
    const result = async () => (await evidence()).project_timeline.result
    const reveal = async locator => {
      const details = locator.locator('xpath=ancestor::details')
      for (let index = await details.count() - 1; index >= 0; index--) {
        const item = details.nth(index)
        if (!await item.evaluate(node => node.open)) await item.locator(':scope > summary').click()
      }
    }
    const summary = page.locator('.project-economics')
    const compact = summary.locator('.project-timeline')
    const timeline = page.locator('#builder-timeline-estimate')
    const openTimeline = async () => {
      if (!await timeline.isVisible()) await compact.getByRole('link', { name: 'View and adjust timeline' }).click()
      await timeline.waitFor({ state: 'visible' })
      assert.equal(await timeline.locator('h1').evaluate(node => node === document.activeElement), true)
    }
    const closeTimeline = async () => {
      await timeline.getByRole('link', { name: 'Back to project', exact: true }).click()
      await timeline.waitFor({ state: 'detached' })
      assert.equal(await compact.getByRole('link', { name: 'View and adjust timeline' }).evaluate(node => node === document.activeElement), true)
    }
    const bounds = label => ({ min: timeline.getByRole('textbox', { name: `From ${label} (weeks)`, includeHidden: true }), max: timeline.getByRole('textbox', { name: `To ${label} (weeks)`, includeHidden: true }) })
    const edit = async (label, min, max = min) => {
      const fields = bounds(label)
      await reveal(fields.min)
      await fields.min.fill(min); await fields.max.fill(max)
    }
    try {
      await page.goto(origin)
      await page.getByRole('button', { name: 'Try an example', exact: true }).click()
      await page.waitForFunction(() => { const field = document.getElementById('builder-technical-record'); return field && JSON.parse(field.value).measurement })
      await page.getByRole('button', { name: 'Skip rental estimate', exact: true }).click()
      await compact.scrollIntoViewIfNeeded()
      await summary.screenshot({ path: `${output}/${size.name}-summary.png` })
      assert.match(await compact.innerText(), /Estimated ready for use/)
      assert.equal(await compact.locator('select, .timeline-stages').count(), 0, 'main flow stays compact')
      await compact.getByLabel('Project start date', { exact: true }).fill('2027-01-01')
      await openTimeline()
      assert.equal(await timeline.getByLabel('Project start date', { exact: true }).inputValue(), '2027-01-01')
      assert.equal(await timeline.locator('.timeline-chart > li').count(), 6)
      await page.screenshot({ path: `${output}/${size.name}-viewport.png` })
      await page.screenshot({ path: `${output}/${size.name}-expanded.png`, fullPage: true })
      await timeline.locator('.timeline-chart').getByRole('link', { name: 'Permits', exact: true }).click()
      assert.equal(await timeline.locator('#timeline-stage-permits').evaluate(node => node === document.activeElement), true)
      const municipal = (await result()).profile
      assert.equal(municipal.jurisdictionId, 'ca-bc-victoria')
      for (const [stage, value] of Object.entries({ Preparation: '2', Permits: '4', Production: '10', 'Site work': '3', Installation: '1', Completion: '2' })) await edit(stage, value)
      assert.equal((await result()).ready.maximum, 105)
      assert.match(await timeline.locator('.timeline-drivers').innerText(), /manufacturer schedule finishes later than site work/)
      await edit('Production', '1')
      assert.match(await timeline.locator('.timeline-drivers').innerText(), /Permits and site work finish later/)
      await edit('Production', '10')
      await closeTimeline()
      await page.goForward()
      await timeline.waitFor({ state: 'visible' })
      assert.equal((await result()).ready.maximum, 105, 'browser forward preserves edits')
      await page.goBack()
      await timeline.waitFor({ state: 'detached' })
      await openTimeline()
      await edit('Permits', '')
      assert.equal((await result()).ready, null)
      assert.match(await timeline.locator('.timeline-headline').innerText(), /Not estimated/)
      assert.equal(await timeline.locator('.timeline-chart').count(), 0, 'unknown stages never draw a shorter schedule')
      await edit('Permits', '8', '2')
      assert.equal((await result()).ready, null)
      assert.equal(await bounds('Permits').max.getAttribute('aria-invalid'), 'true')
      assert.match(await timeline.locator('.timeline-stages').innerText(), /To must be at least From/)
      assert.match(await timeline.locator('.timeline-stages').innerText(), /Complete building permit application through issuance/)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
      await edit('Permits', '4')
      const focus = bounds('Permits').min
      await focus.focus(); await focus.press('Tab')
      assert.equal(await bounds('Permits').max.evaluate(node => node === document.activeElement), true)
      assert.equal((await result()).ready.maximum, 105)
      await timeline.getByLabel('Manufacturer timing covers').selectOption('production_after_permits')
      assert.equal((await result()).draft.overrides.production, undefined, 'scope change clears incompatible duration')
      await edit('Production', '10')
      assert.equal((await result()).ready.maximum, 133)
      await timeline.getByLabel('Permit planning pathway').selectOption('unknown')
      assert.equal((await result()).ready, null)
      await timeline.getByLabel('Permit planning pathway').selectOption('additional_approvals')
      await edit('Additional approvals', '20')
      assert.equal(await timeline.locator('.timeline-chart > li').count(), 7)
      assert.equal((await result()).draft.overrides.permits, undefined, 'pathway change clears permit override')
      await timeline.getByLabel('Permit planning pathway').selectOption('building_permit')
      await closeTimeline()
      await page.getByRole('button', { name: 'Change rental preference', exact: true }).click()
      await page.getByRole('button', { name: 'Include rental income', exact: true }).click()
      await openTimeline()
      await timeline.getByRole('checkbox', { name: 'Estimate rent in the first year from project start' }).check()
      assert.ok((await evidence()).project_timeline.first_year_income)
      await closeTimeline()
      await page.getByRole('link', { name: 'View and adjust estimate', exact: false }).click()
      const expanded = page.locator('#builder-economics-estimate .project-timeline')
      await expanded.getByRole('link', { name: 'View and adjust timeline' }).click()
      assert.match(await timeline.innerText(), /first year from project start/)
      assert.equal(await timeline.getByLabel('Project start date', { exact: true }).inputValue(), '2027-01-01')
      await timeline.getByRole('link', { name: 'Back to project economics', exact: true }).click()
      await timeline.waitFor({ state: 'detached' })
      assert.equal(await expanded.getByRole('link', { name: 'View and adjust timeline' }).evaluate(node => node === document.activeElement), true)
      await page.getByRole('link', { name: 'Back to project', exact: true }).last().click()
      // Replay financial → timeline after both views were unmounted. The return
      // link must recover the launching surface, not the last globally used view.
      await page.goForward()
      await page.locator('#builder-economics-estimate').waitFor({ state: 'visible' })
      await page.goForward()
      await timeline.waitFor({ state: 'visible' })
      await timeline.getByRole('link', { name: 'Back to project economics', exact: true }).click()
      await timeline.waitFor({ state: 'detached' })
      assert.equal(await expanded.getByRole('link', { name: 'View and adjust timeline' }).evaluate(node => node === document.activeElement), true)
      await page.getByRole('link', { name: 'Back to project', exact: true }).last().click()
      await openTimeline()
      await edit('Completion', '40')
      await closeTimeline()
      const prior = (await result()).draft.contextKey
      const select = page.locator('#builder-model-choice')
      await reveal(select); await select.selectOption('aux-240')
      await page.waitForFunction(key => JSON.parse(document.getElementById('builder-technical-record').value).project_timeline.result.draft.contextKey !== key, prior)
      assert.deepEqual((await result()).draft.overrides, {}, 'model change resets all timing overrides')
      assert.ok((await evidence()).project_timeline.archived_drafts.some(draft => draft.overrides.completion?.minimum === '40'), 'inactive owner evidence is retained')
      await reveal(select); await select.selectOption('aux-300')
      assert.deepEqual((await result()).draft.overrides, {}, 'returning to a model cannot revive stale assumptions')
      const city = page.getByRole('textbox', { name: 'City or municipality in British Columbia', exact: true, includeHidden: true }).last()
      // Navigate to shared project details; do not invent a second location control.
      await page.locator('nav[aria-label="Prefab model steps"] a[href="#builder-property-details"]').click()
      const skipStreet = page.getByRole('button', { name: 'I’m not sure—continue', exact: true })
      if (await skipStreet.isVisible()) await skipStreet.click()
      await reveal(city); await city.fill('Saanich')
      await city.locator('xpath=ancestor::form').getByRole('button', { name: 'Use municipality' }).click()
      assert.equal((await result()).profile.jurisdictionId, 'ca-bc-saanich')
      assert.equal((await result()).profile.milestone, 'initial_response')
      assert.deepEqual((await result()).draft.overrides, {})
      await page.locator('nav[aria-label="Prefab model steps"] a[href="#builder-next"]').click()
      await page.locator('#builder-use').fill('Home office')
      assert.equal((await result()).context.proposedUse, 'other')
      assert.equal((await result()).profile, null, 'explicit other use cannot apply the residential timing target')
      assert.deepEqual((await result()).stages.find(stage => stage.id === 'permits').duration, { minimum: 42, maximum: 112 })
      await page.locator('#builder-use').fill('Garden suite')
      assert.equal((await result()).profile.jurisdictionId, 'ca-bc-saanich')
      assert.deepEqual((await result()).draft.overrides, {})
      await page.locator('nav[aria-label="Prefab model steps"] a[href="#builder-property-details"]').click()
      await reveal(city); await city.fill('Uncovered Town')
      await city.locator('xpath=ancestor::form').getByRole('button', { name: 'Use municipality' }).click()
      assert.equal((await result()).profile, null)
      assert.equal((await result()).stages.find(stage => stage.id === 'permits').origin, 'planning_allowance')
      // Property replacement must invalidate the prior scope even before another lot is selected.
      const oldProperty = (await result()).context.propertyKey
      await page.getByRole('button', { name: 'Wrong property? Change', exact: true }).click()
      assert.equal(await compact.count(), 0, 'old property timeline is removed immediately')
      await page.getByRole('button', { name: 'Can’t find your address? Enter details manually', exact: true }).click()
      await page.locator('#manual-address').fill('Synthetic second property; no real address')
      await page.getByRole('button', { name: 'Confirm my site description', exact: true }).click()
      assert.notEqual((await result()).context.propertyKey, oldProperty)
      assert.deepEqual((await result()).draft.overrides, {})
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      assert.ok(overflow <= 1)
      assert.deepEqual(errors, [])
      results.runs.push({ ...size, passed: true, errors, checks: 'compact main flow, dedicated page, chart and completion driver, browser back/forward and both return focus paths, include/skip rental, overlapping and serial schedules, unknown and reversed input, overrides, scope/pathway/model/city/property changes, evidence archive, shared expanded economics, keyboard field order' })
      console.log(`${size.name}: timeline integration passed`)
    } catch (error) {
      await page.screenshot({ path: `${output}/${size.name}-failure.png` })
      await writeFile(`${output}/${size.name}-failure.txt`, await page.locator('body').innerText())
      throw error
    } finally { await context.close() }
  }
} finally {
  await browser.close()
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2))
}
