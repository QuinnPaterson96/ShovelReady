import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { HomeownerSummary, type Summary } from './HomeownerSummary'
import { useRetainedResult } from './resultRetention'
import { IntendedUseControl, applyIntendedUse, mapIntendedUse } from '../builder_demo/intendedUse'
import { initialProjectSettings } from './projectSettings'
import { BoundaryRoleHelp } from '../zoning_site_assumptions/BoundaryMapTools'
import { renderToStaticMarkup } from 'react-dom/server'

test('explicit use choices preserve unknowns and never turn an office answer into a garden suite', () => {
  // Independent expected pathways from the declared bounded garden-suite scope.
  for (const [answer, pathway, state] of [['', null, 'unanswered'], ['Not sure', null, 'unknown'], ['Still deciding', null, 'unknown'], ['Home office', 'other', 'supplied'], ['Garden suite', 'garden_suite', 'supplied'], ['Sleeping room', 'other', 'supplied']] as const) {
    assert.equal(mapIntendedUse(answer).state, state)
    const settings = applyIntendedUse(initialProjectSettings(), answer)
    assert.equal(settings.proposal.proposed_use, pathway)
    assert.equal(settings.evidence.proposed_use.value, pathway)
    assert.equal(settings.evidence.proposed_use.origin, pathway === null ? 'unknown' : 'user')
  }
  const html = renderToStaticMarkup(createElement(IntendedUseControl, { value: 'Not sure', onChange() {} }))
  assert.match(html, /value="Not sure" selected/)
  assert.match(html, /aria-describedby="builder-intended-use-help"/)
})

test('recalculation retains concerns without acknowledging stale findings, and switches cannot show the old property or model', async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const originals = new Map<string, PropertyDescriptor | undefined>()
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true })
  }
  const first: Summary = { conclusion: 'This placement has a conflict', next: 'Adjust the placement.', checks: [{ label: 'Boundary gap', status: 'conflict', detail: 'The captured gap is short.' }] }
  const second: Summary = { conclusion: 'Review this placement', next: 'Confirm the height.', checks: [{ label: 'Height', status: 'unknown', detail: 'Installed height is missing.' }] }
  const root = createRoot(dom.window.document.getElementById('root')!)
  let eligible = false
  function Harness(props: { scopeKey: string | null; inputKey: string; current: Summary | null; pending: boolean }) {
    const view = useRetainedResult(props)
    eligible = view.current
    return view.result ? createElement(HomeownerSummary, { summary: view.result, updating: view.updating, onNavigate() {}, onAcknowledge() {} }) : createElement('p', null, 'Waiting for this assessment')
  }
  const show = async (scopeKey: string, inputKey: string, current: Summary | null, pending: boolean) => act(async () => root.render(createElement(Harness, { scopeKey, inputKey, current, pending })))
  try {
    await show('property-A:model-300', 'placement-1', first, false)
    assert.equal(eligible, true)
    await show('property-A:model-300', 'placement-2', null, true)
    assert.equal(eligible, false)
    assert.match(dom.window.document.body.textContent!, /Updating checks/)
    assert.match(dom.window.document.body.textContent!, /1 Placement concerns/)
    const acknowledgement = [...dom.window.document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Acknowledge and include in enquiry')!
    assert.equal(acknowledgement.disabled, true)
    // Revisiting unchanged inputs must not enter updating or lose the result.
    await show('property-A:model-300', 'placement-2', second, false)
    await show('property-A:model-300', 'placement-2', { ...second }, false)
    assert.equal(eligible, true)
    assert.doesNotMatch(dom.window.document.body.textContent!, /Updating checks/)
    for (const scope of ['property-B:model-300', 'property-B:model-office']) {
      await show(scope, 'new-placement', null, true)
      assert.equal(eligible, false)
      assert.doesNotMatch(dom.window.document.body.textContent!, /Boundary gap|Height|placement has a conflict/)
    }
  } finally {
    await act(async () => root.unmount())
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key) }
    dom.window.close()
  }
})

test('optional boundary help has native disclosure, a described illustration and an obvious unknown path', () => {
  const html = renderToStaticMarkup(createElement(BoundaryRoleHelp))
  assert.match(html, /<details class="boundary-role-help"><summary>/)
  assert.doesNotMatch(html, /<details[^>]* open/)
  assert.match(html, /role="img" aria-labelledby=/)
  assert.match(html, /I don’t know/)
  assert.match(html, /not a required setback/)
})
