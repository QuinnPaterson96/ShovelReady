import type { EnquiryDocument, EnquirySection } from './enquiry'
import type { OccupiedMeasurement } from '../occupied_lots/OccupiedLots'
import type { ScenarioResult, AdditionalCheck } from '../conditional_screening/scenarios'
import type { ScreeningResult } from '../conditional_screening/model'
import { screeningCheckTitle } from '../conditional_screening/model'
import type { ScreeningCheck, Pathway } from '../conditional_screening/model'
import type { ProjectSettings } from '../conditional_screening/projectSettings'
import type { PropertyScanResult } from '../conditional_screening/PropertyScan'
import type { SiteAssumptions } from '../zoning_site_assumptions/model'
import { measurementWithUnit } from '../measurements'

export type EnquiryInput = {
  question?: string; intendedUse: string; timing: string; budget: string; access: string; services: string
  relationship?: string; stage?: string; configuration?: string; nextStep?: string; contact?: string
}

export function conditionalObservation(check: ScreeningCheck): string {
  const status = { meets_under_assumptions: 'meets under the supplied facts',
    apparent_conflict_under_assumptions: 'unresolved preliminary concern under the supplied assumptions',
    needs_information: 'not assessed: a required measurement or property fact is missing', not_applicable: 'not applicable under the supplied assumptions',
    unsupported: 'outside supported checks' }[check.status]
  const value = (v: string | number | null) => check.normalized_unit === 'm' ? measurementWithUnit(v, 'length')
    : check.normalized_unit === 'm2' ? measurementWithUnit(v, 'area') : String(v)
  const hasValues = check.normalized_observed !== null && check.normalized_threshold !== null
  const difference = check.status === 'apparent_conflict_under_assumptions' && hasValues
    ? ` Difference from the candidate threshold: ${value(Math.abs(Number(check.normalized_observed) - Number(check.normalized_threshold)))}.` : ''
  const required = check.rule.kind === 'boundary_min' ? 'This comparison needs compatible wall-to-legal-line measurements and review of projections and waterfront conditions; a surveyor and City staff can establish these.'
    : check.rule.kind === 'separation_min' ? 'The mapped roof gap is reported separately. Legal wall/projection endpoints and their separation need a survey or approved plans and City review.'
    : check.rule.kind === 'area_max' ? 'The manufacturer’s plans need a compatible floor-area calculation, including the relevant levels and inclusions; the buffered footprint estimate is reported separately.'
    : check.rule.kind === 'count_max' ? 'Existing suites and the lot’s eligibility need confirmation by the property contact and City staff.'
    : check.rule.fact_id === 'principal_building' ? 'The mapped main home is an assumption; the property contact can confirm its identity on the plan.'
    : check.rule.fact_id === 'legal_lot' ? 'The source-selected parcel does not establish legal lot identity; title or survey records and the property contact can confirm it.'
    : 'The property contact and City staff need to confirm the relevant property fact and its applicability.'
  const scenarioFact = check.rule.kind === 'prerequisite' && ['proposed_use', 'foundation', 'building_type', 'principal_building'].includes(check.rule.fact_id) ? ' This records the screening scenario; it does not confirm the intended project or property fact.' : ''
  return `${screeningCheckTitle(check)}: ${status}.${check.status === 'needs_information' ? ` ${required}` : ''}${scenarioFact}${hasValues ? ` Supplied ${value(check.normalized_observed)}; candidate threshold ${value(check.normalized_threshold)}.` : ''}${difference}`
}

