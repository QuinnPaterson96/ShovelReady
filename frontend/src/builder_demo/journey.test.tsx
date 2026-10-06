import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import BuilderDemo from './BuilderDemo'
import { expectedPropertyRevision } from '../conditional_screening/model'
import type { ScenarioRequest, ScenarioResult } from '../conditional_screening/scenarios'

// Exercise the actual host/map/summary/enquiry connections. HTTP geometry is a
// retained boundary fixture; this verifies workflow, not distance arithmetic.
test('saved journey puts results below map, focuses facts, invalidates late measurements and changes property', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  Object.assign(dom.window.HTMLElement.prototype, { attachEvent: () => {}, detachEvent: () => {} })
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
    assert.match(document.querySelector('#builder-quick-checks')!.textContent!, /Resolve this question first/)
    const map = document.querySelector('#placement-map svg')!
    const summary = document.querySelector('#builder-quick-checks')!
    assert.ok(map.compareDocumentPosition(summary) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
    assert.ok(summary.compareDocumentPosition(document.querySelector('.builder-example-controls')!) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
    await click('Review suite count')
    assert.equal(document.activeElement?.id, 'existing-suites')
    assert.ok(document.getElementById('existing-suites')?.closest('details')?.open)
    await click('Prepare enquiry')
    assert.match(document.getElementById('builder-enquiry-content')!.textContent!, /SAVED EXAMPLE/)
    const evidence = () => JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value).zoning_site_assumptions.existing_garden_suites
    assert.deepEqual([evidence().value, evidence().origin, evidence().evidence_state], [0, 'journey_default', 'assumed'])
    assert.match(document.querySelector('#builder-enquiry-content')!.textContent!, /default assumption/)
    const select = document.querySelector<HTMLSelectElement>('#existing-suites')!
    const changeCount = async (value: string) => act(async () => { select.value = value; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
    const confirm = [...document.querySelectorAll<HTMLInputElement>('.zsa input[type="checkbox"]')].find(input => input.closest('label')?.textContent?.includes('I confirm this count'))!
    await changeCount('1')
    assert.deepEqual([evidence().value, evidence().evidence_state], [1, 'assumed'])
    await act(async () => confirm.click())
    assert.equal(evidence().evidence_state, 'user_confirmed')
    assert.equal(evidence().origin, 'user')
    await changeCount('')
    assert.deepEqual([evidence().value, evidence().evidence_state], [null, 'unknown'])
    assert.equal(confirm.checked, false)
    assert.equal(confirm.disabled, true)
    await changeCount('0')
    assert.equal(evidence().evidence_state, 'assumed')
    await act(async () => confirm.click())
    await click('Mark enquiry ready')
    assert.match(document.getElementById('builder-enquiry-content')!.textContent!, /Ready for your review/)
    await click('2 · PlacementMeasured')
    await act(async () => { map.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })) })
    assert.match(summary.textContent!, /Place the unit to explore the possibilities/)
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
          return { edge_id: edge.id, role, distance_m, minimum_m, basis: manual ? 'user_wall_to_lot_line' as const : 'captured_nominal' as const, meets: distance_m >= minimum_m, rule_id: 'fixture-distance-rule' }
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
  const click = async (label: string) => { const node = [...document.querySelectorAll<HTMLElement>('button, summary')].find(node => node.textContent === label); assert.ok(node, label); await act(async () => node.click()) }
  const change = async (node: HTMLInputElement | HTMLSelectElement, value: string) => { await act(async () => { node.focus(); Object.getOwnPropertyDescriptor(node instanceof dom.window.HTMLSelectElement ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype, 'value')!.set!.call(node, value); node.dispatchEvent(node instanceof dom.window.HTMLSelectElement ? new dom.window.Event('change', { bubbles: true }) : new dom.window.KeyboardEvent('keyup', { key: '5', bubbles: true })) }) }
  try {
    await act(async () => root.render(createElement(BuilderDemo)))
    await click('Try an example property'); await settle(550); await settle(1150)
    assert.match(document.querySelector('.builder-placement-results')!.textContent!, /timed out/)
    assert.doesNotMatch(document.querySelector('.builder-placement-results')!.textContent!, /Checking plausible/)
    await click('Retry boundary checks'); await settle()
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /unavailable \(503\)/)
    await click('Retry boundary checks'); await click('Retry candidate checks'); await settle()
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /Boundary clarification/)
    await act(async () => { finishLate(); finishLateLegal() }); assert.equal(scenarioCalls, 3)
    assert.equal(document.querySelectorAll('[role="tablist"][aria-label="Placement actions"]').length, 1)
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    assert.deepEqual(tabs.map(tab => tab.textContent), ['Move unit', 'Mark street side', 'Adjust boundaries'])
    await act(async () => { tabs[0].focus(); tabs[0].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })) })
    assert.equal(document.activeElement, tabs[1])
    assert.equal(tabs[1].getAttribute('aria-selected'), 'true')
    assert.equal(document.querySelectorAll('#boundary-roles').length, 1)
    await click('Edge 1 faces street')
    const single = document.querySelector<HTMLInputElement>('.boundary-map-single input')!
    await act(async () => single.click()); await settle()
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /Derived scenario role: rear/)
    assert.equal(document.querySelectorAll('[data-boundary-edge]').length, 4)
    assert.doesNotMatch(document.querySelector('.cs-compact-details')!.textContent!, /Parcel edge \d role|Side setback|Rear setback/)
    assert.match(document.querySelectorAll('[data-boundary-edge]')[1].textContent!, /User wall\/legal-line comparison.*needs information/)
    assert.ok(latest.assumptions.edges.every(edge => edge.role.value === 'unknown'))
    const mapView = document.querySelector('#placement-map svg')!.getAttribute('viewBox')
    const placement = document.querySelector('#placement-map svg g[transform]')!.getAttribute('transform')
    await act(async () => document.querySelector('#placement-map svg')!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })))
    assert.equal(document.querySelector('#placement-map svg g[transform]')!.getAttribute('transform'), placement)
    await click('Adjust boundaries'); await click('Edge 2')
    assert.equal(document.activeElement?.id, 'boundary-roles')
    assert.equal(document.activeElement?.getAttribute('aria-label'), 'Edge 2 role')
    assert.equal(document.querySelector('#placement-map svg')!.getAttribute('viewBox'), mapView)
    assert.equal(document.querySelector('#placement-map svg g[transform]')!.getAttribute('transform'), placement)
    await change(document.querySelector<HTMLSelectElement>('[aria-label="Edge 2 role"]')!, 'side')
    await change(document.querySelector<HTMLInputElement>('[aria-label="Edge 2 wall to lot line in metres"]')!, '.75')
    await settle()
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /Your wall-to-legal-line entry: 0.75 m/)
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /≈ 1.25 m from captured/)
    assert.equal(latest.assumptions.edges[1].role.origin, 'user')
    await click('Mark street side'); await click('Edge 3 faces street')
    assert.doesNotMatch(document.querySelector('.placement-scenarios')!.textContent!, /Derived scenario role: rear/)
    await settle()
    assert.match(document.querySelector('[data-boundary-edge]')!.textContent!, /Derived scenario role: rear/)
    assert.equal(latest.assumptions.measurements.boundary[latest.assumptions.edges[1].id].value, .75)
    await click('Corner or multiple streets'); await settle()
    assert.doesNotMatch(document.querySelector('.zsa')?.textContent ?? '', /Suggested:/)
    assert.match(document.querySelector('.placement-scenarios')!.textContent!, /Possible scenario roles:/)
    await click('Prepare enquiry')
    const exportRecord = JSON.parse(document.querySelector<HTMLTextAreaElement>('#builder-technical-record')!.value)
    assert.equal(exportRecord.zoning_site_assumptions.edges[1].role.origin, 'user')
    assert.equal(exportRecord.placement_scenario_result.status, 'clarify')
    assert.match(document.querySelector('#builder-enquiry-content')!.textContent!, /additional scouting checks for front distance, approximate rear yard and user-entered height/)
    assert.match(document.querySelector('#builder-enquiry-content')!.textContent!, /Site-specific rules, current applicability and legal boundary measurements remain unresolved/)
  } finally {
    await act(async () => root.unmount())
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})
