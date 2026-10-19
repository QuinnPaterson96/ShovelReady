import type { CatalogueModel } from '../model_catalogue/model'
import { categories, decimalPlaces, decimalString, minorUnits, parseBudget, type BudgetDraft, type BudgetScope, type Category, type Context, type CostItem, type Money } from './contract'

export const scopeLabels: Record<BudgetScope, string> = { building: 'Building only', whole_project: 'Whole project', not_sure: 'Not sure' }
export const utcToday = () => new Date().toISOString().slice(0, 10)
const sameContext = (a: Context, b: Context) => (Object.keys(a) as Array<keyof Context>).every(key => a[key] === b[key])
export const requiredCategories = (scope: BudgetScope): Category[] => scope === 'building'
  ? ['unit', 'upgrades', 'tax', 'contingency'] : Object.keys(categories) as Category[]
export const emptyBudget = (): BudgetDraft => ({ schema_version: 'project-budget.draft.v1', scope: 'not_sure', items: [] })

export type ManualEntry = {
  id: string; category: Category; label: string; state: CostItem['state']; basis: 'allowance' | 'quote'
  minimum: string; maximum: string; bound: 'exact' | 'range' | 'minimum'; currency: string
  included_in: string; rationale: string; tax_basis: string; provider: string; locator: string
  captured_at: string; effective_at: string; expires_at: string; inclusions: string[]; exclusions: string[]
  treatment: CostItem['treatment']
  tax_status: CostItem['tax_status']
}
/** A user-entered quote fact is still unreviewed; no attachment is fetched or published. */
export function manualItem(entry: ManualEntry, context: Context, today = utcToday()): CostItem {
  const nullable = (s: string) => s.trim() || null
  const minimum = entry.minimum.trim(), maximum = entry.bound === 'exact' ? minimum : nullable(entry.maximum)
  const item: CostItem = {
    id: entry.id, category: entry.category, label: entry.label.trim() || categories[entry.category], state: entry.state,
    money: entry.state === 'priced' ? { minimum, maximum: entry.bound === 'minimum' ? null : maximum,
      currency: nullable(entry.currency.trim().toUpperCase()), precision: Math.max(decimalPlaces(minimum), decimalPlaces(maximum ?? '')) } : null,
    basis: entry.basis, included_in: entry.state === 'included' ? nullable(entry.included_in) : null,
    alternative_group: null, selected: true, inclusions: entry.inclusions, exclusions: entry.exclusions,
    tax_basis: nullable(entry.tax_basis), tax_status: entry.tax_status, rationale: entry.rationale, recheck_reason: null, treatment: entry.treatment, context,
    evidence: { origin: entry.basis === 'quote' ? 'user_quote' : 'user_allowance', provider: entry.provider.trim() || 'Homeowner',
      label: entry.basis === 'quote' ? 'User-entered quote fact' : 'User planning allowance', locator: entry.locator.trim() || 'Entered in this local draft',
      captured_at: nullable(entry.captured_at), effective_at: nullable(entry.effective_at), expires_at: nullable(entry.expires_at),
      recorded_at: today, review_status: 'unreviewed', original_record: JSON.stringify(entry) },
  }
  return parseBudget({ schema_version: 'project-budget.draft.v1', scope: 'not_sure', items: [item] }).items[0]
}
/** Explicit immutable update. Validation completes before any caller replaces state. */
export function replaceItem(draft: BudgetDraft, item: CostItem): BudgetDraft {
  return parseBudget({ ...draft, items: [...draft.items.filter(old => old.id !== item.id), item] })
}
export function reconcile(draft: BudgetDraft, context: Context): BudgetDraft {
  return { ...draft, items: draft.items.map(item => !sameContext(item.context, context) && !item.recheck_reason
    ? { ...item, recheck_reason: 'Model, configuration, property or project assumptions changed. Replace or re-enter this cost after checking its scope.' } : item) }
}