export function assumptionsDescription(input: EnquiryInput, assumptions: SiteAssumptions | null, pathway: Pathway | null, settings: ProjectSettings | null): string {
  const provenance = (item: { value: unknown; origin: string; evidence_state?: string }) => item.value === null ? 'not supplied' : item.evidence_state === 'user_confirmed' ? 'user-confirmed, not independently verified' : item.origin === 'journey_default' ? 'default assumption, unconfirmed' : 'user assumption, unverified'
  const use = settings?.evidence.proposed_use
  const foundation = settings?.evidence.foundation_attached
  return [`Intended use: ${input.intendedUse.trim() || 'not supplied'}.`,
    `Screening use: ${pathway?.proposed_use === 'garden_suite' ? 'garden suite' : pathway?.proposed_use === 'other' ? 'other use' : 'not supplied'} (${use?.origin === 'user_confirmed' ? 'confirmed by the user for this scenario, unverified' : use?.origin === 'journey_default' ? 'default scenario, not confirmed intended use' : 'scenario assumption, unverified'}).`,
    `Foundation attachment: ${pathway?.foundation_attached === null || pathway?.foundation_attached === undefined ? 'not supplied' : pathway.foundation_attached ? 'attached to a permanent foundation scenario' : 'not attached to a permanent foundation scenario'} (${foundation?.origin === 'journey_default' ? 'default assumption, unconfirmed' : foundation?.origin === 'user_confirmed' ? 'user-confirmed scenario, unverified' : 'unverified assumption'}).`,
    ...(assumptions ? [
      `Main-building type: ${assumptions.building_type.value === null ? 'not supplied' : { single_detached: 'single-family detached home', duplex: 'duplex', other: 'other' }[assumptions.building_type.value]} (user answer, unverified).`,
      `Existing garden suites: ${assumptions.existing_garden_suites.value === 'two_or_more' ? 'two or more' : assumptions.existing_garden_suites.value ?? 'not supplied'} (${provenance(assumptions.existing_garden_suites)}).`,
      `Waterfront status: ${assumptions.waterfront.value === null ? 'not supplied' : assumptions.waterfront.value ? 'yes' : 'no'} (${provenance(assumptions.waterfront)}).`,
      `Main outline: ${assumptions.principal_building_id.value ? `Outline ${assumptions.observed_buildings.findIndex(b => b.id === assumptions.principal_building_id.value) + 1}, ${assumptions.principal_building_id.origin === 'journey_default' ? 'assumed from the largest mapped outline, not verified as the main house' : 'selected by the user, not independently verified as the main house'}` : 'not identified'}. Main-home identification and legal boundaries remain unverified.`,
    ] : ['Main building, existing suites, waterfront status and boundary roles have not been supplied.']),
    'A planning comparison based on a garden-suite scenario does not establish that it applies to the intended use. The City or a qualified professional must review applicability.'
  ].join(' ')
}
const section = (heading: string, paragraphs: string[], siteDetails = false): EnquirySection =>
  ({ heading, paragraphs, emailSummary: paragraphs.join('\n\n'), siteDetails })
const pct = (value: number) => `${Number((value * 100).toFixed(1))}%`

// Present structured observations; do not parse diagnostic prose into facts or change comparisons.
const unresolvedFacts = { separation: 'Main-home identification or usable building geometry is unresolved.', front: 'Front-line classification or waterfront applicability is unresolved.', rear_location: 'The main home, rear boundary or waterfront status is unresolved.', rear_occupancy: 'The main home or rear-yard area is unresolved.', height: 'Installed height, grade and the measurement datum are unresolved.', area: 'Regulatory floor area and its inclusions are unresolved.' }

