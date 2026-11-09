import type { CatalogueModel } from '../model_catalogue/model'
import type { calculateRental } from '../rental_scenario/model'
import { categories, type BudgetDraft, type Category, type Context, type CostItem, type Money } from './contract'
import { calculateBudget, catalogueSuggestions, emptyBudget, manualItem, reconcile, replaceItem, requiredCategories, sumPricedCosts, utcToday } from './pipeline'

export const emptyEconomicsBudget = (): BudgetDraft => ({ ...emptyBudget(), scope: 'whole_project' })

const defaultPrefix = 'economics-default:'
const regionalSource = {
  provider: 'Evolv Modular',
  locator: 'https://evolvmodular.ca/',
  label: 'What Your Lot Decides · Vancouver Island site costs',
  captured_at: '2026-11-09',
} as const

const allowances = {
  site: { amount: '25000', reference: 'CAD 22,000–60,000', label: 'Foundation and site work', scope: 'Ordinary excavation and foundation on an accessible, level site.' },
  services: { amount: '15000', reference: 'CAD 14,000–70,000', label: 'On-site service connections', scope: 'Short runs to available services. Authority upgrades and new mains need separate pricing.' },
  delivery: { amount: '15000', reference: 'CAD 12,000–30,000', label: 'Delivery and lift', scope: 'Local transport, typical crane set and access. Ferry, difficult lifts and unusual traffic controls may cost more.' },
  fees: { amount: '8000', reference: 'Approximately CAD 4,000–22,000', label: 'Development and permit fees', scope: 'A reserve for authority application, permit and development charges. Actual charges, waivers and refundable deposits depend on the site and application.' },
} as const

const allowanceCategories = Object.keys(allowances) as (keyof typeof allowances)[]
const coreCategories: Category[] = ['unit', 'fees', 'delivery', 'site', 'services']
export const costGroups = [
  { label: 'Prefab building', categories: ['unit', 'upgrades'] },
  { label: 'Development and permit fees', categories: ['fees'] },
  { label: 'Installation', categories: ['delivery', 'site', 'services'] },
  { label: 'Other project costs', categories: ['professional', 'tax', 'contingency'] },
] as const satisfies readonly { label: string; categories: readonly Category[] }[]

const packageExclusions: Record<keyof typeof allowances, string[]> = {
  site: ['foundation', 'foundations', 'foundation and site work'],
  services: ['site services', 'services', 'service connections'],
  delivery: ['shipping and installation', 'delivery and lift'],
  fees: ['permitting', 'permits', 'fees', 'development and permit fees'],
}
const explicitlySeparate = (item: CostItem, category: keyof typeof allowances) => {
  const exclusions = item.exclusions.map(value => value.trim().toLowerCase())
  return packageExclusions[category].some(value => exclusions.includes(value)) ||
    category === 'delivery' && exclusions.includes('shipping') && exclusions.includes('installation')
}

export const isEconomicsDefault = (item: CostItem) => item.id.startsWith(defaultPrefix)

/** Suggested amounts are reconstructed from current context. Owner entries and imported
 * quotes keep their own evidence and are withheld by the existing reconciliation rules. */
export function economicsBudget(draft: BudgetDraft, model: CatalogueModel, context: Context, hasLocalContext: boolean, today = utcToday()): BudgetDraft {
  const retained = reconcile(draft, context)
  const items = [...retained.items]
  const available = (category: Category) => !items.some(item => item.category === category)
  if (available('unit')) {
    const offers = catalogueSuggestions(model, context.snapshot_id, context, today).filter(item =>
      item.state === 'priced' && item.money?.currency === 'CAD' && !item.recheck_reason)
    if (offers.length === 1) {
      const offer = offers[0]
      const starting = offer.basis === 'starting'
      items.push({ ...offer, id: `${defaultPrefix}${offer.id}`,
        basis: starting ? 'allowance' : offer.basis,
        money: starting ? { ...offer.money!, maximum: offer.money!.minimum } : offer.money,
        rationale: starting ? 'Uses the published starting price as the planning amount. Upgrades and configuration changes may increase it.' : offer.rationale,
        evidence: starting ? { ...offer.evidence, origin: 'planning_reference', label: `${model.name} starting price used for planning` } : offer.evidence,
      })
    }
  }
  const unit = items.find(item => item.selected && item.category === 'unit' && item.state === 'priced' && !item.recheck_reason)
  if (hasLocalContext && draft.scope !== 'building' && today >= regionalSource.captured_at && (!unit || unit.money?.currency === 'CAD')) {
    for (const category of allowanceCategories) {
      // Fees can be explored before the building is priced. Install amounts with
      // no priced package are placeholders. A supplied package must separate the work.
      if (!available(category) || (unit && !explicitlySeparate(unit, category))) continue
      const { amount, reference, label, scope } = allowances[category]
      items.push({
        id: `${defaultPrefix}${category}`, category, label, state: 'priced', basis: 'allowance', included_in: null,
        alternative_group: null, selected: true, money: { currency: 'CAD', minimum: amount, maximum: amount, precision: 0 },
        inclusions: [scope], exclusions: [], tax_basis: null, tax_status: 'unknown', rationale: scope,
        recheck_reason: null, treatment: 'capital_cost', context,
        evidence: { ...regionalSource, origin: 'planning_reference', effective_at: null, expires_at: null, recorded_at: today,
          review_status: 'unreviewed', original_record: JSON.stringify({ source_band: reference, planning_point_cad: amount, scope, region: 'Vancouver Island, BC' }) },
      })
    }
  }
  return { ...retained, items }
}

