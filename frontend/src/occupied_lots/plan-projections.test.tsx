import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { journeyCatalogue } from '../model_catalogue/demo'
import { initialAssumptions } from '../zoning_site_assumptions/model'
import OccupiedLots from './OccupiedLots'
import type { Case, Result } from './contract'

test('mapped placement separates projection clearance from the nominal geometry request as the user changes the plan basis and position', async () => {
  // The 3.048 m nominal body is 0.226 m inside the east edge at the starting
  // centre. The west nudges increase that gap by exactly one metre each.
  const site: Case = {
    case_id: 'tight-projection-control', label: 'Constructed square parcel',
    site: {
      projected_metre_crs: 'EPSG:3157', buildings: [], named_boundaries: [],
      parcel: { id: 'test-parcel', shape: { crs: 'EPSG:3157', geometry: { type: 'Polygon',
        coordinates: [[[0, 0], [13, 0], [13, 13], [0, 13], [0, 0]]] } },
        source: { provider: 'Constructed geometry', record_label: 'Square control', capture_date: null,
          review_status: 'unreviewed', reference: null } },
      capture: { completeness: 'partial', scope: 'Constructed parcel edge control', limitations: [] },
    },
  }
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const originals = new Map<string, PropertyDescriptor | undefined>()
  const requests: (Result['input'] & { requirements: unknown[] })[] = []
  Object.assign(dom.window.HTMLElement.prototype, { attachEvent() {}, detachEvent() {} })
  const expose = (name: string, value: unknown) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document,
    navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) expose(name, value)
  expose('fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, '/api/scouting-geometry/assess')
    const input = JSON.parse(String(options.body))
    requests.push(input)
    return { ok: true, json: async () => ({ schema_version: 'scouting-geometry.v1',
      conclusion: 'tested_placement_observations_only', checks: [], limitations: [], input }) }
  })
  const document = dom.window.document
  const root = createRoot(document.getElementById('root')!)
  const find = <T extends Element = HTMLElement,>(selector: string) => {
    const node = document.querySelector<T>(selector)
    assert.ok(node, selector)
    return node
  }
  const nudgeWest = () => act(async () => {
    find('svg.occupied-map').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
  })
  const basis = (findBasis: string) => act(async () => {
    const control = find<HTMLSelectElement>('#placement-projections-basis')
    control.value = findBasis
    control.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
    assert.equal(control.value, findBasis)
  })
  const rotate = (angle: string) => act(async () => {
    const control = find<HTMLInputElement>('#occupied-angle')
    control.focus()
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(control, angle)
    control.dispatchEvent(new dom.window.KeyboardEvent('keyup', { key: '9', bubbles: true }))
  })
  const findings = () => find('#placement-projections').textContent!
  const drawing = 'svg.occupied-map [data-plan-projection-layer]'
  try {
    await act(async () => root.render(createElement(OccupiedLots, {
      suppliedCase: site, compactPlacement: true, showHandoff: false,
      catalogue: journeyCatalogue, initialModelId: 'aux-240', autoSuggest: false,
      initialDraft: { position: { x: '11.25', y: '6.5', width: '3.048', depth: '7.3406', angle: '0' },
        widthOrigin: 'catalogue', depthOrigin: 'catalogue', minima: { parcel: '', building: '' } },
      boundaryInteraction: { edges: initialAssumptions(site, 'test-geometry', 'test-placement').edges,
        mode: 'place', frontId: null, rearId: null, streetPattern: 'unknown', onModeChange() {}, onSelect() {} },
    })))
    assert.equal(find<HTMLSelectElement>('#placement-projections-basis').value, 'unknown')
    assert.equal(find('[data-projection-clearance]').getAttribute('data-projection-clearance'), 'unknown')
    assert.equal(find(drawing).hasAttribute('data-projection-added-depth-m'), false)
    assert.match(findings(), /9 ft 11 in.*advertised 10 ft width.*no eave or gutter dimension/s)
    await basis('wall_face')
    assert.equal(find('[data-projection-clearance]').getAttribute('data-projection-clearance'), 'crosses')
    assert.equal(find(drawing).getAttribute('data-projection-added-depth-m'), '0.3')
    await basis('includes_projection')
    assert.equal(find('[data-projection-clearance]').getAttribute('data-projection-clearance'), 'clear')
    assert.equal(find(drawing).getAttribute('data-projection-added-depth-m'), '0')
    assert.match(find('[data-projection-clearance]').textContent!, /0\.23 m/)
    await basis('wall_face')
    await nudgeWest()
    assert.equal(find('[data-projection-clearance]').getAttribute('data-projection-clearance'), 'clear')
    assert.match(find('[data-projection-clearance]').textContent!, /0\.93 m/)
    await nudgeWest()
    const transformBeforeRotation = find(drawing).closest('[transform]')?.getAttribute('transform')
    await rotate('90')
    assert.notEqual(find(drawing).closest('[transform]')?.getAttribute('transform'), transformBeforeRotation)
    assert.match(findings(), /0.08 m/)
    assert.match(findings(), /Setback treatment and any permitted encroachment still need separate confirmation/)
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 500)) })
    const current = requests.at(-1)
    assert.ok(current, 'The normal assessment submits this position')
    assert.deepEqual(current.placement, { id: 'user-supplied-placement', centre_xy: [9.25, 6.5],
      width_m: 3.048, depth_m: 7.3406, angle_degrees: 90 })
    assert.deepEqual(current.requirements, [], 'Projection assumptions do not create an inferred setback or exemption')
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [name, original] of originals) {
      if (original) Object.defineProperty(globalThis, name, original)
      else Reflect.deleteProperty(globalThis, name)
    }
  }
})