export function additionalObservation(check: AdditionalCheck): string {
  if (check.status === 'unknown' || check.status === 'unsupported' || check.status === 'review') return `${check.label}: ${check.status === 'unsupported' ? 'outside the supported comparison' : check.status === 'review' ? 'needs review' : 'not assessed'}. ${ unresolvedFacts[check.id as keyof typeof unresolvedFacts] ?? 'Property-specific applicability is unresolved.' }`
  if (check.id === 'rear_location') return check.status === 'conflict'
    ? 'The sketch suggests part of the unit extends beyond the assumed rear-yard boundary behind the main building.'
    : 'The rectangle is inside the approximate rear yard under the supplied scenario. The yard definition and main-building identification still need confirmation.'
  if (check.id === 'rear_occupancy' && check.observed !== null && check.threshold !== null)
    return `The nominal footprint is approximately ${pct(check.observed)} of the estimated rear-yard area, compared with a possible ${pct(check.threshold)} limit.${check.status === 'conflict' && check.observed > check.threshold && pct(check.observed) === pct(check.threshold) ? ' The exact estimate exceeds that limit despite rounded equality.' : ''} The yard estimate, building identification, projections and rule applicability need checking.`
  const quantity = (value: number) => check.unit === 'm' ? measurementWithUnit(value, 'length')
    : check.unit === 'm2' ? measurementWithUnit(value, 'area') : String(value)
  const values = check.observed !== null && check.threshold !== null
    ? ` Approximate value ${quantity(check.observed)}; candidate threshold ${quantity(check.threshold)}.` : ''
  const shortfall = check.status === 'conflict' && check.observed !== null && check.threshold !== null
    ? ` Difference from the candidate threshold: ${quantity(Math.abs(check.observed - check.threshold))}.` : ''
  return `${check.label}: ${check.status === 'conflict' ? 'preliminary concern' : check.status === 'checked' || check.status === 'probable' ? 'within the candidate threshold under the stated measurement assumptions' : 'unresolved or outside supported checks'}.${values}${shortfall}`
}

export function placementConcerns(measured: OccupiedMeasurement | null, conditional: ScreeningResult | null, scenarios: ScenarioResult | null): string[] {
  const concerns: string[] = []
  for (const check of measured?.result.checks ?? []) {
    if (check.kind === 'containment' && check.status === 'observed' && ['outside', 'touches'].includes(check.relation ?? ''))
      concerns.push(`The rectangle ${check.relation === 'touches' ? 'touches the mapped parcel boundary' : 'is not wholly inside the mapped parcel'}${check.area_m2 !== null && check.area_m2 > 0 ? `; ${measurementWithUnit(check.area_m2, 'area')} lies outside` : ''}. Legal boundaries require confirmation.`)
    if (check.kind === 'building_overlap' && check.status === 'observed' && ['positive_area_overlap', 'touches'].includes(check.relation ?? ''))
      concerns.push(`The rectangle ${check.relation === 'touches' ? 'touches' : 'overlaps'} a mapped building outline${check.area_m2 !== null ? ` (${measurementWithUnit(check.area_m2, 'area')})` : ''}. Rooflines are not surveyed walls.`)
    if (check.kind === 'requirement' && check.comparison === 'shortfall')
      concerns.push(`A supplied clearance target is not met${check.margin_m !== null ? `; shortfall ${measurementWithUnit(Math.abs(check.margin_m), 'length')}` : ''}. This target's legal applicability is unconfirmed.`)
  }
  // Each boundary is reported once even when several alternative front-line choices were tested.
  const failingEdges = new Map<string, string>()
  for (const scenario of scenarios?.scenarios ?? []) for (const check of scenario.checks) if (!check.meets)
    failingEdges.set(check.edge_id, `An approximate ${check.role === 'flanking_street' ? 'street-side' : check.role} boundary gap of ${measurementWithUnit(check.distance_m, 'length')} falls short of the candidate ${measurementWithUnit(check.minimum_m, 'length')} distance by ${measurementWithUnit(check.minimum_m - check.distance_m, 'length')}. Boundary roles and legal measurements require review.`)
  concerns.push(...failingEdges.values())
  concerns.push(...(scenarios?.additional_checks ?? []).filter(check => check.status === 'conflict').map(additionalObservation))
  for (const check of conditional?.checks ?? []) if (check.status === 'apparent_conflict_under_assumptions') {
    // Keep strict checks when their basis differs; label them so a mapped estimate cannot resolve them.
    const hasValues = check.normalized_observed !== null && check.normalized_threshold !== null
    const value = (v: string | number | null) => check.normalized_unit === 'm' ? measurementWithUnit(v, 'length')
      : check.normalized_unit === 'm2' ? measurementWithUnit(v, 'area') : String(v)
    concerns.push(`${screeningCheckTitle(check)} raises a concern in the separate supplied-facts comparison${hasValues ? `: supplied ${value(check.normalized_observed)}, candidate threshold ${value(check.normalized_threshold)}` : ''}. Supplied facts and rule applicability need review.`)
  }
  return [...new Set(concerns)]
}

