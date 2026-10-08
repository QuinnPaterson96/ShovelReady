import { useEffect } from 'react'
import { publicSourceUrl, readableDate, TechnicalDetails } from '../ReadableProvenance'
import type { Confirmed } from './flow'
import { parcelDescription, roofParcelDetails } from './parcelComparison'

export function SelectedProperty({ value, onChangeProperty, onInspectAlternatives, onRetryObservation }: {
  value: Confirmed; onChangeProperty: () => void; onInspectAlternatives?: () => void; onRetryObservation?: () => void
}) {
  useEffect(() => { void import('./site-discovery.css') }, [])
  const roofDetails = roofParcelDetails(value.observation)
  const sourceUrl = publicSourceUrl(value.observation.source.url)
  return <section className="site-discovery sd-property-summary" aria-label="Selected property">
    <div className="sd-selected"><p><strong>{value.address.label}</strong><br />{parcelDescription(value.parcel) || value.parcel.label}</p>
      <button type="button" onClick={onChangeProperty}>Change property</button></div>
    {value.parcel.identityConcern && <p className="sd-notice">{value.parcel.identityConcern}</p>}
    {onInspectAlternatives && value.parcel.identityConcern && <button type="button" onClick={onInspectAlternatives}>Inspect another parcel candidate</button>}
    <details><summary>Property source and outline help</summary>
      <p>{value.observation.source.provider} · captured {readableDate(value.observation.source.capturedAt)} · {value.observation.source.review}. {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">Parcel source</a>} Approximate source outlines; selection does not verify ownership or legal boundaries.</p>
      <p>Mapped roof outlines include overhangs, not surveyed walls. Small differences between roof and parcel outlines can reflect mapping accuracy. Identify buildings and relevant boundaries before relying on placement checks.</p>
      {roofDetails.map(detail => <p key={detail}>{detail}</p>)}
      {value.observation.buildingsState !== 'available' && <p>Building observation is {value.observation.buildingsState}. Missing or incomplete rooflines do not establish open space.
        {onRetryObservation && <> <button type="button" onClick={onRetryObservation}>Retry parcel and rooflines</button> Retrying clears property-dependent inputs and results.</>}</p>}
      <TechnicalDetails title="Complete selected-property evidence"><pre>{JSON.stringify(value, null, 2)}</pre></TechnicalDetails>
    </details>
  </section>
}
