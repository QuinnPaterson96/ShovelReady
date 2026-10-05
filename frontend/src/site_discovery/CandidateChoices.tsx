import type { ReactNode } from 'react'
import type { Address, Parcel } from './flow'

// These are optional because saved/manual Transport implementations need not supply
// provider ranking metadata. A score compares address suggestions only.
export type ProviderFault = { element: string; fault: string; value: string }
export type RankedAddress = Address & { providerScore?: number; providerFaults?: ProviderFault[]; providerProvince?: string }
export type RelatedParcel = Parcel & { relation?: 'pid_exact' | 'gislink_join' | 'spatial_lead' }

export function leadingAddressIndex(addresses: Address[]): number | null {
  if (addresses.length < 2) return null
  const ranked = addresses as RankedAddress[]
  if (ranked.some(address => !Number.isFinite(address.providerScore))) return null
  // Distinct unit records must remain visible even if their scores differ.
  const units = ranked.map(address => {
    const raw = address.raw as { candidate?: { address?: { unitDesignator?: string; unitNumber?: string; unitNumberSuffix?: string } } } | null
    const unit = raw?.candidate?.address
    return [unit?.unitDesignator, unit?.unitNumber, unit?.unitNumberSuffix].map(value => typeof value === 'string' ? value.trim().toLowerCase() : '').join('|')
  })
  if (new Set(units).size > 1) return null
  const top = Math.max(...ranked.map(address => address.providerScore!))
  const leaders = ranked.filter(address => address.providerScore === top)
  if (leaders.length !== 1) return null
  const lead = leaders[0]
  // The saved 1144 May response has only an omitted province on its civic
  // record. Street/locality suggestions lose the civic identity entirely.
  // A competing civic or block record remains a material identity choice.
  if (lead.precision !== 'CIVIC_NUMBER' || (lead.providerFaults
    ? lead.providerFaults.some(fault => fault.element !== 'PROVINCE' || fault.fault !== 'missing' || lead.providerProvince !== 'BC')
    : lead.issues.length > 0)) return null
  if (ranked.some(address => address !== lead && !['STREET', 'LOCALITY'].includes(address.precision))) return null
  return ranked.indexOf(leaders[0])
}

export function leadingParcelIndex(parcels: Parcel[]): number | null {
  // The municipal API supplies relationship descriptions, not a comparable rank.
  // A unique source join among spatial leads is useful to show first, but it is
  // still unreviewed and requires explicit selection and confirmation.
  if (parcels.length < 2) return null
  const related = parcels as RelatedParcel[]
  const joined = related.filter(parcel => parcel.relation === 'pid_exact' || parcel.relation === 'gislink_join')
  if (joined.length !== 1 || related.some(parcel => !parcel.relation)) return null
  if (related.some(parcel => parcel !== joined[0] && parcel.relation !== 'spatial_lead')) return null
  return related.indexOf(joined[0])
}

type Candidate = { id: string }
export function CandidateChoices<T extends Candidate>({ candidates, selectedId, leadingIndex, kind, render }:
  { candidates: T[]; selectedId: string | null; leadingIndex: number | null; kind: 'address' | 'parcel'; render: (candidate: T, label: string) => ReactNode }) {
  const lead = leadingIndex === null ? null : candidates[leadingIndex]
  const others = lead ? candidates.filter(candidate => candidate.id !== lead.id) : candidates
  return <div className="sd-candidate-choices">
    {lead && <ul className="sd-options"><li>{render(lead, kind === 'address' ? 'Leading address suggestion' : 'Source-linked parcel lead')}</li></ul>}
    {lead ? <details className="sd-other-matches" key={`${kind}:${selectedId ?? ''}`} open={others.some(candidate => candidate.id === selectedId)}>
      <summary>Other matches ({others.length}){others.some(candidate => candidate.id === selectedId) ? ' · current selection inside' : ''}</summary>
      <ul className="sd-options">{others.map(candidate => <li key={candidate.id}>{render(candidate, 'Other match')}</li>)}</ul>
    </details> : <ul className="sd-options">{others.map(candidate => <li key={candidate.id}>{render(candidate, 'Possible match')}</li>)}</ul>}
  </div>
}
