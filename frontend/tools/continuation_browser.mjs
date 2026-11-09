// Regression for the shared continuation at the scroll boundary and on a phone.
// Use the saved example with the stateless local API and offline source boundaries.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.env.CONTINUATION_URL ?? 'http://127.0.0.1:18138'
const origin = new URL(base).origin
assert.equal(new URL(base).hostname, '127.0.0.1', 'Use an isolated local preview')
const localApis = new Set([
  '/api/identity', '/api/scouting-geometry/assess', '/api/municipal-rules/v1/evaluate',
  '/api/municipal-rules/v1/placement-scenarios', '/api/placement-suggestions/v1/suggest',
])
const browser = await chromium.launch({
  headless: true,
  ...(process.env.WALKTHROUGH_BROWSER ? { channel: process.env.WALKTHROUGH_BROWSER } : {}),
})
const results = []

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const phone = viewport.width === 390
      const context = await browser.newContext({ viewport, reducedMotion, isMobile: phone, hasTouch: phone })
      const page = await context.newPage()
      const errors = []
      page.setDefaultTimeout(6000)
      page.on('pageerror', error => errors.push(error.message))
      await context.route('**/*', route => {
        const url = new URL(route.request().url())
        if (url.origin !== origin) {
          errors.push(`Unexpected external request to ${url.origin}`)
          return route.abort()
        }
        if (url.pathname.startsWith('/api/') && !localApis.has(url.pathname)) {
          return route.fulfill({ status: 503, body: 'Offline source boundary' })
        }
        return route.continue()
      })

      const nav = page.getByRole('navigation', { name: 'Prefab model steps' })
      const active = page.locator('.floating-next:visible .builder-continue:visible')
      const reach = async (name, step) => {
        await page.waitForFunction(({ name, step }) => {
          const actions = [...document.querySelectorAll('.floating-next .builder-continue')]
            .filter(button => button.getClientRects().length)
          if (actions.length !== 1 || !actions[0].textContent.includes(name)) return false
          const current = document.querySelector('nav[aria-label="Prefab model steps"] [aria-current="step"]')
          if (!current?.textContent.includes(step)) return false
          const bounds = actions[0].getBoundingClientRect()
          return bounds.top >= 0 && bounds.bottom <= innerHeight &&
            bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth &&
            actions[0].contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2))
        }, { name, step }, { timeout: 5000 })
        assert.equal(await active.count(), 1, `One continuation for ${step}`)
      }
      const pointerAdvance = () => phone ? active.tap() : active.click()
      const leaveStreetsUnknown = async () => {
        const unknown = page.getByRole('button', { name: 'I’m not sure—continue', exact: true })
        if (await unknown.isVisible()) await unknown.click()
      }
      const steady = async step => {
        await page.waitForFunction(() => {
          const record = document.querySelector('#builder-technical-record')
          return record && JSON.parse(record.value).evaluation_state === 'current'
        })
        await page.waitForLoadState('networkidle')
        const measurements = await active.evaluate(async button => {
          const bar = button.closest('.floating-next')
          const oldPosition = bar.style.position
          // Read the end-of-step position without the sticky inset, then restore
          // the real layout before sampling motion on either side of the threshold.
          bar.style.position = 'static'
          const naturalBottom = bar.getBoundingClientRect().bottom + scrollY
          bar.style.position = oldPosition
          const threshold = naturalBottom - innerHeight
          const documentHeight = document.documentElement.scrollHeight
          const result = []
          for (const offset of [-80, -32, -8, 0, 24]) {
            scrollTo({ top: threshold + offset, behavior: 'instant' })
            const frames = []
            for (let frame = 0; frame < 16; frame++) {
              await new Promise(requestAnimationFrame)
              const rect = button.getBoundingClientRect()
              frames.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, scroll: scrollY,
                documentHeight: document.documentElement.scrollHeight })
            }
            result.push({ offset, frames })
          }
          return { documentHeight, result }
        })
        for (const { offset, frames } of measurements.result) {
          const [first, ...rest] = frames
          assert.equal(first.documentHeight, measurements.documentHeight, `${step} reserves its place at ${offset}`)
          assert.deepEqual(rest, Array(rest.length).fill(first), `${step} is stationary at scroll offset ${offset}`)
        }
        const [before] = measurements.result[0].frames
        const [after] = measurements.result.at(-1).frames
        assert.equal(before.width, after.width, `${step} has a stable action width`)
      }

      await page.goto(base)
      await page.getByRole('button', { name: 'Try an example', exact: true }).click()
      await nav.locator('a[href="#builder-placement"]').click()
      await leaveStreetsUnknown()
      await page.waitForFunction(() => {
        const button = document.querySelector('.builder-placement-next .builder-continue')
        return button?.textContent.includes('Next:')
      })
      const placementTarget = (await active.textContent()).includes('Mark street edges') ? 'Mark street edges' : 'Review boundaries'
      await reach(placementTarget, 'Placement')
      await page.waitForFunction(() => document.activeElement?.id === 'builder-placement-map-title')
      // Evaluate the arrival viewport directly; locator.click would scroll the preview into view.
      const placementArrival = await page.getByRole('button', { name: 'Open full-size placement preview' }).evaluate(button => {
        const preview = button.getBoundingClientRect()
        const map = document.querySelector('#placement-map svg.occupied-map').getBoundingClientRect()
        return {
          mapY: map.top, previewY: preview.top, previewBottom: preview.bottom,
          previewHit: button.contains(document.elementFromPoint(preview.x + preview.width / 2, preview.y + preview.height / 2)),
        }
      })
      assert.ok(placementArrival.mapY >= 0 && placementArrival.mapY < viewport.height, 'Arrival shows the interactive map')
      assert.ok(placementArrival.previewY >= 0 && placementArrival.previewBottom <= viewport.height && placementArrival.previewHit,
        'The placement preview receives a pointer without scrolling')
      await pointerAdvance()
      await leaveStreetsUnknown()
      if ((await nav.locator('[aria-current="step"]').textContent()).includes('Street')) {
        await reach('Review boundaries', 'Street')
        await pointerAdvance()
        await leaveStreetsUnknown()
      }
      await reach('Review property details', 'Boundaries')
      const boundaryReach = await active.boundingBox()
      const boundaryMap = await page.locator('#placement-map svg.occupied-map').boundingBox()
      if (phone) assert.ok(boundaryMap.y >= viewport.height || boundaryMap.y + boundaryMap.height <= 0,
        'The phone reproduction reaches Next while the boundary map is offscreen')
      await pointerAdvance()

      await reach('Intended purpose', 'Property details')
      await steady('Property details')
      const optional = page.getByText('Optional measurements', { exact: true })
      await optional.click()
      const floor = page.locator('#zsa-floor-area')
      const focusBeforeFloor = page.getByRole('button', { name: 'About City of Victoria floor area measurement', exact: true })
      await floor.evaluate(input => {
        const rect = input.getBoundingClientRect()
        scrollTo({ top: scrollY + rect.bottom - innerHeight + 8, behavior: 'instant' })
      })
      await focusBeforeFloor.evaluate(button => button.focus({ preventScroll: true }))
      await page.keyboard.press('Tab')
      assert.equal(await floor.evaluate(input => document.activeElement === input), true)
      await page.waitForFunction(() => {
        const input = document.getElementById('zsa-floor-area')
        const bounds = input.getBoundingClientRect()
        return bounds.top >= 0 && bounds.bottom <= innerHeight &&
          document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2) === input
      }, undefined, { timeout: 3000 })
      await active.press('Enter')

      await reach('Review quick checks', 'Intended purpose')
      await steady('Intended purpose')
      if (phone) await pointerAdvance()
      else await active.press('Enter')

      await reach('Review project economics', 'Quick checks')
      await page.waitForFunction(() => !document.querySelector('.floating-next--active .builder-continue')?.disabled)
      await page.waitForLoadState('networkidle')
      const checksArrival = await page.locator('#builder-quick-checks').evaluate(section => {
        const heading = section.querySelector('h3')
        const counts = section.querySelector('[aria-label="Named check counts"]')
        const footer = document.querySelector('#builder-checks-disclosure .floating-next')
        const labelsFit = [...counts.querySelectorAll('button')].every(button => {
          const bounds = button.getBoundingClientRect()
          const range = document.createRange()
          range.selectNodeContents(button.querySelector('strong'))
          const text = range.getBoundingClientRect()
          return text.left >= bounds.left && text.right <= bounds.right
        })
        return {
          labelsFit, focus: document.activeElement === heading,
          titleY: heading.getBoundingClientRect().top, countsY: counts.getBoundingClientRect().top,
          countsBottom: counts.getBoundingClientRect().bottom,
          footerY: Math.min(innerHeight, footer.getBoundingClientRect().top),
        }
      })
      assert.ok(checksArrival.focus && checksArrival.titleY >= 0 && checksArrival.countsBottom <= checksArrival.footerY,
        `Quick checks opens at the visible headline and counts: ${JSON.stringify(checksArrival)}`)
      assert.ok(checksArrival.labelsFit, 'Check count labels fit inside their own buttons')
      await active.press('Enter')

      await reach('Continue to enquiry', 'Project economics')
      await pointerAdvance()
      await nav.locator('a[href="#builder-next"][aria-current="step"]').waitFor({ timeout: 5000 })
      assert.deepEqual(errors, [])
      results.push({ viewport, reducedMotion, placementArrival, checksArrival, boundaryActionY: boundaryReach.y, boundaryMapY: boundaryMap.y })
      await context.close()
    }
  }
} finally {
  await browser.close()
}
console.log(JSON.stringify(results, null, 2))
