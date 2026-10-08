import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
const { default: App } = await import('../App')

test('direct example URL opens a labelled preset; page navigation preserves it and homepage exposes example links', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://shovelready.test/#examples/model-300' })
  dom.window.scrollTo = () => {}
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  Object.assign(dom.window.HTMLElement.prototype, { attachEvent: () => {}, detachEvent: () => {} })
  const originals = new Map<string, PropertyDescriptor | undefined>()
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, requestAnimationFrame: (fn: () => void) => setTimeout(fn, 0), IS_REACT_ACT_ENVIRONMENT: true, fetch: async (url: string) => url === '/health' ? { ok: true, json: async () => ({ status: 'ok' }) } : { ok: false, status: 503 } })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  }
  const document = dom.window.document
  const root = createRoot(document.getElementById('root')!)
  const click = async (text: string) => act(async () => { const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === text); assert.ok(button, text); button.click(); await new Promise(resolve => setTimeout(resolve, 20)) })
  try {
    await act(async () => root.render(createElement(App)))
    assert.ok(document.querySelector('#placement-map'), 'preset route opens its map without a second example-choice control')
    assert.match(document.querySelector('.builder-selected-property')!.textContent!, /not your property/)
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-model-choice')!.value, 'aux-300')
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-intended-use')!.value, '', 'preset does not invent intended use')
    assert.equal(document.querySelector('#builder-site-mode'), null)
    await click('Home')
    assert.equal(dom.window.location.hash, '#home')
    await click('Prefab models')
    assert.match(document.querySelector('.builder-selected-property')!.textContent!, /not your property/)
    await click('Home'); await click('Explore examples')
    assert.ok(document.querySelector('a[href="#examples/model-300"]'), 'homepage examples have a shareable preset route')
    await act(async () => { document.querySelector<HTMLAnchorElement>('a[href="#examples/model-300"]')!.click(); await new Promise(resolve => setTimeout(resolve, 25)) })
    assert.equal(dom.window.location.hash, '#examples/model-300')
    assert.ok(document.querySelector('#placement-map'))
    await click('Wrong property? Change')
    assert.ok(document.querySelector('#sd-address'), 'changing the preset opens address search')
    assert.doesNotMatch(document.querySelector('#builder-property-content')!.textContent!, /Try an example property|How would you like to enter/)
    await click('Can’t find your address? Enter details manually')
    assert.ok(document.querySelector('.manual-site'), 'manual fallback remains reachable')
    await click('Back to address search')
    assert.ok(document.querySelector('#sd-address'))
  } finally {
    await act(async () => root.unmount())
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})
