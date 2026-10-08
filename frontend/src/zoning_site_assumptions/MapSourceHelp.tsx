import { StepInfo } from '../StepInfo'
import { readableDate } from '../ReadableProvenance'
import type { Case } from '../occupied_lots/contract'

export function MapSourceHelp({ site }: { site: Case }) {
  const source = site.site.parcel.source
  return <span className="map-source-help"><span>Map</span><StepInfo label="Map sources & accuracy"><strong>{source.provider} · {source.record_label}</strong><p>Captured {readableDate(source.capture_date)} · {source.review_status}.</p><p>Parcel outlines and rooflines are approximate, unreviewed observations. Rooflines are not building walls; the map does not establish legal lot lines or frontage.</p><p>Full source records and exact geometry remain in the expandable evidence and technical export.</p></StepInfo></span>
}
