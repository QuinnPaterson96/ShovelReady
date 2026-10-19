import Ajv from 'ajv'
import addFormats from 'ajv-formats'

export const categories = {
  unit: 'Building', upgrades: 'Upgrades', delivery: 'Delivery and lift', site: 'Foundation and site work',
  services: 'Service connections', professional: 'Professional work', fees: 'Fees', tax: 'Tax', contingency: 'Contingency',
} as const
export type Category = keyof typeof categories
export type BudgetScope = 'building' | 'whole_project' | 'not_sure'
export type Context = {
  model_id: string; snapshot_id: string; model_revision: string | null; configuration: string
  property_key: string; scenario_key: string
}
export type Money = { minimum: string; maximum: string | null; currency: string | null; precision: number }
export type Evidence = {
  origin: 'catalogue' | 'user_allowance' | 'user_quote'; provider: string; label: string; locator: string
  captured_at: string | null; effective_at: string | null; expires_at: string | null; recorded_at: string
  review_status: 'unreviewed'; original_record: string
}
export type CostItem = {
  id: string; category: Category; label: string; state: 'priced' | 'included' | 'unknown' | 'not_applicable'
  money: Money | null; basis: 'starting' | 'fixed' | 'estimated' | 'quote' | 'allowance'
  included_in: string | null; alternative_group: string | null; selected: boolean
  inclusions: string[]; exclusions: string[]; tax_basis: string | null; rationale: string
  tax_status: 'included' | 'excluded' | 'unknown'
  recheck_reason: string | null
  treatment: 'capital_cost' | 'refundable_security'
  context: Context; evidence: Evidence
}
export type BudgetDraft = {
  schema_version: 'project-budget.draft.v1'; scope: BudgetScope; items: CostItem[]
}

// A deliberately small boundary, independent of HTTP, catalogue publication and UI.
const text = { type: 'string', maxLength: 20000 }
const requiredText = { ...text, minLength: 1, pattern: '\\S' }
const nullableText = { anyOf: [requiredText, { type: 'null' }] }
const date = { anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] }
const decimal = { type: 'string', pattern: '^(0|[1-9][0-9]{0,17})(\\.[0-9]{1,6})?$' }
const record = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties })
const contextSchema = record({ model_id: requiredText, snapshot_id: requiredText, model_revision: nullableText,
  configuration: requiredText, property_key: requiredText, scenario_key: requiredText })
export const budgetSchema = record({
  schema_version: { const: 'project-budget.draft.v1' }, scope: { enum: ['building', 'whole_project', 'not_sure'] },
  items: { type: 'array', maxItems: 80, items: record({
    id: requiredText, category: { enum: Object.keys(categories) }, label: requiredText,
    state: { enum: ['priced', 'included', 'unknown', 'not_applicable'] },
    money: { anyOf: [{ type: 'null' }, record({ minimum: decimal, maximum: { anyOf: [decimal, { type: 'null' }] },
      currency: { anyOf: [{ type: 'string', pattern: '^[A-Z]{3}$' }, { type: 'null' }] }, precision: { type: 'integer', minimum: 0, maximum: 6 } })] },
    basis: { enum: ['starting', 'fixed', 'estimated', 'quote', 'allowance'] },
    included_in: nullableText, alternative_group: nullableText, selected: { type: 'boolean' },
    inclusions: { type: 'array', maxItems: 40, items: requiredText }, exclusions: { type: 'array', maxItems: 40, items: requiredText },
    tax_basis: nullableText, tax_status: { enum: ['included', 'excluded', 'unknown'] }, rationale: text, recheck_reason: nullableText,
    treatment: { enum: ['capital_cost', 'refundable_security'] }, context: contextSchema,
    evidence: record({ origin: { enum: ['catalogue', 'user_allowance', 'user_quote'] }, provider: requiredText, label: requiredText,
      locator: requiredText, captured_at: date, effective_at: date, expires_at: date, recorded_at: { type: 'string', format: 'date' },
      review_status: { const: 'unreviewed' }, original_record: { type: 'string', maxLength: 100000 } }),
  }) },
})
const ajv = new Ajv({ allErrors: true })
addFormats(ajv)
const validate = ajv.compile(budgetSchema)
export const decimalPlaces = (value: string) => value.split('.')[1]?.length ?? 0
export const minorUnits = (value: string, precision: number): bigint => BigInt(value.replace('.', '')) * 10n ** BigInt(precision - decimalPlaces(value))
export function decimalString(value: bigint, precision: number): string {
  const digits = value.toString().padStart(precision + 1, '0')
  return precision ? `${digits.slice(0, -precision)}.${digits.slice(-precision)}` : digits
}
export function parseBudget(value: unknown): BudgetDraft {
  if (!validate(value)) throw new Error(`Budget draft was not changed. Invalid input: ${ajv.errorsText(validate.errors, { separator: '; ' })}`)
  const draft = value as BudgetDraft
  const ids = new Set<string>()
  for (const item of draft.items) {
    if (ids.has(item.id)) throw new Error('Budget draft was not changed. Duplicate cost item identity.')
    ids.add(item.id)
    if ((item.state === 'priced') !== (item.money !== null) || (item.state === 'included') !== (item.included_in !== null))
      throw new Error('Budget draft was not changed. Amounts and inclusion links must match the item state.')
    if (['included', 'not_applicable'].includes(item.state) && !item.rationale.trim())
      throw new Error('Budget draft was not changed. Included and not-applicable items need a reason.')
    if (item.evidence.origin === 'catalogue' && (item.basis === 'allowance' || item.basis === 'quote') ||
        item.evidence.origin === 'user_allowance' && item.basis !== 'allowance' || item.evidence.origin === 'user_quote' && item.basis !== 'quote')
      throw new Error('Budget draft was not changed. Price basis and source origin disagree.')
    if (item.money) {
      const { minimum, maximum, precision } = item.money
      if (decimalPlaces(minimum) > precision || maximum !== null && decimalPlaces(maximum) > precision)
        throw new Error('Budget draft was not changed. Declared precision must preserve the original decimal amounts.')
      if (maximum !== null && minorUnits(maximum, precision) < minorUnits(minimum, precision))
        throw new Error('Budget draft was not changed. The upper amount must be at least the lower amount.')
    }
  }
  // Copy accepted candidates: callers cannot mutate a prior valid draft by alias.
  return structuredClone(draft)
}
