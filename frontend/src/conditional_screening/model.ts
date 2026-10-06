import type { SiteAssumptions } from '../zoning_site_assumptions/model'
import type { ProposalEvidence } from './projectSettings'

export type Pathway = {
  proposed_use: 'garden_suite' | 'other' | null
  foundation_attached: boolean | null
  confirmed_zone: 'GRD-1' | 'GRD-1 (PGA)' | 'other' | null
  confirmed_instrument: 'Zoning Bylaw 2018' | 'other' | null
  legal_lot_confirmed: boolean | null
  floor_area_definition_acknowledged: boolean | null
  no_relevant_projections: boolean | null
}
export const emptyPathway = (): Pathway => ({ proposed_use: null, foundation_attached: null, confirmed_zone: null,
  confirmed_instrument: null, legal_lot_confirmed: null, floor_area_definition_acknowledged: null, no_relevant_projections: null })

export type ScreeningRequest = { schema_version: 'conditional-screening.api.v1'; assumptions: SiteAssumptions; model_revision: string; proposal: Pathway; proposal_evidence?: ProposalEvidence }
export type ScreeningStatus = 'meets_under_assumptions' | 'apparent_conflict_under_assumptions' | 'needs_information' | 'not_applicable' | 'unsupported'
export type ScreeningCheck = { rule: { logical_id: string; revision_id: string; kind: string; fact_id: string; boundary_role: string | null; applicability?: 'applicable' | 'unknown' | 'not_applicable' | 'unsupported'; measurement_definition: string | null; source: {
  provider: string; record_label: string; url: string; locator: string; capture_date: string | null;
  source_revision: string | null; currentness_limitations: string[]; review_status: string
}; threshold?: unknown }; fact?: unknown; status: ScreeningStatus; reasons: string[];
  normalized_observed: string | number | null; normalized_threshold: string | number | null; normalized_unit: string | null }
export type ScreeningResult = { schema_version: 'conditional-screening.v1'; mode: 'candidate_assumption_comparison';
  scope: 'supplied_placement_only'; request: Record<string, unknown>; checks: ScreeningCheck[];
  coverage: Record<ScreeningStatus, number>; outstanding_prerequisites: string[]; limitations: string[] }

export function screeningCheckTitle(check: ScreeningCheck): string {
  const segment = /segment-(\d+)/.exec(check.rule.fact_id)
  const edge = segment ? ` · edge ${Number(segment[1]) + 1}` : ''
  if (check.rule.fact_id.startsWith('edge_role:')) return `Parcel edge ${segment ? Number(segment[1]) + 1 : 'unknown'} role`
  if (check.rule.fact_id === 'flanking_presence') return 'Flanking street line presence'
  switch (check.rule.kind) {
    case 'boundary_min': return `${check.rule.boundary_role === 'flanking_street' ? 'Flanking street' : check.rule.boundary_role === 'rear' ? 'Rear' : 'Side'} setback${edge}`
    case 'area_max': return 'Garden suite floor area'
    case 'count_max': return 'Garden suite count'
    case 'separation_min': return 'Separation from main building'
    case 'prerequisite': return ({ legal_lot: 'Legal lot', zone: 'Current zoning', instrument: 'Applicable zoning bylaw', proposed_use: 'Proposed use', foundation: 'Foundation attachment', building_type: 'Existing main building type', principal_building: 'Main building selection' } as Record<string, string>)[check.rule.fact_id] ?? 'Garden suite pathway condition'
    default: return 'Candidate check'
  }
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const statuses: ScreeningStatus[] = ['meets_under_assumptions', 'apparent_conflict_under_assumptions', 'needs_information', 'not_applicable', 'unsupported']
function validCoverage(value: unknown): boolean { return object(value) && statuses.every(status => typeof value[status] === 'number' && Number.isInteger(value[status]) && Number(value[status]) >= 0) }
export function parseScreeningResult(raw: unknown): ScreeningResult {
  if (!object(raw) || raw.schema_version !== 'conditional-screening.v1' || raw.mode !== 'candidate_assumption_comparison' ||
    raw.scope !== 'supplied_placement_only' || !object(raw.request) || !Array.isArray(raw.checks) || !validCoverage(raw.coverage) ||
    !Array.isArray(raw.outstanding_prerequisites) || !raw.outstanding_prerequisites.every(value => typeof value === 'string') ||
    !Array.isArray(raw.limitations) || !raw.limitations.every(value => typeof value === 'string') ||
    !raw.checks.every(check => object(check) && object(check.rule) && typeof check.rule.logical_id === 'string' &&
      typeof check.rule.revision_id === 'string' && typeof check.rule.fact_id === 'string' && typeof check.rule.kind === 'string' &&
      (check.rule.applicability === undefined || ['applicable', 'unknown', 'not_applicable', 'unsupported'].includes(String(check.rule.applicability))) &&
      object(check.rule.source) && typeof check.rule.source.provider === 'string' && typeof check.rule.source.record_label === 'string' &&
      typeof check.rule.source.locator === 'string' && typeof check.rule.source.url === 'string' && /^https:\/\/www\.victoria\.ca\//.test(check.rule.source.url) &&
      typeof check.rule.source.review_status === 'string' && Array.isArray(check.rule.source.currentness_limitations) &&
      check.rule.source.currentness_limitations.every((item: unknown) => typeof item === 'string') &&
      statuses.includes(check.status as ScreeningStatus) && Array.isArray(check.reasons) && check.reasons.every((reason: unknown) => typeof reason === 'string') &&
      (check.normalized_observed === null || finiteDecimal(check.normalized_observed)) &&
      (check.normalized_threshold === null || finiteDecimal(check.normalized_threshold)) &&
      (check.normalized_unit === null || ['m', 'm2', 'count'].includes(check.normalized_unit as string)))) {
    throw new Error('Conditional screening response is malformed or uses an unsupported version.')
  }
  return raw as ScreeningResult
}

function finiteDecimal(value: unknown): boolean { return (typeof value === 'string' && value.trim() !== '' || typeof value === 'number') && Number.isFinite(Number(value)) }

function digest(input: string): string {
  let hash = 2166136261
  for (let index = 0; index < input.length; index++) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}
export function propertyGeometryRevision(site: { site: { parcel: { id: string; shape: { geometry: unknown }; source: { provider: string; record_label: string; capture_date: string | null; reference: string | null } } } }): string {
  // Identity for the captured coordinates, not a legal survey or manufacturer revision.
  const source = site.site.parcel.source
  const input = JSON.stringify([site.site.parcel.id, source.provider, source.record_label, source.capture_date, source.reference, site.site.parcel.shape.geometry])
  return `client-capture-fnv1a32:${digest(input)}`
}

export function currentPlacementRevision(input: unknown): string { return `client-placement-fnv1a32:${digest(JSON.stringify(input))}` }
export function expectedPropertyRevision(assumptions: SiteAssumptions): string {
  return `${assumptions.property.case_id}:${assumptions.property.parcel_id}:${assumptions.property.geometry_revision}`
}

export function screeningIdentity(request: ScreeningRequest): string { return JSON.stringify(request) }