export function boundaryObservations(scenarios: ScenarioResult | null, assumptions: SiteAssumptions | null): string[] {
  return (assumptions?.edges ?? []).map((edge, index) => {
    const roles = new Set(scenarios?.scenarios.map(s => s.front_edge_id === edge.id ? 'front' : s.checks.find(c => c.edge_id === edge.id)?.role).filter(Boolean))
    const role = edge.role.value && edge.role.value !== 'unknown' ? edge.role.value : roles.size === 1 ? [...roles][0] : null
    const label = role ? `${role === 'flanking_street' ? 'Street-side' : role[0].toUpperCase() + role.slice(1)} boundary (assumed; plan edge ${index + 1})` : `Unclassified boundary (plan edge ${index + 1})`
    const manual = assumptions?.measurements.boundary[edge.id]
    const distance = manual?.value ?? scenarios?.edge_distances_m[edge.id]
    const buffer = assumptions?.planning_buffers_m?.[edge.id]
    const thresholds = [...new Set(scenarios?.scenarios.flatMap(s => s.checks.filter(c => c.edge_id === edge.id).map(c => c.minimum_m)))]
    return `${label}: ${distance === undefined ? 'gap unavailable' : `${measurementWithUnit(distance, 'length')} ${manual ? 'user-supplied wall-to-lot-line measurement, unverified' : 'approximate mapped-line-to-nominal-rectangle gap'}`}.${thresholds.length ? ` Candidate distance${thresholds.length > 1 ? 's' : ''}: ${thresholds.map(v => measurementWithUnit(v, 'length')).join(' / ')}; applicability unconfirmed.` : ''}${!manual && buffer ? ` Separate user planning allowance: ${measurementWithUnit(buffer, 'length')}; this is neither the physical gap nor a legal setback.` : ''}`
  })
}

export function positivePropertyFindings(scan: PropertyScanResult | null): string[] {
  return (scan?.findings ?? []).filter(row => row.records.length > 0).map(row => {
    const names = row.records.map(record => record.Name ?? record.SUBJECT ?? record.Heritage ?? record.AppType)
      .filter((value): value is string => typeof value === 'string' && !!value.trim())
    return names.length ? `${row.label}: ${[...new Set(names)].join('; ')}. Relevance and conditions need City or professional review.` : ''
  }).filter(Boolean)
}

export function preparationChecklist(input: EnquiryInput): string[] {
  return [
    ...(!input.intendedUse.trim() ? ['Choose an intended use, or explicitly select Unknown, Still deciding or Prefer not to say.'] : []),
    ...(!input.relationship?.trim() ? ['State your relationship to the property, or choose Unknown or Prefer not to say.'] : []),
    ...(!input.nextStep?.trim() ? ['Choose the response you want, or select Unknown or Prefer not to say.'] : []),
    /^I own the property\.?$/i.test(input.relationship?.trim() ?? '') ? 'You have stated that you own the property. Check the property identity and any co-owner or title restrictions; ownership has not been independently verified.' : 'Confirm the property identity and permission to proceed with the property owner.',
    'Check the main home, existing suites and waterfront answers before relying on the comparisons.',
    'Add access photos, known obstructions and an entrance location when available; the sketch does not establish delivery access.',
    'Ask City staff or a qualified local professional to check applicable planning rules, title restrictions and permit conditions. The sketch is not a survey.',
    'Review your contact details and any attachments before sending. Share the supporting report if detailed calculations are needed.',
  ]
}

