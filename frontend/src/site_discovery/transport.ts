import { DiscoveryProblem } from './flow'
import type { Address, Observation, Parcel, Polygon, SearchResult, Source, Transport } from './flow'

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const string = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const optionalString = (value: unknown): value is string | null => value === null || typeof value === 'string'
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

async function post(path: string, body: unknown, signal: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, 10000)
  try {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal })
    if (!response.ok) throw Error(`HTTP ${response.status}`)
    return await response.json()
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort) }
}

export function parseAddresses(value: unknown): SearchResult<Address> {
  if (!object(value) || value.schemaVersion !== 'sr-address-search.v1' || !string(value.query) ||
    !['candidates', 'no_match', 'unavailable', 'malformed', 'rate_limited'].includes(String(value.status)) ||
    !Array.isArray(value.candidates) || value.candidates.length > 5 || !value.candidates.every(object) ||
    !(value.source === null || object(value.source))) throw Error('Malformed address response')
  const source = value.source
  const candidates = value.candidates.map((candidate, index) => {
    const point = candidate.point
    if (!string(candidate.locator) || !string(candidate.fullAddress) || !object(candidate.address) ||
      !string(candidate.locality) || !string(candidate.matchPrecision) || !Array.isArray(candidate.faults) ||
      !candidate.faults.every(fault => object(fault) && string(fault.fault) && typeof fault.value === 'string') ||
      !finite(candidate.score) || !object(point) || point.crs !== 'EPSG:4326' || !finite(point.longitude) || Math.abs(point.longitude) > 180 || !finite(point.latitude) || Math.abs(point.latitude) > 90 ||
      !optionalString(candidate.sourceChangeDate) || !object(source) || !string(source.provider) ||
      !string(source.fetchedAt) || !string(source.reviewStatus) || !string(source.sourceUrl)) throw Error('Malformed address candidate')
    return { id: candidate.locator as string, label: candidate.fullAddress as string, locality: candidate.locality as string,
      precision: candidate.matchPrecision as string, issues: candidate.faults.map(fault => `${fault.fault}: ${fault.value}`),
      point: [point.longitude, point.latitude] as [number, number], crs: 'EPSG:4326',
      source: { provider: source.provider as string, record: `Address suggestion ${index + 1}`, capturedAt: source.fetchedAt as string,
        sourceDate: candidate.sourceChangeDate as string | null, url: source.sourceUrl as string, review: source.reviewStatus as string },
      raw: { candidate, source },
    }
  })
  if (new Set(candidates.map(candidate => candidate.id)).size !== candidates.length) throw Error('Duplicate address locator')
  if ((value.status === 'candidates') !== (candidates.length > 0)) throw Error('Inconsistent address response')
  return { status: candidates.length ? 'ok' : 'no_match', candidates,
    message: value.status === 'rate_limited' ? 'Address provider rate limited the request. Continue manually or try later.' :
      value.status === 'unavailable' || value.status === 'malformed' ? 'Address provider unavailable or returned invalid data. Continue manually.' : undefined }
}

function municipalSource(value: unknown): Source {
  if (!object(value) || !string(value.provider) || !string(value.record_label) || !string(value.captured_at_utc) ||
    !string(value.source_url) || !string(value.review_status) || !string(value.source_date_limit)) throw Error('Malformed municipal evidence')
  return { provider: value.provider, record: value.record_label, capturedAt: value.captured_at_utc, sourceDate: null,
    url: value.source_url, review: value.review_status.replace(/_/g, ' ') }
}

export function parseParcels(value: unknown): SearchResult<Parcel> {
  if (!object(value) || value.schema_version !== 'municipal-sites.v1' ||
    !['candidates', 'no_match_in_live_query'].includes(String(value.status)) || !Array.isArray(value.candidates) ||
    value.candidates.length > 25 || !Array.isArray(value.evidence)) throw Error('Malformed municipal search response')
  const source = municipalSource(value.evidence[0])
  const candidates = value.candidates.map((candidate, index) => {
    if (!object(candidate) || !object(candidate.parcel_ref) || candidate.parcel_ref.source !== 'city-of-victoria-pid-parcels' ||
      !Number.isInteger(candidate.parcel_ref.object_id) || (candidate.parcel_ref.object_id as number) < 1 ||
      !['gislink_join', 'pid_exact', 'spatial_lead'].includes(String(candidate.relation)) || !object(candidate.attributes) ||
      !optionalString(candidate.pid) || !optionalString(candidate.address)) throw Error('Malformed parcel candidate')
    const label = candidate.address || (candidate.pid ? `PID ${candidate.pid}` : `Parcel option ${index + 1}`)
    return { id: `${candidate.parcel_ref.object_id}:${index}`, label,
      match: candidate.relation === 'spatial_lead' ? 'Nearby spatial lead only; identity unverified.' :
        candidate.relation === 'gislink_join' ? 'City address-to-parcel record join; unreviewed.' : 'City PID exact record match; unreviewed.',
      source: { ...source, record: `City parcel ${label}` }, raw: { candidate, evidence: value.evidence },
    }
  })
  if ((value.status === 'candidates') !== (candidates.length > 0)) throw Error('Inconsistent municipal search response')
  return { status: candidates.length ? 'ok' : 'no_match', candidates }
}

