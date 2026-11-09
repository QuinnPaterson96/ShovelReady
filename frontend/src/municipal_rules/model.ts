import catalogue from './catalogue.json'
import { parseScreeningResult, type ScreeningResult, type ScreeningStatus } from '../conditional_screening/model'
import type { Summary, SummaryCheck } from '../conditional_screening/HomeownerSummary'
import { measurementWithUnit } from '../measurements'
import type { EnquiryDocument } from '../builder_demo/enquiry'

export type MunicipalProfile = typeof catalogue.profiles[number]
export type MunicipalField = MunicipalProfile['inputs'][number]
export type MunicipalDraft = Record<string, string>
export type MunicipalRequest = {
  schema_version: 'municipal-screening.request.v1'
  jurisdiction_id: string
  pathway_id: string
  payload: unknown
}
export type MunicipalFinding = {
  id: string; label: string; status: ScreeningStatus; detail: string
  next_action: string | null; input_id: string | null
  source: ScreeningResult['checks'][number]['rule']['source'] | null
}
export type MunicipalResult = {
  schema_version: 'municipal-screening.result.v1'
  jurisdiction_id: string; pathway_id: string; package_revision: string
  scope: string; screening: ScreeningResult; findings: MunicipalFinding[]
}
export const profiles = catalogue.profiles
export const municipalProfile = (jurisdiction: string | null | undefined) => profiles.find(profile => profile.jurisdiction_id === jurisdiction) ?? null
export const supports = (profile: MunicipalProfile | null, capability: string) => profile?.capabilities.includes(capability) ?? false

export function municipalRequest(profile: MunicipalProfile, payload: unknown): MunicipalRequest {
  return { schema_version: 'municipal-screening.request.v1', jurisdiction_id: profile.jurisdiction_id, pathway_id: profile.pathway_id, payload }
}

const decimalInput = /^\+?(\d+\.?\d*|\.\d+)(?:[eE]([+-]?\d+))?$/
export function invalidMunicipalInput(profile: MunicipalProfile, draft: MunicipalDraft): string | null {
  return profile.inputs.find(field => {
    const value = draft[field.id] ?? ''
    return field.kind === 'measurement' && value.trim() !== '' &&
      (!decimalInput.test(value.trim()) || !Number.isFinite(Number(value)) || field.definition?.unit === 'fraction' && Number(value) > 100)
  })?.label ?? null
}

export function municipalInputs(profile: MunicipalProfile, draft: MunicipalDraft) {
  return Object.fromEntries(profile.inputs.map(field => {
    const value = draft[field.id] ?? ''
    if (field.kind === 'boolean') return [field.id, value === '' ? null : value === 'true']
    const definition = field.definition!
    const decimal = value.trim().match(decimalInput)
    if (!decimal || !Number.isFinite(Number(value)) || definition.unit === 'fraction' && Number(value) > 100) return [field.id, null]
    // Shift the decimal exponent, not a floating-point approximation of the
    // percentage. The backend compares the full supplied precision.
    return [field.id, { quantity: { value: definition.unit === 'fraction' ? `${decimal[1]}e${Number(decimal[2] ?? 0) - 2}` : value.trim(), unit: definition.unit },
      definition_id: definition.id, definition_revision: definition.revision, origin: 'user_measurement' }]
  }))
}

export function parseMunicipalResult(raw: unknown, request: MunicipalRequest): MunicipalResult {
  const value = raw as MunicipalResult | null
  if (!value || value.schema_version !== 'municipal-screening.result.v1' ||
      value.jurisdiction_id !== request.jurisdiction_id || value.pathway_id !== request.pathway_id ||
      typeof value.package_revision !== 'string' || typeof value.scope !== 'string' || !Array.isArray(value.findings)) throw Error('Municipal response does not match the current city and pathway.')
  parseScreeningResult(value.screening)
  const statuses: ScreeningStatus[] = ['meets_under_assumptions', 'apparent_conflict_under_assumptions', 'needs_information', 'not_applicable', 'unsupported']
  if (!value.findings.every(finding => typeof finding.id === 'string' && typeof finding.label === 'string' &&
      statuses.includes(finding.status) && typeof finding.detail === 'string' &&
      (finding.input_id === null || typeof finding.input_id === 'string') &&
      (finding.next_action === null || typeof finding.next_action === 'string'))) throw Error('Municipal findings are malformed.')
  return value
}

