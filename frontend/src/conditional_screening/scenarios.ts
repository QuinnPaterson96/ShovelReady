import type { Result as GeometryResult } from '../occupied_lots/contract'
import type { SiteAssumptions } from '../zoning_site_assumptions/model'
import type { Pathway } from './model'
import type { ProposalEvidence } from './projectSettings'

export type ScenarioRequest = {
  schema_version: 'placement-scenarios.request.v1'
  geometry: GeometryResult['input']
  assumptions: SiteAssumptions
  model_revision: string
  proposal: Pathway
  proposal_evidence?: ProposalEvidence
  street_edge_id: string | null
  rear_edge_id: string | null
  street_pattern: 'unknown' | 'single' | 'corner_or_multiple'
  additional_inputs?: { height_from_average_grade_m: number | null; nominal_footprint_area_m2?: number | null; advertised_height_m?: number | null; area_buffer_percent?: number; height_buffer_percent?: number; foundation_allowance_m?: number | null }
}
export type AdditionalCheck = {
  id: string; label: string; status: 'checked' | 'probable' | 'conflict' | 'unknown' | 'unsupported'; detail: string;
  action_target: string | null; observed: number | null; threshold: number | null; unit: string | null;
  basis: string; source: { provider: string; record_label: string; url: string; locator: string; review_status: string }
}
export type ScenarioResult = {
  schema_version: 'placement-scenarios.result.v1'
  status: 'bounded_pass' | 'clarify' | 'apparent_conflict' | 'unresolved'
  reason: string
  property_revision: string
  placement_revision: string
  model_revision: string
  packet_id: string
  packet_revision: string
  scope: string
  edge_distances_m: Record<string, number>
  thresholds_m: { side_rear: number; flanking_street: number }
  scenarios: { front_edge_id: string; outcome: 'pass' | 'fail'; checks: {
    edge_id: string; role: 'side' | 'rear' | 'flanking_street'; distance_m: number; basis: 'captured_nominal' | 'user_wall_to_lot_line';
    minimum_m: number; meets: boolean; rule_id: string
  }[] }[]
  sources: { provider: string; record_label: string; capture_date: string | null; review_status: string; url: string; locator: string }[]
  limitations: string[]
  proposal_evidence?: ProposalEvidence | null
  additional_checks?: AdditionalCheck[]
  additional_revision?: string | null
}

