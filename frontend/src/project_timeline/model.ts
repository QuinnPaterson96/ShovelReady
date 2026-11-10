import type { CatalogueModel, Timing } from '../model_catalogue/model'
import type { MunicipalityContext } from '../municipality_coverage/model'
import type { EnquiryDocument } from '../builder_demo/enquiry'
import type { calculateRental } from '../rental_scenario/model'
import { money } from '../rental_scenario/model'
import { timingProfiles } from './profiles'

export type Range = { minimum: number; maximum: number }
export const stageLabels = { preparation: 'Preparation', permits: 'Permits', production: 'Production', site: 'Site work', installation: 'Installation', completion: 'Completion' } as const
export type StageId = keyof typeof stageLabels
export type TimelineContext = {
  propertyKey: string; municipality: MunicipalityContext | null; modelId: string; modelRevision: string | null
  snapshotId: string; configuration: string; pathwayKey: string; proposedUse: 'garden_suite' | 'other' | null
}
export type DurationInput = { minimum: string; maximum: string; note: string; recordedAt: string }
export type TimelineDraft = {
  schema_version: 'project-timeline.v1'; contextKey: string; startDate: string
  pathway: 'building_permit' | 'additional_approvals' | 'unknown'
  schedule: 'contract_to_delivery' | 'production_after_permits' | 'production_with_permits'
  scheduleOrigin: 'default' | 'user'; overrides: Partial<Record<StageId, DurationInput>>
  additionalApprovals: DurationInput; includeFirstYear: boolean
}
export type Stage = {
  id: StageId; label: string; duration: Range | null; origin: 'planning_allowance' | 'source_based_allowance' | 'manufacturer_claim' | 'user'
  note: string; scope: string; start: Range | null; end: Range | null
}
export const todayLocal = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export const timelineContextKey = (context: TimelineContext) => JSON.stringify(context)
const range = (minimum: number, maximum = minimum): Range => ({ minimum, maximum })
const weeks = (minimum: number, maximum = minimum) => range(minimum * 7, maximum * 7)
const add = (a: Range | null, b: Range | null) => a && b ? range(a.minimum + b.minimum, a.maximum + b.maximum) : null
const later = (a: Range | null, b: Range | null) => a && b ? range(Math.max(a.minimum, b.minimum), Math.max(a.maximum, b.maximum)) : null

/** Missing upper bounds and qualitative claims are never promoted to exact durations. */
function timingDays(claim: Timing): Range | null {
  const factor = claim.unit === 'hours' ? 1 / 24 : claim.unit === 'days' ? 1 : claim.unit === 'weeks' ? 7 : claim.unit === 'months' ? 365.25 / 12 : null
  if (!factor || !claim.duration?.minimum?.trim() || !claim.duration.maximum?.trim()) return null
  const minimum = Number(claim.duration.minimum), maximum = Number(claim.duration.maximum)
  return Number.isFinite(minimum) && Number.isFinite(maximum) && minimum >= 0 && maximum >= minimum && maximum * factor <= 3650 ? range(minimum * factor, maximum * factor) : null
}
function manufacturerDuration(model: CatalogueModel, schedule: TimelineDraft['schedule']) {
  const stage = schedule === 'contract_to_delivery' ? 'contract_to_delivery' : 'production_lead_time'
  const claims = (model.timings ?? []).filter(claim => claim.stage === stage && (!claim.configuration || claim.configuration === model.configuration) && claim.region === null && model.sources.some(source => source.source_id === claim.source_id) && timingDays(claim))
  return claims.length === 1 ? { claim: claims[0], days: timingDays(claims[0])! } : null
}
export function emptyTimeline(context: TimelineContext, model: CatalogueModel, today = todayLocal()): TimelineDraft {
  const hasBundle = manufacturerDuration(model, 'contract_to_delivery') !== null
  return { schema_version: 'project-timeline.v1', contextKey: timelineContextKey(context), startDate: today,
    pathway: 'building_permit', schedule: hasBundle ? 'contract_to_delivery' : 'production_after_permits', scheduleOrigin: 'default',
    overrides: {}, additionalApprovals: { minimum: '4', maximum: '16', note: 'Illustrative allowance for additional approvals before the building permit application; replace with local advice.', recordedAt: today }, includeFirstYear: false }
}
export function durationInput(value: DurationInput): Range | null {
  const numeric = (text: string) => /^\d+(?:\.\d+)?$/.test(text.trim()) ? Number(text) : NaN
  const min = numeric(value.minimum), max = numeric(value.maximum)
  return Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= min && max <= 520 ? weeks(min, max) : null
}
export function durationError(value: DurationInput): string | null {
  if (!value.minimum.trim() || !value.maximum.trim()) return null
  return durationInput(value) ? null : 'Use 0–520 weeks for each bound. To must be at least From.'
}
export function dateValue(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2000-01-01' || value > '2100-12-31') return null
  const time = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null
}
export const dateAfter = (start: string, days: number) => new Date(dateValue(start)! + Math.ceil(days) * 86400000).toISOString().slice(0, 10)
export function rangeWeeks(value: Range | null) {
  if (!value) return 'Not estimated'
  const format = (n: number) => n > 0 && n < 0.1 ? '<0.1' : Number(n.toFixed(1)).toLocaleString('en-CA')
  const min = format(value.minimum / 7), max = format(value.maximum / 7)
  return `${min === max ? min : `${min}–${max}`} weeks`
}
export const calendarDate = (value: string) => new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))