const statusMap: Record<ScreeningStatus, SummaryCheck['status']> = {
  meets_under_assumptions: 'probable', apparent_conflict_under_assumptions: 'conflict',
  needs_information: 'unknown', not_applicable: 'unsupported', unsupported: 'unsupported',
}
export function findingText(result: MunicipalResult, finding: MunicipalFinding): string {
  const check = result.screening.checks.find(check => check.rule.logical_id === finding.id)
  if (!check || check.normalized_observed === null || check.normalized_threshold === null) return finding.detail
  const format = (value: string | number) => check.normalized_unit === 'fraction' ? `${(Number(value) * 100).toLocaleString('en-CA', { maximumFractionDigits: 1 })}%`
    : measurementWithUnit(value, check.normalized_unit === 'm' ? 'length' : 'area')
  const roundedEqual = check.status === 'apparent_conflict_under_assumptions' && format(check.normalized_observed) === format(check.normalized_threshold)
  return `${format(check.normalized_observed)} supplied, compared with ${format(check.normalized_threshold)} ${check.rule.kind.endsWith('min') ? 'minimum' : 'maximum'}.${roundedEqual ? ' The exact values differ despite rounding; see the evidence.' : ''} ${finding.detail}`
}

export function municipalSummary(geometry: SummaryCheck, result: MunicipalResult | null, error: string, profile: MunicipalProfile): Summary {
  const checks = [geometry]
  if (result) checks.push(...result.findings.map(finding => ({
    label: finding.label, status: statusMap[finding.status], detail: findingText(result, finding),
    ...(finding.next_action && !finding.input_id && finding.status !== 'meets_under_assumptions' ? { gap: { missing: finding.next_action, affects: 'This question remains outside the completed comparisons.', next: finding.next_action, owner: 'Property contact / local planning professional' } } : {}),
    ...(finding.input_id ? { action: { label: `Review ${finding.label.toLowerCase()}`, target: `municipal-input-${finding.input_id}` } } : {}),
  })))
  else checks.push({ label: profile.label, status: 'unknown', detail: error || 'Local comparisons are updating.',
    ...(error ? { action: { label: 'Retry local comparisons', target: 'retry-municipal' } } : {}) })
  return { checks, conclusion: checks.some(check => check.status === 'conflict') ? 'A preliminary concern needs discussion' : 'Explore this proposal with local advice',
    next: 'Use the measured placement and bounded local comparisons to prepare your provider conversation.' }
}

export function withMunicipalReport(document: EnquiryDocument | null, result: MunicipalResult | null, detailed = false): EnquiryDocument | null {
  if (!document || !result?.findings.length) return document
  const conflicts = result.findings.filter(finding => finding.status === 'apparent_conflict_under_assumptions')
  const open = result.findings.filter(finding => finding.status === 'needs_information')
  const source = result.findings.find(finding => finding.source)?.source
  const provenance = source ? `Source: ${source.provider}, ${source.record_label}, captured ${source.capture_date ?? 'date unavailable'}, ${source.review_status}. ${source.source_revision ? `Source revision: ${source.source_revision}.` : 'Effective bylaw revision remains unresolved.'}` : ''
  const paragraphs = detailed
    ? [result.scope, provenance, ...result.findings.map(finding => `${finding.label} · ${finding.status.replace(/_/g, ' ')}. ${findingText(result, finding)}${finding.source ? ` Source: ${finding.source.provider}, ${finding.source.locator}, captured ${finding.source.capture_date ?? 'date unavailable'}, ${finding.source.review_status}. ${finding.source.url}` : ''}`)]
    : [result.scope,
      ...conflicts.map(finding => `${finding.label}: ${findingText(result, finding)}`),
      ...(open.length ? [`Open questions include ${open.map(finding => finding.label.toLowerCase()).join(', ')}.`] : []),
      ...result.findings.filter(finding => finding.status === 'unsupported').map(finding => finding.detail),
      'Please advise what product information would help with these local planning questions.', provenance]
  const sections = [...document.sections]
  const beforeQuestions = sections.findIndex(section => section.heading.startsWith('Questions for '))
  sections.splice(!detailed && beforeQuestions >= 0 ? beforeQuestions : sections.length, 0,
    { heading: 'Local planning comparisons', paragraphs, emailSummary: paragraphs.join(' '), siteDetails: true })
  return { ...document, sections }
}
