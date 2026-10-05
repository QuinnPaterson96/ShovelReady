import type { ReactNode } from 'react'
import type { Address, Parcel } from './flow'

// These are optional because saved/manual Transport implementations need not supply
// provider ranking metadata. A score compares address suggestions only.
export type RankedAddress = Address & { providerScore?: number }
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
  if (leaders.length !== 1 || leaders[0].issues.length) return null
  // A locality disagreement needs human resolution even when one score is higher.
  const localities = new Set(ranked.map(address => address.locality?.trim().toLowerCase()))
  const precisions = new Set(ranked.map(address => address.precision.trim().toLowerCase()))
  if (localities.size !== 1 || precisions.size !== 1) return null
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
