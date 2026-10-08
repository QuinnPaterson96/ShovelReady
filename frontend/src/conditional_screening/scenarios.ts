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
export type ComparisonGeometry = {
  schema_version: 'scouting-comparison-geometry.v1'; crs: string; principal_building_id: string;
  principal_outline_area_m2: number; principal_crosses_parcel: boolean;
  measurement_line: [[number, number], [number, number]];
  rear_yard: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown } | null;
  outside_rear_yard: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown } | null;
  rear_yard_area_m2: number | null; outside_rear_yard_area_m2: number | null;
}
export type AdditionalCheck = {
  id: string; label: string; status: 'checked' | 'probable' | 'review' | 'conflict' | 'unknown' | 'unsupported'; detail: string;
  action_target: string | null; observed: number | null; threshold: number | null; unit: string | null;
  visual_evidence?: ComparisonGeometry | null;
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
  edge_measurement_lines?: Record<string, [[number, number], [number, number]]>
  thresholds_m: { side_rear: number; flanking_street: number }
  scenarios: { front_edge_id: string; outcome: 'pass' | 'fail'; checks: {
    edge_id: string; role: 'side' | 'rear' | 'flanking_street'; distance_m: number; basis: 'captured_nominal' | 'user_wall_to_lot_line';
    planning_buffer_m?: number; planning_distance_m?: number; planning_meets?: boolean; minimum_m: number; meets: boolean; rule_id: string
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
  const point = (p: unknown) => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number' && Number.isFinite(n))
  const segment = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every(point)
  const polygon = (g: unknown) => {
    if (!record(g) || !['Polygon', 'MultiPolygon'].includes(String(g.type)) || !Array.isArray(g.coordinates)) return false
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
    return polys.every(poly => Array.isArray(poly) && poly.length > 0 && poly.every(ring => Array.isArray(ring) && ring.length >= 4 && ring.every(point) && JSON.stringify(ring[0]) === JSON.stringify(ring.at(-1))))
  }
  if (result.edge_measurement_lines && (!record(result.edge_distances_m) || !record(result.edge_measurement_lines) || !Object.entries(result.edge_measurement_lines).every(([id, line]) => id in result.edge_distances_m && segment(line)))) throw new Error('Measurement endpoints are malformed.')
  for (const check of Array.isArray(result.additional_checks) ? result.additional_checks : []) {
    const v = check.visual_evidence
    if (v && (v.schema_version !== 'scouting-comparison-geometry.v1' || !nonempty(v.crs) || !nonempty(v.principal_building_id) || !finiteNonnegative(v.principal_outline_area_m2) || typeof v.principal_crosses_parcel !== 'boolean' || !segment(v.measurement_line) ||
      v.rear_yard !== null && !polygon(v.rear_yard) || v.outside_rear_yard !== null && !polygon(v.outside_rear_yard) ||
      v.rear_yard_area_m2 !== null && !finiteNonnegative(v.rear_yard_area_m2) || v.outside_rear_yard_area_m2 !== null && !finiteNonnegative(v.outside_rear_yard_area_m2) ||
      request && (v.crs !== request.geometry.projected_metre_crs || !request.assumptions.observed_buildings.some(b => b.id === v.principal_building_id) || request.assumptions.principal_building_id.value !== null && v.principal_building_id !== request.assumptions.principal_building_id.value))) throw new Error('Comparison drawing evidence is malformed or belongs to another building.')
  }
  if (result.additional_checks !== undefined && (!Array.isArray(result.additional_checks) ||
    result.additional_revision !== 'candidate-scouting-2026-10-06-1' || ![5, 6].includes(result.additional_checks.length) ||
    !['separation', 'front', 'rear_location', 'rear_occupancy', 'height'].every(id => result.additional_checks!.some(check => check?.id === id)) ||
    new Set(result.additional_checks.map(check => check?.id)).size !== result.additional_checks.length ||
    !result.additional_checks.every(check => record(check) && ['separation', 'front', 'rear_location', 'rear_occupancy', 'height', 'area'].includes(check.id) &&
      ['checked', 'probable', 'review', 'conflict', 'unknown', 'unsupported'].includes(check.status) && nonempty(check.label) && nonempty(check.detail) && nonempty(check.basis) &&
      (check.observed === null || finiteNonnegative(check.observed)) && (check.threshold === null || finiteNonnegative(check.threshold)) &&
      (check.unit === null || typeof check.unit === 'string') &&
      (check.action_target === null || ['principal-building', 'boundary-roles', 'boundary-offsets', 'street-side', 'scouting-height', 'scouting-area-buffer', 'zsa-floor-area', 'waterfront-lot'].includes(check.action_target)) &&
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
        (check.planning_buffer_m === undefined || finiteNonnegative(check.planning_buffer_m) &&
          check.planning_distance_m === Math.max(0, check.distance_m - check.planning_buffer_m) &&
          check.planning_meets === (check.distance_m - check.planning_buffer_m >= check.minimum_m)) &&
        check.minimum_m === (check.role === 'flanking_street' ? result.thresholds_m.flanking_street : result.thresholds_m.side_rear) &&
        (check.basis !== 'captured_nominal' || check.distance_m === result.edge_distances_m[check.edge_id]))
  })
  const status = !result.scenarios.length ? 'unresolved' : result.scenarios.every(scenario => scenario.outcome === 'pass') ? 'bounded_pass'
    : result.scenarios.every(scenario => scenario.outcome === 'fail') ? 'apparent_conflict' : 'clarify'
  // Incomplete street context can retain hypothetical alternatives without an
  // applicable aggregate result. Never turn that explicit unresolved status into a pass.
  const unresolvedStreetContext = result.status === 'unresolved' && (!request || request.assumptions.street_adjacency?.all_marked === false)
  if (!valid || (result.status !== status && !unresolvedStreetContext) || !result.sources.length || !result.sources.every(source => /^https?:\/\//i.test(source.url)))
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
          const buffer = manual ? 0 : request.assumptions.planning_buffers_m?.[check.edge_id] ?? 0
          if (check.planning_buffer_m !== undefined && check.planning_buffer_m !== buffer || buffer > 0 && check.planning_buffer_m === undefined) return true
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
