import assert from 'node:assert/strict'
import { register } from 'node:module'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ExampleProperty } from '../builder_demo/ExampleProperty'
import type { SuggestionGeometry } from './usePlacementSuggestion'

register('../../tools/css-test-loader.mjs', import.meta.url)

test('a late starting suggestion cannot undo a manual move; retry applies only a matching response', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const document = dom.window.document
  const pending: { geometry: SuggestionGeometry; respond: (body: unknown) => void }[] = []
  const mockFetch = async (path: string, init?: RequestInit) => {
    if (!path.endsWith('/suggest')) return new Response(null, { status: 503 })
    const { geometry } = JSON.parse(String(init?.body))
    // Deliberately ignore abort: even a transport delivering the old response
    // after an edit must never move the user's new position.
    return new Promise<Response>(resolve => pending.push({ geometry,
      respond: body => resolve(new Response(JSON.stringify(body), { status: 200 })) }))
  }
  const originals = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries({ document, window: dom.window, fetch: mockFetch, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true })
  }
  const root = createRoot(document.getElementById('root')!)
  const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.startsWith(label))!
  const angle = () => Number(document.querySelector<HTMLInputElement>('#builder-example-angle')!.value)
  const success = (index: number) => ({ schema_version: 'placement-suggestion.result.v1', status: 'suggested',
    basis: 'mapped_geometry', message: 'Mapped starting position.', selected_scenario: null, scenario_context_applied: false,
    evaluated_positions: 625, capture: pending[index].geometry.capture, sources: [], limitations: [],
    placement: { ...pending[index].geometry.placement, id: 'suggested-starting-placement', angle_degrees: 33.25 } })
  try {
    await act(async () => root.render(createElement(ExampleProperty, { suggestionContext: null, onMeasurement() {} })))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 220)) })
    assert.equal(pending.length, 1)
    const initialAngle = angle()
    await act(async () => button('East').click())
    await act(async () => pending[0].respond(success(0)))
    assert.equal(angle(), initialAngle)
    assert.doesNotMatch(document.body.textContent!, /Mapped starting position\./)
    await act(async () => button('Suggest a placement').click())
    assert.equal(pending.length, 2)
    await act(async () => pending[1].respond(success(1)))
    assert.equal(angle(), 33.25)
    assert.match(document.body.textContent!, /Mapped starting position\./)
    await act(async () => button('Suggest a placement').click())
    await act(async () => pending[2].respond({ ...success(2), capture: null, selected_scenario: { checks: null } }))
    assert.equal(angle(), 33.25)
    assert.match(document.body.textContent!, /response did not match/)
  } finally {
    await act(async () => root.unmount())
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key) }
    dom.window.close()
  }
})
