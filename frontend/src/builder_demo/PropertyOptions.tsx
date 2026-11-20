import { useEffect } from 'react'
import { publicSourceUrl, readableDate } from '../ReadableProvenance'
import type { PropertyScanResult } from '../conditional_screening/PropertyScan'
import type { ZoningLookup } from '../conditional_screening/victoriaZoning'
import type { Confirmed } from '../site_discovery/flow'
import { ObservationMap } from '../site_discovery/ObservationMap'

export type HousePlan = 'keep' | 'replace' | 'exploring'

const housePlans: { value: HousePlan; label: string }[] = [
  { value: 'keep', label: 'Keep it' },
  { value: 'replace', label: 'Replace it' },
  { value: 'exploring', label: 'Still exploring' },
]

type Props = {
  selected: Confirmed
  opportunity: { detail: string; sourceLabel: string; sourceUrl: string | null } | null
  zoning?: ZoningLookup | null
  scan?: PropertyScanResult | null
  housePlan: HousePlan | null
  onHousePlanChange: (value: HousePlan | null) => void
  onExploreGarden: () => void
  onExploreDetached: () => void
}

function MapSource({ source }: { source: ZoningLookup['source_records'][number] | NonNullable<PropertyScanResult['findings'][number]['source']> }) {
  const url = publicSourceUrl(source.source_url)
  return <span className="property-options-source">{source.provider} · {url
    ? <a href={url} target="_blank" rel="noreferrer">{source.record_label}</a>
    : source.record_label} · {readableDate(source.captured_at_utc)} · unreviewed</span>
}

function MunicipalMapFindings({ zoning, scan }: Pick<Props, 'zoning' | 'scan'>) {
  const flags = scan?.findings.filter(row => row.status === 'review') ?? []
  if (!zoning && !flags.length) return null
  const zone = zoning?.status === 'single_covered_mapping' ? zoning.zones[0]?.source_fields.Zoning : null
  const zoningCopy = zone ? `The city maps this parcel as ${zone}.`
    : zoning?.status === 'split_zones' ? 'More than one zone crosses this parcel. Check which zone covers your proposed location.'
    : zoning?.status === 'partial_coverage' ? 'The zoning map covers only part of this parcel. Check the proposed location with the city.'
    : 'The city map did not establish a single zoning designation for this parcel.'
  const zoningSource = zoning?.source_records.at(-1)
  return <div className="property-options-records">
    {zoning && <p>{zoningCopy}</p>}
    {flags.length > 0 && <p>Ask the city how records for {flags.map(row => row.label.toLowerCase()).join(', ')} affect your project.</p>}
    {(zoningSource || flags.length > 0) && <details>
      <summary>City map records and sources</summary>
      {zoningSource && <p><MapSource source={zoningSource} /></p>}
      {flags.map(row => <p key={row.label}><strong>{row.label}.</strong> {row.detail}{row.source && <> <MapSource source={row.source} /></>}</p>)}
    </details>}
  </div>
}

export function PropertyOptions({ selected, opportunity, zoning, scan, housePlan, onHousePlanChange, onExploreGarden, onExploreDetached }: Props) {
  useEffect(() => { void import('./property-options.css') }, [])
  const sourceUrl = publicSourceUrl(opportunity?.sourceUrl)
  return <section className="property-options" aria-labelledby="property-options-title">
    <h2 id="property-options-title" tabIndex={-1}>What we found on this property</h2>
    {opportunity && <div className="property-options-finding">
      <p>{opportunity.detail}</p>
      <p className="property-options-source">{sourceUrl
        ? <a href={sourceUrl} target="_blank" rel="noreferrer">{opportunity.sourceLabel}</a>
        : opportunity.sourceLabel}</p>
    </div>}
    <div className="property-options-layout">
      <div>
        <ObservationMap observation={selected.observation} parcel={selected.parcel} />
        <MunicipalMapFindings zoning={zoning} scan={scan} />
      </div>
      <div className="property-options-next">
        <fieldset className="property-options-house-plan">
          <legend>What are you hoping to do with the existing house? <small>(optional)</small></legend>
          <div>{housePlans.map(plan => <label key={plan.value}>
            <input type="radio" name="property-options-house-plan" value={plan.value}
              checked={housePlan === plan.value} onChange={() => onHousePlanChange(plan.value)} />
            {plan.label}
          </label>)}</div>
        </fieldset>
        {housePlan !== 'replace' && <>
          <h3>Could a garden suite fit here?</h3>
          <p>{selected.observation.roofs.length
            ? 'Place a prefab model on the map to see how much space it leaves beside the mapped buildings.'
            : 'Place a prefab model inside the mapped lot. Check where any existing buildings stand before relying on the space shown.'}
            {!opportunity && ' Check local rules to confirm whether this property allows a garden suite.'}</p>
          <button type="button" className="sr-primary" onClick={onExploreGarden}>Explore a garden suite</button>
        </>}
        {(housePlan === 'replace' || housePlan === 'exploring') && <>
          <h3>Which detached plans could fit here?</h3>
          <p>Compare house plans on the lot and choose which mapped building you would remove.</p>
          <button type="button" className={housePlan === 'replace' ? 'sr-primary' : undefined} onClick={onExploreDetached}>Compare detached plans</button>
        </>}
      </div>
    </div>
  </section>
}
