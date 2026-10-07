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
  const status = { meets_under_assumptions: 'meets within this strict-input subset under the supplied assumptions',
    apparent_conflict_under_assumptions: 'unresolved preliminary concern under the supplied assumptions',
    needs_information: 'needs compatible measurements or confirmed property facts', not_applicable: 'not applicable under the supplied assumptions',
    unsupported: 'outside supported checks' }[check.status]
  const value = (v: string | number | null) => check.normalized_unit === 'm' ? measurementWithUnit(v, 'length')
    : check.normalized_unit === 'm2' ? measurementWithUnit(v, 'area') : String(v)
  const hasValues = check.normalized_observed !== null && check.normalized_threshold !== null
  const difference = check.status === 'apparent_conflict_under_assumptions' && hasValues
    ? ` Difference from the candidate threshold: ${value(Math.abs(Number(check.normalized_observed) - Number(check.normalized_threshold)))}.` : ''
  const scenarioFact = check.rule.kind === 'prerequisite' && ['proposed_use', 'foundation', 'building_type', 'principal_building'].includes(check.rule.fact_id) ? ' This records the screening scenario; it does not confirm the intended project or property fact.' : ''
  return `${screeningCheckTitle(check)}: ${status}.${scenarioFact}${hasValues ? ` Supplied ${value(check.normalized_observed)}; candidate threshold ${value(check.normalized_threshold)}.` : ''}${difference}`
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
      `Main outline: ${assumptions.principal_building_id.value ? `Outline ${assumptions.observed_buildings.findIndex(b => b.id === assumptions.principal_building_id.value) + 1}, ${assumptions.principal_building_id.origin === 'journey_default' ? 'assumed from the largest mapped outline, not verified as the main house' : 'selected by the user, not independently verified as the main house'}` : 'not identified'}. The property contact must identify the house and legal boundaries on a plan.`,
    ] : ['Main building, existing suites, waterfront status and boundary roles have not been supplied.']),
    'A planning comparison based on a garden-suite scenario does not establish that it applies to the intended use. The City or a qualified professional must review applicability.'
  ].join(' ')
}
const section = (heading: string, paragraphs: string[], siteDetails = false): EnquirySection =>
  ({ heading, paragraphs, emailSummary: paragraphs.join('\n\n'), siteDetails })
const pct = (value: number) => `${Number((value * 100).toFixed(1))}%`
const percentageExcess = (value: number) => value > 0 && value * 100 < .05 ? '< 0.1 percentage points' : `${Number((value * 100).toFixed(1))} percentage points`

// Present structured observations; do not parse diagnostic prose into facts or change comparisons.
export function additionalObservation(check: AdditionalCheck): string {
  if (check.status === 'unknown' || check.status === 'unsupported' || check.status === 'review') return `${check.label}: ${check.status === 'unsupported' ? 'outside the supported comparison' : check.status === 'review' ? 'needs review of measurements and applicability' : 'missing information or unresolved applicability'}. No positive finding is established; the property contact and City/professional review must establish the relevant facts.`
  if (check.id === 'rear_location') return check.status === 'conflict'
    ? 'The proposed rectangle is not wholly inside the approximate rear yard behind the assumed main building. The amount extending outside was not supplied.'
    : 'The rectangle is inside the approximate rear yard under the supplied scenario. The yard definition and main-building identification still need confirmation.'
  if (check.id === 'rear_occupancy' && check.observed !== null && check.threshold !== null)
    return `The nominal footprint is approximately ${pct(check.observed)} of the estimated rear-yard area, compared with a candidate ${pct(check.threshold)} limit.${check.status === 'conflict' && check.observed > check.threshold ? ` Excess: ${percentageExcess(check.observed - check.threshold)}.` : ''} The yard estimate, building identification, projections and rule applicability need review.`
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
    concerns.push(`${screeningCheckTitle(check)} raises a concern in the separate strict-input comparison${hasValues ? `: supplied ${value(check.normalized_observed)}, candidate threshold ${value(check.normalized_threshold)}` : ''}. Supplied facts and rule applicability need review.`)
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
  return (scan?.findings ?? []).filter(row => row.status === 'review' || row.records.length > 0).map(row => {
    const names = row.records.map(record => record.Name ?? record.SUBJECT ?? record.Heritage ?? record.AppType)
      .filter((value): value is string => typeof value === 'string' && !!value.trim())
    return `${row.label}: ${names.length ? [...new Set(names)].join('; ') : 'mapped records found; record names not supplied'}. Relevance and conditions need City or professional review.`
  })
}

