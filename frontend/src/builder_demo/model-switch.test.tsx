import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import BuilderDemo from './BuilderDemo'
import { journeyCatalogue, modelSnapshot } from '../model_catalogue/demo'
import { enquiryPackageFiles, placementDrawing } from './placementExport'
import { enquiryDocument, screeningDocument } from './BuilderDemo'

// Public-source body dimensions are independent expected values. Mock only HTTP;
// this exercises host -> model/placement -> enquiry/evidence/package connections.
// Fixture checks are not evidence of geometry arithmetic or legal applicability.
test('switching models retains the property, resets overrides and exports only the selected provider', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  Object.assign(dom.window.HTMLElement.prototype, { attachEvent: () => {}, detachEvent: () => {} })
  const originals = new Map<string, PropertyDescriptor | undefined>()
  const expose = (name: string, value: unknown) => { originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }) }
  for (const [name, value] of Object.entries({ Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, window: dom.window, document: dom.window.document, navigator: dom.window.navigator, requestAnimationFrame: (cb: () => void) => setTimeout(cb, 0), IS_REACT_ACT_ENVIRONMENT: true })) expose(name, value)
  const fixture = JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8'))
  expose('fetch', async (url: string, options: RequestInit) => url === '/api/scouting-geometry/assess'
    ? { ok: true, json: async () => ({ ...fixture, input: JSON.parse(String(options.body)), checks: fixture.checks.filter((check: {kind: string}) => check.kind !== 'requirement') }) }
    : { ok: false, status: 503 })
  const document = dom.window.document
  const root = createRoot(document.getElementById('root')!)
  const click = async (text: string) => act(async () => { const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text); assert.ok(button, text); button.click() })
  const edit = async (id: string, text: string) => act(async () => {
    const input = document.getElementById(id) as HTMLInputElement
    input.focus(); Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, text)
    input.dispatchEvent(new dom.window.KeyboardEvent('keyup', { key: '5', bubbles: true }))
  })
  const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)) }); await act(async () => { await new Promise(resolve => setTimeout(resolve, 450)) }) }
  const evidence = () => JSON.parse((document.getElementById('builder-technical-record') as HTMLTextAreaElement).value)
  try {
    await act(async () => root.render(createElement(BuilderDemo)))
    await click('Try an example property'); await settle()
    await edit('builder-use', 'Unknown'); await edit('builder-relationship', 'I own the property'); await edit('builder-nextStep', 'Please advise the next step.')
    const parcel = evidence().measurement.site.site.parcel.id
    for (const [id, answer] of [['building-type', 'Yes'], ['existing-suites', 'None'], ['waterfront-lot', 'No']]) {
      await act(async () => { [...document.querySelectorAll<HTMLButtonElement>(`#${id} button`)].find(button => button.textContent === answer)!.click() })
    }
    const retainedFacts = evidence().zoning_site_assumptions
    await edit('builder-configuration', 'Model 300 special options'); await settle()
    await edit('builder-email-recipient', 'old-provider@example.com')
    await edit('builder-example-width', '12')
    // Initial source figures / exact conversions from the model sheets; tolerance
    // for Quadra's explicitly approximate decimal feet is representational only.
    for (const [id, width, depth] of [['aux-240', 3.048, 7.3406], ['wcch-ch-studio', 2.4384, 6.096], ['hewing-quadra4', 6.1214, 6.1214], ['aux-300', 3.048, 9.144]] as const) {
      await act(async () => { const select = document.getElementById('builder-model-choice') as HTMLSelectElement; select.value = id; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
      const reset = evidence()
      assert.equal(reset.measurement, null, 'old result is invalidated synchronously')
      assert.equal(reset.enquiry_inputs.configuration, '')
      assert.equal(document.getElementById('builder-email-recipient'), null, 'pending model cannot prepare an email')
      assert.equal(reset.enquiry_inputs.intendedUse, 'Unknown')
      assert.equal(reset.enquiry_inputs.relationship, 'I own the property')
      await settle()
      assert.equal((document.getElementById('builder-email-recipient') as HTMLInputElement).value, '')
      const current = evidence(), model = journeyCatalogue.models.find(item => item.model_id === id)!
      for (const key of ['building_type', 'existing_garden_suites', 'waterfront']) assert.deepEqual(current.zoning_site_assumptions[key], retainedFacts[key])
      assert.equal(current.measurement.site.site.parcel.id, parcel)
      assert.equal(current.measurement.model.model_id, id)
      assert.ok(Math.abs(current.measurement.result.input.placement.width_m - width) < 1e-10)
      assert.ok(Math.abs(current.measurement.result.input.placement.depth_m - depth) < 1e-10)
      assert.equal(current.measurement.widthOrigin, 'catalogue')
      assert.equal(current.model_catalogue.snapshot_id, modelSnapshot(model))
      assert.equal(current.project_settings.proposal.proposed_use, null)
      assert.equal(current.foundation_scenario.allowance_m, null)
      const input = current.enquiry_inputs
      const args = [null, input, current.measurement, false, null, null, true, null, null, null, current.project_settings.proposal, null, null, null, model] as const
      const doc = enquiryDocument(...args), report = screeningDocument(...args)
      const files = enquiryPackageFiles(doc, report, [], current, null)
      const recipient = new TextDecoder().decode(files['prefab-enquiry.md'])
      const supporting = new TextDecoder().decode(files['prefab-supporting-report.md'])
      const actual = (document.getElementById('builder-enquiry-text') as HTMLTextAreaElement).value
      for (const text of [recipient, supporting, actual]) { assert.ok(text.includes(model.name)); assert.doesNotMatch(text, /Model 300 special options|old-provider@example/) }
      assert.equal(document.querySelector('#builder-provider-website')?.getAttribute('href'), id.startsWith('aux-') ? 'https://www.auxbox.ca/contact' : id === 'wcch-ch-studio' ? 'https://westcoastcontainerhomes.ca/contact/' : 'https://hewinghaus.com/connect/')
      if (!id.startsWith('aux-')) for (const text of [recipient, supporting, actual]) assert.doesNotMatch(text, /aux box|Model 300|187,000/)
      if (id === 'wcch-ch-studio') { assert.match(actual, /permanent residential use/); assert.match(supporting, /Currency unknown 96,860/); assert.match(actual, /unknown-use scenario/); assert.match(document.querySelector('#builder-quick-checks')!.textContent!, /Permanent dwelling suitability.*has not been established/s) }
      if (id === 'hewing-quadra4') { assert.match(supporting, /Advertised exterior height unknown/); assert.match(supporting, /CAD 224,000/) }
      const svg = placementDrawing(current.measurement, null, null, true, { ink: '#000', danger: '#f00', parcelFill: '#fff', parcelStroke: '#000', roofFill: '#ddd', roofStroke: '#000', zoneFill: '#aaa', zoneStroke: '#000' }).svg
      assert.ok(svg.includes(`Proposed ${model.name}`))
      assert.equal(JSON.parse(new TextDecoder().decode(files['prefab-technical-evidence.json'])).model_catalogue.model.model_id, id)
    }
    assert.ok(![...document.querySelectorAll('#builder-model-choice option')].some(item => item.textContent?.includes('Yarrow')))
  } finally {
    await act(async () => root.unmount())
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})
