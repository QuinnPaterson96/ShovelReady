import type { Result as GeometryResult } from '../occupied_lots/contract'
import type { ScreeningResult } from './model'
import type { ScenarioResult } from './scenarios'
import type { MappedZoning, ProjectSettings } from './projectSettings'
import { supportedGardenSuiteZone } from './projectSettings'
import type { ZoningLookup } from './victoriaZoning'
import type { SiteAssumptions } from '../zoning_site_assumptions/model'

import type { PropertyScanResult } from './PropertyScan'

import type { SummaryCheck, Summary } from './HomeownerSummary'

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
  const outsideScope = mappedOutside || enteredOutside

  const geometryConflict = geometry?.checks.some(check => check.relation === 'outside' || check.relation === 'touches' || check.relation === 'positive_area_overlap' || check.comparison === 'shortfall') ?? false
  const contained = geometry?.checks.some(check => check.kind === 'containment' && check.relation === 'contained') ?? false
  checks.push(geometryConflict
    ? { label: 'Space within the property', status: 'conflict', detail: 'The current approximate placement has a parcel, roofline or chosen clearance conflict.', action: { label: 'Adjust placement', target: 'placement-map' } }
    : contained && geometryComplete ? { label: 'Space within the property', status: 'checked', detail: 'The footprint is inside the captured parcel and no overlap with captured rooflines was observed. Captured geometry is approximate.' }
      : { label: 'Space within the property', status: 'unknown', detail: geometry ? 'The parcel or roofline observation is incomplete.' : 'Place the model to check the captured parcel and rooflines.', action: { label: geometry ? 'Review placement' : 'Place model', target: 'placement-map' } })

  const legalDistanceConflict = screening?.checks.some(check => check.rule.kind === 'boundary_min' && check.status === 'apparent_conflict_under_assumptions') ?? false
  checks.push(legalDistanceConflict || scenario?.status === 'apparent_conflict'
    ? { label: 'Distance to boundaries', status: 'conflict', detail: 'At least one candidate distance conflicts under the stated assumptions.', action: { label: 'Review boundary measurements', target: 'boundary-offsets' } }
    : outsideScope ? { label: 'Distance to boundaries', status: 'unsupported', detail: 'Boundary rules for this zoning are not yet covered.' }
    : scenarioError ? { label: 'Distance to boundaries', status: 'unknown', detail: 'The distance comparison could not be loaded. The captured geometry remains separate.', action: { label: 'Retry distance check', target: 'retry-scenario' } }
    : scenario?.status === 'bounded_pass'
      ? { label: 'Distance to boundaries', status: 'checked', detail: 'Tested side and rear distances pass in coherent approximate scenarios. Front and legal-line distances remain unchecked.' }
      : { label: 'Distance to boundaries', status: 'unknown', detail: scenario?.status === 'clarify' ? 'The possible boundary roles change the result.' : 'A useful boundary comparison needs a current placement and boundary context.', action: { label: 'Review boundary offsets', target: 'boundary-offsets' } })

  if (assumptions?.street_adjacency) checks.push({ label: 'Street edges', status: assumptions.street_adjacency.all_marked ? 'checked' : 'unknown', detail: assumptions.street_adjacency.all_marked ? `${assumptions.street_adjacency.completion_method === 'advance' ? 'Advancing treated your street selection as complete' : 'You confirmed all street edges are marked'}. Reopen the street tab to revise it. These are adjacency assumptions, not verified legal roles.` : 'Mark known street edges and confirm whether the selection is complete. Unmarked edges remain uncertain.', action: { label: 'Review street edges', target: 'street-side' } })

  const suiteCount = assumptions?.existing_garden_suites.value
  const countConflict = screening?.checks.some(check => check.rule.kind === 'count_max' && check.status === 'apparent_conflict_under_assumptions') ?? false
  const countChecked = screening?.checks.some(check => check.rule.kind === 'count_max' && check.status === 'meets_under_assumptions') ?? false
  checks.push(outsideScope
    ? { label: 'Existing garden suite', status: 'unsupported', detail: 'Suite count rules for this zoning are not covered.' }
    : countConflict
    ? { label: 'Existing garden suite', status: 'conflict', detail: 'The supplied suite count conflicts with the candidate count check.', action: { label: 'Review suite count', target: 'existing-suites' } }
    : suiteCount === null || suiteCount === undefined
      ? { label: 'Existing garden suite', status: 'unknown', detail: 'Tell us if there is already a garden suite on the property.', action: { label: 'Enter suite count', target: 'existing-suites' } }
      : countChecked ? { label: 'Existing garden suite', status: assumptions?.existing_garden_suites.origin === 'journey_default' ? 'probable' : 'checked', detail: assumptions?.existing_garden_suites.evidence_state === 'user_confirmed' ? 'Meets count limit · user-confirmed count, not independently verified.' : suiteCount === 0 ? 'Meets count limit · assuming none existing.' : 'Meets count limit under supplied assumptions.', action: { label: 'Review suite count', target: 'existing-suites' } }
        : { label: 'Existing garden suite', status: suiteCount === 0 ? 'probable' : 'unknown', detail: `${assumptions?.existing_garden_suites.origin === 'journey_default' ? 'Assuming none already exist' : assumptions?.existing_garden_suites.evidence_state === 'user_confirmed' ? 'User-confirmed count recorded' : 'Assumed count recorded'}. ${suiteCount === 0 ? 'Probably fine for this count assumption.' : 'Count prerequisites remain unresolved.'} Other site prerequisites remain open; this is not a verified count pass.`, action: { label: 'Review suite count', target: 'existing-suites' } })

  for (const [kind, label, target] of [
    ['area_max', 'Floor area', 'zsa-floor-area'],
    ['separation_min', 'Distance from the main building', 'separation-measurement-choice'],
  ] as const) {
    const check = screening?.checks.find(item => item.rule.kind === kind)
    if (kind === 'separation_min' && check && (check.rule.measurement_definition === null || check.rule.applicability === 'unknown')) {
      checks.push({ label, status: 'unsupported', detail: 'The source rule’s separation measurement basis is unresolved. Entering a distance cannot complete this check; source review is needed.' })
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
  checks.push({ label: 'Height', status: 'unsupported', detail: 'Not yet covered: installed height, grade and a reviewed applicable height rule are missing.' })
  if (screeningError) checks.push({ label: 'Candidate rule checks', status: 'unknown', detail: 'The rule comparison could not be loaded for the current inputs.', action: { label: 'Retry rule checks', target: 'retry-screening' } })
  if (input.propertyScan || input.propertyScanBusy || input.propertyScanError) {
    const clear = input.propertyScan?.findings.every(row => row.status === 'probably_clear') ?? false
    checks.push({ label: 'Mapped heritage and planning flags', status: clear ? 'probable' : 'unknown',
      detail: clear ? 'No flags found in the six searched City map/history sources. Permit documents, title, projections and servicing remain unsearched.'
        : input.propertyScanBusy ? 'Scanning City map flags and application history.'
        : input.propertyScanError ? 'The scan could not complete. Unsearched sources remain unknown.'
        : 'Some searched records need review or a source was unavailable. Review the individual findings.',
      action: { label: 'Review property scan', target: 'property-scan' } })
  }
  checks.push(outsideScope
    ? { label: 'Zoning coverage', status: 'unsupported', detail: mappedOutside ? `Mapped ${mapped?.zone ?? 'unknown zone'} is outside this tool’s supported Victoria GRD-1 packet. This does not mean a garden suite is prohibited.` : 'Your entered zone or bylaw is outside this tool’s Victoria GRD-1 packet. This does not mean a garden suite is prohibited.' }
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
        ...(extra.action_target ? { action: { label: extra.action_target === 'scouting-height' ? 'Enter installed height' : extra.action_target === 'scouting-area-buffer' ? 'Review area estimate' : extra.action_target === 'zsa-floor-area' ? 'Review floor area' : extra.action_target === 'waterfront-lot' ? 'Confirm waterfront status' : extra.action_target === 'principal-building' ? 'Review main building' : 'Review boundary roles', target: extra.action_target } } : {}) }
      if (index >= 0) {
        if (checks[index].status !== 'conflict' && !(extra.id === 'area' && checks[index].status === 'checked')) checks[index] = row
      } else checks.splice(checks.length - 1, 0, row)
    }
    const remaining = checks.find(check => check.label === 'Other siting requirements')
    if (remaining) { remaining.label = 'Site-specific approvals and other requirements'; remaining.detail = 'Variances, heritage/permit conditions, projections, servicing and other provisions still need property-specific review. New front/rear-yard checks cover only the stated approximate subset.' }
  }
  const supportedConflict = screening?.checks.some(check => check.rule.kind !== 'prerequisite' && check.rule.kind !== 'boundary_min' && check.status === 'apparent_conflict_under_assumptions') ?? false
  const conflict = geometryConflict || legalDistanceConflict || scenario?.status === 'apparent_conflict' || countConflict || supportedConflict || checks.some(check => check.status === 'conflict')
  const supportingCoverage = ['separation', 'front', 'rear_location', 'rear_occupancy', 'height'].every(id => scenario?.additional_checks?.some(check => check.id === id && (check.status === 'checked' || check.status === 'probable')))
  const readyToExplore = supportingCoverage && contained && geometryComplete && !outsideScope && scenario?.status === 'bounded_pass' && checks.every(check => check.status === 'checked' || check.status === 'probable' || check.status === 'unsupported')
  return {
    conclusion: conflict ? 'This placement has a conflict' : readyToExplore ? 'Worth exploring with the provider' : geometry ? 'Resolve this question first' : 'Place the unit to explore the possibilities',
    next: conflict ? 'Review the flagged position or supplied facts, then check the remaining unknowns.' : readyToExplore ? 'The supported checks look plausible under the stated assumptions. Ask the provider about the requirements this tool does not cover.' : geometry ? 'Resolve the highlighted question to see whether this placement is worth pursuing. You can take these questions to the provider.' : 'Place the model on a property to start the approximate checks.',
    checks,
  }
}

