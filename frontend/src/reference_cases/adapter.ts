import Ajv from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import schema from './schema.json'

export type Evidence = { source_id: string; locator: string }
export type Statement = { summary: string; evidence: Evidence[] }
export type Source = {
  url: string; title: string; kind: string; access_date: string; access_method: string
  document_date: string | null; date_basis: string; sha256: string | null
  byte_length: number | null; page_count: number | null; inspection: string; rights_id: string
}
export type PublicCase = {
  case_id: string; jurisdiction: { name: string; province: string; country: string }
  scope: 'pilot_jurisdiction' | 'transfer_only'; public_site_label: string
  official_identifiers: string[]; dependency_group: string; split: 'unassigned'
  review_status: 'provisional'; benchmark_eligible: false
  development: Statement; prefab: { status: 'unknown'; evidence: Evidence[]; note: string }
  application_date: string | null; application_date_evidence: Evidence[]
  source_facts: Statement[]; official_interpretations: Statement[]; researcher_inferences: string[]
  plan_version: Statement
  governing_rules: Statement & { effective_date: null; current_applicability: 'unverified' }
  decision: { status: string; date: string | null; evidence: Evidence[]; conditions: Statement[]
    issued_development_permit: null; issued_building_permit: null; as_built_verified: null }
  measurements: { name: string; original_value: string | string[] | null; original_unit: string | null
    measurement_definition: string; normalized_value: null; normalization_status: 'not_performed'
    review_status: 'provisional'; evidence: Evidence[] }[]
  test_uses: string[]; unsupported: string[]; missing_inputs: string[]
}
export type Inventory = {
  schema_version: 'public-case-view.v1'
  identity: { kind: 'provisional_public_case_inventory'; inventory_revision: string
    content_sha256: string; source_schema_version: 'public-cases.v1'; access_date: string }
  purpose: string; first_case_id: string; cases: PublicCase[]; sources: Record<string, Source>
  rights: Record<string, { evidence_url: string; locator: string; access_date: string
    summary: string; handling: string }>
}
const ajv = new Ajv({ strict: false })
addFormats(ajv)
const validate = ajv.compile(schema)
export function officialUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password &&
      (!url.port || url.port === '443') && !/[\s\\]/.test(value) &&
      ['tender.victoria.ca', 'www.victoria.ca', 'saanich.ca.granicus.com', 'vancouver.ca'].includes(url.hostname)
      ? value : null
  } catch { return null }
}
export function parseInventory(value: unknown): Inventory {
  if (!validate(value)) throw new Error('Public-case response is invalid or unsupported.')
  const data = value as Inventory
  const ids = data.cases.map(c => c.case_id)
  if (new Set(ids).size !== ids.length || !ids.includes(data.first_case_id)) throw new Error('Invalid case identity.')
  const urls = Object.values(data.sources).map(s => s.url)
  if (new Set(urls).size !== urls.length) throw new Error('Duplicate source.')
  for (const source of Object.values(data.sources)) {
    if (!officialUrl(source.url) || !Object.prototype.hasOwnProperty.call(data.rights, source.rights_id)) throw new Error('Invalid source.')
  }
  for (const rights of Object.values(data.rights)) {
    if (!officialUrl(rights.evidence_url)) throw new Error('Invalid rights link.')
  }
  function check(value: unknown): void {
    if (Array.isArray(value)) { value.forEach(check); return }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      if ('source_id' in obj && !Object.prototype.hasOwnProperty.call(data.sources, obj.source_id as string)) throw new Error('Broken evidence reference.')
      if (Array.isArray(obj.evidence)) {
        const refs = obj.evidence.map(e => JSON.stringify(e))
        if (new Set(refs).size !== refs.length) throw new Error('Duplicate evidence reference.')
      }
      Object.values(obj).forEach(check)
    }
  }
  data.cases.forEach(c => {
    if ((c.jurisdiction.name === 'City of Victoria') !== (c.scope === 'pilot_jurisdiction') || c.dependency_group !== c.case_id) throw new Error('Invalid case scope.')
    check(c)
  })
  return data
}
