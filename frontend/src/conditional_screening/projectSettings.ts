import type { Pathway } from './model'

export type SettingOrigin = 'journey_default' | 'user' | 'municipal_lookup' | 'derived' | 'unknown'
export type MunicipalSource = { provider: string; record_label: string; url: string; capture_date: string | null; review_status: string; locator: string; source_revision?: string | null; currentness_limitations?: string[] }
export type SettingEvidence = { value: string | boolean | null; origin: SettingOrigin; source: MunicipalSource | null; note: string | null }
export type ProposalEvidence = { [K in keyof Pathway]: SettingEvidence }
export type ProjectSettings = { proposal: Pathway; evidence: ProposalEvidence }

const unknown = (): SettingEvidence => ({ value: null, origin: 'unknown', source: null, note: null })
export function initialProjectSettings(): ProjectSettings {
  return {
    proposal: { proposed_use: 'garden_suite', foundation_attached: true, confirmed_zone: null,
      confirmed_instrument: null, legal_lot_confirmed: null, floor_area_definition_acknowledged: null,
      no_relevant_projections: null },
    evidence: {
      proposed_use: { value: 'garden_suite', origin: 'journey_default', source: null, note: 'Model 300 garden-suite exploration default; editable and not independently verified.' },
      foundation_attached: { value: true, origin: 'journey_default', source: null, note: 'Permanent-foundation scenario default; installation has not been confirmed.' },
      confirmed_zone: unknown(), confirmed_instrument: unknown(), legal_lot_confirmed: unknown(),
      floor_area_definition_acknowledged: unknown(), no_relevant_projections: unknown(),
    },
  }
}

export function changeProjectSetting<K extends keyof Pathway>(settings: ProjectSettings, key: K, value: Pathway[K]): ProjectSettings {
  return { proposal: { ...settings.proposal, [key]: value }, evidence: { ...settings.evidence,
    [key]: value === null ? unknown() : { value, origin: 'user', source: null, note: 'Entered in Project details; unverified.' } } }
}

// Only complete single-zone observations from the exact selected parcel may populate the candidate proposal.
export type MappedZoning = { schema_version: 'sr.mapped-zoning.v1'; property_revision: string;
  status: 'single' | 'multiple' | 'partial' | 'unavailable'; zone: string | null; instrument: string | null;
  source: MunicipalSource | null; reason: string }
export function parseMappedZoning(raw: unknown): MappedZoning {
  const item = raw as MappedZoning
  const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
  const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0
  if (!record(raw) || item.schema_version !== 'sr.mapped-zoning.v1' || !text(item.property_revision) ||
      !['single', 'multiple', 'partial', 'unavailable'].includes(item.status) || !text(item.reason) ||
      (item.zone !== null && !text(item.zone)) || (item.instrument !== null && !text(item.instrument)) ||
      (item.status === 'single' && (!text(item.zone) || !text(item.instrument) || !record(item.source))) ||
      (item.status !== 'single' && (item.zone !== null || item.instrument !== null)) ||
      (item.source !== null && (!record(item.source) || !text(item.source.provider) || !text(item.source.record_label) ||
        !text(item.source.url) || !text(item.source.review_status) || !text(item.source.locator) ||
        (item.source.capture_date !== null && !text(item.source.capture_date))))) throw new Error('Mapped zoning observation is malformed.')
  return item
}

export function applyMappedZoning(settings: ProjectSettings, mapped: MappedZoning | null, propertyRevision: string): ProjectSettings {
  const reset = (key: 'confirmed_zone' | 'confirmed_instrument') => settings.evidence[key].origin === 'municipal_lookup'
    ? { value: null, origin: 'unknown' as const, source: null, note: null } : settings.evidence[key]
  const cleared: ProjectSettings = { proposal: { ...settings.proposal,
    confirmed_zone: settings.evidence.confirmed_zone.origin === 'municipal_lookup' ? null : settings.proposal.confirmed_zone,
    confirmed_instrument: settings.evidence.confirmed_instrument.origin === 'municipal_lookup' ? null : settings.proposal.confirmed_instrument },
    evidence: { ...settings.evidence, confirmed_zone: reset('confirmed_zone'), confirmed_instrument: reset('confirmed_instrument') } }
  if (!mapped || mapped.property_revision !== propertyRevision || mapped.status !== 'single' || !mapped.source) return cleared
  // A mapped source never silently replaces an explicit manual fallback.
  const zone = mapped.zone === 'GRD-1' ? 'GRD-1' : 'other'
  const instrument = mapped.instrument === 'Zoning Bylaw 2018 (No. 18-072)' ? 'Zoning Bylaw 2018' : 'other'
  let next = cleared
  for (const [key, value] of [['confirmed_zone', zone], ['confirmed_instrument', instrument]] as const) {
    if (next.evidence[key].origin === 'user') continue
    next = { proposal: { ...next.proposal, [key]: value }, evidence: { ...next.evidence,
      [key]: { value, origin: 'municipal_lookup', source: mapped.source, note: `Mapped ${mapped.zone} under ${mapped.instrument}. ${mapped.reason}; unreviewed site applicability.` } } }
  }
  return next
}

export function withFloorAreaBasis(settings: ProjectSettings, basis: 'regulatory_floor_area' | 'rough_floor_area_estimate' | null): ProjectSettings {
  const value = basis === 'regulatory_floor_area' ? true : null
  return { proposal: { ...settings.proposal, floor_area_definition_acknowledged: value }, evidence: { ...settings.evidence,
    floor_area_definition_acknowledged: value === null ? unknown() : { value: true, origin: 'derived', source: null,
      note: 'Derived from the user choosing a measured Victoria floor-area basis for the entered area; applicability unreviewed.' } } }
}
