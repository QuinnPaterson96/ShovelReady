import { useEffect, useRef, useState } from 'react'
import { StepInfo } from '../StepInfo'
import { publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { DiscoveryFlow, initial } from './flow'
import type { Address, Confirmed, Source, State, Transport } from './flow'
import { ObservationMap } from './ObservationMap'
import { liveTransport } from './transport'
import { CandidateChoices, harmlessCompletion, leadingAddressIndex, leadingParcelIndex } from './CandidateChoices'
import { SelectedProperty } from './SelectedProperty'
import { parcelDescription } from './parcelComparison'

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
export function SiteDiscovery({ onConfirm, transport = liveTransport, onManual, autoProceed = false, resetKey = 0, inspectKey = 0 }: { onConfirm: (value: Confirmed | null) => void; transport?: Transport; onManual?: () => void; autoProceed?: boolean; resetKey?: number; inspectKey?: number }) {
  const [state, setState] = useState<State>(initial)
  const [addressOpen, setAddressOpen] = useState(true)
  const [parcelOpen, setParcelOpen] = useState(true)
  const [observationOpen, setObservationOpen] = useState(true)
  const onConfirmRef = useRef(onConfirm)
  onConfirmRef.current = onConfirm
  const [flow] = useState(() => new DiscoveryFlow(transport, setState, value => onConfirmRef.current(value), autoProceed))
  useEffect(() => { void import('./site-discovery.css'); return () => flow.dispose() }, [flow])
  useEffect(() => { if (resetKey) { flow.reject(); setAddressOpen(true); setParcelOpen(true); setObservationOpen(true) } }, [resetKey, flow])
  useEffect(() => { if (inspectKey) setParcelOpen(true) }, [inspectKey])
  useEffect(() => { if (parcelOpen && state.parcels.length > 1) document.getElementById('sd-parcels')?.focus() }, [parcelOpen, state.parcels.length, inspectKey])
  const { query, busy, addresses, address, parcels, parcel, observation, confirmed, message } = state
  if (autoProceed && confirmed && (parcels.length === 1 || !parcelOpen)) return <SelectedProperty value={confirmed}
    onChangeProperty={() => { flow.changeProperty(); setAddressOpen(true); setParcelOpen(true); setObservationOpen(true) }}
    onInspectAlternatives={parcels.length > 1 ? () => setParcelOpen(true) : undefined}
    onRetryObservation={() => void flow.chooseParcel(confirmed.parcel.id)} />
  return <section className="site-discovery" aria-labelledby="site-discovery-title">
    <div className="sd-address-heading"><h4 id="site-discovery-title">Enter your address</h4><StepInfo label="Address search and property outlines"><p>Choose an address result. A sole usable Victoria parcel opens placement automatically; several parcels require your choice.</p><p>Address suggestions and municipal outlines are unreviewed source leads. Neither a geocoder score nor a nearby point proves parcel identity. Rooflines are mapped roof outlines, not legal building walls. Check the property identity and source dates independently.</p></StepInfo></div>
    {address && !addressOpen && <div className="sd-selected"><p><strong>Address lead:</strong> {address.label}{address.locality ? ` · ${address.locality}` : ''}. Parcel identity is still separate.</p><button type="button" onClick={() => setAddressOpen(true)}>Change address</button></div>}
    {addressOpen && <form onSubmit={event => { event.preventDefault(); setParcelOpen(true); setObservationOpen(true); void flow.search() }}>
      <label htmlFor="sd-address">Street address in British Columbia</label>
      <div className="sd-search"><input id="sd-address" value={query} maxLength={160} onChange={event => { setParcelOpen(true); setObservationOpen(true); flow.edit(event.target.value) }} placeholder="Street address, city" autoComplete="street-address" />
        <button className="sd-search-primary" type="submit" disabled={busy || query.trim().length < 3}>Search</button></div>
    </form>}
    {busy && <p role="status">{state.stage === 'addresses' ? 'Searching addresses…' : state.stage === 'parcels' ? 'Searching Victoria parcels…' : 'Fetching parcel and rooflines…'}</p>}
    {message && <p className="sd-notice" role="status">{message}</p>}
    {addressOpen && addresses.length > 0 && <AddressCandidates addresses={addresses} selectedId={address?.id ?? null} onChoose={id => { setAddressOpen(false); setParcelOpen(true); setObservationOpen(true); void flow.chooseAddress(id) }} />}
    {address && !busy && parcels.length === 0 && <p><button type="button" onClick={() => void flow.chooseAddress(address.id)}>Retry Victoria parcel search</button></p>}
    {!autoProceed && parcel && !parcelOpen && <div className="sd-selected"><p><strong>Parcel lead:</strong> {parcel.label}. {parcel.match} Property confirmation is still required.</p><button type="button" onClick={() => setParcelOpen(true)}>Change parcel</button></div>}
    {parcelOpen && parcels.length > 0 && (!autoProceed || parcels.length > 1) && <section id="sd-parcels" tabIndex={-1} aria-label="Parcel choices"><h5>2 · Choose a parcel to inspect</h5><p>{parcels.length > 1 ? 'Compare the parcel identifiers and mapped outlines, then choose the parcel your project concerns.' : 'Choose the parcel to inspect its mapped outline.'}</p>
      <CandidateChoices candidates={parcels} selectedId={parcel?.id ?? null} leadingIndex={leadingParcelIndex(parcels)} kind="parcel" render={(candidate, label) => <>
        <p className="sd-candidate-label">{label}</p>
        <button type="button" aria-pressed={parcel?.id === candidate.id} onClick={() => { setParcelOpen(false); setObservationOpen(true); void flow.chooseParcel(candidate.id) }}>{candidate.label}{parcelDescription(candidate) ? ` · ${parcelDescription(candidate)}` : ''}</button>
        <p>{candidate.match}</p>
        <details><summary>Parcel source details</summary><SourceLine source={candidate.source} /></details>
        <TechnicalDetails title="Complete parcel candidate"><pre>{JSON.stringify(candidate.raw, null, 2)}</pre></TechnicalDetails>
      </>} /></section>}
    {!autoProceed && confirmed && !observationOpen && <div className="sd-selected"><p><strong>Observed property confirmed for this demonstration:</strong> {confirmed.parcel.label}. Source observation remains unreviewed; no fit check was run.</p><button type="button" onClick={() => setObservationOpen(true)}>Review observed property</button></div>}
    {!autoProceed && observationOpen && observation && parcel && <section className="sd-observation" aria-label="Property observation"><h5>3 · Inspect and confirm the observed property</h5>
      <p className="sd-notice">Captured parcel and rooflines are approximate. Rooflines are not walls; missing or partial rooflines do not establish clear space. Check that the parcel shown is yours.</p>
      <ObservationMap observation={observation} address={address ?? undefined} parcel={parcel} />
      <div className="sd-actions"><button type="button" onClick={() => { flow.confirm(); setObservationOpen(false) }} disabled={!!confirmed}>Confirm this observed property</button><button type="button" onClick={() => { flow.changeProperty(); setAddressOpen(true); setParcelOpen(true); setObservationOpen(true) }}>Change property</button></div>
      <TechnicalDetails title="Complete observation and exact source records"><pre>{JSON.stringify(observation.raw, null, 2)}</pre></TechnicalDetails>
    </section>}
    {parcel && !busy && (!observation || observation.buildingsState === 'partial') && <p><button type="button" onClick={() => void flow.chooseParcel(parcel.id)}>Retry parcel and rooflines</button> Retrying clears the selected property and placement result.</p>}
    {onManual ? <p className="sd-fallback"><button className="sd-manual-link" type="button" onClick={onManual}>Can’t find your address? Enter details manually</button></p> :
      <p className="sd-fallback">You can continue with the retained lookup or <a href="#manual-address">manual site details below</a> if this search is wrong, outside Victoria or unavailable. This demonstration does not fill those fields or affect the prepared summary yet.</p>}
  </section>
}
