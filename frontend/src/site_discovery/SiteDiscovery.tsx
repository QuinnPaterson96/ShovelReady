import { useEffect, useState } from 'react'
import { publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import { DiscoveryFlow, initial } from './flow'
import type { Confirmed, Observation, Polygon, Source, State, Transport } from './flow'
import { liveTransport } from './transport'
import { CandidateChoices, leadingAddressIndex, leadingParcelIndex } from './CandidateChoices'

function SourceLine({ source }: { source: Source }) {
  const url = publicSourceUrl(source.url)
  return <p className="sd-source">{source.provider} · {source.record} · captured {readableDate(source.capturedAt)} · {source.review}. Source date {readableDate(source.sourceDate)}. {url && <a href={url} target="_blank" rel="noreferrer">Source</a>}</p>
}
function rings(geometry: Polygon): number[][][] {
  return geometry.type === 'Polygon' ? geometry.coordinates as number[][][] : (geometry.coordinates as number[][][][]).flat()
}
function mapPath(geometry: Polygon) {
  return rings(geometry).map(ring => ring.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${-y}`).join(' ') + ' Z').join(' ')
}
function Map({ observation }: { observation: Observation }) {
  const shapes = [observation.parcel.geometry, ...observation.roofs.map(roof => roof.geometry)]
  const points = shapes.flatMap(shape => rings(shape).flat())
  const xs = points.map(point => point[0]), ys = points.map(point => point[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const extent = Math.max(maxX - minX, maxY - minY, 20), pad = extent * .15
  const viewBox = `${minX - pad} ${-maxY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
  return <figure className="sd-map"><svg viewBox={viewBox} role="img" aria-label={`Approximate parcel and ${observation.roofs.length} captured roofline outlines; coordinates in EPSG:3157 metres. North is up.`}>
    <path d={mapPath(observation.parcel.geometry)} fill="var(--map-parcel-fill)" stroke="var(--map-parcel-stroke)" fillRule="evenodd" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    {observation.roofs.map((roof, index) => {
      const vertices = rings(roof.geometry).flat()
      return <g key={roof.id}><path d={mapPath(roof.geometry)} fill="var(--map-roof-fill)" stroke="var(--map-roof-stroke)" fillRule="evenodd" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <text x={Math.min(...vertices.map(point => point[0]))} y={-Math.max(...vertices.map(point => point[1])) - extent * .015} fontSize={extent * .04}>Roof {index + 1}</text></g>
    })}
  </svg><figcaption>Teal: captured parcel · Purple: captured rooflines, not walls · North ↑ · EPSG:3157 projected metres. Drawing is approximate, without a basemap or legal yard interpretation.</figcaption></figure>
}

export function SiteDiscovery({ onConfirm, transport = liveTransport, onManual }: { onConfirm: (value: Confirmed | null) => void; transport?: Transport; onManual?: () => void }) {
  const [state, setState] = useState<State>(initial)
  const [flow] = useState(() => new DiscoveryFlow(transport, setState, onConfirm))
  useEffect(() => { void import('./site-discovery.css'); return () => flow.dispose() }, [flow])
  const { query, busy, addresses, address, parcels, parcel, observation, confirmed, message } = state
  return <section className="site-discovery" aria-labelledby="site-discovery-title">
    <h4 id="site-discovery-title">Search for a property · source demonstration</h4>
    <p>Search an address, choose the address record, then choose and inspect a Victoria parcel before confirming it. These are unreviewed source leads; no site fit is calculated here.</p>
    <details><summary>What do these matches mean?</summary><p>An address suggestion identifies a possible civic address. A parcel candidate is a separate municipal lead. Neither a geocoder score nor a nearby point proves parcel identity. Rooflines are mapped roof outlines, not legal building walls. Check the source dates and confirm the parcel yourself.</p></details>
    <form onSubmit={event => { event.preventDefault(); void flow.search() }}>
      <label htmlFor="sd-address">Street address in British Columbia</label>
      <div className="sd-search"><input id="sd-address" value={query} maxLength={160} onChange={event => flow.edit(event.target.value)} placeholder="Street address, city" autoComplete="street-address" />
        <button type="submit" disabled={busy || query.trim().length < 3}>Search</button></div>
    </form>
    {busy && <p role="status">{state.stage === 'addresses' ? 'Searching addresses…' : state.stage === 'parcels' ? 'Searching Victoria parcels…' : 'Fetching parcel and rooflines…'}</p>}
    {message && <p className="sd-notice" role="status">{message}</p>}
    {addresses.length > 0 && <section aria-label="Address choices"><h5>1 · Choose the address record</h5><p>Address suggestions can be corrected or ambiguous. Provider scores compare address suggestions only; they are not match probabilities or proof of parcel identity. Choose a record explicitly.</p>
      {leadingAddressIndex(addresses) === null && addresses.length > 1 && <p className="sd-notice">These address results have no clear leading suggestion. Review every locality, precision and provider correction before choosing.</p>}
      {addresses.some(candidate => candidate.issues.length > 0) && <p className="sd-notice">At least one address suggestion has a provider correction or issue. Review those details before choosing; the entered address may differ from the provider record.</p>}
      <CandidateChoices candidates={addresses} selectedId={address?.id ?? null} leadingIndex={leadingAddressIndex(addresses)} kind="address" render={(candidate, label) => <>
        <p className="sd-candidate-label">{label}</p>
        <button type="button" aria-pressed={address?.id === candidate.id} onClick={() => void flow.chooseAddress(candidate.id)}>{candidate.label}{candidate.locality ? ` · ${candidate.locality}` : ''}</button>
        <p>Address match: {candidate.precision.replace(/_/g, ' ').toLowerCase()}{candidate.issues.length ? ` · Provider corrections or issues: ${candidate.issues.join('; ')}` : ''}. This is not parcel identity.</p>
        <SourceLine source={candidate.source} />
        <TechnicalDetails title="Complete address record"><pre>{JSON.stringify(candidate.raw, null, 2)}</pre></TechnicalDetails>
      </>} /></section>}
    {address && <p className="sd-choice">Chosen address lead: <strong>{address.label}</strong>. {address.locality && `Locality: ${address.locality}.`} You can choose a different address above or edit the search.</p>}
    {address && !busy && parcels.length === 0 && <p><button type="button" onClick={() => void flow.chooseAddress(address.id)}>Retry Victoria parcel search</button></p>}
    {parcels.length > 0 && <section aria-label="Parcel choices"><h5>2 · Choose a parcel to inspect</h5><p>More than one parcel may match. A source join is unreviewed; a nearby point does not prove property identity. Choose a parcel explicitly.</p>
      {leadingParcelIndex(parcels) === null && parcels.length > 1 && <p className="sd-notice">Several parcel leads remain unresolved. The source does not rank them as one confirmed property.</p>}
      <CandidateChoices candidates={parcels} selectedId={parcel?.id ?? null} leadingIndex={leadingParcelIndex(parcels)} kind="parcel" render={(candidate, label) => <>
        <p className="sd-candidate-label">{label}</p>
        <button type="button" aria-pressed={parcel?.id === candidate.id} onClick={() => void flow.chooseParcel(candidate.id)}>{candidate.label}</button>
        <p>{candidate.match}</p><SourceLine source={candidate.source} />
        <TechnicalDetails title="Complete parcel candidate"><pre>{JSON.stringify(candidate.raw, null, 2)}</pre></TechnicalDetails>
      </>} /></section>}
    {parcel && <p className="sd-choice">Chosen parcel lead: <strong>{parcel.label}</strong>. {parcel.match} Inspect the observation before confirming.</p>}
    {observation && parcel && <section aria-label="Property observation"><h5>3 · Inspect and confirm the observed property</h5>
      <p className="sd-notice">Captured parcel and rooflines are approximate. Rooflines are not walls; missing or partial rooflines do not establish clear space. Check that the parcel shown is yours.</p>
      <Map observation={observation} />
      <p>Approximate mapped parcel area: {observation.parcel.areaM2 === null ? 'unknown' : `${Number(observation.parcel.areaM2.toFixed(1))} m²`}. {observation.roofs.length} roofline outline{observation.roofs.length === 1 ? '' : 's'} returned. Building fetch state: {observation.buildingsState.replace(/_/g, ' ')}.</p>
      {observation.issues.length > 0 && <p>Source limitations: {observation.issues.map(issue => issue.replace(/_/g, ' ')).join('; ')}.</p>}
      <SourceLine source={observation.source} />
      {observation.roofSource && <SourceLine source={observation.roofSource} />}
      <div className="sd-actions"><button type="button" onClick={() => flow.confirm()} disabled={!!confirmed}>Confirm this observed property</button><button type="button" onClick={() => flow.reject()}>Reject and correct search</button></div>
      <TechnicalDetails title="Complete observation and exact source records"><pre>{JSON.stringify(observation.raw, null, 2)}</pre></TechnicalDetails>
    </section>}
    {parcel && !busy && (!observation || observation.buildingsState === 'partial') && <p><button type="button" onClick={() => void flow.chooseParcel(parcel.id)}>Retry parcel and rooflines</button> Retrying clears the current property confirmation and placement result.</p>}
    {onManual ? <p className="sd-fallback"><button type="button" onClick={onManual}>Enter property details manually</button> if this search is wrong, outside Victoria or unavailable. Confirming a property opens approximate placement below.</p> :
      <p className="sd-fallback">You can continue with the retained lookup or <a href="#manual-address">manual site details below</a> if this search is wrong, outside Victoria or unavailable. This demonstration does not fill those fields or affect the prepared summary yet.</p>}
  </section>
}
