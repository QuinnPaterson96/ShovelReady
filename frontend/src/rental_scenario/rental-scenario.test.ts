import assert from 'node:assert/strict'
import { test } from 'node:test'
import { journeyCatalogue } from '../model_catalogue/demo'
import { benchmarks, calculateRental, defaultRental, rentalEvidence, withRentalReport } from './model'
import { enquiryPlainText, type EnquiryDocument } from '../builder_demo/enquiry'

// Independent arithmetic protects vacancy, expense and debt bases (including
// principal), negative cash flow and unknown-vs-zero, poorly covered by visual QA.
test('rental scenario calculates one full year and exports its assumptions and source', () => {
  const model = journeyCatalogue.models.find(m => m.model_id === 'aux-300')!
  const draft = { ...defaultRental(model, 'City of Victoria'), monthlyRent: '2000', financing: 'payment' as const, monthlyDebt: '1000' }
  const result = calculateRental(draft)
  assert.equal(result.gross, 24000)
  assert.equal(result.collected, 22800) // 24,000 less 5%
  assert.equal(result.runningCosts, 5700) // 25% of COLLECTED rent
  assert.equal(result.operating, 17100)
  assert.equal(result.cashFlow, 5100) // 17,100 less 12 monthly payments
  assert.equal(calculateRental({ ...draft, monthlyDebt: '2500' }).cashFlow, -12900)
  assert.equal(calculateRental({ ...draft, financing: 'cash' }).cashFlow, 17100)
  assert.equal(calculateRental({ ...draft, financing: 'unknown' }).cashFlow, null)
  assert.equal(calculateRental({ ...draft, vacancyPercent: '100' }).collected, 0)
  assert.equal(calculateRental({ ...draft, expenseMode: 'monthly', expenses: '500' }).operating, 16800)
  for (const monthlyRent of ['', '-1', 'NaN', 'Infinity', '1e3']) assert.equal(calculateRental({ ...draft, monthlyRent }).collected, null)
  assert.equal(calculateRental({ ...draft, vacancyPercent: '' }).collected, null)
  assert.equal(calculateRental({ ...draft, vacancyPercent: '101' }).operating, null)
  assert.equal(calculateRental({ ...draft, expenses: '' }).operating, null)
  assert.equal(calculateRental({ ...draft, monthlyDebt: '' }).cashFlow, null)
  const document: EnquiryDocument = { kind: 'screening', title: 'My investigation', question: 'My own question', example: true, sections: [], closing: 'Next steps' }
  const exported = enquiryPlainText(withRentalReport(document, draft, model)!)
  assert.match(exported, /My own question/)
  assert.match(exported, /\$5,100.*before income tax/)
  assert.match(exported, /entered by homeowner/)
  assert.match(exported, /Statistics Canada.*46-10-0092-01/)
  const evidence = rentalEvidence(draft, model)
  assert.equal(evidence.source.source_sha256, benchmarks.source_sha256)
  assert.equal(evidence.draft.monthlyRent, '2000')
  assert.equal(evidence.result.cashFlow, 5100)
})

test('regional and layout selection uses distinct sourced cohorts without inventing small-suite adjustments', () => {
  for (const model of journeyCatalogue.models) {
    const draft = defaultRental(model, 'District of Saanich')
    const result = calculateRental(draft)
    assert.equal(draft.bedrooms, ['aux-300', 'hewing-quadra4'].includes(model.model_id) ? 1 : 0)
    assert.equal(result.rent, result.benchmark!.monthly_cad, 'use actual cohort, never multiply by exterior area')
    assert.equal(result.benchmark?.market, 'Victoria, Census metropolitan area (CMA)')
    assert.equal(result.cashFlow, null)
    const unsupported = defaultRental(model, 'Port Renfrew')
    assert.equal(calculateRental(unsupported).rent, null, 'CRD address alone is not Victoria CMA')
    assert.equal(calculateRental({ ...unsupported, monthlyRent: '1500' }).rent, 1500, 'manual scenario remains useful outside coverage')
  }
  const draft = defaultRental(journeyCatalogue.models[0], 'Victoria')
  const missing = benchmarks.records.find(r => r.monthly_cad === null)
  if (missing) assert.equal(calculateRental({ ...draft, marketId: missing.market_id, bedrooms: missing.bedrooms as 0 | 1 | 2 | 3 }).rent, null)
})
