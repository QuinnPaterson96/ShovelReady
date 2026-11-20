import { useEffect, useState } from 'react'
import { CopyableRecord, publicSourceUrl, readableDate } from '../ReadableProvenance'
import type { PropertyScanResult } from '../conditional_screening/PropertyScan'
import type { ZoningLookup } from '../conditional_screening/victoriaZoning'
import { measurementWithUnit } from '../measurements'
import type { Opportunity } from '../municipal_rules/propertyOpportunity'
import { victoriaResidentialUses } from '../municipal_rules/victoriaResidentialUses'
import { municipalityFromProperty, parcelCoverage } from '../municipality_coverage/model'
import type { Confirmed } from '../site_discovery/flow'
import { ParcelDrawing, crdImageryTerms } from '../site_discovery/ObservationMap'
import { roofParcelDetails } from '../site_discovery/parcelComparison'

export type HousePlan = 'keep' | 'replace' | 'exploring'

type Props = {
  selected: Confirmed
  opportunity: Opportunity | null
  zoning: ZoningLookup | null
  municipalityMismatch: boolean
  checkingZone: boolean
  scan: PropertyScanResult | null
  onChangeAddress: () => void
  onInspectAlternatives?: () => void
  onRetryObservation: () => void
  onExploreGarden: () => void
  onExploreDetached: () => void
}

function SourceLink({ url, label }: { url: string | null; label: string }) {
  const href = publicSourceUrl(url)
  return href ? <a href={href} target="_blank" rel="noreferrer">{label}</a> : <>{label}</>
}

function zoneFinding(zoning: Props['zoning'], checking: boolean) {
  if (checking) return 'Checking the zoning map…'
  if (zoning?.status === 'split_zones') return 'More than one zone crosses this lot. Ask the city which applies to your project.'
  if (zoning?.status === 'partial_coverage') return 'The zoning map covers only part of this lot. Ask the city about your project location.'
  const zone = zoning?.zones[0]?.source_fields.Zoning
  if (zone && zoning?.status === 'single_covered_mapping') return `This lot is mapped as ${zone}. Permitted uses still need checking.`
  return 'Zoning is unresolved for this lot. You can still explore either project.'
}

export function PropertyOptions({ selected, opportunity, zoning, municipalityMismatch, checkingZone, scan, onExploreGarden,
  onExploreDetached, onChangeAddress, onInspectAlternatives, onRetryObservation }: Props) {
  useEffect(() => { void import('./property-options.css') }, [])
  const [showSources, setShowSources] = useState(false)
  const { address, parcel, observation } = selected
  const municipality = municipalityFromProperty(selected)
  const town = parcelCoverage(municipality)?.name.replace(/^(City|District) of /, '') ?? municipality.name
  const street = address.label.split(',')[0]
  const count = observation.roofs.length
  const partial = observation.buildingsState !== 'available'
  const descriptor = [
    observation.parcel.areaM2 === null ? null : `${measurementWithUnit(observation.parcel.areaM2, 'area')} mapped lot`,
    count ? `${count} mapped roofline${count === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ')
  const uses = victoriaResidentialUses(zoning)
  const flags = scan?.findings.filter(row => row.status === 'review') ?? []
  return <article className="property-options" aria-labelledby="property-options-title">
    <header>
      <div>
        <h1 id="property-options-title" tabIndex={-1}>{street}{town && <>, {town}</>}</h1>
        {descriptor && <p>{descriptor}</p>}
      </div>
      <button type="button" onClick={onChangeAddress}>Change address</button>
    </header>
    <div className="property-options-layout">
      <figure className="observation-map"><ParcelDrawing observation={observation} showAerial /></figure>
      <div className="property-options-next">
        <h2>What the zoning supports</h2>
        {municipalityMismatch && <p>The municipality you entered differs from the parcel record. Check the address before relying on local rules.</p>}
        {uses ? <>
          <p>Housing types in the mapped {zoning?.zones[0].source_fields.Zoning} zone</p>
          <ul className="property-use-list">{uses.labels.map(label => <li key={label}>{label} <span aria-hidden="true">✓</span></li>)}</ul>
          <p>One garden suite can accompany a detached home or duplex. Site conditions and permits still apply.</p>
        </> : <p>{opportunity?.detail ?? zoneFinding(zoning, checkingZone)}</p>}
        {flags.length > 0 && <p>Ask the city about {flags.map(row => row.label.toLowerCase()).join(', ')}.</p>}
        {partial && <p>Building outlines are incomplete. Check which buildings are on the lot.</p>}
        {parcel.identityConcern && <p>{parcel.identityConcern} {onInspectAlternatives && <button type="button" onClick={onInspectAlternatives}>Inspect another parcel candidate</button>}</p>}
        <h2>Choose a project</h2>
        <div className="property-project-actions">
          <button type="button" onClick={onExploreDetached}>Replace the main home<span className="property-action-arrow" aria-hidden="true" /></button>
          <button type="button" onClick={onExploreGarden}>Add a garden suite<span className="property-action-arrow" aria-hidden="true" /></button>
        </div>
      </div>
    </div>
    <details className="property-option-sources" onToggle={event => setShowSources(event.currentTarget.open)}>
      <summary>Property details and sources</summary>
      {showSources && <>
        <p>{parcel.match} The outline is approximate. Rooflines can include overhangs and neighbouring buildings. The sketch shows north up in projected metres (EPSG:3157).</p>
        {roofParcelDetails(observation).map(detail => <p key={detail}>{detail}</p>)}
        {partial && <p><button type="button" onClick={onRetryObservation}>Retry parcel and rooflines</button> Retrying clears property-dependent inputs and results.</p>}
        {[address.source, observation.source, observation.roofSource].map((s, i) => s && <p key={i}>{s.provider} · <SourceLink url={s.url} label={s.record} /> · captured {readableDate(s.capturedAt)} · {s.review}</p>)}
        <p><a href={crdImageryTerms}>Capital Regional District aerial photography</a> · 2025, 10 cm imagery. The parcel outline comes from the municipal record.</p>
        {zoning?.source_records.map((s, i) => <p key={i}>{s.provider} · <SourceLink url={s.source_url} label={s.record_label} /> · {readableDate(s.captured_at_utc)} · unreviewed</p>)}
        {uses && <p>{uses.source.provider} · <SourceLink url={uses.source.url} label={uses.source.title} /> · {uses.source.locator}. Read {uses.source.captured}. {uses.source.review}. The comparison covers base-zone use. Size, siting and site-specific approvals need separate checks.</p>}
        {opportunity && <p><SourceLink url={opportunity.sourceUrl} label={opportunity.sourceLabel} /></p>}
        {flags.map(row => <p key={row.label}><strong>{row.label}.</strong> {row.detail} {row.source && <SourceLink url={row.source.source_url} label={row.source.record_label} />}</p>)}
        <CopyableRecord id="property-options-record" label="Complete property and zoning evidence" value={JSON.stringify({ selected, zoning, scan, useCheck: uses, lotAreaCheck: opportunity?.evidence }, null, 2)} />
      </>}
    </details>
  </article>
}
