export type Evidence = {
  origin: 'source' | 'derived' | 'user'
  snapshot_id: string | null
  feature_index: number | null
  source_url: string | null
  captured_at: string | null
  method: string | null
  review_status: 'unreviewed'
}
export type Fact = {
  value: string | number | null
  unit: string | null
  basis: string | null
  unresolved_reason: string | null
  evidence: Evidence
}
export type Candidate = {
  candidate_id: string
  pid: Fact
  vic_pid: Fact
  address: Fact
  parcel_type: Fact
  parcel_status: Fact
  boundary: { rings: number[][][] } | null
  boundary_crs: 'EPSG:3157'
  approximate_area_m2: Fact
  zones: { zone: Fact; bylaw: Fact; contact_area_m2: Fact; classification: string }[]
  constraints_status: 'not_queried'
  unresolved: string[]
  selected: false
}
export type Lookup = {
  schema_version: 'sr-38.site-lookup.v1'
  spatial_revision: string
  collection: string
  query_kind: 'pid' | 'address'
  query: string
  status: 'one_match' | 'ambiguous' | 'no_match' | 'unavailable'
  coverage: 'three_retained_victoria_parcel_leads'
  candidates: Candidate[]
  reason: string | null
  screening_status: 'not_performed'
}
export type ManualFacts = {
  address: Fact
  pid: Fact
  lot_area_m2: Fact
  notes: Fact
}
/** Integrator receives this only after explicit user confirmation. No legal site or placement is implied. */
export type SitePreparationSelection = {
  schema_version: 'sr-38.site-selection.v1'
  mode: 'retained_candidate' | 'manual_unmatched'
  candidate: Candidate | null
  spatial_revision: string | null
  manual: ManualFacts
  review_status: 'unreviewed'
  screening_status: 'not_performed'
}

/** Editable session state, separate from confirmed/unreviewed source selection. */
export type SiteInputDraft = {
  lookup?: Lookup | null
  kind: 'pid' | 'address'
  query: string
  address: string
  pid: string
  area: string
  notes: string
}
export const emptySiteInput: SiteInputDraft = { kind: 'pid', query: '', address: '', pid: '', area: '', notes: '' }
