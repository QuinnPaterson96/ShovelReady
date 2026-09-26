import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import schema from './schema.json'
import { useRef, useState, type FormEvent } from 'react'
import type { Candidate, Fact, Lookup, ManualFacts, SitePreparationSelection } from './types'

export type SitePreparationProps = {
  onConfirm: (selection: SitePreparationSelection) => void
  endpoint?: string
}

function userFact(value: string | number | null, reason: string, unit: string | null = null): Fact {
  return {
    value, unit, basis: null, unresolved_reason: value === null ? reason : null,
    evidence: {
      origin: 'user', snapshot_id: null, feature_index: null, source_url: null,
      captured_at: new Date().toISOString(), method: 'manual entry; unverified', review_status: 'unreviewed',
    },
  }
}

export function buildSelection(
  candidate: Candidate | null, spatialRevision: string | null, manual: ManualFacts,
): SitePreparationSelection {
  return {
    schema_version: 'sr-38.site-selection.v1',
    mode: candidate ? 'retained_candidate' : 'manual_unmatched',
    candidate,
    spatial_revision: candidate ? spatialRevision : null,
    manual,
    review_status: 'unreviewed', screening_status: 'not_performed',
  }
}

const ajv = new Ajv2020({ strict: false, allErrors: true })
addFormats(ajv)
const validateLookup = ajv.compile(schema)

export function validLookup(value: unknown): value is Lookup {
  if (!validateLookup(value)) return false
  const data = value as Lookup
  if (!data.candidates.every(candidate => candidate.pid.evidence.origin === 'source' &&
    candidate.approximate_area_m2.evidence.origin === 'derived')) return false
  return (data.status === 'one_match' && data.candidates.length === 1) ||
    (data.status === 'ambiguous' && data.candidates.length > 1) ||
    (['no_match', 'unavailable'].includes(data.status) && data.candidates.length === 0)
}

export function SitePreparation({ onConfirm, endpoint = '/api/site-preparations/lookup' }: SitePreparationProps) {
  const [kind, setKind] = useState<'pid' | 'address'>('pid')
  const [query, setQuery] = useState('')
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [pid, setPid] = useState('')
  const [area, setArea] = useState('')
  const [notes, setNotes] = useState('')
  const requestId = useRef(0)

  async function search(event: FormEvent) {
    event.preventDefault()
    const currentRequest = ++requestId.current
    setLookup(null)
    setError(null)
    setLoading(true)
    try {
      const response = await fetch(`${endpoint}?kind=${kind}&q=${encodeURIComponent(query.trim())}`)
      if (!response.ok) throw new Error(`Lookup unavailable (HTTP ${response.status})`)
      const payload: unknown = await response.json()
      if (!validLookup(payload)) throw new Error('Lookup returned an unsupported response')
      if (currentRequest === requestId.current) setLookup(payload)
    } catch (reason) {
      if (currentRequest === requestId.current)
        setError(reason instanceof Error ? reason.message : 'Lookup failed')
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }

  function manualFacts(): ManualFacts {
    const parsed = area.trim() === '' ? null : Number(area)
    return {
      address: userFact(address.trim() || null, 'address unknown'),
      pid: userFact(pid.trim() || null, 'PID unknown'),
      lot_area_m2: userFact(parsed !== null && Number.isFinite(parsed) && parsed > 0 ? parsed : null,
        'area unknown or invalid', 'm2'),
      notes: userFact(notes.trim() || null, 'no manual notes'),
    }
  }

  function confirm(candidate: Candidate | null) {
    onConfirm(buildSelection(candidate, lookup?.spatial_revision ?? null, manualFacts()))
  }

  return <section className="site-preparation" aria-labelledby="site-preparation-title">
    <p className="eyebrow">Site preparation · unreviewed</p>
    <h2 id="site-preparation-title">Find a parcel lead</h2>
    <p>Search three retained Victoria GIS parcel observations. A match is a lead for confirmation, not a surveyed lot or zoning result.</p>
    <form onSubmit={search}>
      <label htmlFor="site-search-kind">Search by</label>
      <select id="site-search-kind" value={kind} onChange={(event) => { ++requestId.current; setKind(event.target.value as 'pid' | 'address'); setLookup(null); setLoading(false) }}>
        <option value="pid">Parcel identifier (PID)</option><option value="address">Address</option>
      </select>
      <label htmlFor="site-search-value">{kind === 'pid' ? 'PID' : 'Address'}</label>
      <input id="site-search-value" type="text" value={query} maxLength={200} required onChange={(event) => { ++requestId.current; setQuery(event.target.value); setLookup(null); setLoading(false) }} />
      <button disabled={loading} type="submit">{loading ? 'Searching…' : 'Search retained observations'}</button>
    </form>
    {error && <p role="alert" className="site-preparation-status">{error}. You can enter manual facts below.</p>}
    {lookup && <div className="site-preparation-status" role="status">
      <strong>{lookup.status.replace('_', ' ')}</strong> · {lookup.reason ?? `${lookup.candidates.length} retained candidate(s). Confirm one below.`}
      <p className="metadata">Collection {lookup.collection}; spatial revision {lookup.spatial_revision}. Screening not performed.</p>
    </div>}
    {lookup?.candidates.map((candidate) => <article className="site-preparation-candidate" key={candidate.candidate_id}>
      <h3>PID {candidate.pid.value ?? 'unknown'}</h3>
      <p>VicPID {candidate.vic_pid.value ?? 'unknown'} · {candidate.parcel_type.value ?? 'type unknown'} · {candidate.parcel_status.value ?? 'status unknown'}</p>
      <p>Approximate GIS area: {candidate.approximate_area_m2.value ?? 'unknown'} m² ({candidate.boundary_crs} XY). Boundary is an unreviewed GIS polygon.</p>
      <p>Zoning contacts: {candidate.zones.length ? candidate.zones.map((zone) => `${zone.zone.value ?? 'unknown'} (${zone.classification})`).join(', ') : 'none captured; coverage unresolved'}.</p>
      <p className="metadata">Captured {candidate.pid.evidence.captured_at ?? 'date unknown'} · Source {candidate.pid.evidence.source_url ?? 'unknown'} · Snapshot {candidate.pid.evidence.snapshot_id ?? 'unknown'}</p>
      <p>Constraints not queried. Title, survey, principal building and placement remain unknown.</p>
      <button type="button" onClick={() => confirm(candidate)}>Confirm this parcel lead</button>
    </article>)}
    <div className="site-preparation-manual">
      <h3>Manual site facts · unreviewed</h3>
      <p>Enter what you know; leave unknown fields empty. These values remain separate from any source observation. An address alone does not verify a parcel match.</p>
      <label htmlFor="manual-address">Address, if known</label><input id="manual-address" type="text" value={address} onChange={(event) => setAddress(event.target.value)} />
      <label htmlFor="manual-pid">PID, if known</label><input id="manual-pid" type="text" value={pid} onChange={(event) => setPid(event.target.value)} />
      <label htmlFor="manual-area">Approximate lot area (m²), if known</label><input id="manual-area" type="number" min="0" step="any" value={area} onChange={(event) => setArea(event.target.value)} />
      <label htmlFor="manual-notes">Source or uncertainty notes</label><input id="manual-notes" type="text" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <button type="button" onClick={() => confirm(null)}>Continue with unmatched manual facts</button>
    </div>
  </section>
}