export function economicsBudgetChange(draft: BudgetDraft) {
  // Deselecting a default is deliberate. Retain that choice and its provenance.
  return { ...draft, items: draft.items.filter(item => !item.selected || !isEconomicsDefault(item)) }
}

export function changePlanningAmount(draft: BudgetDraft, context: Context, category: Category, amount: string): BudgetDraft {
  const existing = draft.items.find(item => item.category === category && item.selected)
  const item = manualItem({
    id: `economics-owner:${category}`, category, label: existing?.label ?? categories[category],
    state: amount ? 'priced' : 'unknown', basis: 'allowance', minimum: amount, maximum: amount, bound: 'exact',
    currency: 'CAD', included_in: '', rationale: category === 'unit' ? 'Homeowner planning amount for the prefab building alone.' : existing?.rationale ?? '',
    tax_basis: '', provider: '', locator: '', captured_at: '', effective_at: '', expires_at: '',
    inclusions: [],
    exclusions: category === 'unit' ? ['Permitting', 'Foundations', 'Site services', 'Shipping', 'Installation'] : [],
    treatment: 'capital_cost', tax_status: 'unknown',
  }, context)
  return replaceItem({ ...draft, items: draft.items.map(old => old.category === category ? { ...old, selected: false } : old) }, item)
}

export function usablePlanningAmount(value: string) {
  const trimmed = value.trim()
  const ungrouped = /^\d{1,3}(?:,\d{3})+(?:\.\d{1,6})?$/.test(trimmed) ? trimmed.replace(/,/g, '') : trimmed
  const normalized = ungrouped.replace(/^0+(?=\d)/, '')
  return /^(?:0|[1-9]\d{0,17})(?:\.\d{1,6})?$/.test(normalized) ? normalized : ''
}

export function calculateEconomics(draft: BudgetDraft, context: Context, rental: ReturnType<typeof calculateRental> | null, today = utcToday()) {
  const budget = calculateBudget(draft, context, today)
  const counted = draft.items.filter(item => budget.counted_ids.includes(item.id))
  const subtotal = budget.subtotals.length === 1 && budget.subtotals[0].currency === 'CAD' ? budget.subtotals[0] : null
  const wholeProject = budget.scope === 'whole_project' && budget.complete
  const coreCovered = coreCategories.every(category => !budget.missing.includes(category))
    && budget.scope === 'whole_project' && !budget.issues.length
    && counted.some(item => item.category === 'unit' && Number(item.money?.minimum) > 0)
  const operating = rental?.operating ?? null
  const paybackRange = subtotal?.maximum != null && Number(subtotal.minimum) > 0 && operating !== null && operating > 0 && (wholeProject || coreCovered)
    ? { minimum: Number(subtotal.minimum) / operating, maximum: Number(subtotal.maximum) / operating } : null
  const payback = paybackRange && Number.isFinite(paybackRange.maximum)
    ? { ...paybackRange, basis: wholeProject ? 'whole_project' as const : 'subtotal' as const } : null

  // Sum only the lines the budget calculation already admitted. Each group is
  // a display breakdown of those same exact totals, never another cost estimate.
  const breakdown = costGroups.map(group => {
    const lines = counted.filter(item => (group.categories as readonly Category[]).includes(item.category))
    const value = sumPricedCosts(lines)
    const included = draft.items.some(item => requiredCategories(draft.scope).includes(item.category) && (group.categories as readonly Category[]).includes(item.category) &&
      item.state === 'included' && item.selected && !budget.issues.some(issue => issue.item_id === item.id))
    return { label: group.label, value, included }
  })
  return { budget, subtotal, wholeProject, coreCovered, payback, breakdown, counted }
}

export type EconomicsEstimate = ReturnType<typeof calculateEconomics>

export function economicsMoney(value: Money) {
  const format = (amount: string) => {
    const [whole, fraction] = amount.split('.')
    const prefix = value.currency === 'CAD' ? '$' : `${value.currency ?? 'Currency unknown'} `
    return `${prefix}${BigInt(whole).toLocaleString('en-CA')}${fraction ? `.${fraction}` : ''}`
  }
  const min = format(value.minimum)
  return value.maximum === null ? `From ${min}` : value.minimum === value.maximum ? min : `${min}–${format(value.maximum)}`
}

export function paybackText(payback: EconomicsEstimate['payback']) {
  if (!payback) return 'Not estimated'
  const years = (value: number) => value < 0.1 ? '<0.1' : Number(value.toFixed(1)).toLocaleString('en-CA')
  const minimum = years(payback.minimum), maximum = years(payback.maximum)
  return `${minimum === maximum ? minimum : `${minimum}–${maximum}`} years`
}
