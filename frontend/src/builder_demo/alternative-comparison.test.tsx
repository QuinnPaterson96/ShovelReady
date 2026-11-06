import { register } from 'node:module'
register('../../tools/css-test-loader.mjs', import.meta.url)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { AlternativeComparison, type ComparisonAlternative, type FinancialGoal } from './AlternativeComparison'
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
  let goals: FinancialGoal[] | null = null
  let quoteModel = ''
  const render = async (alternatives: ComparisonAlternative[], activeModelId = 'aux-300') => act(async () => root.render(createElement(AlternativeComparison, { alternatives, activeModelId,
    onSelectModel: id => { selected = id }, financialGoals: goals, onFinancialGoalsChange: next => { goals = next }, onPrepareQuote: id => { quoteModel = id } })))
  try {
    await render([first, missing, currency, other])
    const document = dom.window.document
    const panel = document.querySelector<HTMLDetailsElement>('#builder-alternative-comparison')!
    assert.equal(panel.open, false, 'comparison is optional and closed initially')
    const interests = document.querySelector<HTMLElement>('[aria-label="Financial interests"]')!
    assert.equal(interests.closest('details'), null, 'everyone can discover the optional question with the comparison closed')
    assert.match(interests.textContent!, /What would you like to understand about the finances/)
    const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === label)!
    await act(async () => { interests.querySelectorAll<HTMLInputElement>('input')[0].click(); interests.querySelectorAll<HTMLInputElement>('input')[1].click() })
    await act(async () => button('Save interests').click())
    assert.deepEqual(goals, ['cost', 'rental'], 'financial interests can coexist without changing planning use')
    await render([first, missing, currency, other])
    assert.equal(interests.querySelector('fieldset'), null, 'saved interests do not repeat the question')
    assert.match(interests.textContent!, /Project cost and Potential rental income/)
    panel.open = true
    const lead = document.querySelector<HTMLElement>('[aria-label="Current model financial next step"]')!
    assert.match(lead.textContent!, /CAD 210,000.*building quote/s)
    assert.match(lead.textContent!, /Installed cost incomplete.*Still needed.*Prepare quote request for/s)
    // The rental lead must name income, occupancy and expenses before opening supporting details.
    for (const input of [/local rent/i, /occup|vacan/i, /expenses|running costs/i]) assert.match(lead.textContent!, input)
    await act(async () => button(`Prepare quote request for ${first.model.name}`).click())
    assert.equal(quoteModel, first.model.model_id, 'quote action is optional and targets the active model')
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
    const overview = document.querySelector<HTMLElement>('[aria-label="Explored model overview"]')!
    assert.ok(overview.compareDocumentPosition(lane(first.model.name)) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING, 'overview precedes every full model record')
    const row = (name: string) => [...overview.querySelectorAll('tbody tr')].find(item => item.querySelector('th strong')?.textContent === name)!
    assert.match(row(missing.model.name).textContent!, /Model price unknown/)
    assert.match(row(currency.model.name).textContent!, /Currency unknown 96,860.*currency needs confirmation/s)
    assert.match(row(first.model.name).textContent!, /Roof overlap.*Preliminary concern|Preliminary concern.*Roof overlap/s)
    await act(async () => [...lane(missing.model.name).querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === `Open ${missing.model.name}`)!.click())
    assert.equal(selected, missing.model.model_id, 'comparison opens the retained alternative through the host')
    await render([{ ...first, placement: 'needs_recheck' }, missing], missing.model.model_id)
    assert.equal(interests.querySelector('fieldset'), null, 'model switching retains project interests without asking again')
    assert.match(lead.textContent!, /Model price unknown/)
    await act(async () => button(`Prepare quote request for ${missing.model.name}`).click())
    assert.equal(quoteModel, missing.model.model_id, 'quote handoff follows the newly active model')
    assert.match(lane(first.model.name).textContent!, /Recheck this scenario/)
    assert.doesNotMatch(lane(first.model.name).textContent!, /Worth exploring with the provider/, 'stale findings cannot stay affirmative')
    assert.match(row(first.model.name).textContent!, /Recheck this scenario/)
    assert.doesNotMatch(row(first.model.name).textContent!, /Worth exploring with the provider/)
    await act(async () => button('Edit financial interests').click())
    await act(async () => button('Skip for now').click())
    assert.deepEqual(goals, [], 'skip is an explicit project answer, distinct from unanswered')
    await render([missing], missing.model.model_id)
    assert.match(interests.textContent!, /skipped for now/)
    assert.equal(overview.querySelectorAll('tbody tr').length, 1, 'overview works before a second model is explored')
    assert.ok(button(`Prepare quote request for ${missing.model.name}`), 'skip preserves enquiry access')
    assert.doesNotMatch(lead.textContent!, /For rental income/)
    goals = ['rental']
    const quadra = alternative('hewing-quadra4')
    currency.summary = { conclusion: 'Footprint explored', next: 'Ask the provider about residential use.', checks: [
      { label: 'Permanent dwelling suitability', status: 'unknown', detail: 'Permanent residential suitability has not been established.' },
    ] }
    await render([first, missing, currency, quadra])
    assert.equal(interests.querySelector('fieldset'), null, 'an explicitly supplied rental interest is reflected without repeating the question')
    assert.match(interests.textContent!, /Potential rental income/)
    assert.equal(overview.querySelectorAll('tbody tr').length, 4)
    assert.match(row(quadra.model.name).textContent!, /Starting at CAD/)
    assert.match(row(currency.model.name).textContent!, /Permanent dwelling suitability.*Missing information/s)
    const evidenceLink = row(currency.model.name).querySelector<HTMLAnchorElement>('a')!
    assert.ok(document.querySelector(evidenceLink.hash), 'each compact row links to its own full evidence')
    first.budget.draft.items[0].recheck_reason = 'Configuration changed'
    await render([first, missing, currency, quadra])
    assert.doesNotMatch(lead.textContent!, /building quote/, 'a stale quote is withheld from the financial lead')
    assert.match(lead.textContent!, /Starting at CAD 187,000/, 'attributed captured price remains distinct from a matching quote')
    await render([], 'missing')
    assert.match(panel.textContent!, /Select a property/)
  } finally {
    await act(async () => root.unmount())
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) }
    dom.window.close()
  }
})
