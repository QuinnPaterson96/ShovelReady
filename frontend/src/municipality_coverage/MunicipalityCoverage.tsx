import { useEffect, useId, useState } from 'react'
import { readableDate, publicSourceUrl } from '../ReadableProvenance'
import { coverageRequestUrl, userMunicipality, type MunicipalityContext } from './model'

export function MunicipalityCoverage({ value, onChange, onCorrectAddress, onManual, id }: {
  value: MunicipalityContext | null
  id?: string
  onChange?: (next: MunicipalityContext) => void
  onCorrectAddress?: () => void
  onManual?: () => void
}) {
  const inputId = useId()
  const [name, setName] = useState(value?.name ?? '')
  useEffect(() => { void import('./municipality-coverage.css') }, [])
  useEffect(() => { setName(value?.name ?? '') }, [value?.name])
  const supported = value?.rule_coverage === 'victoria_candidate'
  const request = value ? coverageRequestUrl(value) : null
  const sourceUrl = publicSourceUrl(value?.source?.url ?? null)
  return <section id={id} tabIndex={id ? -1 : undefined} className="municipality-coverage" aria-label="Municipality and rule coverage">
    <p className="municipality-coverage__title"><strong>{supported ? 'Using City of Victoria rules' : value?.name ? `We don’t cover ${value.name}’s rules yet` : 'Choose a municipality for local rules'}</strong></p>
    <p>{supported ? 'Preliminary garden-suite comparisons use the available Victoria rule subset.' : 'You can still explore a manual site sketch. Local rule checks are not available for this selection.'}</p>
    {(request || onManual || onCorrectAddress) && <div className="municipality-coverage__actions">
      {request && <a className="municipality-coverage__request" href={request} target="_blank" rel="noreferrer">Request {value?.name} coverage</a>}
      {!supported && onManual && <button type="button" onClick={onManual}>Continue with a site sketch</button>}
      {onCorrectAddress && <button type="button" onClick={onCorrectAddress}>Correct address or city</button>}
    </div>}
    {request && <p className="municipality-coverage__note">Opens a public GitHub request form; sign-in may be required. Only the municipality name is prefilled. Submit the form there to send your request.</p>}
    {onChange && <details><summary>{value?.name ? 'Change municipality' : 'Select municipality'}</summary>
      <form onSubmit={event => { event.preventDefault(); onChange(userMunicipality(name)) }}>
        <label htmlFor={inputId}>City or municipality in British Columbia</label>
        <div className="municipality-coverage__actions"><input id={inputId} value={name} maxLength={80} onChange={event => setName(event.target.value)} placeholder="For example, City of Victoria" autoComplete="address-level2" />
          <button type="submit" disabled={!name.trim()}>Use municipality</button></div>
      </form>
    </details>}
    {value?.name && <details><summary>Municipality source and coverage</summary>
      <p>{value.origin === 'municipal_parcel' ? 'Municipality follows the selected City of Victoria parcel source.' : value.origin === 'geocoder_locality' ? 'Municipality is suggested from the selected address record’s locality. It remains a provisional jurisdiction choice.' : 'Municipality entered by you; not independently verified.'} A municipality selection does not determine the property’s zone or applicable pathway.</p>
      {value.source && <p>{value.source.provider} · captured {readableDate(value.source.capturedAt)} · {value.source.review}. {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">Municipality source record</a>}</p>}
    </details>}
  </section>
}
