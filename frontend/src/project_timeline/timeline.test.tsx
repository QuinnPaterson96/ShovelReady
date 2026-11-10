import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { defaultJourneyModel, journeyCatalogue, modelSnapshot } from '../model_catalogue/demo'
import { userMunicipality } from '../municipality_coverage/model'
import { calculateRental, defaultRental } from '../rental_scenario/model'
import { enquiryMarkdown, type EnquiryDocument } from '../builder_demo/enquiry'
import { ProjectTimeline } from './ProjectTimeline'
import { calculateTimeline, durationInput, emptyTimeline, firstYearIncome, timelineContextKey, withTimelineReport, type DurationInput, type StageId, type TimelineContext } from './model'

const model = defaultJourneyModel
const context: TimelineContext = { propertyKey: 'synthetic-property-a', municipality: userMunicipality('Victoria'), modelId: model.model_id,
  modelRevision: model.source_revision, snapshotId: modelSnapshot(model), configuration: model.configuration, pathwayKey: 'synthetic-garden-suite' }
const allowance = (minimum: string, maximum = minimum): DurationInput => ({ minimum, maximum, note: 'Synthetic owner allowance', recordedAt: '2026-11-09' })
const exact = () => ({ ...emptyTimeline(context, model, '2027-01-01'), overrides: Object.fromEntries(Object.entries({ preparation: '2', permits: '4', production: '10', site: '3', installation: '1', completion: '2' }).map(([key, value]) => [key, allowance(value)])) })

test('captured catalogue and municipal timing -> overlapping project -> readable UI and complete report evidence', () => {
  const draft = emptyTimeline(context, model, '2027-01-01')
  const result = calculateTimeline(draft, context, model)
  assert.equal(draft.schedule, 'contract_to_delivery')
  assert.equal(result.profile?.businessDays, 20)
  assert.equal(result.profile?.milestone, 'review_target')
  assert.deepEqual(result.manufacturer?.days, { minimum: 84, maximum: 126 }) // Captured 12–18 calendar weeks.
  // 2–6 preparation + max(12–18 bundle, (4 review + 2–8 issuance) + 2–6 site)
  // + 1–7 installation days + 2–4 completion weeks = 113–203 days.
  assert.deepEqual(result.ready, { minimum: 113, maximum: 203 })
  const html = renderToStaticMarkup(<ProjectTimeline result={result} rental={null} onChange={() => {}} />)
  assert.match(html, /View and adjust timeline/)
  assert.match(html, /review target.*not permit issuance/)
  assert.match(html, /Completion/)
  assert.doesNotMatch(html, /first year from project start/)
  const doc: EnquiryDocument = { title: 'Synthetic enquiry', question: 'Confirm the schedule', example: false, sections: [], closing: 'No message sent.' }
  const text = enquiryMarkdown(withTimelineReport(doc, result, null, true)!)
  assert.match(text, /captured 2026-11-09, unreviewed/)
  assert.match(text, /contract-to-delivery.*not added/)
  assert.match(text, /Ready|ready for use/)
  assert.deepEqual(JSON.parse(JSON.stringify(result)).manufacturerEvidence[0].claim, model.timings![0])
})

test('independent critical-path arithmetic, serial versus overlapping production, and first project-year rent', () => {
  // Independently specified durations: 2 + max(10,4+3) + 1 + 2 = 15 weeks.
  const draft = { ...exact(), includeFirstYear: true }
  const result = calculateTimeline(draft, context, model)
  assert.deepEqual(result.ready, { minimum: 105, maximum: 105 })
  assert.deepEqual(result.readyDates, { earliest: '2027-04-16', latest: '2027-04-16' })
  const sequential = calculateTimeline({ ...draft, schedule: 'production_after_permits' }, context, model)
  assert.equal(sequential.ready?.maximum, 133) // 2 + 4 + max(10,3) + 1 + 2 = 19 weeks.
  const rental = calculateRental({ ...defaultRental(model), monthlyRent: '2000', vacancyPercent: '0' })
  const income = firstYearIncome(result, rental)!
  assert.equal(income.minimum, 24000 * 260 / 365)
  assert.equal(income.maximum, income.minimum)
  assert.equal(firstYearIncome(result, null), null)
  assert.equal(firstYearIncome(calculateTimeline({ ...draft, includeFirstYear: false }, context, model), rental), null)
  const slow = calculateTimeline({ ...draft, overrides: { ...draft.overrides, completion: allowance('60') } }, context, model)
  assert.equal(firstYearIncome(slow, rental)?.maximum, 0)
  const leap = calculateTimeline({ ...draft, startDate: '2028-02-29' }, context, model)
  assert.equal(firstYearIncome(leap, rental)?.endDate, '2029-02-28')
})

