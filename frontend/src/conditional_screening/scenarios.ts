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
}

export function parseScenarioResult(raw: unknown): ScenarioResult {
  if (!raw || typeof raw !== 'object') throw new Error('Scenario response is malformed.')
  const result = raw as ScenarioResult
  const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
  const nonempty = (value: unknown) => typeof value === 'string' && value.trim().length > 0
  const finiteNonnegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
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
  return result
}