export function calculateTimeline(draft: TimelineDraft, context: TimelineContext, model: CatalogueModel) {
  const availableProfile = timingProfiles.find(item => item.jurisdictionId === context.municipality?.jurisdiction_id) ?? null
  // An undisclosed/undecided use can explore the residential planning scenario.
  // An explicit other use cannot inherit its residential municipal target.
  const profile = context.proposedUse === 'other' ? null : availableProfile
  const manufacturer = manufacturerDuration(model, draft.schedule)
  // A five-day workweek approximation is an explicit planning conversion, not a holiday calendar or promised response date.
  const reviewDays = profile ? profile.businessDays * 7 / 5 : null
  const additional = draft.pathway === 'building_permit' ? range(0) : draft.pathway === 'additional_approvals' ? durationInput(draft.additionalApprovals) : null
  const defaults: Record<StageId, { duration: Range; origin: Stage['origin']; note: string }> = {
    preparation: { duration: weeks(2, 6), origin: 'planning_allowance', note: 'Discovery, site information, drawings and a complete application. Assumes the purchase contract is signed at the end of preparation.' },
    permits: { duration: reviewDays !== null ? range(reviewDays + 14, reviewDays + 56) : weeks(6, 16), origin: profile ? 'source_based_allowance' : 'planning_allowance',
      note: profile ? `${profile.businessDays} business days converted using a five-day workweek, plus an illustrative 2–8 calendar weeks for revisions and issuance. Holidays and actual queues may extend this. The published target is not an issuance date.` : `${context.proposedUse === 'other' ? 'Residential timing targets are not applied to the selected other use.' : 'No local timing profile.'} Illustrative 6–16 weeks from complete application to permit issuance; replace with municipal advice.` },
    production: { duration: manufacturer?.days ?? weeks(16, 28), origin: manufacturer ? 'manufacturer_claim' : 'planning_allowance',
      note: manufacturer ? `${model.provider}: ${manufacturer.claim.qualifications.join(' ')} ${draft.schedule === 'contract_to_delivery' ? 'One contract-to-delivery bundle includes the permitting dependency and production; do not add those periods to it.' : 'Production only; delivery and installation are allowed for separately.'}` : 'No applicable bounded manufacturer timing. Illustrative 16–28 weeks; ask the selected provider for its current queue, scope and clock start.' },
    site: { duration: weeks(2, 6), origin: 'planning_allowance', note: 'Foundation and service preparation after permit issuance; runs alongside the manufacturer schedule when possible. Major upgrades need a longer allowance.' },
    installation: { duration: range(1, 7), origin: 'planning_allowance', note: 'Delivery coordination, placement and installation after both the unit and site are ready. Crane-day claims do not establish occupancy.' },
    completion: { duration: weeks(2, 4), origin: 'planning_allowance', note: 'Final connections, inspections, corrections and occupancy authorization where required. An estimated ready-for-use date is not permission to occupy.' },
  }
  const compatible = draft.contextKey === timelineContextKey(context) && model.model_id === context.modelId
  const scopes: Record<StageId, string> = {
    preparation: 'Discovery, site information, drawings and a complete application; purchase contract assumed at the end.',
    permits: 'Complete building permit application through issuance, including revisions; additional approvals are separate.',
    production: draft.schedule === 'contract_to_delivery' ? 'Contract-to-delivery period, including the permitting dependency and production; counted alongside permits and site work.' : 'Factory queue and production; delivery and installation are separate.',
    site: 'Foundation and service preparation after permit issuance; may overlap production.',
    installation: 'Delivery coordination, placement and installation after both the unit and site are ready.',
    completion: 'Final connections, inspections, corrections and occupancy authorization where required.',
  }
  const stages: Stage[] = (Object.keys(stageLabels) as StageId[]).map(id => ({ id, label: stageLabels[id], scope: scopes[id], ...defaults[id],
    ...(draft.overrides[id] ? { duration: durationInput(draft.overrides[id]!), origin: 'user' as const, note: draft.overrides[id]!.note || 'Your planning allowance.' } : {}), start: null, end: null }))
  const byId = Object.fromEntries(stages.map(stage => [stage.id, stage])) as Record<StageId, Stage>
  function place(id: StageId, start: Range | null) { byId[id].start = start; byId[id].end = add(start, byId[id].duration); return byId[id].end }
  const prepared = place('preparation', range(0))
  const permits = place('permits', add(prepared, additional))
  const production = place('production', draft.schedule === 'production_after_permits' ? permits : prepared)
  const site = place('site', permits)
  const delivery = later(production, site)
  const installed = place('installation', delivery)
  const completion = place('completion', installed)
  const errors = [...(!compatible ? ['Project context changed; use a new timeline for this property, municipality, model and pathway.'] : []),
    ...(dateValue(draft.startDate) === null ? ['Choose a valid project start date between 2000 and 2100.'] : []),
    ...stages.filter(stage => !stage.duration).map(stage => `${stage.label}: enter both bounds from 0 to 520 weeks, with the upper bound at least the lower bound, or restore the default.`),
    ...(!additional ? ['Additional approvals: choose a planning pathway and enter its allowance to estimate completion.'] : [])]
  const ready = errors.length ? null : completion
  return { schema_version: 'project-timeline-result.v1' as const, profile, availableProfile, manufacturer, context, draft, stages, additional, delivery: errors.length ? null : delivery,
    ready, readyDates: ready ? { earliest: dateAfter(draft.startDate, ready.minimum), latest: dateAfter(draft.startDate, ready.maximum) } : null, errors,
    assumptions: ['Building-permit-only is a planning scenario, not a determination of required approvals. Add development, variance or other approvals if needed.',
      'Site work waits for permits. Installation waits for both the manufacturer and site work. Overlapping periods are counted once.',
      'Ranges are planning scenarios, not statistical confidence intervals or bookings. Confirm the permit route with the municipality and schedule with the provider.'],
    manufacturerEvidence: (model.timings ?? []).map(claim => ({ claim, source: model.sources.find(source => source.source_id === claim.source_id) ?? null })),
  }
}
export type TimelineResult = ReturnType<typeof calculateTimeline>