export function manufacturerDocument(input: EnquiryInput, address: string | null, example: boolean,
  measured: OccupiedMeasurement | null, conditional: ScreeningResult | null, scenarios: ScenarioResult | null, scan: PropertyScanResult | null,
  linkedPlacement: boolean): EnquiryDocument {
  const concerns = placementConcerns(measured, conditional, scenarios)
  const facts = [input.relationship?.trim() && `Relationship to the property: ${input.relationship.trim()}.`,
    input.stage?.trim() && `Project stage: ${input.stage.trim()}.`,
    input.configuration?.trim() && `Desired configuration: ${input.configuration.trim()}.`,
    input.timing.trim() && `Target timing: ${input.timing.trim()}.`, input.budget.trim() && `Budget range: ${input.budget.trim()}.`,
    input.access.trim() && `Access information/questions: ${input.access.trim()}.`, input.services.trim() && `Utility information/questions: ${input.services.trim()}.`].filter((v): v is string => !!v)
  const missing = [!input.intendedUse.trim() && 'intended use', !input.relationship?.trim() && 'relationship to the property',
    !input.stage?.trim() && 'project stage', !input.configuration?.trim() && 'configuration', !input.timing.trim() && 'target timing',
    !input.access.trim() && 'access information/photos', !input.services.trim() && 'known utility connections'].filter(Boolean)
  const placement = measured && linkedPlacement ? [`The preliminary rectangle is ${measurementWithUnit(measured.result.input.placement.width_m, 'length')} × ${measurementWithUnit(measured.result.input.placement.depth_m, 'length')}${measured.widthOrigin === 'user' || measured.depthOrigin === 'user' ? '; dimensions have been edited and availability needs your confirmation' : ' using published nominal dimensions'}. It excludes unconfirmed overhangs and installation space.`] : []
  const next = input.nextStep?.trim() || 'Please let me know what information you need for an initial site discussion and whether a preliminary call is the appropriate next step.'
  return {
    title: `Model 300 feasibility enquiry${address ? ` — ${address}` : ''}`,
    example,
    question: input.question?.trim() || 'Could you help establish whether Model 300 is worth investigating for this project?',
    sections: [
      section('Project', [`I’m exploring aux box Model 300${address ? ` at ${address}` : ' for a possible site'}${input.intendedUse.trim() ? ` for ${input.intendedUse.trim()}` : '. My intended use is not yet specified'}.`, ...facts, ...(input.nextStep?.trim() ? [input.nextStep.trim()] : [])], true),
      ...(concerns.length ? [section('Preliminary concerns', [linkedPlacement ? 'The preliminary placement raises the following unresolved concerns.' : 'The following findings concern a separate retained example, not the proposed property.', ...concerns,
        'These are preliminary comparisons with uncertain applicability, not established legal violations. The garden-suite scenario may not apply to the intended use. Could you advise on relocation, rotation or a smaller model if the concerns persist?'], true)] : []),
      section('Questions for aux box', [
        '1. Can you provide current dimensioned plans with drawing date/version, overall dimensions including overhangs, interior floor area, and a section showing where height is measured from and the foundation interface?',
        `2. Do you service ${address ? 'this locality' : 'the proposed locality once identified'}, and what truck access, crane setup space, lifting clearances and site photos or measurements do you need?`,
        '3. Which foundation and utility interfaces do you support? Who supplies or coordinates site preparation, foundations, connections and permitting, and what planning or permit assistance do you offer?',
        '4. What is the current price for the requested configuration? Please distinguish tax, upgrades, transport, crane, installation, foundations, services and permits from included work.',
        '5. What is the current lead time, when does it start, and what decisions, permits and site preparation must be complete before booking or delivery?',
      ]),
      section('Site preparation', [...placement, ...(!measured && !scenarios ? ['No current placement measurements are supplied; siting remains unassessed.'] : []), ...positivePropertyFindings(scan),
        'A marked site plan is not included in this enquiry. The next preparation step is to identify the main house, front/rear/side boundaries, proposed entrance, approximate gaps and known obstructions on a property plan, with access photos. Any map sketch is approximate and is not a survey. A separate screening report can be shared; it is not attached here.',
        ...(missing.length ? [`Not yet supplied: ${missing.join(', ')}. Please advise which details you need first; detailed studies can follow the initial discussion.`] : []),
        'The sender must establish property identity, permission to proceed, existing dwellings/suites, waterfront status and services. City staff or a qualified local professional must confirm planning applicability and any required approvals; mapped outlines and scenario defaults do not establish those facts.',
      ], true),
    ],
    closing: `${next}${input.contact?.trim() ? `\n\n${input.contact.trim()}` : ''}`,
  }
}