test('Saanich timing routes without map or zoning coverage; uncovered places get allowances, not Victoria targets', () => {
  const saanich: TimelineContext = { ...context, municipality: { ...userMunicipality('Saanich'), rule_coverage: 'unavailable' } }
  const result = calculateTimeline(emptyTimeline(saanich, model), saanich, model)
  assert.equal(result.profile?.businessDays, 12)
  assert.equal(result.profile?.milestone, 'initial_response')
  assert.match(result.profile!.url, /saanich.ca/)
  assert.equal(result.stages.find(stage => stage.id === 'permits')?.duration?.minimum, 30.8) // 12 / 5 * 7 + 14 days, not issuance in 12 days.
  const unknown = { ...context, municipality: userMunicipality('Uncovered Town') }
  const fallback = calculateTimeline(emptyTimeline(unknown, model), unknown, model)
  assert.equal(fallback.profile, null)
  assert.equal(fallback.stages.find(stage => stage.id === 'permits')?.origin, 'planning_allowance')
  assert.ok(fallback.ready!.maximum >= result.ready!.maximum)
})

test('missing, reversed, nonfinite and incomplete stages never make readiness earlier; context changes reject overrides', () => {
  for (const input of [allowance(''), allowance('2', ''), allowance('8', '2'), allowance('NaN'), allowance('-1'), allowance('521')]) {
    assert.equal(durationInput(input), null)
    const draft = { ...exact(), overrides: { ...exact().overrides, permits: input }, includeFirstYear: true }
    const result = calculateTimeline(draft, context, model)
    assert.equal(result.ready, null)
    assert.equal(result.delivery, null)
    assert.equal(firstYearIncome(result, calculateRental(defaultRental(model))), null)
  }
  for (const change of [{ propertyKey: 'other' }, { municipality: userMunicipality('Saanich') }, { modelId: 'aux-240' }, { pathwayKey: 'office' }, { configuration: 'new options' }]) {
    const changed = { ...context, ...change }
    assert.notEqual(timelineContextKey(changed), timelineContextKey(context))
    assert.equal(calculateTimeline(exact(), changed, model).ready, null)
    assert.deepEqual(emptyTimeline(changed, model).overrides, {})
  }
  assert.equal(calculateTimeline({ ...exact(), startDate: '2027-02-30' }, context, model).ready, null)
  assert.equal(calculateTimeline({ ...exact(), pathway: 'unknown' }, context, model).ready, null)
})

test('additional approvals extend the permit branch; user overrides retain original source claims', () => {
  const base = exact()
  const result = calculateTimeline({ ...base, pathway: 'additional_approvals', additionalApprovals: allowance('20') }, context, model)
  assert.equal(result.ready!.minimum, 224) // 2 + max(10,20+4+3) + 1 + 2 = 32 weeks.
  assert.equal(result.stages.find(stage => stage.id === 'production')?.origin, 'user')
  assert.deepEqual(result.manufacturer?.claim, model.timings![0])
  const other = journeyCatalogue.models.find(item => item.model_id === 'hewing-quadra4')!
  const nextContext = { ...context, modelId: other.model_id, configuration: other.configuration }
  const fallback = calculateTimeline(emptyTimeline(nextContext, other), nextContext, other)
  assert.equal(fallback.manufacturer, null) // Earliest qualitative claim cannot become a bounded range.
  assert.equal(fallback.stages.find(stage => stage.id === 'production')?.origin, 'planning_allowance')
  for (const stage of fallback.stages) assert.ok(stage.duration, stage.id satisfies StageId)
})