/** First project year ends at the calendar anniversary. Income is prorated by available days, after the existing vacancy assumption. */
export function firstYearIncome(result: TimelineResult, rental: ReturnType<typeof calculateRental> | null) {
  if (!result.draft.includeFirstYear || !result.ready || !result.readyDates || rental?.collected == null) return null
  const start = dateValue(result.draft.startDate)!
  const d = new Date(start), year = d.getUTCFullYear() + 1, month = d.getUTCMonth()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const end = Date.UTC(year, month, Math.min(d.getUTCDate(), lastDay))
  const days = (end - start) / 86400000
  const available = (ready: number) => Math.max(0, days - Math.ceil(ready))
  return { minimum: rental.collected * available(result.ready.maximum) / days, maximum: rental.collected * available(result.ready.minimum) / days,
    daysAvailable: range(available(result.ready.maximum), available(result.ready.minimum)), daysInYear: days,
    endDate: new Date(end).toISOString().slice(0, 10), basis: 'Collected rent after vacancy, before running costs, financing and tax. Rental starts at estimated readiness; no additional letting delay.' }
}
export function timelineParagraphs(result: TimelineResult, rental: ReturnType<typeof calculateRental> | null = null, detailed = false) {
  const ready = result.readyDates
  const income = firstYearIncome(result, rental)
  return [
    `Project timeline for ${result.context.municipality?.name ?? 'municipality not supplied'}: ${rangeWeeks(result.ready)} from ${result.draft.startDate}${ready ? `; estimated ready for use ${calendarDate(ready.earliest)}–${calendarDate(ready.latest)}` : '. Complete the missing timing inputs to estimate readiness'}. Planning scenario, not a booked completion or occupancy approval.`,
    `Permit pathway: ${result.draft.pathway === 'building_permit' ? 'building permit only assumed; additional approvals excluded' : result.draft.pathway === 'additional_approvals' ? `additional approvals allowed ${rangeWeeks(result.additional)} before the building permit application` : 'not yet known'}. ${result.draft.schedule === 'contract_to_delivery' ? 'Manufacturer contract-to-delivery period overlaps permits and site work; it is not added to them.' : result.draft.schedule === 'production_with_permits' ? 'Production is assumed to overlap permitting.' : 'Production is assumed to start after permit issuance.'} Please confirm the required approvals, provider availability and what must happen before occupancy.`,
    ...(detailed ? result.stages.map(stage => `${stage.label}: ${rangeWeeks(stage.duration)} (${stage.origin.replace(/_/g, ' ')}). ${stage.origin === 'user' ? stage.scope + ' ' : ''}${stage.note}`) : []),
    ...(result.profile ? [`${result.profile.provider}, ${result.profile.label}: ${result.profile.businessDays}-business-day ${result.profile.milestone.replace(/_/g, ' ')}; captured ${result.profile.capturedAt}, unreviewed. ${result.profile.url} ${result.draft.overrides.permits ? 'Retained for reference; your permit-duration override replaces the target-based allowance.' : 'Permit issuance includes a separate editable planning allowance.'}`] : [result.context.proposedUse === 'other' ? 'The residential municipal timing profile is not applied to the selected other use; permit timing is a disclosed planning allowance. Ask the municipality for the applicable route and timing.' : 'Local permit timing is unsourced; a disclosed planning allowance is used.']),
    ...(detailed ? result.manufacturerEvidence.map(({ claim, source }) => `${claim.stage.replace(/_/g, ' ')}: ${claim.wording} ${claim.qualifications.join(' ')} ${source ? `${source.url}; captured ${source.captured_at}; unreviewed.` : 'Source record unavailable.'}`) : []),
    ...(income ? [`First year from project start: ${money(income.minimum)}–${money(income.maximum)} CAD collected rent through ${income.endDate}. ${income.basis}`] : []),
  ]
}
export function withTimelineReport(doc: EnquiryDocument | null, result: TimelineResult, rental: ReturnType<typeof calculateRental> | null, detailed = false) {
  if (!doc) return doc
  const paragraphs = timelineParagraphs(result, rental, detailed)
  return { ...doc, sections: [...doc.sections, { heading: 'Project timeline', paragraphs, emailSummary: paragraphs.slice(0, 2).join(' ') }] }
}