export function manufacturerDocument(input: EnquiryInput, address: string | null, example: boolean,
  measured: OccupiedMeasurement | null, conditional: ScreeningResult | null, scenarios: ScenarioResult | null, scan: PropertyScanResult | null,
  linkedPlacement: boolean, sketchAvailable = false): EnquiryDocument {
  const concerns = placementConcerns(measured, conditional, scenarios)
  const facts = [input.relationship?.trim() && `Relationship to the property: ${input.relationship.trim()}.`,
    input.stage?.trim() && `Project stage: ${input.stage.trim()}.`,
    input.configuration?.trim() && `Desired configuration: ${input.configuration.trim()}.`,
    input.timing.trim() && `Target timing: ${input.timing.trim()}.`, input.budget.trim() && `Budget range: ${input.budget.trim()}.`,
    input.access.trim() && `Access information/questions: ${input.access.trim()}.`, input.services.trim() && `Utility information/questions: ${input.services.trim()}.`].filter((v): v is string => !!v)
  const placement = measured && linkedPlacement ? [`The preliminary rectangle is ${measurementWithUnit(measured.result.input.placement.width_m, 'length')} × ${measurementWithUnit(measured.result.input.placement.depth_m, 'length')}${measured.widthOrigin === 'user' || measured.depthOrigin === 'user' ? '; dimensions have been edited and availability needs your confirmation' : ' using published nominal dimensions'}. It excludes unconfirmed overhangs and installation space.`] : []
  const withheld = (value?: string) => !value?.trim() || ['unknown', 'prefer not to say'].includes(value.trim().toLowerCase())
  const use = input.intendedUse.trim().toLowerCase() === 'still deciding' ? ' I’m still deciding how I would use it.' : withheld(input.intendedUse) ? '' : ` I would use it for ${input.intendedUse.trim()}.`
  const next = withheld(input.nextStep) ? '' : input.nextStep!.trim()
  return {
    title: `Model 300 feasibility enquiry${address ? ` — ${address}` : ''}`,
    example,
    question: input.question?.trim() || 'Could you help establish whether Model 300 is worth investigating for this project?',
    sections: [
      section('Project', [`I’m exploring aux box Model 300${address ? ` at ${address}` : ' for a possible site'}.${use}`, ...facts.filter(fact => !/Relationship to the property: (Unknown|Prefer not to say)\./i.test(fact))], true),
      ...(concerns.length ? [section('Preliminary concerns', [linkedPlacement ? 'The preliminary placement raises the following unresolved concerns.' : 'The following findings concern a separate retained example, not the proposed property.', ...concerns,
        'These preliminary comparisons assume a garden suite; their applicability needs checking. They are not established legal violations. Could relocation, rotation or a smaller model help address these concerns?'], true)] : []),
      section('Questions for aux box', [
        '1. Can you share current dimensioned plans with their date/version, overhangs, interior floor area, height measurement reference and foundation requirements?',
        `2. Do you service ${address ? 'this locality' : 'the proposed locality once identified'}, and what truck access, crane setup space, lifting clearances and site photos or measurements do you need?`,
        '3. What foundation requirements and utility connections are needed? Who coordinates site preparation, foundations, connections and permits, and what assistance do you offer?',
        `4. What is the current ${input.configuration?.trim() ? 'price for the options described above' : 'starting price for the standard Model 300'}, and what is included? Please identify additional costs for tax, upgrades, transport, crane, installation, foundations, utility connections and permits.`,
        '5. What is the current lead time, when does it start, and what decisions, permits and site preparation must be complete before booking or delivery?',
      ]),
      section('Site information', [...placement, ...positivePropertyFindings(scan),
        ...(sketchAvailable ? ['I have an approximate proposed placement sketch available. Please let me know the best way to share it.'] : []),
      ], true),
    ],
    closing: `${next}${input.contact?.trim() ? `\n\n${input.contact.trim()}` : ''}`,
  }
}
