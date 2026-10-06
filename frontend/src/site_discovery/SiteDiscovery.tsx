import { useEffect, useState } from 'react'
import { publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { DiscoveryFlow, initial } from './flow'
import type { Address, Confirmed, Source, State, Transport } from './flow'
import { ObservationMap } from './ObservationMap'
import { liveTransport } from './transport'
import { CandidateChoices, harmlessCompletion, leadingAddressIndex, leadingParcelIndex } from './CandidateChoices'

function SourceLine({ source }: { source: Source }) {
  const url = publicSourceUrl(source.url)
  return <p className="sd-source">{source.provider} · {source.record} · captured {readableDate(source.capturedAt)} · {source.review}. Source date {readableDate(source.sourceDate)}. {url && <a href={url} target="_blank" rel="noreferrer">Source</a>}</p>
}
export function AddressCandidates({ addresses, selectedId, onChoose }: { addresses: Address[]; selectedId: string | null; onChoose: (id: string) => void }) {
  const leading = leadingAddressIndex(addresses)
  return <section aria-label="Address choices"><h5>1 · Choose the address record</h5><p>Choose an address explicitly. Suggestions are unreviewed; a provider score is a ranking aid, not a probability or proof of parcel identity.</p>
    {leading === null && addresses.length > 1 && <p className="sd-notice">Several address matches need review. Check the street, city and any corrections before choosing.</p>}
    <CandidateChoices candidates={addresses} selectedId={selectedId} leadingIndex={leading} kind="address" render={(candidate, label) => <>
      <p className="sd-candidate-label">{label === 'Leading address suggestion' && harmlessCompletion(candidate) ? `Matched to ${candidate.label.split(',')[0]}` : label}</p>
      <button type="button" aria-pressed={selectedId === candidate.id} onClick={() => onChoose(candidate.id)}>{candidate.label}{candidate.locality ? ` · ${candidate.locality}` : ''}</button>
      <p>Address match: {candidate.precision.replace(/_/g, ' ').toLowerCase()}{!harmlessCompletion(candidate) && candidate.issues.length ? ` · Review: ${candidate.issues.join('; ')}` : ''}. Parcel identity requires a separate check.</p>
      <SourceLine source={candidate.source} />
      {candidate.issues.length > 0 && <details><summary>Provider address details</summary><p>{candidate.issues.join('; ')}.</p></details>}
      <TechnicalDetails title="Complete address record"><pre>{JSON.stringify(candidate.raw, null, 2)}</pre></TechnicalDetails>
    </>} />
  </section>
}
export function SiteDiscovery({ onConfirm, transport = liveTransport, onManual }: { onConfirm: (value: Confirmed | null) => void; transport?: Transport; onManual?: () => void }) {
  const [state, setState] = useState<State>(initial)
  const [addressOpen, setAddressOpen] = useState(true)
  const [parcelOpen, setParcelOpen] = useState(true)
  const [observationOpen, setObservationOpen] = useState(true)
  const [flow] = useState(() => new DiscoveryFlow(transport, setState, onConfirm))
  useEffect(() => { void import('./site-discovery.css'); return () => flow.dispose() }, [flow])
  const { query, busy, addresses, address, parcels, parcel, observation, confirmed, message } = state
  return <section className="site-discovery" aria-labelledby="site-discovery-title">
    <h4 id="site-discovery-title">Search for a property · source demonstration</h4>
    <p>Search an address, choose the address record, then choose and inspect a Victoria parcel before confirming it. These are unreviewed source leads; no site fit is calculated here.</p>
    <details><summary>What do these matches mean?</summary><p>An address suggestion identifies a possible civic address. A parcel candidate is a separate municipal lead. Neither a geocoder score nor a nearby point proves parcel identity. Rooflines are mapped roof outlines, not legal building walls. Check the source dates and confirm the parcel yourself.</p></details>
    {address && !addressOpen && <div className="sd-selected"><p><strong>Address lead:</strong> {address.label}{address.locality ? ` · ${address.locality}` : ''}. Parcel identity is still separate.</p><button type="button" onClick={() => setAddressOpen(true)}>Change address</button></div>}
    {addressOpen && <form onSubmit={event => { event.preventDefault(); setParcelOpen(true); setObservationOpen(true); void flow.search() }}>
      <label htmlFor="sd-address">Street address in British Columbia</label>
      <div className="sd-search"><input id="sd-address" value={query} maxLength={160} onChange={event => { setParcelOpen(true); setObservationOpen(true); flow.edit(event.target.value) }} placeholder="Street address, city" autoComplete="street-address" />
        <button type="submit" disabled={busy || query.trim().length < 3}>Search</button></div>
    </form>}
    {busy && <p role="status">{state.stage === 'addresses' ? 'Searching addresses…' : state.stage === 'parcels' ? 'Searching Victoria parcels…' : 'Fetching parcel and rooflines…'}</p>}
    {message && <p className="sd-notice" role="status">{message}</p>}
    {addressOpen && addresses.length > 0 && <AddressCandidates addresses={addresses} selectedId={address?.id ?? null} onChoose={id => { setAddressOpen(false); setParcelOpen(true); setObservationOpen(true); void flow.chooseAddress(id) }} />}
    {address && !busy && parcels.length === 0 && <p><button type="button" onClick={() => void flow.chooseAddress(address.id)}>Retry Victoria parcel search</button></p>}
    {parcel && !parcelOpen && <div className="sd-selected"><p><strong>Parcel lead:</strong> {parcel.label}. {parcel.match} Property confirmation is still required.</p><button type="button" onClick={() => setParcelOpen(true)}>Change parcel</button></div>}
    {parcelOpen && parcels.length > 0 && <section aria-label="Parcel choices"><h5>2 · Choose a parcel to inspect</h5><p>More than one parcel may match. A source join is unreviewed; a nearby point does not prove property identity. Choose a parcel explicitly.</p>
      {leadingParcelIndex(parcels) === null && parcels.length > 1 && <p className="sd-notice">Several parcel leads remain unresolved. The source does not rank them as one confirmed property.</p>}
      <CandidateChoices candidates={parcels} selectedId={parcel?.id ?? null} leadingIndex={leadingParcelIndex(parcels)} kind="parcel" render={(candidate, label) => <>
        <p className="sd-candidate-label">{label}</p>
        <button type="button" aria-pressed={parcel?.id === candidate.id} onClick={() => { setParcelOpen(false); setObservationOpen(true); void flow.chooseParcel(candidate.id) }}>{candidate.label}</button>
        <p>{candidate.match}</p><SourceLine source={candidate.source} />
        <TechnicalDetails title="Complete parcel candidate"><pre>{JSON.stringify(candidate.raw, null, 2)}</pre></TechnicalDetails>
      </>} /></section>}
    {confirmed && !observationOpen && <div className="sd-selected"><p><strong>Observed property confirmed for this demonstration:</strong> {confirmed.parcel.label}. Source observation remains unreviewed; no fit check was run.</p><button type="button" onClick={() => setObservationOpen(true)}>Review observed property</button></div>}
    {observationOpen && observation && parcel && <section className="sd-observation" aria-label="Property observation"><h5>3 · Inspect and confirm the observed property</h5>
      <p className="sd-notice">Captured parcel and rooflines are approximate. Rooflines are not walls; missing or partial rooflines do not establish clear space. Check that the parcel shown is yours.</p>
      <ObservationMap observation={observation} address={address ?? undefined} parcel={parcel} />
      <div className="sd-actions"><button type="button" onClick={() => { flow.confirm(); setObservationOpen(false) }} disabled={!!confirmed}>Confirm this observed property</button><button type="button" onClick={() => { flow.reject(); setAddressOpen(true); setParcelOpen(true); setObservationOpen(true) }}>Reject and correct search</button></div>
      <TechnicalDetails title="Complete observation and exact source records"><pre>{JSON.stringify(observation.raw, null, 2)}</pre></TechnicalDetails>
    </section>}
    {parcel && !busy && (!observation || observation.buildingsState === 'partial') && <p><button type="button" onClick={() => void flow.chooseParcel(parcel.id)}>Retry parcel and rooflines</button> Retrying clears the current property confirmation and placement result.</p>}
    {onManual ? <p className="sd-fallback"><button type="button" onClick={onManual}>Enter property details manually</button> if this search is wrong, outside Victoria or unavailable. Confirming a property opens approximate placement below.</p> :
      <p className="sd-fallback">You can continue with the retained lookup or <a href="#manual-address">manual site details below</a> if this search is wrong, outside Victoria or unavailable. This demonstration does not fill those fields or affect the prepared summary yet.</p>}
  </section>
}
