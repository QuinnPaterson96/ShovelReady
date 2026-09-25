import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import schema from './schema.json'
import type { DesignRevision, SiteRevision, PlacementRevision, MeasuredFact, RuleContent } from '../draft_evaluations/types'

export type Citation = { source_id: string; locator: string; url: string }
export type Preparation = {
  schema_version: 'pilot-preparation.v1'; case_id: 'VIC-PC-002'; status: 'evaluation_not_run'
  annotation_revision: string; annotation_text_sha256: string; source_manifest_text_sha256: string; hash_basis: string
  selected_period: string; design_date: string; received_date: string; historical_cutoff: string
  retained_observations: { observation_id: string; kind: string; period: string; summary: string; sources: Citation[]
    eligible_for_historical_fact_fragment: boolean; quantity: { value: string; unit: string; original_value: string; original_unit: string; basis: unknown } }[]
  parcel_claims: { value: string; link: { source_id: string; locator: string } }[]
  later_permit_observations: Record<string, unknown>[]
  mapped_fragments: { facts: MeasuredFact[]; design: DesignRevision; site: SiteRevision; placement: PlacementRevision; rule_contents: RuleContent[] }
  diagnostics: { code: string; detail: string; next_artifact: string; scope: string; sources: Citation[] }[]
  boundary_attempts: { boundary: string; item: string; period?: string; errors: { type: string; loc: (string | number)[]; msg: string }[]; sources: Citation[]; attempted_payload?: unknown }[]
}
const ajv = new Ajv2020({ strict: false, allErrors: true })
addFormats(ajv)
const validate = ajv.compile(schema)
export function parsePreparation(value: unknown): Preparation {
  if (!validate(value)) throw new Error('Invalid preparation payload')
  return value as Preparation
}

/** Only known public evidence hosts become links; artifact URIs remain inert text. */
export function evidenceUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || value.includes('\\') ||
      !['tender.victoria.ca', 'www.victoria.ca', 'pub-victoria.escribemeetings.com', 'maps.victoria.ca',
        'www.greatervictoriapropertygroup.com', 'www.civicweb.net', 'victoria.civicweb.net'].includes(url.hostname)) return null
    return url.href
  } catch { return null }
}
export type LoadState = { kind: 'loading' } | { kind: 'empty' } | { kind: 'error' } | { kind: 'ready'; data: Preparation }
export function startLoad(publish: (state: LoadState) => void, fetcher: typeof fetch = fetch) {
  const controller = new AbortController()
  let active = true
  publish({ kind: 'loading' })
  const timer = setTimeout(() => {
    if (active) publish({ kind: 'error' })
    active = false
    controller.abort()
  }, 15000)
  void fetcher('/api/case-preparations/pilot', { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' } })
    .then(async response => {
      if (!response.ok) throw new Error('Unavailable')
      if (response.status === 204) { if (active) publish({ kind: 'empty' }); return }
      const data = parsePreparation(await response.json())
      if (active) publish(data.retained_observations.length ? { kind: 'ready', data } : { kind: 'empty' })
    }).catch(() => { if (active) publish({ kind: 'error' }) })
    .finally(() => clearTimeout(timer))
  return () => { active = false; clearTimeout(timer); controller.abort() }
}
