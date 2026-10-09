import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
const { default: App } = await import('../App')

test('one assessment supports fresh, demo and model links without history resets or silent replacement', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://shovelready.test/#examples/model-300' })
  dom.window.scrollTo = () => {}
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  Object.assign(dom.window.HTMLElement.prototype, { attachEvent: () => {}, detachEvent: () => {} })
  Object.assign(dom.window.HTMLDialogElement.prototype, { showModal(this: HTMLDialogElement) { this.open = true }, close(this: HTMLDialogElement) { this.open = false } })
  const originals = new Map<string, PropertyDescriptor | undefined>()
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, requestAnimationFrame: (fn: () => void) => setTimeout(fn, 0), IS_REACT_ACT_ENVIRONMENT: true, fetch: async (url: string) => url === '/health' ? { ok: true, json: async () => ({ status: 'ok' }) } : { ok: false, status: 503 } })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  }
  const document = dom.window.document
  const root = createRoot(document.getElementById('root')!)
  const click = async (text: string) => act(async () => { const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === text); assert.ok(button, text); button.click(); await new Promise(resolve => setTimeout(resolve, 20)) })
  try {
    await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
    assert.match(document.querySelector('.builder-hero')!.textContent!, /Example assessment/)
    assert.ok(document.querySelector('#placement-map'), 'preset route opens its map without a second example-choice control')
    assert.match(document.querySelector('.builder-selected-property')!.textContent!, /not your property/)
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-model-choice')!.value, 'aux-300')
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-intended-use')!.value, '', 'preset does not invent intended use')
    assert.equal(document.querySelector('#builder-site-mode'), null)
    await click('Home')
    assert.equal(dom.window.location.hash, '#home')
    await click('Start assessment')
    assert.match(document.querySelector('.builder-selected-property')!.textContent!, /not your property/)
    const selectModel = async (id: string) => act(async () => {
      const select = document.querySelector<HTMLSelectElement>('#builder-model-choice')!
      select.value = id; select.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
    })
    await selectModel('hewing-quadra4')
    await click('Home'); await click('Try the demo')
    assert.ok(document.querySelector('dialog[open]') !== null, 'explicit replacement asks before changing existing work')
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-model-choice')!.value, 'hewing-quadra4')
    await click('Keep current assessment')
    await click('Home'); await click('Start assessment')
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-model-choice')!.value, 'hewing-quadra4', 'ordinary entry resumes the selected model')
    await act(async () => { dom.window.history.back(); await new Promise(resolve => setTimeout(resolve, 25)) })
    await act(async () => { dom.window.history.forward(); await new Promise(resolve => setTimeout(resolve, 25)) })
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-model-choice')!.value, 'hewing-quadra4', 'back/forward does not reapply Model 300')
    await click('Home'); await click('Try the demo'); await click('Load example assessment')
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-model-choice')!.value, 'aux-300')
    assert.ok(document.querySelector('#placement-map'))
    await click('Wrong property? Change')
    assert.ok(document.querySelector('#sd-address'), 'changing the preset opens address search')
    assert.doesNotMatch(document.querySelector('#builder-property-content')!.textContent!, /Try an example property|How would you like to enter/)
    await click('Can’t find your address? Enter details manually')
    assert.ok(document.querySelector('.manual-site'), 'manual fallback remains reachable')
    await click('Back to address search')
    assert.ok(document.querySelector('#sd-address'))
    await act(async () => { document.querySelector<HTMLAnchorElement>('a[href="#builder-model"]')!.click(); await new Promise(resolve => setTimeout(resolve, 20)) })
    assert.equal(document.querySelector('#sd-address')!.closest('[hidden]'), null, 'navigation cannot hide empty address entry')
    assert.ok(![...document.querySelectorAll('button')].some(node => ['Collapse property', 'Review or change property'].includes(node.textContent ?? '')), 'empty location has no collapse toggle')
    assert.equal(document.querySelector('#placement-map'), null, 'switching to own property clears example geometry and results')
    assert.doesNotMatch(document.querySelector('.builder-hero')!.textContent!, /Example assessment/, 'saved example identity is cleared')
    assert.equal(document.querySelector('#builder-enquiry-text'), null, 'old example enquiry is unavailable')
    await act(async () => { dom.window.history.replaceState(null, '', '#assessment'); root.render(createElement(App, { key: 'fresh' })) })
    assert.ok(document.querySelector('#sd-address'))
    assert.equal(document.querySelector('#placement-map'), null, 'fresh assessment never loads example geometry')
    assert.ok(![...document.querySelectorAll('[aria-label="Main navigation"] button')].some(node => /Prefab models|General assessment|Demo/.test(node.textContent ?? '')))
    await click('Home'); await click('Try the demo')
    assert.ok(document.querySelector('dialog[open]') !== null, 'even an unconfirmed address is protected once journey opened')
    await click('Load example assessment')
    assert.ok(document.querySelector('#placement-map'))
    await act(async () => { dom.window.history.replaceState(null, '', '#assessment?model=hewing-quadra4'); root.render(createElement(App, { key: 'model-link' })) })
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-model-choice')!.value, 'hewing-quadra4')
    assert.equal(document.querySelector('#placement-map'), null, 'builder model link selects a model without example data')
    await act(async () => { dom.window.history.replaceState(null, '', '#builder'); root.render(createElement(App, { key: 'old-builder' })) })
    assert.ok(document.querySelector('#sd-address'), 'old builder URL opens shared empty journey')
    await act(async () => { dom.window.history.replaceState(null, '', '#inputs'); root.render(createElement(App, { key: 'old-inputs' })) })
    assert.ok(document.querySelector('[aria-label="Input preparation steps"]'), 'research preparation tools remain reachable')

  } finally {
    await act(async () => root.unmount())
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})
