import response from '../conditional_screening/api-response.fixture.json'
import { parseScreeningResult } from '../conditional_screening/model'
import type { ScenarioResult } from '../conditional_screening/scenarios'
import type { SiteAssumptions } from '../zoning_site_assumptions/model'
import { initialProjectSettings } from '../conditional_screening/projectSettings'
import type { PropertyScanResult } from '../conditional_screening/PropertyScan'

// Reporting reconstruction only: the October 7 exported text supplies these numbers,
// not its original geometry/API payload. The retained strict-input fixture supplies
// contract shape and source identity. Neither is a new evaluation of this property.
export const reviewAddress = '419 Cecelia Rd, Victoria, BC'
export const reviewInput = { intendedUse: '', timing: '', budget: '', access: '', services: '' }
export const reviewSettings = initialProjectSettings()
const strict = parseScreeningResult(response)
export const reviewConditional = { ...strict, checks: strict.checks.filter(c => c.status !== 'apparent_conflict_under_assumptions'),
  coverage: { ...strict.coverage, apparent_conflict_under_assumptions: 0 },
  limitations: [...strict.limitations, 'Reporting reconstruction; checks retained from a separate synthetic API fixture, not this property.'] }
export const reviewAssumptions: SiteAssumptions = {
  ...(strict.request.site_assumptions as SiteAssumptions),
  existing_garden_suites: { value: 0, origin: 'journey_default', evidence_state: 'assumed', note: null },
  waterfront: { value: false, origin: 'journey_default', evidence_state: 'assumed', note: null },
  principal_building_id: { value: 'assumed-outline', origin: 'journey_default', evidence_state: 'assumed', note: null },
  measurements: { boundary: {}, principal_separation: null, floor_area: null },
  observed_buildings: [{ id: 'assumed-outline', basis: 'roofline', source: { provider: 'Reporting fixture', record_label: 'Assumed main outline', capture_date: '2026-10-07', review_status: 'unreviewed', reference: null } }],
}
reviewAssumptions.edges = reviewAssumptions.edges.map((edge, index) => ({ ...edge, role: { value: index === 3 ? 'front' : index === 1 ? 'rear' : 'side', origin: 'user', note: 'Reporting reconstruction from the review.' } }))
reviewAssumptions.planning_buffers_m = Object.fromEntries(reviewAssumptions.edges.map(edge => [edge.id, 1]))
const source = strict.checks[0].rule.source
const distances = [7.02, 1.7, 3.15, 24.05]
const edges = reviewAssumptions.edges
export const reviewScenarios: ScenarioResult = {
  schema_version: 'placement-scenarios.result.v1', status: 'bounded_pass',
  reason: 'Side/rear distance subset only; reporting reconstruction, not re-evaluated geometry.',
  property_revision: 'report-reconstruction', placement_revision: 'report-reconstruction', model_revision: 'report-reconstruction',
  packet_id: 'victoria-zb2018-grd1-ordinary-garden-suite-scouting', packet_revision: 'candidate-2026-10-05-1',
  scope: 'Report reconstruction from supplied export, not a new site evaluation.',
  edge_distances_m: Object.fromEntries(edges.map((e, i) => [e.id, distances[i]])), thresholds_m: { side_rear: .6, flanking_street: 3.5 },
  scenarios: [{ front_edge_id: edges[3].id, outcome: 'pass', checks: edges.slice(0, 3).map((e, i) => ({ edge_id: e.id, role: i === 1 ? 'rear' : 'side', distance_m: distances[i], basis: 'captured_nominal', minimum_m: .6, meets: true, rule_id: 'candidate-side-rear' })) }],
  sources: [...new Map(strict.checks.filter(check => check.rule.kind === 'boundary_min').map(check => [check.rule.source.locator, check.rule.source])).values()], limitations: ['Original geometry and complete original API payload unavailable.'],
  additional_revision: 'candidate-scouting-2026-10-06-1',
  additional_checks: [
    { id: 'rear_location', label: 'Located behind the main building', status: 'conflict', observed: null, threshold: null, unit: null,
      detail: 'The nominal footprint is not wholly inside the approximate rear yard.', basis: 'parcel clipped at rear-most assumed main outline', action_target: 'principal-building', source: { ...source, locator: 'Part 3.1(28)(a), PDF p27; Part 2.1 Rear Yard, PDF p19' } },
    { id: 'rear_occupancy', label: 'Share of the rear yard', status: 'conflict', observed: 27.870912000912913 / 47.15957088298145, threshold: .25, unit: 'ratio',
      detail: 'The nominal footprint exceeds the candidate rear-yard share.', basis: 'nominal footprint 27.870912000912913 m2 / approximate rear yard 47.15957088298145 m2', action_target: 'principal-building', source: { ...source, locator: 'Part 3.1(28)(i), PDF p28' } },
  ],
}
export const reviewScan: PropertyScanResult = {
  schema_version: 'victoria-property-scan.v1', parcel_ref: { source: 'city-of-victoria-pid-parcels', object_id: 10573 }, parcel_source: null,
  findings: [{ label: 'Development permit areas', status: 'review', records: [], detail: 'Mapped records found; names unavailable in the original export.', source: null }],
  limitations: ['Reporting reconstruction: original scan records, geometry, hashes and payload were not supplied. No mapped area name can be invented.'],
}
