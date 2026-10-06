import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import BuilderDemo from './BuilderDemo'

// Exercise the actual host/map/summary/enquiry connections. HTTP geometry is a
// retained boundary fixture; this verifies workflow, not distance arithmetic.
test('saved journey puts results below map, focuses facts, invalidates late measurements and changes property', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  const originals = new Map<string, PropertyDescriptor | undefined>()
  const expose = (name: string, value: unknown) => { originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }) }
  for (const [name, value] of Object.entries({ Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, window: dom.window, document: dom.window.document, navigator: dom.window.navigator, requestAnimationFrame: (cb: () => void) => setTimeout(cb, 0), IS_REACT_ACT_ENVIRONMENT: true })) expose(name, value)
  const fixture = JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8'))
  let releaseLate!: () => void
  let geometryCalls = 0
  expose('fetch', async (url: string, options: RequestInit) => {
    if (url !== '/api/scouting-geometry/assess') return { ok: false, status: 503 }
    const input = JSON.parse(String(options.body))
    const result = { ...fixture, input, checks: fixture.checks.filter((check: {kind: string}) => check.kind !== 'requirement') }
    geometryCalls++
    if (geometryCalls === 2) await new Promise<void>(resolve => { releaseLate = resolve }) // Deliberately ignores abort.
    return { ok: true, json: async () => result }
  })
  const document = dom.window.document
  const root = createRoot(document.getElementById('root')!)
  const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === label)!
  const click = async (label: string) => { assert.ok(button(label), label); await act(async () => { button(label).click() }); await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) }) }
  try {
    await act(async () => { root.render(createElement(BuilderDemo)) })
    await click('Try an example property')
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)) })
    assert.match(document.querySelector('#builder-quick-checks')!.textContent!, /promising starting position/)
    const map = document.querySelector('#placement-map svg')!
    const summary = document.querySelector('#builder-quick-checks')!
    assert.ok(map.compareDocumentPosition(summary) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
    assert.ok(summary.compareDocumentPosition(document.querySelector('.builder-example-controls')!) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
    await click('Enter suite count')
    assert.equal(document.activeElement?.id, 'existing-suites')
    assert.ok(document.getElementById('existing-suites')?.closest('details')?.open)
    await click('Prepare enquiry')
    assert.match(document.getElementById('builder-enquiry-content')!.textContent!, /SAVED EXAMPLE/)
    await click('Mark enquiry ready')
    assert.match(document.getElementById('builder-enquiry-content')!.textContent!, /Ready for your review/)
    await click('2 · PlacementMeasured')
    await act(async () => { map.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })) })
    assert.doesNotMatch(summary.textContent!, /promising starting position/)
    assert.match(document.getElementById('builder-enquiry-content')!.textContent!, /Draft in progress/)
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)) })
    assert.equal(geometryCalls, 2)
    await click('Wrong property? Change')
    assert.equal(document.activeElement?.id, 'sd-address')
    await act(async () => { releaseLate() })
    assert.equal(document.getElementById('builder-quick-checks'), null)
    assert.equal(document.querySelector('#placement-map'), null)
    assert.match(document.getElementById('builder-property-content')!.textContent!, /Street address in British Columbia/)
  } finally {
    await act(async () => { root.unmount() })
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})
