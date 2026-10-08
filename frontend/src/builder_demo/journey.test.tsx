import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import BuilderDemo from './BuilderDemo'
import { BuilderJourneyNav, emptyBuilderJourneyCompletion } from '../navigation/BuilderJourneyNav'
import { expectedPropertyRevision } from '../conditional_screening/model'
import type { ScenarioRequest, ScenarioResult } from '../conditional_screening/scenarios'

// Exercise the actual host/map/summary/enquiry connections. HTTP geometry is a
// retained boundary fixture; this verifies workflow, not distance arithmetic.
test('saved journey puts results below map, focuses facts, invalidates late measurements and changes property', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  let lastScroll: { id: string; options: ScrollIntoViewOptions } | null = null
  dom.window.HTMLElement.prototype.scrollIntoView = function(options) { lastScroll = { id: this.id, options: options as ScrollIntoViewOptions } }
  Object.assign(dom.window.HTMLElement.prototype, { attachEvent: () => {}, detachEvent: () => {} })
  const originals = new Map<string, PropertyDescriptor | undefined>()
  const expose = (name: string, value: unknown) => { originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }) }
  for (const [name, value] of Object.entries({ Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, window: dom.window, document: dom.window.document, navigator: dom.window.navigator, requestAnimationFrame: (cb: () => void) => setTimeout(cb, 0), IS_REACT_ACT_ENVIRONMENT: true })) expose(name, value)
  let mapVisibility!: (visible: boolean) => void
  const visibility = new Map<Element, (visible: boolean) => void>()
  expose('IntersectionObserver', class {
    callback: (entries: { target: Element; isIntersecting: boolean; intersectionRatio: number }[]) => void
    constructor(callback: (entries: { target: Element; isIntersecting: boolean; intersectionRatio: number }[]) => void) { this.callback = callback }
    observe(target: Element) { const notify = (visible: boolean) => this.callback([{ target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]); visibility.set(target, notify); if (target.tagName === 'svg') mapVisibility = notify }
    disconnect() {}
  })
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
  function Journey() {
    const [completion, setCompletion] = useState(emptyBuilderJourneyCompletion)
    return <><BuilderJourneyNav completion={completion} /><BuilderDemo onProgressChange={setCompletion} /></>
  }
  const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === label)!
  const click = async (label: string) => { assert.ok(button(label), label); await act(async () => { button(label).click() }); await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) }) }
  try {
    await act(async () => { root.render(createElement(Journey)) })
    await click('Try an example property')
    await act(async () => { const choice = document.getElementById('builder-intended-use') as HTMLSelectElement; choice.value = 'Garden suite'; choice.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)) })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 450)) })
    assert.match(document.querySelector('#builder-quick-checks')!.textContent!, /Review this placement/)
    const map = document.querySelector('#placement-map svg')!
    const summary = document.querySelector('#builder-quick-checks')!
    assert.ok(map.compareDocumentPosition(summary) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
    assert.ok(document.querySelector('.boundary-map-tools')!.compareDocumentPosition(document.querySelector('.builder-placement-next')!) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
    assert.equal(document.querySelector('.occupied-map-concerns'), null, 'movement is not interrupted by an acknowledgement panel')
    const beforeFloating = document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value
    await act(async () => mapVisibility(true))
    assert.ok(document.querySelector('.builder-placement-next--floating'), 'Next floats while the map is in view')
    await act(async () => mapVisibility(false))
    assert.equal(document.querySelector('.builder-placement-next--floating'), null, 'Next returns to the document when the map leaves view')
    assert.equal(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value, beforeFloating, 'presentation changes do not edit the scenario')
    assert.ok(document.querySelector('.builder-placement-next')!.compareDocumentPosition(summary) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
    assert.equal(document.querySelector<HTMLDetailsElement>('.homeowner-summary__checks')!.open, true)
    await act(async () => document.querySelector<HTMLButtonElement>('.homeowner-summary__counts .homeowner-summary__review')!.click())
    assert.equal(document.activeElement, document.querySelector('.homeowner-summary__checks li.homeowner-summary__unknown'))
    const titleHelp = document.querySelector<HTMLButtonElement>('[aria-label="About Title restrictions"]')!
    await act(async () => titleHelp.focus())
    assert.match(document.querySelector('[role=tooltip]')!.textContent!, /current title.*LTSA/)
    await act(async () => titleHelp.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    assert.equal(titleHelp.getAttribute('aria-expanded'), 'false')
    // Guided progression preserves an approximate placement and unknowns rather
    // than requiring every assessment row to pass before an unsent enquiry.
    const mapHelp = document.querySelector<HTMLButtonElement>('[aria-label="About Map sources & accuracy"]')!
    await act(async () => mapHelp.focus())
    assert.match(document.querySelector('[role=tooltip]')!.textContent!, /City of Victoria.*Captured.*Rooflines are not building walls/s)
    await act(async () => mapHelp.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    const initialMeasurement = document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value
    await click('Next: Mark street edges →')
    assert.equal(document.activeElement?.id, 'placement-action-front')
    assert.equal(document.querySelector('.builder-journey-rail [aria-current="step"]')?.getAttribute('href'), '#placement-action-front')
    await click('Edge 1 borders a street')
    await click('Edge 1 borders a street')
    const clearedStreet = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).zoning_site_assumptions.street_adjacency
    assert.deepEqual(clearedStreet.edge_ids, [])
    assert.equal(clearedStreet.all_marked, false, 'removing the last street leaves context unknown')
    await click('Edge 1 borders a street')
    const beforeAdvance = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value)
    await click('Next: Review boundaries →')
    const afterAdvance = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value)
    assert.deepEqual(afterAdvance.zoning_site_assumptions, beforeAdvance.zoning_site_assumptions, 'advancing preserves saved street marks and all facts')
    assert.equal(document.querySelector<HTMLElement>('.zsa__defaults')!.hidden, false)
    assert.equal(beforeAdvance.zoning_site_assumptions.street_adjacency.all_marked, true, 'marking one street saves the answer')
    assert.equal(beforeAdvance.zoning_site_assumptions.street_adjacency.completion_method, 'marking')
    await click('Yes, use suggestions')
    const afterAccept = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value)
    assert.equal(afterAccept.zoning_site_assumptions.street_adjacency.all_marked, true, 'accepting boundary proposals preserves the marked answer')
    assert.ok(afterAccept.zoning_site_assumptions.edges.every((edge: { role: { evidence_state: string } }) => edge.role.evidence_state === 'assumed'))
    assert.match(document.querySelector('.builder-journey-rail')!.textContent!, /Boundaries✓Reviewed/)
    await click('Mark street edges')
    assert.deepEqual(JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).zoning_site_assumptions, afterAccept.zoning_site_assumptions, 'reopening preserves saved selection and accepted proposals')
    await click('Not sure')
    await click('Next: Review boundaries →')
    assert.deepEqual(JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).zoning_site_assumptions.street_adjacency.edge_ids, [])
    await click('Mark street edges')
    assert.equal(JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).zoning_site_assumptions.street_adjacency.all_marked, false, 'Not sure survives a revisit')
    assert.equal(document.querySelector('.boundary-map-single input'), null, 'no extra street confirmation required')
    await click('Next: Review boundaries →')
    assert.equal(document.activeElement?.id, 'placement-action-rear')
    assert.equal(JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).zoning_site_assumptions.street_adjacency.all_marked, false)
    await click('Next: Review property details →')
    assert.equal(document.activeElement?.id, 'building-type')
    for (const id of ['builder-intended-use', 'building-type', 'principal-building', 'existing-suites', 'waterfront-lot']) {
      assert.equal(document.getElementById(id)!.closest('[hidden]'), null, `${id} must not be hidden by a map-controls wrapper during property review`)
    }
    assert.deepEqual(lastScroll, { id: 'building-type', options: { block: 'start', behavior: 'smooth' } })
    const factsSectionElement = document.getElementById('builder-property-details')!
    const factsEnd = factsSectionElement.querySelector('.floating-next')!
    const beforeDock = document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value
    await act(async () => { visibility.get(factsSectionElement)!(true); visibility.get(factsEnd)!(false) })
    assert.ok(factsSectionElement.querySelector('.floating-next--docked'), 'Next docks while reviewing long property details')
    assert.equal(factsSectionElement.querySelectorAll('.builder-continue').length, 1, 'docking does not duplicate the action')
    await act(async () => visibility.get(factsEnd)!(true))
    assert.equal(factsSectionElement.querySelector('.floating-next--docked'), null, 'Next settles into flow at the section end')
    assert.equal(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value, beforeDock, 'docking changes no answers or findings')
    assert.equal(document.querySelector<HTMLDetailsElement>('#builder-property-details > details')!.open, true)
    assert.equal(document.querySelector('.builder-placement-next'), null)
    assert.equal(document.querySelector<HTMLSelectElement>('#builder-property-details #builder-intended-use')!.value, 'Garden suite')
    assert.ok(document.getElementById('property-details-below-map')!.contains(document.getElementById('builder-property-details')))
    assert.ok(map.compareDocumentPosition(document.getElementById('builder-property-details')!) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
    assert.ok(document.getElementById('waterfront-lot')!.compareDocumentPosition(document.getElementById('builder-intended-use')!) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
    assert.ok(document.querySelector('[aria-label="Choose the main building from captured outlines"] [role="button"]'))
    assert.ok(document.getElementById('builder-intended-use')!.compareDocumentPosition(summary) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
    assert.ok(document.querySelector('#builder-property-details #scouting-height'))
    assert.ok(document.querySelector('#builder-property-details #scouting-area-buffer'))
    const optionalMeasurements = document.getElementById('scouting-height')!.closest('details')!
    assert.equal(optionalMeasurements.querySelector('summary')!.textContent, 'Optional measurements')
    assert.equal(optionalMeasurements.open, false)
    assert.match(document.getElementById('planning-assumptions-summary')!.textContent!, /1 m.*\+10%.*0.3 m/s)
    await click('Review floor area')
    assert.equal(document.activeElement?.id, 'zsa-floor-area')
    assert.equal(optionalMeasurements.open, true)
    assert.doesNotMatch(document.body.textContent!, /Complete the remaining checks/)
    assert.equal(document.getElementById('builder-property-details')!.hidden, false)
    await click('Next: Review quick checks →')
    assert.equal(document.activeElement?.id, 'builder-quick-checks')
    assert.equal(document.querySelector<HTMLDetailsElement>('#builder-property-details > details')!.open, false)
    assert.equal(document.querySelector<HTMLDetailsElement>('.homeowner-summary__checks')!.open, true)
    assert.match(document.querySelector('.builder-journey-rail')!.textContent!, /Boundaries✓Reviewed/)
    assert.match(document.querySelector('.builder-journey-rail')!.textContent!, /Property details✓Reviewed/)
    await click('Next: Prepare enquiry →')
    assert.equal(document.activeElement?.id, 'builder-use')
    assert.equal(document.getElementById('builder-enquiry-content')!.hidden, false)
    assert.match(document.querySelector('.builder-journey-rail')!.textContent!, /Quick checks✓Reviewed/)
    const afterProgression = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value)
    assert.deepEqual(afterProgression.measurement, JSON.parse(initialMeasurement).measurement)
    assert.equal(document.querySelector('#builder-enquiry-text'), null, 'missing context must not generate a recipient message')
    assert.equal(button('Confirm enquiry & continue →').disabled, true)
    for (const [id, value] of [['builder-use', 'Garden suite'], ['builder-relationship', 'Prefer not to say'], ['builder-nextStep', 'Please advise whether this is worth investigating further.']]) {
      await act(async () => { const node = document.getElementById(id) as HTMLInputElement; node.focus(); Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(node, value); node.dispatchEvent(new dom.window.KeyboardEvent('keyup', { key: '5', bubbles: true })) })
    }
    assert.ok(document.querySelector('#builder-enquiry-text'))
    assert.doesNotMatch(document.querySelector('.enquiry-preview')!.textContent!, /still deciding|The sender must|Not yet supplied/)
    assert.match(document.querySelector('.builder-journey-rail')!.textContent!, /Contact providerTo do/)
    const reviewedEvidence = document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value
    const reviewedDraft = document.querySelector<HTMLTextAreaElement>('#builder-enquiry-text')!.value
    for (const anchor of ['#placement-action-front', '#placement-action-rear', '#builder-property-details', '#builder-quick-checks', '#builder-next']) {
      await act(async () => document.querySelector<HTMLAnchorElement>(`.builder-journey-rail a[href="${anchor}"]`)!.click())
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
      assert.equal(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value, reviewedEvidence, 'review navigation is a read-only transition')
      assert.equal(document.querySelector<HTMLTextAreaElement>('#builder-enquiry-text')!.value, reviewedDraft)
    }

    await act(async () => { document.querySelector<HTMLAnchorElement>('a[href="#builder-email"]')!.click(); await new Promise(resolve => setTimeout(resolve, 20)) })
    assert.equal(document.activeElement?.id, 'builder-provider-website')
    const website = document.querySelector<HTMLAnchorElement>('#builder-provider-website')!
    assert.equal(website.href, 'https://www.auxbox.ca/contact')
    assert.match(document.getElementById('builder-email-content')!.textContent!, /central enquiry form.*Copy your prepared enquiry/s)
    assert.equal(document.querySelector<HTMLDetailsElement>('.builder-email-optional')!.open, false)
    assert.match(document.querySelector<HTMLTextAreaElement>('#builder-provider-text')!.value, /Please advise whether this is worth investigating further/)
    let copiedEnquiry = ''
    Object.defineProperty(dom.window.navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { copiedEnquiry = text } } })
    await click('Copy enquiry for provider')
    assert.equal(copiedEnquiry, document.querySelector<HTMLTextAreaElement>('#builder-provider-text')!.value)
    // Prevent external navigation in the mounted test; the link remains a plain
    // contact URL with no property text automatically transmitted.
    website.addEventListener('click', event => event.preventDefault())
    await act(async () => website.click())
    assert.match(document.querySelector('.builder-journey-rail')!.textContent!, /Website requested/)
    assert.equal(document.querySelector<HTMLDetailsElement>('.builder-email-optional')!.open, false)
    assert.doesNotMatch(document.querySelector('.builder-journey-rail')!.textContent!, /Draft requested/, 'visiting email must not request a draft')
    await click('Review suite count')
    assert.equal(document.activeElement?.id, 'existing-suites')
    assert.ok(document.getElementById('existing-suites')?.closest('details')?.open)
    await click('Prepare enquiry')
    assert.match(document.getElementById('builder-enquiry-content')!.textContent!, /SAVED EXAMPLE/)
    const evidence = () => JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).zoning_site_assumptions.existing_garden_suites
    assert.deepEqual([evidence().value, evidence().origin, evidence().evidence_state], [0, 'journey_default', 'assumed'])
    assert.ok(document.querySelector('#builder-geometry-evidence .builder-example-result'))
    assert.ok(document.querySelector('#builder-rule-evidence .cs-results'))
    assert.doesNotMatch(document.body.textContent!, /Current placement checklist/)
    assert.match(document.querySelector('#builder-enquiry-content')!.textContent!, /default assumption/)
    const answer = async (id: string, label: string) => act(async () => {
      const choice = [...document.querySelectorAll<HTMLButtonElement>(`#${id} button`)].find(node => node.textContent === label)!
      assert.ok(choice, `${id} ${label}`); choice.click()
    })
    await answer('existing-suites', 'One')
    assert.deepEqual([evidence().value, evidence().evidence_state, evidence().origin], [1, 'user_confirmed', 'user'])
    await answer('existing-suites', 'Not sure')
    assert.deepEqual([evidence().value, evidence().evidence_state], [null, 'unknown'])
    await answer('existing-suites', 'None')
    assert.equal(evidence().evidence_state, 'user_confirmed')
    assert.equal(document.querySelector('.zsa')!.textContent!.includes('I confirm this count'), false)
    await answer('building-type', 'Yes')
    await answer('waterfront-lot', 'No')
    const facts = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).zoning_site_assumptions
    assert.deepEqual([facts.building_type.value, facts.building_type.evidence_state], ['single_detached', 'user_confirmed'])
    assert.deepEqual([facts.waterfront.value, facts.waterfront.origin, facts.waterfront.evidence_state], [false, 'user', 'user_confirmed'])
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 450)) })
    await click('Confirm enquiry & continue →')
    assert.match(document.getElementById('builder-enquiry-content')!.textContent!, /Enquiry confirmed/)
    assert.equal(document.getElementById('builder-enquiry-content')!.hidden, true)
    assert.equal(document.getElementById('builder-email-content')!.hidden, false)
    assert.equal(document.getElementById('builder-enquiry-content')!.contains(document.getElementById('builder-email')), false)
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    assert.equal(document.activeElement?.id, 'builder-provider-website')
    assert.match(document.querySelector<HTMLTextAreaElement>('#builder-question')!.value, /Could Model 300 be suitable/)
    assert.equal(document.querySelector<HTMLDetailsElement>('.builder-optional-site')!.open, false)
    await act(async () => document.querySelector<HTMLAnchorElement>('.builder-journey-rail a[href="#builder-placement"]')!.click()); await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    await act(async () => { map.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })) })
    assert.match(document.body.textContent!, /Updating checks/)
    assert.match(summary.textContent!, /previous input|previous findings|Updating checks/i)
    assert.equal(JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).evaluation_state, 'updating')
    assert.match(document.getElementById('builder-enquiry-content')!.textContent!, /Draft in progress/)
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)) })
    assert.equal([...document.querySelectorAll<HTMLButtonElement>('button')].some(node => node.textContent === 'Download placement PNG' && !node.disabled), false, 'a pending placement must not export the earlier drawing')
    assert.equal(document.querySelector('#builder-enquiry-text'), null, 'stale draft cannot be copied as current')
    assert.equal([...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === 'Confirm enquiry & continue →')!.disabled, true)
    assert.equal(document.querySelector('#builder-provider-text'), null, 'pending findings cannot become an empty provider message')
    assert.equal(geometryCalls, 2)
    await click('Wrong property? Change')
    assert.equal(document.activeElement?.id, 'sd-address')
    // Project preferences stay, but old site-specific questions/responses cannot
    // leak into the next property's enquiry.
    assert.equal(document.querySelector('#builder-intended-use'), null, 'property-details controls wait for a selected property')
    assert.equal(document.querySelector('#builder-enquiry-text'), null, 'the old property enquiry is no longer active')
    await act(async () => { releaseLate() })
    assert.equal(document.getElementById('builder-quick-checks'), null)
    assert.equal(document.querySelector('#placement-map'), null)
    assert.match(document.getElementById('builder-property-content')!.textContent!, /Street address in British Columbia/)
    // A page remount must recover the enquiry text, while old geometry and
    // acknowledged findings must not become an active assessment.
    const saved = JSON.parse(dom.window.sessionStorage.getItem('shovelready.enquiry-recovery.v1')!)
    assert.match(saved.enquiry, /Please advise whether this is worth investigating further/)
    assert.match(saved.report, /supporting screening report/)
    assert.equal(JSON.parse(saved.technicalEvidence).schema_version, 'builder-evidence.v1')
    assert.doesNotMatch(saved.report, /builder-evidence.v1|Complete historical technical evidence/)
    await act(async () => { root.render(null) })
    await act(async () => { root.render(createElement(Journey)) })
    assert.equal(document.querySelector<HTMLTextAreaElement>('#recovered-enquiry')!.value, saved.enquiry)
    assert.equal(document.getElementById('builder-quick-checks'), null)
    assert.match(document.querySelector('[aria-label="Enquiry recovery"]')!.textContent!, /not restored as current/)
    await click('Clear recovery copy')
    assert.equal(dom.window.sessionStorage.getItem('shovelready.enquiry-recovery.v1'), null)
    assert.equal(document.getElementById('recovered-enquiry'), null)
  } finally {
    await act(async () => { root.unmount() })
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})

