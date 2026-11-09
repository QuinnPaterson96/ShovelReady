import snapshot from './benchmarks.json'
import type { CatalogueModel } from '../model_catalogue/model'
import type { EnquiryDocument } from '../builder_demo/enquiry'

export const benchmarks = snapshot
export type Bedrooms = 0 | 1 | 2 | 3
export type RentalDraft = {
  schema_version: 'rental-scenario.v1'
  marketId: string
  marketOrigin: 'municipality' | 'user'
  bedrooms: Bedrooms
  layoutOrigin: 'catalogue_description' | 'planning_assumption' | 'user'
  monthlyRent: string | null // null follows the benchmark; empty is deliberately unknown
  vacancyPercent: string
  expenseMode: 'allowance' | 'monthly'
  expenses: string
  financing: 'unknown' | 'cash' | 'payment'
  monthlyDebt: string
}

export const markets = [...new Map(benchmarks.records.map(row => [row.market_id, {
  id: row.market_id, label: row.market.replace(', Census metropolitan area (CMA)', ''),
}])).values()]
export const layoutLabel = (bedrooms: Bedrooms) => bedrooms === 0 ? 'Studio' : bedrooms === 3 ? '3+ bedrooms' : `${bedrooms} bedroom${bedrooms === 1 ? '' : 's'}`
export const periodLabel = `Q${Math.ceil(Number(benchmarks.period.slice(5, 7)) / 3)} ${benchmarks.period.slice(0, 4)}`
export const money = (amount: number | null) => amount === null ? 'Not estimated' : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(amount)

export function defaultMarket(municipality: string | null | undefined): string {
  const locality = (municipality ?? '').replace(/^(?:city|district|town|village) of /i, '').trim()
  // These municipalities are in Victoria CMA. Never treat all BC or all CRD as Victoria.
  if (['victoria', 'saanich', 'langford', 'oak bay'].includes(locality.toLowerCase())) return '2021S0503935'
  return markets.find(m => m.label.toLowerCase() === locality.toLowerCase())?.id ?? ''
}

export function defaultRental(model: CatalogueModel, municipality?: string | null): RentalDraft {
  // Retained catalogue descriptions identify Model 300 and Quadra as one-bedroom,
  // Model 240 and Studio Pod as studios. This selects an apartment proxy, not a legal use.
  const known = ['aux-300', 'aux-240', 'hewing-quadra4', 'wcch-ch-studio'].includes(model.model_id)
  return { schema_version: 'rental-scenario.v1', marketId: defaultMarket(municipality), marketOrigin: 'municipality',
    bedrooms: ['aux-300', 'hewing-quadra4'].includes(model.model_id) ? 1 : 0,
    layoutOrigin: known ? 'catalogue_description' : 'planning_assumption', monthlyRent: null,
    vacancyPercent: '5', expenseMode: 'allowance', expenses: '25', financing: 'unknown', monthlyDebt: '' }
}

/** A locality correction refreshes a suggested market, never an owner's chosen market or rent. */
export function rentalForProperty(draft: RentalDraft | undefined, model: CatalogueModel, municipality?: string | null): RentalDraft {
  if (!draft) return defaultRental(model, municipality)
  return draft.marketOrigin === 'municipality' ? { ...draft, marketId: defaultMarket(municipality) } : draft
}

