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
test('switching models recovers independent questions, placements and costs without transferring them to another property', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  dom.window.scrollTo = () => {}
  Object.assign(dom.window.HTMLElement.prototype, { attachEvent: () => {}, detachEvent: () => {} })
  const originals = new Map<string, PropertyDescriptor | undefined>()
  const expose = (name: string, value: unknown) => { originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }) }
  for (const [name, value] of Object.entries({ Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, window: dom.window, document: dom.window.document, navigator: dom.window.navigator, requestAnimationFrame: (cb: () => void) => setTimeout(cb, 0), cancelAnimationFrame: clearTimeout, IS_REACT_ACT_ENVIRONMENT: true })) expose(name, value)
  const fixture = JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8'))
  const addresses = JSON.parse(readFileSync('src/site_discovery/may-street-api.fixture.json', 'utf8'))
  const municipal = JSON.parse(readFileSync('src/site_discovery/municipal-api.fixture.json', 'utf8'))
  expose('fetch', async (url: string, options: RequestInit) => url === '/api/address-search' ? { ok: true, json: async () => addresses }
    : url === '/api/municipal-sites/search' ? { ok: true, json: async () => municipal.search }
    : url === '/api/municipal-sites/observe' ? { ok: true, json: async () => municipal.observation }
    : url === '/api/scouting-geometry/assess'
    ? { ok: true, json: async () => ({ ...fixture, input: JSON.parse(String(options.body)), checks: fixture.checks.filter((check: {kind: string}) => check.kind !== 'requirement') }) }
    : { ok: false, status: 503 })
  const document = dom.window.document
  const root = createRoot(document.getElementById('root')!)
  const click = async (text: string) => act(async () => { const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text); assert.ok(button, text); button.click() })
  const edit = async (id: string, text: string) => act(async () => {
    const input = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement
    input.focus(); Object.getOwnPropertyDescriptor(input.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, text)
    input.dispatchEvent(new dom.window.KeyboardEvent('keyup', { key: '5', bubbles: true }))
  })
  const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)) }); await act(async () => { await new Promise(resolve => setTimeout(resolve, 450)) }) }
  let copied = ''
  Object.defineProperty(dom.window.navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { copied = value } } })
  const switchTo = async (id: string) => act(async () => { const select = document.getElementById('builder-model-choice') as HTMLSelectElement; select.value = id; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
  const question300 = 'Could Model 300 support a rental?\nPlease price sound insulation and explain the next step.'
  const question240 = 'For Model 240, could we use my Model 300 research?\nPlease quote a different window configuration.'
  let position300: unknown, position240: unknown
  const openEstimate = () => act(async () => document.querySelector<HTMLAnchorElement>('#builder-economics-open')!.click())
  const backToProject = () => act(async () => document.querySelector<HTMLAnchorElement>('.economics-back')!.click())
  const authoredCosts = () => evidence().project_budget.draft.items.filter((item: { selected: boolean; evidence: { origin: string } }) => item.selected && item.evidence.origin === 'user_allowance')
  const evidence = () => JSON.parse((document.getElementById('builder-technical-record') as HTMLTextAreaElement).value)
  try {
    await act(async () => root.render(createElement<{ presetRequest?: number }>(BuilderDemo, { presetRequest: 1 })))
    await settle()
    await edit('builder-use', 'a rental suite')
    const interests = () => document.querySelector('[aria-label="Rental interest"]')!
    assert.match(interests().textContent!, /Rental scenario included/, 'an explicit rental answer is reflected without repeating the question')
    await click('Change rental preference')
    await click('Skip rental estimate')
    assert.match(interests().textContent!, /Rental income skipped/, 'an explicit skip takes precedence over a previous rental answer')
    await edit('builder-use', 'Unknown'); await edit('builder-relationship', 'I own the property'); await edit('builder-nextStep', 'Please advise the next step.')
    const parcel = evidence().measurement.site.site.parcel.id
    for (const [id, answer] of [['building-type', 'Yes'], ['existing-suites', 'None'], ['waterfront-lot', 'No']]) {
      await act(async () => { [...document.querySelectorAll<HTMLButtonElement>(`#${id} button`)].find(button => button.textContent === answer)!.click() })
    }
    const retainedFacts = evidence().zoning_site_assumptions
    await edit('builder-configuration', 'Model 300 special options'); await settle()
    await edit('builder-email-recipient', 'old-provider@example.com')
    await edit('builder-question', question300)
    await edit('height-view-allowance', '0.45')
    await edit('builder-example-width', '12')
    await click('East →')
    await edit('builder-example-angle', '27')
    await settle()
    await openEstimate()
    await edit('economics-cost-unit', '210000')
    await backToProject()
    assert.equal(document.activeElement?.id, 'builder-economics-open')
    assert.equal(authoredCosts()[0].money.minimum, '210000')
    position300 = evidence().measurement.result.input.placement
    // Initial source figures / exact conversions from the model sheets; tolerance
    // for Quadra's explicitly approximate decimal feet is representational only.
    for (const [id, width, depth] of [['aux-240', 3.048, 7.3406], ['wcch-ch-studio', 2.4384, 6.096], ['hewing-quadra4', 6.1214, 6.1214], ['aux-300', 12, 9.144]] as const) {
      await switchTo(id)
      const reset = evidence()
      assert.equal(reset.measurement, null, 'old result is invalidated synchronously')
      assert.equal(reset.enquiry_inputs.configuration, id === 'aux-300' ? 'Model 300 special options' : '')
      assert.equal(reset.enquiry_inputs.question, id === 'aux-300' ? question300 : `Could ${journeyCatalogue.models.find(item => item.model_id === id)!.name} be suitable for this property?`)
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
      assert.equal(current.measurement.widthOrigin, id === 'aux-300' ? 'user' : 'catalogue')
      assert.equal(current.model_catalogue.snapshot_id, modelSnapshot(model))
      assert.equal(current.project_settings.proposal.proposed_use, null)
      assert.equal(current.foundation_scenario.allowance_m, id === 'aux-300' ? '0.45' : null)
      const input = current.enquiry_inputs
      const args = [null, input, current.measurement, false, null, null, true, null, null, null, current.project_settings.proposal, null, null, null, model] as const
      const doc = enquiryDocument(...args), report = screeningDocument(...args)
      const files = enquiryPackageFiles(doc, report, [], current, null)
      const recipient = new TextDecoder().decode(files['prefab-enquiry.md'])
      const supporting = new TextDecoder().decode(files['prefab-supporting-report.md'])
      const actual = (document.getElementById('builder-enquiry-text') as HTMLTextAreaElement).value
      for (const text of [recipient, supporting, actual]) { assert.ok(text.includes(model.name)); assert.doesNotMatch(text, /old-provider@example/); if (id !== 'aux-300') assert.doesNotMatch(text, /Model 300 special options/) }
      if (id === 'aux-300') {
        assert.deepEqual(current.measurement.result.input.placement, position300)
        assert.equal(authoredCosts()[0].money.minimum, '210000')
        assert.ok(current.project_budget.draft.items.length > 0)
        assert.ok(actual.includes(question300), 'preview restores the exact multiline question')
        await act(async () => (document.getElementById('builder-enquiry-text')!.parentElement!.querySelector('button') as HTMLButtonElement).click())
        assert.ok(copied.includes(question300), 'copied enquiry restores exact user prose')
        assert.ok(!copied.includes(question240))
        expose('Image', class { constructor() { throw new Error('Canvas export unavailable in fixture') } })
        await click('Save enquiry PDF')
        assert.equal(evidence().enquiry_inputs.question, question300, 'export failure preserves authored work')
        assert.ok([...document.querySelectorAll('[role=status]')].some(node => /download could not be prepared.*Copy/s.test(node.textContent!)), 'failure offers save/copy recovery')
        assert.doesNotMatch(document.body.textContent!, /Export downloaded/)
        assert.equal(document.getElementById('builder-enquiry-text')!.parentElement!.querySelector('button')!.disabled, false)
      }
      if (id === 'aux-240') {
        await edit('builder-question', question240)
        await edit('builder-configuration', 'Model 240 custom glazing')
        await edit('height-view-allowance', '0.15')
        await click('West ←')
        await edit('builder-example-angle', '41')
        await settle()
        await openEstimate()
        await edit('economics-cost-unit', '175000')
        await backToProject()
        position240 = evidence().measurement.result.input.placement
      }
      assert.equal(document.querySelector('#builder-provider-website')?.getAttribute('href'), id.startsWith('aux-') ? 'https://www.auxbox.ca/contact' : id === 'wcch-ch-studio' ? 'https://westcoastcontainerhomes.ca/contact/' : 'https://hewinghaus.com/connect/')
      if (!id.startsWith('aux-')) for (const text of [recipient, supporting, actual]) assert.doesNotMatch(text, /aux box|Model 300|187,000/)
      if (id === 'wcch-ch-studio') { assert.match(actual, /permanent residential use/); assert.match(supporting, /Currency unknown 96,860/); assert.match(actual, /unknown-use scenario/); assert.match(document.querySelector('#builder-quick-checks')!.textContent!, /Permanent dwelling suitability.*has not been established/s) }
      if (id === 'hewing-quadra4') { assert.match(supporting, /Advertised exterior height unknown/); assert.match(supporting, /CAD 224,000/) }
      const svg = placementDrawing(current.measurement, null, null, true, { ink: '#000', danger: '#f00', parcelFill: '#fff', parcelStroke: '#000', roofFill: '#ddd', roofStroke: '#000', zoneFill: '#aaa', zoneStroke: '#000' }).svg
      assert.ok(svg.includes(`Proposed ${model.name}`))
      assert.equal(JSON.parse(new TextDecoder().decode(files['prefab-technical-evidence.json'])).model_catalogue.model.model_id, id)
    }
    await switchTo('aux-240')
    assert.equal(evidence().measurement, null, 'restoration cannot restore stale measured findings')
    await settle()
    assert.deepEqual(evidence().measurement.result.input.placement, position240)
    assert.equal(evidence().enquiry_inputs.question, question240)
    assert.equal(evidence().enquiry_inputs.configuration, 'Model 240 custom glazing')
    assert.equal(evidence().foundation_scenario.allowance_m, '0.15')
    assert.equal(authoredCosts().length, 1)
    assert.equal(authoredCosts()[0].money.minimum, '175000')
    assert.ok(evidence().project_budget.draft.items.every((item: { context: { model_id: string } }) => item.context.model_id === 'aux-240'))
    assert.equal(authoredCosts()[0].recheck_reason, null, 'unchanged same-property alternative keeps its cost context')
    await edit('builder-use', 'Home office')
    assert.equal(evidence().conditional_screening, null, 'use changes invalidate affected checks')
    await switchTo('aux-300'); await settle()
    assert.equal(evidence().enquiry_inputs.intendedUse, 'Home office', 'use remains shared property/project context')
    assert.equal(evidence().enquiry_inputs.question, question300, 'shared-context changes preserve authored questions')
    assert.deepEqual(evidence().measurement.result.input.placement, position300, 'physical placement survives a shared-context change')
    assert.ok(authoredCosts().every((item: { recheck_reason: string | null }) => item.recheck_reason), 'changed use withholds costs until reviewed')
    assert.ok(![...document.querySelectorAll('#builder-model-choice option')].some(item => item.textContent?.includes('Yarrow')))
    // Reproduced defect: the mounted discovery flow kept its initial Model 300
    // callback after a model switch. A later selected property must use Quadra's
    // explicit unknown defaults, not the reference model's residential/foundation defaults.
    await click('Wrong property? Change')
    await act(async () => {
      const select = document.getElementById('builder-model-choice') as HTMLSelectElement
      select.value = 'hewing-quadra4'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
    })
    await edit('sd-address', '1144 May St, Victoria')
    await act(async () => document.querySelector('form.sd-search, .site-discovery form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })))
    await click('1144 May St, Victoria, BC · Victoria')
    await settle()
    assert.equal(evidence().model_catalogue.model.model_id, 'hewing-quadra4')
    assert.ok(evidence().live?.parcel, 'live source fixture selected')
    assert.match(interests().textContent!, /Considering renting this suite/, 'a new property starts its own optional rental question')
    assert.equal(evidence().live.parcel.id, '87:0', 'a different May Street source parcel was selected')
    assert.notEqual(evidence().live.parcel.id, parcel, 'May Street is a genuinely different parcel from the Cecelia example')
    assert.equal(evidence().measurement, null, 'different property has no transferred placement')
    assert.equal(authoredCosts().length, 0, 'different property has no transferred cost entries')
    assert.equal(evidence().enquiry_inputs.budget, '')
    await switchTo('aux-300'); await settle()
    assert.equal(evidence().enquiry_inputs.question, question300, 'authored provider question survives property changes')
    assert.equal(evidence().enquiry_inputs.configuration, '')
    assert.equal(evidence().measurement, null)
    assert.equal(authoredCosts().length, 0)
    await switchTo('hewing-quadra4'); await settle()
    assert.equal(evidence().project_settings.proposal.proposed_use, 'other', 'explicit homeowner use survives a property change')
    assert.equal(evidence().project_settings.proposal.foundation_attached, null)
    assert.equal(evidence().project_settings.evidence.proposed_use.origin, 'user')
    assert.equal(evidence().project_settings.evidence.foundation_attached.origin, 'unknown')
    await click('Place at parcel centre')
    await edit('occupied-angle', '13')
    await edit('occupied-parcel-minimum', '0.75')
    await settle()
    const livePlacement = evidence().measurement.result.input.placement
    await switchTo('aux-240'); await settle()
    assert.equal(evidence().measurement, null, 'new model on May Street has no old Cecelia placement')
    await click('Place at parcel centre')
    await edit('occupied-angle', '32')
    await settle()
    await switchTo('hewing-quadra4')
    assert.equal(evidence().measurement, null, 'live restoration invalidates derived findings')
    await settle()
    assert.deepEqual(evidence().measurement.result.input.placement, livePlacement, 'source-selected property restores each model placement')
    assert.equal((document.getElementById('occupied-parcel-minimum') as HTMLInputElement).value, '0.75', 'unverified user clearance target retained')
    await click('Change address')
    await click('Can’t find your address? Enter details manually')
    await edit('manual-address', 'Homeowner sketch')
    await edit('manual-width', '25'); await edit('manual-depth', '40')
    await edit('manual-placement-x', '10'); await edit('manual-placement-y', '12'); await edit('manual-placement-angle', '18')
    const manualPlacement = evidence().manual.placement
    await switchTo('aux-240')
    assert.equal(evidence().manual.placement, null, 'manual sketch does not reuse another model position')
    await edit('manual-placement-x', '15'); await edit('manual-placement-y', '22'); await edit('manual-placement-angle', '36')
    await switchTo('hewing-quadra4')
    assert.deepEqual(evidence().manual.placement, manualPlacement, 'manual alternative restores its physical inputs')
    assert.equal(evidence().manual.assessment, null, 'manual measured findings must be recomputed')
    assert.equal((document.getElementById('manual-width') as HTMLInputElement).value, '25', 'manual property sketch remains shared')

  } finally {
    await act(async () => root.unmount())
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})
