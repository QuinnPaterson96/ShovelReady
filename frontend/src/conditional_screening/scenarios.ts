import type { Result as GeometryResult } from '../occupied_lots/contract'
import type { SiteAssumptions } from '../zoning_site_assumptions/model'
import type { Pathway } from './model'

export type ScenarioRequest = {
  schema_version: 'placement-scenarios.request.v1'
  geometry: GeometryResult['input']
  assumptions: SiteAssumptions
  model_revision: string
  proposal: Pathway
  street_edge_id: string | null
  rear_edge_id: string | null
  street_pattern: 'unknown' | 'single' | 'corner_or_multiple'
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
}

export function parseScenarioResult(raw: unknown): ScenarioResult {
  if (!raw || typeof raw !== 'object') throw new Error('Scenario response is malformed.')
  const result = raw as ScenarioResult
  if (result.schema_version !== 'placement-scenarios.result.v1' ||
    !['bounded_pass', 'clarify', 'apparent_conflict', 'unresolved'].includes(result.status) ||
    typeof result.reason !== 'string' || typeof result.property_revision !== 'string' ||
    typeof result.placement_revision !== 'string' || typeof result.model_revision !== 'string' ||
    !Number.isFinite(result.thresholds_m?.side_rear) || !Number.isFinite(result.thresholds_m?.flanking_street) ||
    !Array.isArray(result.scenarios) || !Array.isArray(result.sources) || !Array.isArray(result.limitations) ||
    !result.scenarios.every(scenario => ['pass', 'fail'].includes(scenario.outcome) && Array.isArray(scenario.checks) &&
      scenario.checks.every(check => Number.isFinite(check.distance_m) && Number.isFinite(check.minimum_m) &&
        ['captured_nominal', 'user_wall_to_lot_line'].includes(check.basis))))
    throw new Error('Scenario response is malformed.')
  return result
}
