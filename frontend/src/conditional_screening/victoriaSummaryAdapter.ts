import type { Result as GeometryResult } from '../occupied_lots/contract'
import type { ScreeningResult } from './model'
import type { ScenarioResult } from './scenarios'
import type { MappedZoning, ProjectSettings } from './projectSettings'
import { supportedGardenSuiteZone } from './projectSettings'
import type { ZoningLookup } from './victoriaZoning'
import type { SiteAssumptions } from '../zoning_site_assumptions/model'

import type { PropertyScanResult } from './PropertyScan'

import type { FindingGap, SummaryCheck, Summary } from './HomeownerSummary'

// These requests describe the bounded Victoria adapter's inputs, not new rule findings.
const inputGaps: Record<string, FindingGap> = {
  'placement-map': { missing: 'A current placement with usable parcel and building outlines.', affects: 'Containment and building gaps cannot be assessed reliably.', next: 'Place or recheck the rectangle; use a local sketch when mapped geometry is unavailable.', owner: 'Property contact' },
  'boundary-offsets': { missing: 'Boundary roles and compatible wall-to-legal-line gaps.', affects: 'Mapped gaps and optional planning buffers do not establish legal setbacks.', next: 'Review the roles and buffers now; obtain a survey or suitable plan for legal measurements.', owner: 'Property contact, then surveyor / City reviewer' },
  'street-side': { missing: 'Which edges adjoin a street. Current street context is unknown.', affects: 'Street context changes possible front and street-side comparisons.', next: 'Mark known street edges to save your answer, or keep Not sure.', owner: 'Property contact' },
  'waterfront-lot': { missing: 'Waterfront status and any water-adjoining edges.', affects: 'Waterfront conditions can change boundary classification and siting rules.', next: 'Record what is known; ask City staff to establish applicable waterfront rules.', owner: 'Property contact / City reviewer' },
  'existing-suites': { missing: 'The existing garden-suite count and lot eligibility.', affects: 'An assumed count cannot establish permission for another suite.', next: 'Confirm existing suites and ask City staff to check lot eligibility.', owner: 'Property contact / City reviewer' },
  'zsa-floor-area': { missing: 'A floor-area calculation compatible with the candidate rule.', affects: 'Nominal footprint and interior floor area may exclude legally counted space.', next: 'Request dimensioned plans and have the applicable inclusions checked.', owner: 'Manufacturer / designer / City reviewer' },
  'scouting-area-buffer': { missing: 'Reviewed floor area and its inclusions.', affects: 'The editable area allowance is a planning estimate.', next: 'Ask for a configuration-specific area calculation; retain the estimate separately.', owner: 'Manufacturer / designer' },
  'scouting-height': { missing: 'Installed overall height, ground levels and measurement reference.', affects: 'Advertised height plus an allowance does not establish regulatory height.', next: 'Ask for the model height reference and foundation details; confirm site levels separately.', owner: 'Manufacturer, then site professional' },
  'principal-building': { missing: 'Identification of the main home and a usable property plan.', affects: 'Main-home identity changes separation and estimated rear-yard comparisons.', next: 'Identify the main home on the drawing; obtain reviewed wall and yard geometry before relying on it.', owner: 'Property contact / surveyor / City reviewer' },
  'separation-measurement-choice': { missing: 'Compatible main-home and proposed-unit measurement endpoints.', affects: 'A roofline gap may differ from the required wall or projection separation.', next: 'Confirm the main home and request suitable plans or survey measurements.', owner: 'Property contact / surveyor / City reviewer' },
  'property-scan': { missing: 'Review of mapped records and unavailable or unsearched sources.', affects: 'A map search does not resolve permit conditions, title restrictions or servicing.', next: 'Review named records and ask City staff about their relevance; check title separately.', owner: 'Property contact / City reviewer / title professional' },
  'zoning-settings': { missing: 'One applicable zone and bylaw for the legal property.', affects: 'The candidate comparison may not apply to the intended project.', next: 'Review the zoning lead and ask City staff to confirm applicability.', owner: 'Property contact / City reviewer' },
}