function polygon(value: unknown): Polygon {
  if (!object(value) || !Array.isArray(value.rings) || value.rings.length === 0 || value.rings.length > 100 ||
    !value.rings.every(ring => Array.isArray(ring) && ring.length >= 4 && ring.length <= 10000 && ring.every(point =>
      Array.isArray(point) && point.length >= 2 && finite(point[0]) && finite(point[1])))) throw Error('Invalid municipal geometry')
  return { type: 'Polygon', coordinates: value.rings.map((ring: number[][]) => ring.map(point => [point[0], point[1]])) }
}

export function parseObservation(value: unknown, selected: Parcel): Observation {
  if (!object(value) || value.schema_version !== 'municipal-sites.v1' || !object(value.parcel_ref) ||
    !['available', 'partial', 'missing', 'invalid', 'stale'].includes(String(value.status)) ||
    !Array.isArray(value.rooflines) || !Array.isArray(value.issues) || !value.issues.every(issue => typeof issue === 'string') ||
    !Array.isArray(value.evidence)) throw Error('Malformed municipal observation')
  const selectedRef = (selected.raw as { candidate?: { parcel_ref?: { source?: string; object_id?: number } } })?.candidate?.parcel_ref
  if (value.parcel_ref.source !== selectedRef?.source || value.parcel_ref.object_id !== selectedRef?.object_id) throw Error('Different parcel returned')
  if (value.status === 'stale') throw new DiscoveryProblem('The selected parcel changed at the source. Search again or continue manually.')
  if (value.status === 'missing' || value.status === 'invalid') throw new DiscoveryProblem('Selected parcel geometry is missing or invalid. Choose another parcel or continue manually.')
  if (!object(value.parcel) || value.parcel.horizontal_crs !== 'EPSG:3157' || !finite(value.parcel.area_m2)) throw Error('Invalid parcel observation')
  const parcelGeometry = polygon(value.parcel.geometry)
  const source = municipalSource(value.evidence[0])
  const roofSource = value.evidence.length > 1 ? municipalSource(value.evidence[1]) : null
  const roofs = value.rooflines.map((roof, index) => {
    if (!object(roof) || roof.horizontal_crs !== 'EPSG:3157' || roof.relationship !== 'spatial_intersection_not_ownership' ||
      !object(roof.attributes)) throw Error('Invalid roofline observation')
    return { id: String(roof.attributes.OBJECTID ?? index), geometry: polygon(roof.geometry) }
  })
  return { parcel: { geometry: parcelGeometry, areaM2: value.parcel.area_m2 }, roofs, crs: 'EPSG:3157',
    buildingsState: value.status as string, issues: [...value.issues, (value.evidence[0] as Record<string, unknown>).source_date_limit as string],
    source, roofSource, raw: value }
}

export const liveTransport: Transport = {
  async addresses(query: string, signal: AbortSignal): Promise<SearchResult<Address>> {
    return parseAddresses(await post('/api/address-search', { schemaVersion: 'sr-address-search.v1', query, maxResults: 5 }, signal))
  },
  async parcels(address: Address, signal: AbortSignal): Promise<SearchResult<Parcel>> {
    if (address.locality?.trim().toLowerCase() !== 'victoria') return { status: 'outside_coverage', candidates: [], message: 'This address is outside the City of Victoria parcel demonstration. Continue manually.' }
    const street = object(address.raw) && object(address.raw.candidate) && object(address.raw.candidate.address) ? address.raw.candidate.address.streetAddress : null
    const query = string(street) ? street : address.label.split(',')[0]
    if (query.length < 3 || query.length > 120) return { status: 'no_match', candidates: [], message: 'Address is too long for the City parcel search. Correct it or continue manually.' }
    return parseParcels(await post('/api/municipal-sites/search', { schema_version: 'municipal-sites.v1', address: query }, signal))
  },
  async observe(parcel: Parcel, signal: AbortSignal): Promise<Observation> {
    const candidate = (parcel.raw as { candidate?: { parcel_ref?: unknown; pid?: unknown } })?.candidate
    if (!candidate || !object(candidate.parcel_ref)) throw Error('Missing parcel reference')
    return parseObservation(await post('/api/municipal-sites/observe', { schema_version: 'municipal-sites.v1', parcel_ref: candidate.parcel_ref,
      expected_pid: typeof candidate.pid === 'string' ? candidate.pid : null }, signal), parcel)
  },
}
