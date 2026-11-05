import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { AlternativeComparison, type ComparisonAlternative } from './AlternativeComparison'
import { journeyCatalogue, modelSnapshot } from '../model_catalogue/demo'
import { catalogueSuggestions, emptyBudget, manualItem, replaceItem } from '../project_budget/pipeline'

// Boundary risk: absent price/currency/coverage must not turn into a cheaper
// option or a suitability pass. Expected source amounts come from captured
// catalogue claims; deliberately authored conflicts are independent of evaluators.
test('same-property comparison preserves qualified findings, cost evidence and missing-input handoff', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const originals = new Map<string, PropertyDescriptor | undefined>()
  const expose = (name: string, value: unknown) => { originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }) }
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) expose(name, value)
  const root = createRoot(dom.window.document.getElementById('root')!)
  const alternative = (id: string): ComparisonAlternative => {
    const model = journeyCatalogue.models.find(item => item.model_id === id)!
    const context = { model_id: id, snapshot_id: modelSnapshot(model), model_revision: model.source_revision,
      configuration: model.configuration, property_key: 'same-parcel', scenario_key: 'same-scenario' }
    return { model, propertyKey: 'same-parcel', propertyLabel: 'Saved example property', intendedUse: 'Garden suite',
      configuration: '', affordabilityPreference: 'Prefer CAD 250,000 overall', foundationAllowanceM: '0.3', measurement: null,
      placement: 'not_placed', summary: null, budget: { draft: { ...emptyBudget(), scope: 'whole_project' }, context } }
  }
  const first = alternative('aux-300'), missing = alternative('aux-240'), currency = alternative('wcch-ch-studio')
  first.summary = { conclusion: 'Worth exploring with the provider', next: 'Discuss the roofline concern.', checks: [
    { label: 'Roof overlap', status: 'conflict', detail: 'This trial position overlaps the captured main roof.' },
    { label: 'Existing garden suite', status: 'probable', detail: 'Assuming no existing garden suite; correct this in property details.' },
    { label: 'Installed height', status: 'unknown', detail: 'Provider height datum not supplied.' },
  ] }
  const quote = manualItem({ id: 'test-quote', category: 'unit', label: 'Configuration-specific quote', state: 'priced', minimum: '210000', maximum: '210000', currency: 'CAD', bound: 'exact',
    basis: 'quote', provider: 'Test provider', locator: 'Quote supplied by homeowner', captured_at: '2026-11-01',
    effective_at: '', expires_at: '', included_in: '', treatment: 'capital_cost', inclusions: ['Building'], exclusions: ['Foundation'], tax_status: 'excluded', tax_basis: 'Tax additional', rationale: 'Selected residential configuration' }, first.budget.context, '2026-11-04')
  first.budget.draft = replaceItem(first.budget.draft, quote)
  currency.budget.draft = replaceItem(currency.budget.draft, catalogueSuggestions(currency.model, modelSnapshot(currency.model), currency.budget.context, '2026-11-04')[0])
  const other = { ...alternative('hewing-quadra4'), propertyKey: 'other-property', propertyLabel: 'Must not compare' }
  let selected = ''
  const render = async (alternatives: ComparisonAlternative[], activeModelId = 'aux-300') => act(async () => root.render(createElement(AlternativeComparison, { alternatives, activeModelId, onSelectModel: id => { selected = id } })))
  try {
    await render([first, missing, currency, other])
    const document = dom.window.document
    const panel = document.querySelector<HTMLDetailsElement>('#builder-alternative-comparison')!
    assert.equal(panel.open, false, 'comparison is optional and closed initially')
    panel.open = true
    const lane = (name: string) => document.querySelector<HTMLElement>(`article[aria-label="${name} comparison"]`)!
    assert.equal(document.querySelectorAll('article').length, 3, 'other properties are excluded defensively')
    assert.match(lane(first.model.name).textContent!, /Roof overlap.*Preliminary concern.*overlaps/s)
    assert.match(lane(first.model.name).textContent!, /Assuming no existing garden suite/)
    assert.ok([...lane(first.model.name).querySelectorAll('p')].some(paragraph => paragraph.closest('details') === panel && /Priority questions: Installed height/.test(paragraph.textContent!)), 'decision-relevant questions stay named outside collapsed details')
    assert.match(lane(first.model.name).textContent!, /CAD 187,000/)
    assert.match(lane(first.model.name).textContent!, /CAD 210,000/)
    assert.match(lane(first.model.name).textContent!, /Test provider.*User-entered quote fact.*2026-11-01/s)
    assert.match(lane(first.model.name).textContent!, /Excluded: Foundation/)
    assert.match(lane(first.model.name).textContent!, /Whole-project estimate: unavailable/)
    assert.match(lane(missing.model.name).textContent!, /Price unknown in captured sources/)
    assert.match(lane(missing.model.name).textContent!, /No usable priced-components subtotal.*Unknown costs are not zero/s)
    assert.match(lane(missing.model.name).textContent!, /No current suitability findings/)
    assert.match(lane(currency.model.name).textContent!, /Currency unknown 96,860/)
    assert.match(lane(currency.model.name).textContent!, /Currency is unknown.*cannot enter a subtotal/s)
    assert.match(lane(currency.model.name).textContent!, /No usable priced-components subtotal/)
    assert.match(panel.textContent!, /Homeowner with local rental evidence.*occupancy/s)
    assert.match(panel.textContent!, /property manager.*recurring owner-paid/s)
    assert.match(panel.textContent!, /lender.*if financing matters/s)
    await act(async () => [...lane(missing.model.name).querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === `Open ${missing.model.name}`)!.click())
    assert.equal(selected, missing.model.model_id, 'comparison opens the retained alternative through the host')
    await render([{ ...first, placement: 'needs_recheck' }, missing], missing.model.model_id)
    assert.match(lane(first.model.name).textContent!, /Recheck this scenario/)
    assert.doesNotMatch(lane(first.model.name).textContent!, /Worth exploring with the provider/, 'stale findings cannot stay affirmative')
    await render([], 'missing')
    assert.match(panel.textContent!, /Select a property/)
  } finally {
    await act(async () => root.unmount())
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})
