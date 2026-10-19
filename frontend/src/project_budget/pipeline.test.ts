import assert from 'node:assert/strict'
import { test } from 'node:test'
import { categories, parseBudget, type BudgetDraft, type Category, type Context, type CostItem } from './contract'
import { budgetEvidence, budgetQuestions, budgetSummary, calculateBudget, catalogueSuggestions, emptyBudget, manualItem, reconcile, replaceItem, type ManualEntry } from './pipeline'
import { defaultJourneyModel, journeyCatalogue, modelSnapshot } from '../model_catalogue/demo'
import { manufacturerDocument } from '../builder_demo/manufacturer'
import { enquiryEmailBody, enquiryMarkdown, enquiryPlainText } from '../builder_demo/enquiry'
import { enquiryPackageFiles } from '../builder_demo/placementExport'
import { screeningDocument } from '../builder_demo/BuilderDemo'

const today = '2026-10-19', model = defaultJourneyModel
export const exampleContext: Context = { model_id: model.model_id, model_revision: model.source_revision, snapshot_id: modelSnapshot(model),
  configuration: model.configuration, property_key: 'synthetic property; no real quote', scenario_key: 'unknown-use, no placement' }
const context = exampleContext
export const entry = (category: Category, changes: Partial<ManualEntry> = {}): ManualEntry => ({ id: `manual:${category}`, category, label: categories[category], state: 'priced',
  basis: 'allowance', minimum: '0', maximum: '', bound: 'exact', currency: 'CAD', included_in: '', rationale: 'Synthetic arithmetic example only',
  tax_basis: 'Tax excluded; separate explicit tax line', provider: 'Synthetic test owner', locator: 'Synthetic fixture, no provider quote',
  captured_at: '', effective_at: '', expires_at: '', inclusions: [], exclusions: [], treatment: 'capital_cost', tax_status: 'excluded', ...changes })
const manual = (category: Category, changes: Partial<ManualEntry> = {}) => manualItem(entry(category, changes), context, today)
const calculate = (draft: BudgetDraft, current = context) => calculateBudget(draft, current, today)
const source = () => catalogueSuggestions(model, context.snapshot_id, context, today)[0]