test('one current boundary checklist recovers timeout, derives roles, preserves user entries and invalidates changed scenarios', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  Object.assign(dom.window.HTMLElement.prototype, { attachEvent: () => {}, detachEvent: () => {} })

  // Accelerate the existing bounded timeout, including a transport that ignores
  // abort. This protects a reproduced loading risk rather than testing timers.
  const windowTimeout = dom.window.setTimeout.bind(dom.window)

  dom.window.setTimeout = ((cb, delay, ...args) => windowTimeout(cb, delay === 10000 ? 1000 : delay, ...args)) as typeof dom.window.setTimeout
  const originals = new Map<string, PropertyDescriptor | undefined>()
  const expose = (name: string, value: unknown) => { originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }) }
  for (const [name, value] of Object.entries({ Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, window: dom.window, document: dom.window.document, navigator: dom.window.navigator, requestAnimationFrame: (cb: () => void) => setTimeout(cb, 0), IS_REACT_ACT_ENVIRONMENT: true })) expose(name, value)
  const geometry = JSON.parse(readFileSync('src/scenario_handoff/retained-assessment.fixture.json', 'utf8'))
  const legal = JSON.parse(readFileSync('src/conditional_screening/api-response.fixture.json', 'utf8'))
  let scenarioCalls = 0
  let legalCalls = 0
  let latest!: ScenarioRequest
  let finishLate!: () => void
  let finishLateLegal!: () => void
  // Coherent boundary fixture: 1.25 m captured distances, .6 m side/rear
  // and 3.5 m flanking minima. Test state/evidence, not geometry arithmetic.
  const scenarioFixture = (request: ScenarioRequest): ScenarioResult => {
    const edges = request.assumptions.edges
    const fronts = request.street_pattern === 'single' && request.street_edge_id ? edges.filter(edge => edge.id === request.street_edge_id) : edges
    const scenarios: ScenarioResult['scenarios'] = []
    for (const front of fronts) {
      const index = edges.indexOf(front)
      for (const flanking of request.street_pattern === 'single' ? [0] : [0, 1, 2, 3]) {
        const checks = edges.filter(edge => edge !== front).map(edge => {
          const edgeIndex = edges.indexOf(edge)
          const role = edgeIndex === (index + 2) % 4 ? 'rear' as const : (flanking & (edgeIndex === (index + 1) % 4 ? 1 : 2)) ? 'flanking_street' as const : 'side' as const
          const manual = request.assumptions.measurements.boundary[edge.id]
          const distance_m = manual?.value ?? 1.25, minimum_m = role === 'flanking_street' ? 3.5 : .6
          const planning_buffer_m = manual ? 0 : request.assumptions.planning_buffers_m?.[edge.id] ?? 0
          return { planning_buffer_m, planning_distance_m: Math.max(0, distance_m - planning_buffer_m), planning_meets: distance_m - planning_buffer_m >= minimum_m, edge_id: edge.id, role, distance_m, minimum_m, basis: manual ? 'user_wall_to_lot_line' as const : 'captured_nominal' as const, meets: distance_m >= minimum_m, rule_id: 'fixture-distance-rule' }
        })
        if (edges.some(edge => edge.role.value !== 'unknown' && edge.role.value !== null && edge.role.value !== (edge === front ? 'front' : checks.find(check => check.edge_id === edge.id)?.role))) continue
        scenarios.push({ front_edge_id: front.id, outcome: checks.every(check => check.meets) ? 'pass' : 'fail', checks })
      }
    }
    return { schema_version: 'placement-scenarios.result.v1', status: !scenarios.length ? 'unresolved' : scenarios.every(s => s.outcome === 'pass') ? 'bounded_pass' : scenarios.every(s => s.outcome === 'fail') ? 'apparent_conflict' : 'clarify', reason: 'Retained coherent distance subset.', property_revision: expectedPropertyRevision(request.assumptions), placement_revision: request.assumptions.placement_revision, model_revision: request.model_revision, packet_id: 'fixture', packet_revision: 'fixture-1', scope: 'supplied placement', edge_distances_m: Object.fromEntries(edges.map(edge => [edge.id, 1.25])), thresholds_m: { side_rear: .6, flanking_street: 3.5 }, scenarios, sources: [{ provider: 'City of Victoria', record_label: 'Fixture source', capture_date: '2026-10-05', review_status: 'candidate', url: 'https://www.victoria.ca/', locator: 'Fixture' }], limitations: ['Front, rear-yard and height omitted.'] }
  }
  expose('fetch', async (url: string, options: RequestInit) => {
    const request = JSON.parse(String(options.body))
    if (url === '/api/scouting-geometry/assess') return { ok: true, json: async () => ({ ...geometry, input: request, checks: geometry.checks.filter((check: {kind: string}) => check.kind !== 'requirement') }) }
    if (url.endsWith('/placement-scenarios')) {
      latest = request; scenarioCalls++
      if (scenarioCalls === 1) await new Promise<void>(resolve => { finishLate = resolve })
      if (scenarioCalls === 2) return { ok: false, status: 503 }
      return { ok: true, json: async () => scenarioFixture(request) }
    }
    if (url.endsWith('/evaluate')) {
      if (++legalCalls === 1) await new Promise<void>(resolve => { finishLateLegal = resolve })
      return { ok: true, json: async () => ({ ...legal, request: { ...legal.request, property_revision: expectedPropertyRevision(request.assumptions), placement_revision: request.assumptions.placement_revision, model_revision: request.model_revision }, checks: legal.checks.map((check: {rule: {fact_id: string}}) => {
        const segment = /segment-(\d+)/.exec(check.rule.fact_id)
        if (!segment) return check
        const prefix = check.rule.fact_id.startsWith('edge_role:') ? 'edge_role:' : 'boundary:'
        return { ...check, rule: { ...check.rule, fact_id: prefix + request.assumptions.edges[Number(segment[1])].id }, status: 'needs_information', reasons: ['Fixture: legal role and regulatory measurement basis remain unresolved.'], normalized_observed: null, normalized_threshold: null, normalized_unit: null }
      }) }) }
    }
    return { ok: false, status: 503 }
  })
  const document = dom.window.document
  const root = createRoot(document.getElementById('root')!)
  const settle = async (ms = 350) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)) })
  const click = async (label: string) => { const node = [...document.querySelectorAll<HTMLElement>('button, summary')].find(node => node.textContent === label || node.getAttribute('aria-label') === label); assert.ok(node, label); await act(async () => node.click()) }
  const change = async (node: HTMLInputElement | HTMLSelectElement, value: string) => { await act(async () => { node.focus(); Object.getOwnPropertyDescriptor(node instanceof dom.window.HTMLSelectElement ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype, 'value')!.set!.call(node, value); node.dispatchEvent(node instanceof dom.window.HTMLSelectElement ? new dom.window.Event('change', { bubbles: true }) : new dom.window.KeyboardEvent('keyup', { key: '5', bubbles: true })) }) }
  try {
    let completion = emptyBuilderJourneyCompletion
    await act(async () => root.render(createElement<{ onProgressChange?: (next: typeof emptyBuilderJourneyCompletion) => void }>(BuilderDemo, { onProgressChange: next => { completion = next } })))
    await click('Try an example property')
    await act(async () => { const choice = document.getElementById('builder-intended-use') as HTMLSelectElement; choice.value = 'Garden suite'; choice.dispatchEvent(new dom.window.Event('change', { bubbles: true })) }); await settle(550); await settle(1150)
    assert.match(document.querySelector('.builder-placement-results')!.textContent!, /timed out/)
    assert.doesNotMatch(document.querySelector('.builder-placement-results')!.textContent!, /Checking plausible/)
    await click('Retry boundary checks'); await settle()
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /unavailable \(503\)/)
    await click('Retry boundary checks'); await click('Retry candidate checks'); await settle()
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /Boundary clarification/)
    await act(async () => { finishLate(); finishLateLegal() }); assert.equal(scenarioCalls, 3)
    assert.equal(document.querySelectorAll('[role="tablist"][aria-label="Placement actions"]').length, 1)
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    assert.deepEqual(tabs.map(tab => tab.textContent), ['Move unit', 'Mark street edges', 'Adjust boundaries'])
    await act(async () => { tabs[0].focus(); tabs[0].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })) })
    assert.equal(document.activeElement, tabs[1])
    assert.equal(tabs[1].getAttribute('aria-selected'), 'true')
    assert.equal(document.querySelectorAll('#boundary-roles').length, 1)
    await click('Edge 1 borders a street')
    await click('Adjust boundaries'); await settle()
    assert.equal(latest.assumptions.street_adjacency?.all_marked, true)
    await click('Mark street edges'); await settle()
    await click('Adjust boundaries'); await settle()
    assert.equal(latest.assumptions.street_adjacency?.all_marked, true)
    assert.equal(latest.assumptions.street_adjacency?.completion_method, 'marking')
    assert.equal(document.querySelector<HTMLElement>('.zsa__boundaries')!.hidden, true)
    const savedBefore = JSON.parse(JSON.stringify(latest.assumptions))
    await click('Yes, use suggestions'); await settle()
    assert.deepEqual(latest.assumptions.edges.map(edge => edge.role.value), ['front', 'side', 'rear', 'side'])
    assert.ok(latest.assumptions.edges.every(edge => edge.role.evidence_state === 'assumed' && edge.role.note === 'Suggested · accepted for planning'))
    assert.deepEqual(latest.assumptions.measurements, savedBefore.measurements)
    assert.deepEqual(latest.assumptions.planning_buffers_m, savedBefore.planning_buffers_m)
    assert.match(document.querySelector('.zsa__defaults')!.textContent!, /accepted for planning/)
    assert.equal(completion.boundaries, true)
    const beforeApply = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value)
    const concernPanel = document.querySelector('.occupied-map-concerns')!
    assert.ok(concernPanel, 'boundary review shows concerns and existing suggestions')
    assert.ok(document.querySelector('.boundary-map-tools')!.compareDocumentPosition(concernPanel) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING, 'concerns follow boundary and buffer controls')
    assert.match(concernPanel.textContent!, /Apply 0.65 m planning buffer/)
    assert.match(concernPanel.textContent!, /Move .* away from this edge/)
    await click('Apply 0.65 m planning buffer'); await settle()
    assert.equal(latest.assumptions.planning_buffers_m![latest.assumptions.edges[1].id], .65)
    assert.equal(latest.assumptions.planning_buffers_m![latest.assumptions.edges[2].id], 1)
    assert.deepEqual(latest.assumptions.measurements, savedBefore.measurements)
    const suggestedBuffer = document.querySelector<HTMLInputElement>('[aria-label="Edge 2 planning buffer in metres"]')!
    await change(suggestedBuffer, '1'); await click('Save planning buffers'); await settle()
    await click('Yes, use suggestions'); await settle()
    assert.equal(completion.boundaries, true)
    const beforeMoveAssumptions = JSON.parse(JSON.stringify(latest.assumptions))
    await change(document.querySelector<HTMLInputElement>('#scouting-height')!, '3.9'); await settle()
    await click('Move 0.35 m away from this edge & recheck'); await settle(700)
    const moved = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value)
    const beforePosition = beforeApply.measurement.result.input.placement
    const afterPosition = moved.measurement.result.input.placement
    // A normal translation has exactly the requested norm; dimensions stay fixed.
    assert.ok(Math.abs(Math.hypot(afterPosition.centre_xy[0] - beforePosition.centre_xy[0], afterPosition.centre_xy[1] - beforePosition.centre_xy[1]) - .35) < 1e-7)
    assert.equal(afterPosition.width_m, beforePosition.width_m)
    assert.equal(afterPosition.depth_m, beforePosition.depth_m)
    assert.equal(completion.boundaries, true, 'movement preserves reviewed boundary context')
    assert.equal(completion.streets, true, 'movement preserves complete street marks')
    assert.deepEqual(latest.assumptions.edges, beforeMoveAssumptions.edges)
    assert.deepEqual(latest.assumptions.street_adjacency, beforeMoveAssumptions.street_adjacency)
    assert.deepEqual(latest.assumptions.planning_buffers_m, beforeMoveAssumptions.planning_buffers_m)
    assert.equal(document.querySelector<HTMLInputElement>('#scouting-height')!.value, '3.9')
    await click('Adjust boundaries'); await click('No, adjust them')
    await change(document.querySelector<HTMLSelectElement>('[aria-label="Edge to mark"]')!, latest.assumptions.edges[1].id)
    const measuredOffset = document.querySelector<HTMLInputElement>('.zsa__edge-row--selected input')!
    await change(measuredOffset, '.1'); await settle()
    assert.match(document.querySelector('#builder-quick-checks')!.textContent!, /Distance to boundaries · Preliminary concern/)
    await click('Acknowledge and include in enquiry'); await settle()
    assert.match(document.querySelector('#builder-quick-checks')!.textContent!, /Distance to boundaries · Preliminary concern/)
    for (const [id, value] of [['builder-use', 'Garden suite'], ['builder-relationship', 'I own the property'], ['builder-nextStep', 'Please advise on suitability.']]) await change(document.getElementById(id) as HTMLInputElement, value)
    assert.equal(JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).acknowledged_conflicts_for_discussion.length, 1, 'unchanged intended use preserves its concern acknowledgement')
    await settle()
    const recipientText = () => document.querySelector<HTMLTextAreaElement>('#builder-enquiry-text')!.value
    assert.match(recipientText(), /falls short.*0.5 m/s)
    assert.match(recipientText(), /Boundary roles and legal measurements require review/)
    assert.doesNotMatch(recipientText(), /Acknowledged conflicts|acknowledged by the user/i)
    assert.equal(JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).acknowledged_conflicts_for_discussion.length, 1)
    assert.ok(document.querySelector('.homeowner-summary__acknowledged-conflict'))
    await change(document.querySelector<HTMLInputElement>('#scouting-height')!, '4.1'); await settle()
    assert.equal(JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).acknowledged_conflicts_for_discussion.length, 1, 'a height edit must retain the boundary concern acknowledgement')

    await click('Remove acknowledgement'); await settle()
    assert.match(recipientText(), /falls short/, 'removing acknowledgement must not remove the unresolved placement concern')
    await click('Acknowledge and include in enquiry'); await settle()
    // Review readiness counts leaf findings, including unknown and uncovered items;
    // discussing them never changes their status or establishes an answer.
    for (let attempts = 0; attempts < 30; attempts++) {
      const next = [...document.querySelectorAll<HTMLButtonElement>('.homeowner-summary button')].find(node => node.textContent === 'Include as an open question in enquiry' || node.textContent === 'Acknowledge and include in enquiry')
      if (!next) break
      await act(async () => next.click())
    }
    await settle()
    assert.equal(completion.reviewReadiness!.ready, true)
    assert.ok(document.querySelector('.homeowner-summary__unknown.homeowner-summary__acknowledged, .homeowner-summary__review.homeowner-summary__acknowledged'))
    assert.match(document.querySelector('#summary-check-7')!.textContent!, /included for discussion/)
    assert.equal(completion.reviewReadiness!.addressed, completion.reviewReadiness!.total)
    assert.doesNotMatch(recipientText(), /Open questions included for discussion|Mapped records \(needs review\)|Other requirements \(not covered\)/)
    assert.match(document.querySelector('.builder-preparation')!.textContent!, /Questions you included for later review/)
    const reviewEvidence = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value)
    assert.ok(reviewEvidence.open_questions_for_discussion.length > 0)
    assert.equal(reviewEvidence.review_readiness.ready, true)
    assert.match(document.querySelector('#builder-enquiry-content')!.textContent!, /Open questions included for discussion.*no answer or clearance is established/s)
    assert.match(document.querySelector('#builder-quick-checks')!.textContent!, /Other requirements · Not covered/)
    assert.match(document.querySelector('#builder-quick-checks')!.textContent!, /Distance to boundaries · Preliminary concern/)
    await change(measuredOffset, ''); await settle()
    assert.doesNotMatch(recipientText(), /gap of 0.1 m falls short/, 'editing the measurement must invalidate this concern')
    assert.equal(completion.reviewReadiness!.ready, false)
    await change(measuredOffset, '.1'); await settle()
    assert.equal(JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).acknowledged_conflicts_for_discussion.length, 0, 'restoring an old input cannot restore a cleared acknowledgement')
    await change(measuredOffset, ''); await settle()

    assert.equal(document.querySelectorAll('#boundary-offsets input').length, 4)
    await click('Mark street edges'); await settle()
    assert.equal(latest.assumptions.street_adjacency?.all_marked, true, 'opening streets preserves explicit completion')
    await click('Not sure'); await settle()
    await click('Edge 1 borders a street'); await settle()
    assert.equal(latest.assumptions.street_adjacency?.all_marked, true, 'one marked street is a complete answer')
    assert.equal(document.querySelector('.boundary-map-single input'), null)
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /Derived scenario role: rear/)
    assert.equal(document.querySelectorAll('[data-boundary-edge]').length, 4)
    assert.doesNotMatch(document.querySelector('.cs-compact-details')!.textContent!, /Parcel edge \d role|Side setback|Rear setback/)
    assert.match(document.querySelectorAll('[data-boundary-edge]')[1].textContent!, /User wall\/legal-line comparison.*needs information/)
    assert.ok(latest.assumptions.edges.every(edge => edge.role.value === 'unknown'))
    assert.equal(latest.assumptions.boundary_role_suggestions!.roles[latest.assumptions.edges[0].id], 'front')
    assert.match(document.querySelector('.boundary-map-overlay')!.textContent!, /Front \(suggested\)/)
    await click('Adjust boundaries'); await click('No, adjust them')
    assert.equal(document.querySelector<HTMLElement>('.zsa__boundaries')!.hidden, false)
    const rearChoice = document.querySelector<HTMLSelectElement>('[aria-label="Edge to mark"]')!
    await change(rearChoice, latest.assumptions.edges[2].id)
    await click('Use suggested rear'); await settle()
    assert.equal(latest.assumptions.edges[2].role.value, 'rear')
    assert.equal(latest.assumptions.boundary_role_suggestions!.roles[latest.assumptions.edges[2].id], undefined)
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('.zsa__edge-row--selected button')].find(button => button.textContent === 'Clear this mark')!.click()); await settle()
    assert.equal(latest.assumptions.edges[2].role.value, 'unknown')
    assert.equal(latest.assumptions.boundary_role_suggestions!.roles[latest.assumptions.edges[2].id], 'rear')
    const mapView = document.querySelector('#placement-map svg')!.getAttribute('viewBox')
    const placement = document.querySelector('#placement-map svg g[transform]')!.getAttribute('transform')
    await act(async () => document.querySelector('#placement-map svg')!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })))
    assert.equal(document.querySelector('#placement-map svg g[transform]')!.getAttribute('transform'), placement)
    await click('Adjust boundaries'); await click('Mark side')
    const edgeHit = document.querySelectorAll<SVGElement>('.boundary-map-edge-hit')[1]
    await act(async () => edgeHit.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })))
    assert.match(document.querySelector('.zsa__edge-row--selected')!.textContent!, /Edge 2 · Side · your assumption/)
    assert.equal(document.querySelectorAll('[aria-label="Edge 2 role"]').length, 0)
    for (const [label, role] of [['rear', 'rear'], ['front', 'front'], ['flanking', 'flanking_street'], ['side', 'side']]) {
      await click(`Mark ${label}`); await click('Mark selected edge'); await settle()
      assert.equal(latest.assumptions.edges[1].role.value, role)
      assert.equal(latest.assumptions.edges[1].role.origin, 'user')
    }
    const markedRole = latest.assumptions.edges[1].role.value
    await click('Close edge details'); await settle()
    assert.equal(document.querySelector('.zsa__edge-row--selected'), null)
    assert.equal(latest.assumptions.edges[1].role.value, markedRole)
    await act(async () => edgeHit.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); await settle()
    assert.match(document.querySelector('.zsa__edge-row--selected')!.textContent!, /Edge 2/)
    assert.equal(latest.assumptions.planning_buffers_m![latest.assumptions.edges[1].id], 1)
    // Buffer edits must not reach evaluation/export until explicitly saved.
    const bufferInput = document.querySelector<HTMLInputElement>('[aria-label="Edge 2 planning buffer in metres"]')!
    await change(bufferInput, '2'); await settle()
    assert.equal(latest.assumptions.planning_buffers_m![latest.assumptions.edges[1].id], 1)
    assert.match(document.querySelector('#boundary-offsets')!.textContent!, /Unsaved buffers/)
    assert.equal(document.querySelector<HTMLButtonElement>('.builder-placement-next .builder-continue')!.disabled, true)
    await click('Save planning buffers'); await settle()
    assert.equal(latest.assumptions.planning_buffers_m![latest.assumptions.edges[1].id], 2)
    assert.match(document.querySelector('#boundary-offsets')!.textContent!, /saved for this property/)
    assert.equal(document.querySelector<HTMLButtonElement>('.builder-placement-next .builder-continue')!.disabled, false)
    await change(bufferInput, '-1'); await settle()
    assert.equal([...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === 'Save planning buffers')!.disabled, true)
    assert.equal(latest.assumptions.planning_buffers_m![latest.assumptions.edges[1].id], 2)
    await change(bufferInput, '1'); await click('Save planning buffers'); await settle()
    assert.match(document.querySelector('#builder-quick-checks')!.textContent!, /Needs review/)
    const info = document.querySelector<HTMLButtonElement>('.homeowner-summary .step-info__button')!
    await act(async () => info.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })))
    assert.equal(info.getAttribute('aria-expanded'), 'true')
    await act(async () => info.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    await act(async () => info.focus())
    assert.equal(info.getAttribute('aria-expanded'), 'true')
    await act(async () => info.click())
    assert.equal(document.getElementById(info.getAttribute('aria-controls')!)?.getAttribute('role'), 'tooltip')
    await act(async () => info.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    assert.equal(info.getAttribute('aria-expanded'), 'false')
    assert.equal(document.querySelector('#placement-map svg')!.getAttribute('viewBox'), mapView)
    assert.equal(document.querySelector('#placement-map svg g[transform]')!.getAttribute('transform'), placement)
    await change(document.querySelector<HTMLInputElement>('[aria-label="Edge 2 wall to lot line in metres"]')!, '.75')
    await settle()
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /Your wall-to-legal-line entry: 0.75 m/)
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /≈ 1.25 m from captured/)
    assert.equal(latest.assumptions.edges[1].role.origin, 'user')
    await click('Mark street edges'); await click('Edge 1 borders a street'); await click('Edge 3 borders a street')
    await settle()
    assert.equal(latest.assumptions.street_adjacency?.all_marked, true, 'adding another street immediately saves the revised answer')
    assert.match(document.querySelector('[data-boundary-edge]')!.textContent!, /Derived scenario role: rear/)
    assert.equal(latest.assumptions.measurements.boundary[latest.assumptions.edges[1].id].value, .75)
    await click('Edge 1 borders a street'); await settle()
    assert.doesNotMatch(document.querySelector('.zsa')?.textContent ?? '', /Suggested:/)
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /Possible scenario roles:/)
    await click('Prepare enquiry'); await settle()
    const exportRecord = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value)
    assert.equal(exportRecord.zoning_site_assumptions.street_adjacency.edge_ids.length, 2)
    assert.equal(exportRecord.zoning_site_assumptions.street_adjacency.all_marked, true)
    assert.equal(exportRecord.zoning_site_assumptions.edges[1].role.origin, 'user')
    assert.equal(exportRecord.placement_scenario_result.status, 'clarify')
    assert.ok(document.querySelector('#builder-geometry-evidence .builder-example-result'))
    assert.ok(document.querySelector('#builder-rule-evidence .cs-results'))
    assert.doesNotMatch(document.body.textContent!, /Current placement checklist/)
    assert.doesNotMatch(document.querySelector('#builder-enquiry-content')!.textContent!, /Street-adjoining edge selection is incomplete/, 'saved street marks carry into reporting')
    assert.ok(document.querySelector('#builder-geometry-evidence .builder-example-result'))
    assert.ok(document.querySelector('#builder-rule-evidence .cs-results'))
    assert.doesNotMatch(document.body.textContent!, /Current placement checklist/)
    assert.match(document.querySelector('#builder-enquiry-content')!.textContent!, /Main outline: Outline 1, assumed/)
    assert.ok(document.querySelector('#builder-geometry-evidence .builder-example-result'))
    assert.ok(document.querySelector('#builder-rule-evidence .cs-results'))
    assert.doesNotMatch(document.body.textContent!, /Current placement checklist/)
    assert.match(document.querySelector('#builder-enquiry-content')!.textContent!, /subset excludes front distance, rear-yard location\/share and height\/area/)
    assert.ok(document.querySelector('#builder-geometry-evidence .builder-example-result'))
    assert.ok(document.querySelector('#builder-rule-evidence .cs-results'))
    assert.doesNotMatch(document.body.textContent!, /Current placement checklist/)
    assert.match(document.querySelector('#builder-enquiry-content')!.textContent!, /None establishes legal feasibility/)
    assert.equal(latest.assumptions.principal_building_id.origin, 'journey_default')
    assert.match(document.querySelector('.main-building-mark')!.textContent!, /Main building · assumed/)
    await act(async () => document.querySelector<SVGGElement>('#principal-building svg [role=button]')!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))); await settle()
    assert.equal(latest.assumptions.principal_building_id.evidence_state, 'user_confirmed')
    assert.equal(latest.assumptions.principal_building_id.origin, 'user')

    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('#principal-building button')].find(node => node.textContent === 'Not sure')!.click()); await settle()
    assert.equal(latest.assumptions.infer_principal_building, false)
    assert.equal(document.querySelector('.main-building-mark'), null)
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('#waterfront-lot button')].find(node => node.textContent === 'Yes')!.click()); await settle()
    assert.equal(document.querySelector('[role="tab"][aria-selected="true"]')!.textContent, 'Mark waterfront')
    assert.equal(document.activeElement?.id, 'placement-action-waterfront')
    assert.deepEqual([...document.querySelectorAll('[role="tab"]')].map(node => node.textContent), ['Move unit', 'Mark street edges', 'Adjust boundaries', 'Mark waterfront'])
    await click('Edge 1 adjoins water'); await settle()
    assert.deepEqual(latest.assumptions.waterfront_edge_ids, [latest.assumptions.edges[0].id])
    assert.equal(latest.assumptions.edges[0].role.value, 'unknown')
    assert.match(document.querySelector('.waterfront-mark')!.textContent!, /Waterfront · your mark/)
    await act(async () => document.querySelector('[role="tab"][aria-selected="true"]')!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))); await settle()
    assert.equal(document.querySelector('[role="tab"][aria-selected="true"]')!.textContent, 'Move unit')
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('#waterfront-lot button')].find(node => node.textContent === 'No')!.click()); await settle()
    assert.equal([...document.querySelectorAll('[role="tab"]')].some(tab => tab.textContent === 'Mark waterfront'), false)
    assert.deepEqual(latest.assumptions.waterfront_edge_ids, [])

    // Changing use must reconcile the screen and both human-facing documents;
    // unknown input does not inherit a garden-suite scenario.
    await change(document.querySelector<HTMLSelectElement>('#builder-intended-use')!, 'Not sure'); await settle()
    const unknownEvidence = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value)
    assert.equal(unknownEvidence.project_settings.proposal.proposed_use, null)
    assert.equal(unknownEvidence.enquiry_inputs.intendedUse, 'Not sure')
    assert.equal(unknownEvidence.planning_comparison_scope.garden_suite_comparisons_applied, false)
    assert.match(document.querySelector('#builder-quick-checks')!.textContent!, /Intended use/)
    assert.doesNotMatch(recipientText(), /planning comparisons use a garden-suite scenario/)
    assert.match(recipientText(), /intended use is (?:not yet confirmed|unconfirmed)/i)
    assert.doesNotMatch(document.querySelector('[aria-label="Supporting screening report"]')!.textContent!, /Height.*Likely fine|Rear-yard occupancy.*Likely fine/s)

  } finally {
    await act(async () => root.unmount())
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})