function number(value: string, max = 100000000): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null
}
export function calculateRental(draft: RentalDraft) {
  const benchmark = benchmarks.records.find(row => row.market_id === draft.marketId && row.bedrooms === draft.bedrooms) ?? null
  const rent = draft.monthlyRent === null ? benchmark?.monthly_cad ?? null : number(draft.monthlyRent)
  const vacancy = number(draft.vacancyPercent, 100)
  const expenses = number(draft.expenses, draft.expenseMode === 'allowance' ? 100 : 100000000)
  const debt = draft.financing === 'cash' ? 0 : draft.financing === 'payment' ? number(draft.monthlyDebt) : null
  const gross = rent === null ? null : rent * 12
  const collected = gross === null || vacancy === null ? null : gross * (1 - vacancy / 100)
  const runningCosts = expenses === null ? null : draft.expenseMode === 'monthly' ? expenses * 12 : collected === null ? null : collected * expenses / 100
  const operating = collected === null || runningCosts === null ? null : collected - runningCosts
  const cashFlow = operating === null || debt === null ? null : operating - debt * 12
  const errors: Partial<Record<'rent' | 'vacancy' | 'expenses' | 'debt', string>> = {}
  if (draft.monthlyRent !== null && rent === null && draft.monthlyRent !== '') errors.rent = 'Use a non-negative amount up to 100,000,000, or leave blank for unknown.'
  if (vacancy === null && draft.vacancyPercent !== '') errors.vacancy = 'Use a percentage from 0 to 100.'
  if (expenses === null && draft.expenses !== '') errors.expenses = draft.expenseMode === 'allowance' ? 'Use a percentage from 0 to 100.' : 'Use a non-negative monthly amount up to 100,000,000.'
  if (draft.financing === 'payment' && debt === null && draft.monthlyDebt !== '') errors.debt = 'Use a non-negative monthly payment up to 100,000,000.'
  return { benchmark, rent, vacancy, expenses, debt, gross, collected, runningCosts, operating, cashFlow, errors }
}

export function rentalEvidence(draft: RentalDraft, model: CatalogueModel) {
  return { schema_version: 'rental-evidence.v1', model_id: model.model_id, model_revision: model.source_revision,
    draft, result: calculateRental(draft), currency: 'CAD', period: benchmarks.period,
    source: { provider: benchmarks.provider, table: benchmarks.table, url: benchmarks.source_url,
      captured_at: benchmarks.captured_at, source_sha256: benchmarks.source_sha256, review_status: benchmarks.review_status },
    assumption_policy: 'rental-planning.v1: 5% vacancy and 25% of collected rent for running costs are editable illustrative allowances, not local observed rates.',
    scope: 'Stabilized full rental year; apartment asking-rent proxy, not a suite forecast. Before income tax. No appreciation, rent growth, partial first year or return on installed cost.' }
}

export function rentalParagraphs(draft: RentalDraft, model: CatalogueModel): string[] {
  const r = calculateRental(draft)
  const market = markets.find(m => m.id === draft.marketId)?.label ?? 'No matching regional benchmark'
  return [
    `${model.name}: long-term rental planning scenario, ${layoutLabel(draft.bedrooms)}. Monthly rent: ${money(r.rent)} CAD${draft.monthlyRent === null ? `, using ${market} apartment asking rents (${periodLabel})` : ', entered by homeowner'}. This assumes the chosen configuration can be used as a self-contained rental dwelling; it does not establish suitability or achievable rent.`,
    `Full rental year: ${money(r.collected)} after ${r.vacancy === null ? 'unknown' : `${r.vacancy}%`} vacancy; ${money(r.operating)} after running costs; ${money(r.cashFlow)} cash flow after debt payments, before income tax. Running costs: ${r.expenses === null ? 'unknown' : draft.expenseMode === 'allowance' ? `${r.expenses}% of collected rent (planning allowance)` : `${money(r.expenses)} CAD/month entered by homeowner`}. Financing: ${draft.financing === 'unknown' ? 'not supplied, not assumed zero' : draft.financing === 'cash' ? 'no borrowing selected' : `${money(r.debt)} CAD/month debt payments`}.`,
    `Vacancy and running-cost allowances are editable scenario choices, not measured local rates. Expenses should cover incremental property tax, insurance, owner-paid utilities, management, maintenance and replacement reserves. Installed costs and acquisition/construction time are separate; no profit or return ranking is established.`,
    ...(r.benchmark ? [`Benchmark: Statistics Canada, table ${benchmarks.table}, ${market}, ${layoutLabel(draft.bedrooms)}, ${periodLabel}; captured ${benchmarks.captured_at.slice(0, 10)}, unreviewed. ${benchmarks.source_url} Asking rents are not signed leases; no suite-size, utilities, parking or furnishing adjustment has been applied.`] : []),
  ]
}

/** Supporting homeowner report only: a provider quote enquiry need not expose financing. */
export function withRentalReport(document: EnquiryDocument | null, draft: RentalDraft | undefined, model: CatalogueModel) {
  if (!document || !draft) return document
  const paragraphs = rentalParagraphs(draft, model)
  return { ...document, sections: [...document.sections, { heading: 'Rental planning scenario', paragraphs, emailSummary: paragraphs[0] }] }
}