/** Catalogue is an existing validated local snapshot. Never read research prices or fetch sources. */
export function catalogueSuggestions(model: CatalogueModel, snapshotId: string, context: Context, today = utcToday()): CostItem[] {
  return (model.prices ?? []).map((price, index) => {
    const source = model.sources.find(s => s.source_id === price.source_id)
    const minimum = price.amount?.minimum ?? ''
    const maximum = price.basis === 'fixed' && price.amount?.maximum === null ? minimum : price.amount?.maximum ?? null
    return {
      id: `catalogue:${snapshotId}:${model.model_id}:${index}`, category: 'unit', label: `${model.provider} ${model.name}`,
      state: price.amount ? 'priced' : 'unknown', money: price.amount ? { minimum, maximum, currency: price.currency,
        precision: Math.max(decimalPlaces(minimum), decimalPlaces(maximum ?? '')) } : null,
      basis: price.basis, included_in: null, alternative_group: 'building-offer', selected: true,
      inclusions: [...price.inclusions], exclusions: [...price.exclusions], tax_basis: price.tax_treatment, tax_status: 'unknown',
      rationale: `Provider ${price.scope === 'provider' ? 'provider-wide' : 'model'} claim; configuration: ${price.configuration ?? 'not specified'}. ${price.qualifications.join(' ')}`,
      recheck_reason: context.configuration !== model.configuration || price.scope !== 'model'
        ? 'This claim does not establish pricing for the selected project configuration. Ask the provider for a matching offer.' : null,
      treatment: 'capital_cost', context, evidence: { origin: 'catalogue', provider: model.provider, label: `${model.name} price claim`,
        locator: source ? `${source.url} — ${source.locator}` : 'Source record unavailable', captured_at: source?.captured_at ?? null,
        effective_at: null, expires_at: null, recorded_at: today, review_status: model.review_status,
        original_record: JSON.stringify({ snapshot_id: snapshotId, model_id: model.model_id, model_revision: model.source_revision,
          model_configuration: model.configuration, source: source ?? null, claim: price }) },
    } satisfies CostItem
  }).map(item => parseBudget({ schema_version: 'project-budget.draft.v1', scope: 'not_sure', items: [item] }).items[0])
}