// Bounded Victoria packet adapter; the renderer consumes jurisdiction-neutral findings.
export function homeownerSummary(input: {
  geometry: GeometryResult | null; geometryComplete: boolean; scenario: ScenarioResult | null; screening: ScreeningResult | null
  assumptions: SiteAssumptions | null; settings: ProjectSettings; mapped: MappedZoning | null; lookup: ZoningLookup | null
  propertyScan?: PropertyScanResult | null; propertyScanBusy?: boolean; propertyScanError?: string
  zoningBusy: boolean; zoningError: string; scenarioError: string; screeningError: string; onRetryAvailable: boolean
}): Summary {
  const { geometry, geometryComplete, scenario, screening, assumptions, settings, mapped, lookup, zoningBusy, zoningError, scenarioError, screeningError, onRetryAvailable } = input
  const checks: SummaryCheck[] = []
  const mappedOutside = mapped?.status === 'single' && (!supportedGardenSuiteZone(mapped.zone) || mapped.instrument !== 'Zoning Bylaw 2018 (No. 18-072)')
  const enteredOutside = settings.evidence.confirmed_zone.origin === 'user' && settings.proposal.confirmed_zone === 'other' ||
    settings.evidence.confirmed_instrument.origin === 'user' && settings.proposal.confirmed_instrument === 'other'
  const useOutside = settings.proposal.proposed_use !== 'garden_suite'
  const outsideScope = mappedOutside || enteredOutside || useOutside

  const geometryConflict = geometry?.checks.some(check => check.relation === 'outside' || check.relation === 'touches' || check.relation === 'positive_area_overlap' || check.comparison === 'shortfall') ?? false
  const contained = geometry?.checks.some(check => check.kind === 'containment' && check.relation === 'contained') ?? false
  checks.push(geometryConflict
    ? { label: 'Space within the property', status: 'conflict', detail: 'The current approximate placement has a parcel, roofline or chosen clearance conflict.', action: { label: 'Adjust placement', target: 'placement-map' } }
    : contained && geometryComplete ? { label: 'Space within the property', status: 'checked', detail: 'The footprint is inside the captured parcel and no overlap with captured rooflines was observed. Captured geometry is approximate.' }
      : { label: 'Space within the property', status: 'unknown', detail: geometry ? 'The parcel or roofline observation is incomplete.' : 'Place the model to check the captured parcel and rooflines.', action: { label: geometry ? 'Review placement' : 'Place model', target: 'placement-map' } })

  const legalDistanceConflict = screening?.checks.some(check => check.rule.kind === 'boundary_min' && check.status === 'apparent_conflict_under_assumptions') ?? false
  checks.push(assumptions?.street_adjacency && !assumptions.street_adjacency.all_marked
    ? { label: 'Distance to boundaries', status: 'unknown', detail: `${contained && geometryComplete ? 'The current rectangle is inside the captured parcel. ' : ''}Street selection is incomplete; front and street-side context and boundary comparisons remain unresolved. Any candidate distances are exploratory.`, action: { label: 'Review street edges', target: 'street-side' } }
    : !outsideScope && (legalDistanceConflict || scenario?.status === 'apparent_conflict')
    ? { label: 'Distance to boundaries', status: 'conflict', detail: 'At least one candidate distance conflicts under the stated assumptions.', action: { label: 'Review boundary measurements', target: 'boundary-offsets' } }
    : outsideScope ? { label: 'Distance to boundaries', status: 'unsupported', detail: 'Boundary rules for this use or zoning are outside the supported garden-suite comparison.' }
    : scenarioError ? { label: 'Distance to boundaries', status: 'unknown', detail: 'The distance comparison could not be loaded. The captured geometry remains separate.', action: { label: 'Retry distance check', target: 'retry-scenario' } }
    : scenario?.status === 'bounded_pass'
      ? { label: 'Distance to boundaries', status: scenario.scenarios?.some(s => s.checks.some(c => c.planning_meets === false)) ? 'review' : scenario.scenarios?.some(s => s.checks.some(c => (c.planning_buffer_m ?? 0) > 0)) ? 'probable' : 'checked', detail: scenario.scenarios?.some(s => s.checks.some(c => c.planning_meets === false)) ? 'Captured distances clear the candidate minimums, but the planning buffers do not. Review buffers or supply measured offsets; no observed distance conflict is established.' : 'Tested side and rear distances clear the candidate minimums after any stated planning buffers. Approximate geometry; front and legal-line distances remain separate.', action: { label: 'Review planning buffers', target: 'boundary-offsets' } }
      : { label: 'Distance to boundaries', status: 'unknown', detail: scenario?.status === 'clarify' ? 'The possible boundary roles change the result.' : 'A useful boundary comparison needs a current placement and boundary context.', action: { label: 'Review boundary offsets', target: 'boundary-offsets' } })

  if (assumptions?.street_adjacency) checks.push({ label: 'Street edges', status: assumptions.street_adjacency.all_marked ? 'checked' : 'unknown', detail: assumptions.street_adjacency.all_marked ? `${assumptions.street_adjacency.completion_method === 'marking' ? 'Your marked streets are saved; remaining edges are assumed not to adjoin a street' : assumptions.street_adjacency.completion_method === 'advance' ? 'Advancing treated your street selection as complete' : 'You confirmed all street edges are marked'}. Reopen the street tab to revise it. These are adjacency assumptions, not verified legal roles.` : 'Street context is unknown. Mark known street edges to save an answer, or keep Not sure. Dependent boundary comparisons remain unresolved.', action: { label: 'Review street edges', target: 'street-side' } })

  const suiteCount = assumptions?.existing_garden_suites.value
  const countConflict = screening?.checks.some(check => check.rule.kind === 'count_max' && check.status === 'apparent_conflict_under_assumptions') ?? false
  if (assumptions?.waterfront) checks.push({ label: 'Waterfront rules', status: outsideScope ? 'unsupported' : assumptions.waterfront.value === null ? 'unknown' : assumptions.waterfront.value ? 'review' : assumptions.waterfront.origin === 'journey_default' ? 'probable' : 'checked',
    detail: outsideScope ? 'Waterfront rules for this zoning are not covered.' : assumptions.waterfront.origin === 'journey_default' ? 'Assuming not waterfront for preliminary scouting. If your property adjoins water, choose Yes and mark those edges. Legal waterfront status and special rules are not established by this default.' : assumptions.waterfront.value === null ? 'Waterfront status is unknown. Choose the answer you know, or keep Not sure.' : assumptions.waterfront.value ? 'You selected waterfront. Mark water-adjoining edges; legal front-line classification and special siting rules need a reviewed property plan.' : 'You selected not waterfront. This records your answer, not independently verified legal waterfront status.',
    ...(!outsideScope ? { action: { label: 'Review waterfront status', target: 'waterfront-lot' } } : {}) })
  const countChecked = screening?.checks.some(check => check.rule.kind === 'count_max' && check.status === 'meets_under_assumptions') ?? false
  checks.push(outsideScope
    ? { label: 'Existing garden suite', status: 'unsupported', detail: 'Garden-suite count comparisons do not establish suitability for this use or zoning.' }
    : countConflict
    ? { label: 'Existing garden suite', status: 'conflict', detail: 'The supplied suite count conflicts with the candidate count check.', action: { label: 'Review suite count', target: 'existing-suites' } }
    : suiteCount === null || suiteCount === undefined
      ? { label: 'Existing garden suite', status: 'unknown', detail: 'Tell us if there is already a garden suite on the property.', action: { label: 'Enter suite count', target: 'existing-suites' } }
      : countChecked ? { label: 'Existing garden suite', status: assumptions?.existing_garden_suites.origin === 'journey_default' ? 'probable' : 'checked', detail: assumptions?.existing_garden_suites.evidence_state === 'user_confirmed' ? 'Meets count limit · user-confirmed count, not independently verified.' : suiteCount === 0 ? 'Meets count limit · assuming none existing.' : 'Meets count limit under supplied assumptions.', action: { label: 'Review suite count', target: 'existing-suites' } }
        : { label: 'Existing garden suite', status: suiteCount === 0 ? 'probable' : 'unknown', detail: `${assumptions?.existing_garden_suites.origin === 'journey_default' ? 'Assuming none already exist' : assumptions?.existing_garden_suites.evidence_state === 'user_confirmed' ? 'User-confirmed count recorded' : 'Assumed count recorded'}. ${suiteCount === 0 ? 'Likely fine for this count assumption.' : 'Count prerequisites remain unresolved.'} Other site prerequisites remain open; this is not a verified count pass.`, action: { label: 'Review suite count', target: 'existing-suites' } })

  for (const [kind, label, target] of [
    ['area_max', 'Floor area', 'zsa-floor-area'],
    ['separation_min', 'Distance from the main building', 'separation-measurement-choice'],
  ] as const) {
    const check = screening?.checks.find(item => item.rule.kind === kind)
    if (kind === 'separation_min' && check && (check.rule.measurement_definition === null || check.rule.applicability === 'unknown')) {
      checks.push({ label, status: 'unsupported', detail: 'The source rule’s separation measurement basis is unresolved. Entering a distance cannot complete this check; source review is needed.', gap: { missing: 'A reviewed separation rule and its measurement endpoints.', affects: 'A physical gap cannot establish the legal separation comparison.', next: 'Ask a City reviewer to establish the applicable rule and measurement basis before supplying legal-basis distances.', owner: 'City reviewer / qualified local professional' } })
      continue
    }
    if (outsideScope || check?.status === 'unsupported') {
      checks.push({ label, status: 'unsupported', detail: `${label} rules for this property are not covered by the supported comparison.` })
      continue
    }
    checks.push({ label, status: check?.status === 'apparent_conflict_under_assumptions' ? 'conflict'
      : check?.status === 'meets_under_assumptions' ? 'checked' : 'unknown',
      detail: check?.status === 'apparent_conflict_under_assumptions' ? 'The supplied measurement conflicts with this candidate check; review the measurement and its basis.'
        : check?.status === 'meets_under_assumptions' ? 'The supplied measurement meets this candidate check under its assumptions.'
        : 'A usable measurement and supported rule comparison are still needed.',
      action: { label: `Review ${label.toLowerCase()}`, target },
    })
  }
  checks.push({ label: 'Other siting requirements', status: 'unsupported', detail: 'Front setback, rear-yard location and occupancy, and site-specific provisions are not yet covered.' })
  checks.push({ label: 'Height', status: 'unsupported', detail: 'Not yet covered: installed height, grade and a reviewed applicable height rule are missing.', gap: inputGaps['scouting-height'] })
  if (screeningError) checks.push({ label: 'Candidate rule checks', status: 'unknown', detail: 'The rule comparison could not be loaded for the current inputs.', action: { label: 'Retry rule checks', target: 'retry-screening' } })
  if (input.propertyScan || input.propertyScanBusy || input.propertyScanError) {
    const clear = input.propertyScan?.findings.every(row => row.status === 'probably_clear') ?? false
    checks.push({ label: 'Mapped heritage and planning flags', status: input.propertyScan?.findings.some(row => row.status === 'review') ? 'review' : clear ? 'probable' : 'unknown',
      detail: clear ? 'No flags found in the six searched City map/history sources. Permit documents, title, projections and servicing remain unsearched.'
        : input.propertyScanBusy ? 'Scanning City map flags and application history.'
        : input.propertyScanError ? 'The scan could not complete. Unsearched sources remain unknown.'
        : 'Some searched records need review or a source was unavailable. Review the individual findings.',
      action: { label: 'Review property scan', target: 'property-scan' } })
  }
  checks.push(outsideScope
    ? { label: 'Zoning coverage', status: 'unsupported', detail: useOutside ? 'Garden-suite zoning comparisons do not apply to an unknown or other intended use. Physical placement observations remain separate.' : mappedOutside ? `Mapped ${mapped?.zone ?? 'unknown zone'} is outside this tool’s supported Victoria GRD-1 packet. This does not mean a garden suite is prohibited.` : 'Your entered zone or bylaw is outside this tool’s Victoria GRD-1 packet. This does not mean a garden suite is prohibited.' }
    : zoningError || lookup?.status === 'unavailable'
      ? { label: 'Zoning coverage', status: 'unknown', detail: 'The municipal zoning source is unavailable. No current zone was verified.', ...(onRetryAvailable ? { action: { label: 'Retry zoning lookup', target: 'zoning-retry' } } : {}) }
      : zoningBusy ? { label: 'Zoning coverage', status: 'unknown', detail: 'Checking the municipal zoning map.' }
        : mapped?.status === 'single' && supportedGardenSuiteZone(mapped.zone)
          ? { label: 'Zoning coverage', status: 'checked', detail: `The selected parcel maps to ${mapped.zone}; the ordinary garden-suite subset is supported. The map observation and site applicability remain unreviewed.` }
          : { label: 'Zoning coverage', status: 'unknown', detail: 'A single supported zone is not established for this property.', action: { label: 'Review zoning', target: 'zoning-settings' } })

  if (!outsideScope && scenario?.additional_checks?.length) {
    // Replace permanent gaps with sourced scouting outcomes, never legal-basis passes.
    for (const extra of scenario.additional_checks) {
      const index = checks.findIndex(check => check.label === extra.label)
      const row: SummaryCheck = { label: extra.label, status: extra.status, detail: extra.detail,
        ...(extra.action_target ? { action: { label: extra.action_target === 'boundary-offsets' ? 'Review planning buffers' : extra.action_target === 'scouting-height' ? 'Review height estimate' : extra.action_target === 'street-side' ? 'Review street edges' : extra.action_target === 'scouting-area-buffer' ? 'Review area estimate' : extra.action_target === 'zsa-floor-area' ? 'Review floor area' : extra.action_target === 'waterfront-lot' ? 'Confirm waterfront status' : extra.action_target === 'principal-building' ? 'Review main building' : 'Review boundary roles', target: extra.action_target } } : {}) }
      if (index >= 0) {
        if (checks[index].status !== 'conflict' && !(extra.id === 'area' && checks[index].status === 'checked')) checks[index] = row
      } else checks.splice(checks.length - 1, 0, row)
    }
    const remaining = checks.find(check => check.label === 'Other siting requirements')
    if (remaining) { remaining.label = 'Site-specific approvals and other requirements'; remaining.detail = 'Variances, heritage/permit conditions, projections, servicing and other provisions still need property-specific review. The mapped comparisons cover only the stated scope.' }
  }
  const distance = checks.find(check => check.label === 'Distance to boundaries')
  if (distance?.status === 'review' && scenario?.status === 'bounded_pass' && scenario.scenarios.length === 1) {
    distance.resolutions = scenario.scenarios[0].checks.filter(check => check.planning_meets === false && check.basis === 'captured_nominal').map(check => {
      const edge = assumptions?.edges.findIndex(edge => edge.id === check.edge_id) ?? -1
      const metres = (value: number) => value > 0 && value < .01 ? '<0.01 m' : `${Number(value.toFixed(2))} m`
      const buffer = check.planning_buffer_m ?? 0
      const gap = check.distance_m - check.minimum_m
      const movement = Math.ceil(Math.max(0, buffer - gap) * 100) / 100
      const ceiling = Math.floor(Math.max(0, gap) * 100) / 100
      return { edgeId: check.edge_id, bufferM: ceiling, moveM: movement, detail: `${edge >= 0 ? `Edge ${edge + 1}` : 'Boundary'} · ${check.role === 'flanking_street' ? 'Flanking' : check.role}: mapped gap ${metres(check.distance_m)} − ${metres(buffer)} planning buffer = ${metres(check.planning_distance_m ?? Math.max(0, check.distance_m - buffer))}; candidate minimum ${metres(check.minimum_m)}. A measured wall-to-legal-line gap of at least ${metres(check.minimum_m)} would clear this distance check under the stated roles. Moving approximately ${metres(movement)} farther from this edge would clear its current buffered estimate; recheck every boundary and building gap after moving. A buffer of ${metres(ceiling)} or less clears this edge's estimate, but reducing it changes only your assumption. Exact evidence is available below.` }
    })
  }
  if (useOutside) {
    const useDependent = new Set(['Distance to boundaries', 'Waterfront rules', 'Existing garden suite', 'Floor area', 'Distance from the main building', 'Height'])
    if (!mappedOutside && !enteredOutside) useDependent.add('Zoning coverage')
    for (const check of checks) {
      if (!useDependent.has(check.label)) continue
      const unknownUse = settings.proposal.proposed_use === null
      check.useDependent = true
      check.status = unknownUse ? 'unknown' : 'unsupported'
      check.detail = `${check.label} depends on the intended use. ${unknownUse
        ? 'Use is unanswered or Not sure, so the garden-suite comparison remains unresolved.'
        : 'The selected use is outside the supported garden-suite comparison.'} Physical placement observations remain separate.${mappedOutside || enteredOutside ? ' The zoning also falls outside the supported packet.' : ''}`
      check.action = { label: 'Change intended use', target: 'builder-intended-use' }
      check.gap = { missing: 'Intended use and applicable planning rules.', affects: 'This comparison cannot establish suitability until the use and applicable rules are known.', next: 'Change the intended use if you know it, or recognize this open question and include it in your enquiry.', owner: 'Homeowner / provider / City reviewer' }
    }
  }
  const propertyParts = checks.filter(check => ['Other siting requirements', 'Site-specific approvals and other requirements', 'Mapped heritage and planning flags'].includes(check.label))
  const propertyIndex = checks.findIndex(check => propertyParts.includes(check))
  if (propertyIndex >= 0) {
    for (const part of propertyParts) checks.splice(checks.indexOf(part), 1)
    checks.splice(propertyIndex, 0, { label: 'Property flags & other requirements', status: propertyParts.some(part => part.status === 'review') ? 'review' : propertyParts.some(part => part.status === 'unknown') ? 'unknown' : 'unsupported', detail: 'Review searched records and requirements that still need property-specific investigation.', parts: [...propertyParts].sort((a, b) => Number(b.label === 'Mapped heritage and planning flags') - Number(a.label === 'Mapped heritage and planning flags')).map(part => ({ ...part, label: part.label === 'Mapped heritage and planning flags' ? 'Mapped records' : 'Other requirements' })) })
  }
  const supportingChecks = checks.flatMap(check => check.parts ?? [check])
  const supportedConflict = screening?.checks.some(check => check.rule.kind !== 'prerequisite' && check.rule.kind !== 'boundary_min' && check.status === 'apparent_conflict_under_assumptions') ?? false
  if (useOutside) checks.splice(1, 0, { label: 'Intended use', status: settings.proposal.proposed_use === null ? 'unknown' : 'unsupported',
    detail: settings.proposal.proposed_use === null ? 'Intended use is unanswered or Not sure. Boundary, waterfront, suite-count, floor-area, main-building, yard and buffered-height comparisons are waiting for this choice. Physical placement observations remain available. Choose Garden suite if that is your intended use, or keep Not sure and carry this question into your enquiry.' : 'This use is outside the garden-suite comparisons. Physical placement observations remain available; ask the provider about suitability and City staff about applicable planning rules.',
    action: { label: 'Review intended use', target: 'builder-intended-use' },
    gap: { missing: 'An intended use and planning rules applicable to that use.', affects: 'A garden-suite comparison cannot establish suitability for an office or undecided project.', next: 'Choose the intended use or keep Not sure; ask the provider about product suitability and City staff about applicable rules.', owner: 'Homeowner / provider / City reviewer' } })
  const conflict = geometryConflict || !outsideScope && (legalDistanceConflict || scenario?.status === 'apparent_conflict' || countConflict || supportedConflict) || checks.some(check => check.status === 'conflict')
  const supportingCoverage = ['separation', 'front', 'rear_location', 'rear_occupancy', 'height'].every(id => scenario?.additional_checks?.some(check => check.id === id && (check.status === 'checked' || check.status === 'probable')))
  const readyToExplore = supportingCoverage && contained && geometryComplete && !outsideScope && scenario?.status === 'bounded_pass' && supportingChecks.every(check => check.status === 'checked' || check.status === 'probable' || check.status === 'unsupported')
  for (const check of supportingChecks) {
    if (!['unknown', 'unsupported', 'review'].includes(check.status)) continue
    const target = check.action?.target
    check.gap ??= target && inputGaps[target] ? inputGaps[target]
      : target?.startsWith('retry-') || target === 'zoning-retry'
        ? { missing: 'A completed source response for the current inputs.', affects: 'Unavailable data cannot establish a result.', next: 'Retry the source; if unavailable, keep this check unresolved and request the relevant records.', owner: 'Property contact / source provider' }
        : { missing: 'Supported, reviewed property-specific evidence for this requirement.', affects: 'The available checks cannot establish this part of planning feasibility.', next: 'Ask City staff or a qualified local professional which records and review are needed.', owner: 'City reviewer / qualified local professional' }
  }
  return {
    conclusion: conflict ? 'This placement has a conflict' : readyToExplore ? 'Worth exploring with the provider' : geometry ? 'Review this placement' : 'Place the unit to explore the possibilities',
    next: conflict ? 'Resolve the named placement concerns first, or ask for advice with those concerns included. Other placements may still be possible.' : readyToExplore ? 'The supported checks look plausible under the stated assumptions. Ask the provider about the requirements this tool does not cover.' : geometry ? 'The placement observations alone do not establish planning suitability. Resolve the priority questions below or include them when asking for advice.' : 'Place the model on a property to start the approximate checks.',
    checks,
  }
}
