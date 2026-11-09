import type { Address, Confirmed, Source } from '../site_discovery/flow'
import savedExample from '../builder_demo/example-site.json'

export type MunicipalityContext = {
  schema_version: 'municipality-context.v1'
  name: string | null
  jurisdiction_id: 'ca-bc-victoria' | 'ca-bc-saanich' | null
  rule_coverage: 'victoria_candidate' | 'unavailable' | 'unresolved'
  origin: 'geocoder_locality' | 'municipal_parcel' | 'user' | 'unknown'
  source: Source | null
}

const cleanName = (value: string | null) => value?.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80) || null
export const parcelSources = {
  'ca-bc-victoria': { id: 'ca-bc-victoria', name: 'City of Victoria', alternate: 'city of victoria',
    municipality: 'victoria', source: 'city-of-victoria-pid-parcels', ruleCoverage: 'victoria_candidate' },
  'ca-bc-saanich': { id: 'ca-bc-saanich', name: 'Saanich', alternate: 'district of saanich',
    municipality: 'saanich', source: 'district-of-saanich-parcels', ruleCoverage: 'unavailable' },
} as const

export function parcelCoverage(value: MunicipalityContext | null) {
  return value?.jurisdiction_id ? parcelSources[value.jurisdiction_id] : null
}

function context(name: string | null, origin: MunicipalityContext['origin'], source: Source | null): MunicipalityContext {
  const cleaned = cleanName(name), locality = cleaned?.toLowerCase()
  const profile = Object.values(parcelSources).find(item => item.municipality === locality || item.alternate === locality)
  return { schema_version: 'municipality-context.v1', name: profile?.name ?? cleaned, jurisdiction_id: profile?.id ?? null,
    rule_coverage: profile?.ruleCoverage ?? (cleaned ? 'unavailable' : 'unresolved'),
    origin: cleaned ? origin : 'unknown', source }
}

/** The selected structured locality is a provisional routing hint, never parsed from postal text. */
export function municipalityFromAddress(address: Address): MunicipalityContext {
  return context(address.locality, 'geocoder_locality', address.source)
}

/** Prefer the selected municipal parcel adapter to the address provider's locality hint. */
export function municipalityFromProperty(property: Confirmed): MunicipalityContext {
  const raw = property.parcel.raw as { candidate?: { parcel_ref?: { source?: unknown } } } | null
  const profile = Object.values(parcelSources).find(item => item.source === raw?.candidate?.parcel_ref?.source)
  return profile ? context(profile.name, 'municipal_parcel', property.observation.source) : municipalityFromAddress(property.address)
}

export function userMunicipality(name: string): MunicipalityContext { return context(name, 'user', null) }
export function hasVictoriaCoverage(value: MunicipalityContext | null | undefined): boolean { return value?.rule_coverage === 'victoria_candidate' }

export function savedExampleMunicipality(): MunicipalityContext {
  const source = savedExample.site.parcel.source
  return context('City of Victoria', 'municipal_parcel', { provider: source.provider, record: source.record_label,
    capturedAt: source.capture_date, sourceDate: null, url: source.reference, review: source.review_status })
}

export function municipalitySummary(value: MunicipalityContext | null): string {
  if (!value?.name) return 'Municipality is unresolved; no local rule comparisons are available.'
  const basis = value.origin === 'municipal_parcel' ? 'selected municipal parcel source' : value.origin === 'geocoder_locality' ? 'address locality suggestion' : 'entered by you'
  return `Municipality: ${value.name} (${basis}, unverified); ${value.rule_coverage === 'victoria_candidate' ? 'preliminary comparisons use the available Victoria garden-suite rule subset' : 'local rule comparisons are unavailable, with geometric exploration only'}.`
}

/** Opens a real intake form. Nothing is sent until the visitor submits it on GitHub. */
export function coverageRequestUrl(value: MunicipalityContext): string | null {
  if (!value.name || value.rule_coverage !== 'unavailable') return null
  const url = new URL('https://github.com/QuinnPaterson96/ShovelReady/issues/new')
  url.searchParams.set('title', `Municipality coverage request: ${value.name}`)
  url.searchParams.set('body', `Please consider adding ShovelReady rule coverage for ${value.name}, British Columbia.\n\nOptional: What would you like to explore there?\n\nPlease do not include your property address or personal contact details in this public request.`)
  return url.toString()
}