export function parseScenarioResult(raw: unknown, request?: ScenarioRequest): ScenarioResult {
  if (!raw || typeof raw !== 'object') throw new Error('Scenario response is malformed.')
  const result = raw as ScenarioResult
  const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
  const nonempty = (value: unknown) => typeof value === 'string' && value.trim().length > 0
  const finiteNonnegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
  if (result.additional_checks !== undefined && (!Array.isArray(result.additional_checks) ||
    result.additional_revision !== 'candidate-scouting-2026-10-06-1' || ![5, 6].includes(result.additional_checks.length) ||
    !['separation', 'front', 'rear_location', 'rear_occupancy', 'height'].every(id => result.additional_checks!.some(check => check?.id === id)) ||
    new Set(result.additional_checks.map(check => check?.id)).size !== result.additional_checks.length ||
    !result.additional_checks.every(check => record(check) && ['separation', 'front', 'rear_location', 'rear_occupancy', 'height', 'area'].includes(check.id) &&
      ['checked', 'probable', 'conflict', 'unknown', 'unsupported'].includes(check.status) && nonempty(check.label) && nonempty(check.detail) && nonempty(check.basis) &&
      (check.observed === null || finiteNonnegative(check.observed)) && (check.threshold === null || finiteNonnegative(check.threshold)) &&
      (check.unit === null || typeof check.unit === 'string') &&
      (check.action_target === null || ['principal-building', 'boundary-roles', 'scouting-height', 'scouting-area-buffer', 'zsa-floor-area', 'waterfront-lot'].includes(check.action_target)) &&
      record(check.source) && nonempty(check.source.locator) && nonempty(check.source.provider) &&
      check.source.url === 'https://www.victoria.ca/media/file/zoning-bylaw-2018'))) throw new Error('Additional scouting response is malformed.')
  if (result.schema_version !== 'placement-scenarios.result.v1' ||
    !['bounded_pass', 'clarify', 'apparent_conflict', 'unresolved'].includes(result.status) ||
    !nonempty(result.reason) || !nonempty(result.property_revision) ||
    !nonempty(result.placement_revision) || !nonempty(result.model_revision) ||
    !nonempty(result.packet_id) || !nonempty(result.packet_revision) || !nonempty(result.scope) ||
    !record(result.thresholds_m) || !finiteNonnegative(result.thresholds_m.side_rear) || !finiteNonnegative(result.thresholds_m.flanking_street) ||
    !record(result.edge_distances_m) || !Object.values(result.edge_distances_m).every(finiteNonnegative) ||
    !Array.isArray(result.scenarios) || !Array.isArray(result.sources) || !Array.isArray(result.limitations) ||
    !result.limitations.every(nonempty) || !result.sources.every(source => record(source) &&
      nonempty(source.provider) && nonempty(source.record_label) && (source.capture_date === null || nonempty(source.capture_date)) &&
      nonempty(source.review_status) && nonempty(source.url) && nonempty(source.locator)) ||
    !result.scenarios.every(scenario => record(scenario) && nonempty(scenario.front_edge_id) &&
      ['pass', 'fail'].includes(scenario.outcome) && Array.isArray(scenario.checks) &&
      scenario.checks.every(check => record(check) && nonempty(check.edge_id) &&
        ['side', 'rear', 'flanking_street'].includes(check.role) && finiteNonnegative(check.distance_m) && finiteNonnegative(check.minimum_m) &&
        typeof check.meets === 'boolean' && nonempty(check.rule_id) &&
        ['captured_nominal', 'user_wall_to_lot_line'].includes(check.basis))))
    throw new Error('Scenario response is malformed.')
  // A nested, well-shaped response can still combine incompatible edges or
  // claim a pass with failing distances. Reject that evidence at the boundary.
  const ids = Object.keys(result.edge_distances_m)
  const valid = result.scenarios.every(scenario => {
    const checkedIds = scenario.checks.map(check => check.edge_id)
    return ids.length === 4 && ids.includes(scenario.front_edge_id) && scenario.checks.length === 3 &&
      new Set([scenario.front_edge_id, ...checkedIds]).size === 4 && checkedIds.every(id => ids.includes(id)) &&
      scenario.checks.filter(check => check.role === 'rear').length === 1 &&
      scenario.outcome === (scenario.checks.every(check => check.meets) ? 'pass' : 'fail') &&
      scenario.checks.every(check => check.meets === (check.distance_m >= check.minimum_m) &&
        check.minimum_m === (check.role === 'flanking_street' ? result.thresholds_m.flanking_street : result.thresholds_m.side_rear) &&
        (check.basis !== 'captured_nominal' || check.distance_m === result.edge_distances_m[check.edge_id]))
  })
  const status = !result.scenarios.length ? 'unresolved' : result.scenarios.every(scenario => scenario.outcome === 'pass') ? 'bounded_pass'
    : result.scenarios.every(scenario => scenario.outcome === 'fail') ? 'apparent_conflict' : 'clarify'
  if (!valid || result.status !== status || !result.sources.length || !result.sources.every(source => /^https?:\/\//i.test(source.url)))
    throw new Error('Scenario response is malformed.')
  if (request) {
    const edges = request.assumptions.edges
    if (ids.some(id => !edges.some(edge => edge.id === id)) || result.scenarios.some(scenario => {
      const roles = new Map<string, string>([[scenario.front_edge_id, 'front'], ...scenario.checks.map(check => [check.edge_id, check.role] as [string, string])])
      const ordered = [...edges].sort((a, b) => a.segment - b.segment)
      const front = ordered.findIndex(edge => edge.id === scenario.front_edge_id)
      return edges.some(edge => edge.role.value && edge.role.value !== 'unknown' && edge.role.value !== roles.get(edge.id)) ||
        ordered.length !== 4 || ordered.some(edge => edge.ring !== 0) ||
        !scenario.checks.some(check => check.role === 'rear' && check.edge_id === ordered[(front + 2) % 4]?.id) ||
        scenario.checks.some(check => {
          const manual = request.assumptions.measurements.boundary[check.edge_id]
          return manual ? check.basis !== 'user_wall_to_lot_line' || check.distance_m !== manual.value || manual.placement_revision !== request.assumptions.placement_revision
            : check.basis !== 'captured_nominal'
        }) || request.street_pattern === 'single' &&
          (request.street_edge_id !== null && request.street_edge_id !== scenario.front_edge_id ||
            request.rear_edge_id !== null && !scenario.checks.some(check => check.role === 'rear' && check.edge_id === request.rear_edge_id) ||
            scenario.checks.some(check => check.role === 'flanking_street'))
    })) throw new Error('Scenario response did not match current boundary choices.')
  }
  return result
}
