import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import BuilderDemo from './BuilderDemo'

test('playback pause, skip and edit takeover retain current state and reject an obsolete measurement', async () => {
  // Retained HTTP boundary response protects workflow identity, not arithmetic.
  // The browser suite separately calls the real local geometry/planning API.
  const fixture = JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8'))
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  Object.assign(dom.window.HTMLElement.prototype, { attachEvent() {}, detachEvent() {} })
  Object.assign(dom.window.HTMLDialogElement.prototype, { showModal(this: HTMLDialogElement) { this.open = true }, close(this: HTMLDialogElement) { this.open = false } })
  dom.window.matchMedia = (() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as unknown as typeof dom.window.matchMedia
  const originals = new Map<string, PropertyDescriptor | undefined>()
  let hold = false, release: (() => void) | undefined, held = false
  for (const [name, value] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Element: dom.window.Element, HTMLElement: dom.window.HTMLElement,
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 0), cancelAnimationFrame: clearTimeout,
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: async (url: string, options: RequestInit) => {
      if (url !== '/api/scouting-geometry/assess') return { ok: false, status: 503 }
      const input = JSON.parse(String(options.body))
      if (hold) { held = true; await new Promise<void>(resolve => { release = resolve }) } // Ignores abort deliberately.
      return { ok: true, json: async () => ({ ...fixture, input, checks: fixture.checks.filter((check: { kind: string }) => check.kind !== 'requirement') }) }
    },
  })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  }
  const document = dom.window.document, root = createRoot(document.getElementById('root')!)
  const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === label)!
  const click = async (label: string) => { assert.ok(button(label), label); await act(async () => { button(label).click(); await new Promise(resolve => setTimeout(resolve, 20)) }) }
  const tick = async (ms: number) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)) })
  const caption = () => document.querySelector('[data-playback-controls] p')?.textContent
  try {
    await act(async () => root.render(<BuilderDemo entryRequest={{ example: true, modelId: 'aux-300', walkthrough: true }} />))
    assert.match(caption()!, /Model 300/)
    await click('Pause'); await tick(550); assert.match(caption()!, /Model 300/)
    await click('Resume'); await click('Next'); assert.match(caption()!, /Parcel 87/)
    await click('Next'); await tick(800)
    assert.match(caption()!, /starting position/)
    hold = true; await click('Skip to result'); await tick(550)
    assert.ok(held)
    await click('Pause'); assert.match(caption()!, /Move away/)
    await act(async () => {
      const select = document.querySelector<HTMLSelectElement>('#builder-model-choice')!
      select.value = 'hewing-quadra4'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
    })
    assert.equal(caption(), undefined)
    hold = false
    await act(async () => { release?.(); await new Promise(resolve => setTimeout(resolve, 50)) })
    await tick(1000)
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-model-choice')!.value, 'hewing-quadra4')
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-intended-use')!.value, '', 'obsolete playback cannot supply a scenario')
    const evidence = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value)
    assert.equal(evidence.measurement?.model.model_id, 'hewing-quadra4')
    assert.deepEqual(evidence.demo_answer_provenance, {})
    await click('Replay walkthrough'); assert.ok(document.querySelector('dialog[open]'))
    await click('Keep current assessment')
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-model-choice')!.value, 'hewing-quadra4')
    await act(async () => root.render(<BuilderDemo visible={false} />))
    assert.equal(caption(), undefined)
  } finally {
    release?.(); await act(async () => root.unmount())
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})