export type BudgetResult = {
  complete: boolean; scope: BudgetScope; subtotals: Money[]; missing: Category[]; included: string[]
  issues: Array<{ item_id: string; message: string }>; counted_ids: string[]; outside_scope: string[]
  limitations: string[]
}
const normalized = (s: string) => s.trim().toLowerCase()
const coverageTerms: Record<Category, string[]> = {
  unit: ['building', 'unit'], upgrades: ['upgrades'], delivery: ['shipping', 'installation', 'delivery', 'crane', 'delivery and lift'],
  site: ['foundations', 'foundation', 'site work', 'foundation and site work'], services: ['site services', 'services', 'service connections'],
  professional: ['professional work'], fees: ['permitting', 'permits', 'fees'], tax: ['tax', 'taxes'], contingency: ['contingency'],
}
/** Exact integer decimal arithmetic only. No FX, implicit tax or contingency assumptions. */
export function calculateBudget(candidate: BudgetDraft, context: Context, today = utcToday()): BudgetResult {
  const draft = parseBudget(candidate), required = requiredCategories(draft.scope)
  const selected = draft.items.filter(item => item.selected && required.includes(item.category))
  const issues: BudgetResult['issues'] = []
  const addIssue = (item: CostItem, message: string) => issues.push({ item_id: item.id, message })
  for (const item of selected) {
    if (item.treatment === 'refundable_security') addIssue(item, 'Refundable deposit/security is a separate cash requirement, outside capital cost. This prototype does not calculate cash timing or credits; the related cost remains unresolved.')
    if (item.recheck_reason || !sameContext(item.context, context)) addIssue(item, item.recheck_reason || 'Cost belongs to different model, property or project assumptions; recheck it.')
    const e = item.evidence
    if (e.expires_at && e.expires_at < today) addIssue(item, 'Offer has expired; refresh before including it.')
    if (e.effective_at && e.effective_at > today || e.captured_at && e.captured_at > today) addIssue(item, 'Source date is in the future; applicability needs checking.')
    // Explicit prototype recency policy, not a claim about legal/contractual validity.
    if (e.origin === 'catalogue' && (!e.captured_at || Date.parse(today) - Date.parse(e.captured_at) > 90 * 86400000))
      addIssue(item, 'Catalogue capture is missing or older than the prototype’s 90-day refresh window. Obtain a dated matching claim.')
    if (item.money && !item.money.currency) addIssue(item, 'Currency is unknown; this amount cannot enter a subtotal.')
    if (item.inclusions.some(s => item.exclusions.map(normalized).includes(normalized(s)))) addIssue(item, 'Inclusions and exclusions contradict each other; clarify scope.')
    if (item.alternative_group && selected.filter(other => other.alternative_group === item.alternative_group).length > 1)
      addIssue(item, 'Select one alternative package before calculating.')
    // Multiple independently priced lines for a category need an explicit disjoint breakdown.
    // This bounded prototype deliberately withholds them instead of guessing overlap.
    if (selected.some(other => other.id !== item.id && other.category === item.category))
      addIssue(item, 'Overlapping priced entries in one category need reconciliation; choose one package or combine a confirmed non-overlapping allowance.')
  }
  for (const item of selected.filter(item => item.state === 'priced')) {
    const including = selected.find(parent => parent.id !== item.id && parent.state === 'priced' && !blockedByExistingIssue(parent) &&
      parent.inclusions.map(normalized).some(s => [normalized(item.label), ...coverageTerms[item.category]].includes(s)))
    if (including) addIssue(item, `This work is already included in ${including.label}. Link it as included or reconcile the package scope before adding a separate price.`)
    if (item.category === 'tax' && selected.some(parent => parent.category !== 'tax' && parent.state === 'priced' && parent.tax_status === 'included'))
      addIssue(item, 'Priced work already includes tax. Reconcile a non-overlapping tax scope before adding a separate tax amount; this prototype does not apportion mixed tax treatments.')
  }
  function blockedByExistingIssue(item: CostItem) { return issues.some(issue => issue.item_id === item.id) }
  const blocked = (item: CostItem) => issues.some(issue => issue.item_id === item.id)
  const included: string[] = []
  for (const item of selected.filter(item => item.state === 'included')) {
    const parent = selected.find(other => other.id === item.included_in)
    if (!parent || parent.state !== 'priced' || blocked(parent) || parent.id === item.id || parent.category === item.category)
      addIssue(item, 'Included work needs a selected, usable priced line in another category; circular or missing links cannot count.')
    else if (parent.exclusions.map(normalized).some(s => [normalized(item.label), ...coverageTerms[item.category]].includes(s)))
      addIssue(item, 'The package excludes this work; reconcile the inclusion before calculating.')
    if (!blocked(item) && parent) included.push(`${item.label} included in ${parent.label} (${item.rationale})`)
  }
  const priced = selected.filter(item => item.state === 'priced' && !blocked(item))
  const currencies = [...new Set(priced.map(item => item.money!.currency!))]
  const subtotals = currencies.map(currency => {
    const items = priced.filter(item => item.money!.currency === currency), precision = Math.max(...items.map(item => item.money!.precision))
    const minimum = items.reduce((sum, item) => sum + minorUnits(item.money!.minimum, precision), 0n)
    const bounded = items.every(item => item.basis !== 'starting' && item.money!.maximum !== null)
    return { currency, precision, minimum: decimalString(minimum, precision), maximum: bounded
      ? decimalString(items.reduce((sum, item) => sum + minorUnits(item.money!.maximum!, precision), 0n), precision) : null }
  })
  const missing = required.filter(category => !selected.some(item => item.category === category && !blocked(item) && item.state !== 'unknown'))
  // Free-text tax notes (including the literal “unknown”) never establish a resolved tax basis.
  const taxKnown = priced.every(item => item.category === 'tax' || item.tax_status !== 'unknown')
  const mixedTax = new Set(priced.filter(item => item.category !== 'tax').map(item => item.tax_status).filter(status => status !== 'unknown')).size > 1
  return { scope: draft.scope, complete: draft.scope !== 'not_sure' && !missing.length && !issues.length && currencies.length === 1 &&
    subtotals[0]?.maximum !== null && taxKnown && !mixedTax, subtotals, missing, included, issues, counted_ids: priced.map(item => item.id),
    outside_scope: draft.items.filter(item => item.selected && !required.includes(item.category)).map(item => item.label),
    limitations: [
      ...(!taxKnown ? ['Tax basis is unstated on priced work; specify whether tax is included or separately allowed.'] : []),
      ...(mixedTax ? ['Priced work has mixed tax treatments. Reconcile a combined non-overlapping tax scope before a complete scenario range; this prototype does not apportion tax.'] : []),
      ...(priced.some(item => item.basis === 'starting' || item.money!.maximum === null) ? ['At least one priced line has no finite upper amount. A starting price cannot bound the project.'] : []),
      ...(draft.scope === 'not_sure' ? ['Choose a scope when known; a priced subtotal does not establish whole-project coverage.'] : []),
    ] }
}