test('real captured Price -> explicit draft -> partial calculation -> enquiry, readable and full evidence exports', () => {
  const suggestion = source()
  assert.equal(suggestion.money!.minimum, model.prices![0].amount!.minimum)
  assert.deepEqual(JSON.parse(suggestion.evidence.original_record).claim, model.prices![0])
  const draft = replaceItem({ ...emptyBudget(), scope: 'whole_project' }, suggestion), result = calculate(draft)
  assert.equal(result.complete, false)
  assert.equal(result.subtotals[0].minimum, '187000') // Existing saved claim, not research-report publication.
  assert.equal(result.subtotals[0].maximum, null)
  assert.ok(result.missing.includes('site') && result.missing.includes('tax'))
  const input = { intendedUse: 'Unknown', relationship: 'Unknown', nextStep: 'I would like an initial call.',
    timing: '', budget: 'around 250k? not sure what that covers', access: '', services: '', budgetDraft: { draft, context, today } }
  const enquiry = manufacturerDocument(input, null, false, null, null, null, null, false, false, null, model)
  const report = screeningDocument(null, input, null)
  const evidence = budgetEvidence(draft, context, today)
  for (const text of [enquiryPlainText(enquiry), enquiryMarkdown(enquiry), enquiryEmailBody(enquiry, true)]) {
    assert.ok(text.includes(input.nextStep) && text.includes(input.budget))
    assert.match(text, /Priced-components subtotal.*187,000/)
    assert.match(text, /upper amount unknown/)
    assert.match(text, /Foundation and site work/)
    assert.doesNotMatch(text, /Whole project total|Complete scenario range|affordable|verified quote/)
  }
  const files = enquiryPackageFiles(enquiry, report, [], { project_budget: evidence }, null)
  const exported = Object.values(files).map(bytes => new TextDecoder().decode(bytes)).join('\n')
  assert.ok(exported.includes(suggestion.evidence.original_record.replace(/"/g, '\\"'))) // complete claim retained inside technical JSON/Markdown
  assert.equal(evidence.accepted_publication, false)
  assert.ok(budgetQuestions(draft, result, model.name).length <= 3)
})

test('independent package arithmetic: 100.10–120.10 + 2.20 + tax 0 = 102.30–122.30; included delivery has no second charge', () => {
  // These numbers are a hand-calculated decimal example, not values copied from the calculator.
  const packageItem = manual('unit', { minimum: '100.10', maximum: '120.10', bound: 'range', inclusions: ['Delivery and lift'] })
  const delivery = manual('delivery', { state: 'included', included_in: packageItem.id, rationale: 'Synthetic package expressly includes delivery and lift' })
  const items = (Object.keys(categories) as Category[]).map(category => category === 'unit' ? packageItem : category === 'delivery' ? delivery
    : category === 'upgrades' ? manual(category, { minimum: '2.20' }) : category === 'tax' ? manual(category, { minimum: '0.00' })
      : manual(category, { state: 'not_applicable', rationale: 'Synthetic excluded-scope assumption for this arithmetic case' }))
  const draft: BudgetDraft = { ...emptyBudget(), scope: 'whole_project', items }, result = calculate(draft)
  assert.equal(result.complete, true)
  assert.deepEqual(result.subtotals, [{ currency: 'CAD', minimum: '102.30', maximum: '122.30', precision: 2 }])
  assert.equal(result.counted_ids.length, 3)
  assert.equal(result.included.length, 1)
  // A priced delivery line would duplicate the package's explicit inclusion.
  const duplicated = calculate(replaceItem(draft, manual('delivery', { minimum: '20.00' })))
  assert.equal(duplicated.subtotals[0].minimum, '102.30')
  assert.equal(duplicated.complete, false)
  assert.match(duplicated.issues.map(i => i.message).join(' '), /already included/)
  const changed = replaceItem(draft, manual('services', { minimum: '5.25', bound: 'minimum' }))
  assert.equal(calculate(changed).subtotals[0].minimum, '107.55')
  assert.equal(calculate(changed).subtotals[0].maximum, null)
  assert.equal(calculate(changed).complete, false)
  const starting = replaceItem(draft, { ...packageItem, basis: 'starting', evidence: { ...packageItem.evidence, origin: 'catalogue', captured_at: today } })
  assert.equal(calculate(starting).subtotals[0].maximum, null, 'even a supplied maximum cannot turn a starting price into a bound')
})

test('missing currencies and mixed original currencies are explicit and never summed', () => {
  const noCurrency = manual('unit', { minimum: '100', currency: '' })
  const result = calculate({ ...emptyBudget(), items: [noCurrency, manual('site', { minimum: '5' }), manual('fees', { minimum: '10', currency: 'USD' })] })
  assert.equal(result.complete, false)
  assert.ok(result.issues.some(i => i.message.includes('Currency is unknown')))
  assert.deepEqual(result.subtotals.map(s => [s.currency, s.minimum]), [['CAD', '5'], ['USD', '10']])
  const pod = journeyCatalogue.models.find(m => m.model_id === 'wcch-ch-studio')!
  assert.equal(catalogueSuggestions(pod, modelSnapshot(pod), { ...context, model_id: pod.model_id, configuration: pod.configuration }, today)[0].money!.currency, null)
})

test('bad intake leaves the prior draft/catalogue untouched; zero and exact source precision survive', () => {
  let active = replaceItem(emptyBudget(), source())
  const before = JSON.stringify(active), catalogueBefore = JSON.stringify(model)
  const failures: unknown[] = [null, { ...active, schema_version: 'v2' }, { ...active, extra: true },
    { ...active, items: [source(), source()] }, { ...active, items: [{ ...source(), money: null }] },
    ...['-1', 'NaN', '1e5', '1,000', '0.1234567', '900719925474099100000'].map(minimum => ({ ...active, items: [{ ...source(), money: { ...source().money!, minimum } }] })),
    { ...active, items: [{ ...source(), money: { currency: 'CAD', minimum: '100.20', maximum: '10.00', precision: 2 } }] }]
  for (const input of failures) { assert.throws(() => { active = parseBudget(input) }); assert.equal(JSON.stringify(active), before) }
  assert.equal(JSON.stringify(model), catalogueBefore)
  const precise = calculate({ ...emptyBudget(), items: [manual('unit', { minimum: '0.100001' }), manual('fees', { minimum: '0.200002' })] })
  assert.equal(precise.subtotals[0].minimum, '0.300003')
  assert.equal(manual('tax', { minimum: '0' }).money!.minimum, '0')
  const security = calculate({ ...emptyBudget(), items: [manual('fees', { minimum: '500', treatment: 'refundable_security' })] })
  assert.equal(security.subtotals.length, 0)
  assert.match(security.issues[0].message, /separate cash requirement/)
})

test('unknowns, tax scope, conflicting inclusions, packages and circular links prevent a misleading complete range', () => {
  const unit = manual('unit', { minimum: '100' })
  const cases: CostItem[][] = [
    [unit, { ...unit, id: 'alternative', alternative_group: 'offers' }, { ...unit, id: 'alternative2', alternative_group: 'offers' }],
    [unit, manual('delivery', { state: 'included', included_in: 'missing' })],
    [manual('unit', { state: 'included', included_in: 'manual:delivery' }), manual('delivery', { state: 'included', included_in: 'manual:unit' })],
    [manual('unit', { inclusions: ['Lift'], exclusions: [' lift '] })],
    [{ ...unit, exclusions: ['Shipping'] }, manual('delivery', { state: 'included', included_in: unit.id })],
    [source(), manual('site', { state: 'included', included_in: source().id })],
  ]
  for (const items of cases) { const result = calculate({ ...emptyBudget(), scope: 'whole_project', items }); assert.equal(result.complete, false); assert.ok(result.issues.length) }
  const taxUnknown = calculate({ ...emptyBudget(), scope: 'building', items: [manual('unit', { minimum: '10', tax_basis: 'unknown', tax_status: 'unknown' }),
    ...(['upgrades', 'tax', 'contingency'] as Category[]).map(category => manual(category, { state: 'not_applicable' }))] })
  assert.equal(taxUnknown.complete, false)
  assert.match(taxUnknown.limitations.join(' '), /Tax basis/)
  const doubleTax = calculate({ ...emptyBudget(), scope: 'building', items: [manual('unit', { minimum: '100', tax_status: 'included' }), manual('tax', { minimum: '10' })] })
  assert.equal(doubleTax.subtotals[0].minimum, '100', 'a separate tax line must not add a second charge to tax-inclusive work')
  assert.match(doubleTax.issues.map(i => i.message).join(' '), /already includes tax/)
})

test('model, configuration, property and scenario edits withhold old costs, including after switching back', () => {
  const draft = replaceItem(emptyBudget(), manual('site', { basis: 'quote', minimum: '500', provider: 'Synthetic site reviewer', captured_at: today }))
  for (const key of ['model_id', 'configuration', 'property_key', 'scenario_key', 'snapshot_id'] as const) {
    const changedContext = { ...context, [key]: 'changed' }
    const changed = reconcile(draft, changedContext)
    assert.equal(calculate(changed, changedContext).subtotals.length, 0)
    assert.equal(calculate(reconcile(changed, context)).subtotals.length, 0, 'returning to old inputs does not erase the recheck flag')
    assert.ok(changed.items[0].evidence.original_record)
  }
  const expired = replaceItem(emptyBudget(), manual('unit', { expires_at: '2026-10-18' }))
  assert.match(calculate(expired).issues[0].message, /expired/)
  const oldSource = { ...source(), evidence: { ...source().evidence, captured_at: '2026-01-01' } }
  assert.equal(calculate(replaceItem(emptyBudget(), oldSource)).subtotals.length, 0)
  const configured = catalogueSuggestions(model, context.snapshot_id, { ...context, configuration: 'bespoke upgrades' }, today)[0]
  assert.ok(configured.recheck_reason)
})

test('incomplete cost draft still makes a useful unknown-context contact and retains owner budget text unchanged', () => {
  const draft = { ...emptyBudget(), scope: 'whole_project' as const }
  const doc = manufacturerDocument({ intendedUse: 'Unknown', relationship: 'Unknown', nextStep: 'Please arrange an initial call.',
    budget: 'Prefer to discuss', timing: '', access: '', services: '', budgetDraft: { draft, context, today } }, null, false, null, null, null, null, false)
  const text = enquiryPlainText(doc)
  assert.match(text, /initial call/); assert.match(text, /Prefer to discuss/)
  assert.match(text, /No usable priced components/)
  assert.match(text, /Builder\/provider/)
  assert.ok(budgetSummary(draft, calculate(draft)).some(p => p.includes('unknown') || p.includes('Unknown')))
})