export const displayMoney = (money: Money): string => {
  const group = (value: string) => {
    const [whole, fraction] = value.split('.')
    return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`)
  }
  return `${money.currency ?? 'Currency unknown'} ${group(money.minimum)}${money.maximum === null ? ' or more; upper amount unknown' : money.maximum === money.minimum ? '' : `–${group(money.maximum)}`}`
}
export function budgetSummary(draft: BudgetDraft, result: BudgetResult): string[] {
  return [`Budget scope: ${scopeLabels[draft.scope]}. ${result.complete ? 'Complete scenario range for the stated scope and supplied assumptions; not a quote guarantee or probability interval.' : 'Cost coverage is incomplete; a complete scenario range is unavailable.'}`,
    ...(result.subtotals.length ? result.subtotals.map(money => `${result.complete ? 'Scenario range' : 'Priced-components subtotal'}: ${displayMoney(money)}.`) : ['No usable priced components supplied. Unknown costs are not zero.']),
    ...(result.subtotals.length > 1 ? ['Currencies are shown separately; there is no combined subtotal.'] : []),
    ...draft.items.filter(item => result.counted_ids.includes(item.id) && item.evidence.origin !== 'user_allowance')
      .map(item => `Price source: ${item.evidence.provider}, ${item.evidence.label}, captured ${item.evidence.captured_at ?? 'date unknown'}, unreviewed. ${item.evidence.origin === 'catalogue' ? item.evidence.locator.split(' — ')[0] : 'User-entered quote fact; source details retained in the cost evidence.'}`),
    ...(result.missing.length ? [`Still unpriced or unresolved: ${result.missing.map(c => categories[c]).join(', ')}.`] : []),
    ...(result.included.length ? [`Included, without a second charge: ${result.included.join('; ')}.`] : []),
    ...(result.issues.length ? [`${new Set(result.issues.map(i => i.item_id)).size} cost entries need checking and are excluded from the subtotal. ${[...new Set(result.issues.map(i => `${draft.items.find(item => item.id === i.item_id)?.label}: ${i.message}`))].slice(0, 3).join(' ')}`] : []),
    ...(draft.scope === 'building' ? ['Building-only scope excludes delivery, foundation/site work, services, professional work and fees.'] : []),
    ...result.limitations,
    'Allowances are user assumptions. Source claims and user-entered quote facts remain unreviewed; tax treatment and scope must be stated for a complete scenario.',
  ]
}
export type BudgetQuestion = { answerer: string; question: string }
export function budgetQuestions(draft: BudgetDraft, result: BudgetResult, modelName: string): BudgetQuestion[] {
  const questions: BudgetQuestion[] = []
  const unresolved = (category: Category) => result.missing.includes(category)
  if (draft.scope === 'not_sure') questions.push({ answerer: 'Homeowner', question: 'Is your budget preference for the building only or the whole project? Not sure is a useful answer for an initial call.' })
  if (result.issues.length || unresolved('unit') || draft.items.some(item => result.counted_ids.includes(item.id) && item.basis === 'starting'))
    questions.push({ answerer: 'Builder/provider', question: `For ${modelName}, which current configuration, currency and dated price apply, and what upgrades, delivery/lift and tax are included or excluded?` })
  if (unresolved('site') || unresolved('services')) questions.push({ answerer: 'Qualified site/utility reviewer', question: `What ${[unresolved('site') && 'foundation/site', unresolved('services') && 'connection'].filter(Boolean).join(' and ')} information is needed to bound work for this property?` })
  if (questions.length < 3 && (unresolved('fees') || unresolved('professional') || unresolved('tax')))
    questions.push({ answerer: 'Builder/provider', question: 'Who will establish professional-work, fee and tax scope, and what information is needed before pricing it?' })
  return questions.slice(0, 3)
}
export function budgetEvidence(draft: BudgetDraft, context: Context, today = utcToday()) {
  return { draft: parseBudget(draft), current_context: context, calculated_at: today, calculation: calculateBudget(draft, context, today),
    source_accuracy: 'unreviewed', accepted_publication: false, recency_policy: 'Catalogue captures older than 90 days are withheld pending explicit refresh. No background refresh.' }
}
